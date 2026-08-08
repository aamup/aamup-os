use reqwest::{Client, StatusCode};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EmbeddingStatus {
    configured: bool,
    provider: String,
    base_url: String,
    model: String,
    has_api_key: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmbeddingRequest {
    input: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EmbeddingResponse {
    provider: String,
    model: String,
    embeddings: Vec<Vec<f32>>,
}

#[derive(Serialize)]
struct ProviderEmbeddingRequest {
    model: String,
    input: Vec<String>,
}

#[derive(Deserialize)]
struct ProviderEmbeddingDatum {
    index: usize,
    embedding: Vec<f32>,
}

#[derive(Deserialize)]
struct ProviderEmbeddingResponse {
    data: Vec<ProviderEmbeddingDatum>,
    model: Option<String>,
}

#[derive(Deserialize)]
struct OllamaEmbeddingResponse {
    model: Option<String>,
    embeddings: Vec<Vec<f32>>,
}

fn config() -> (String, String, Option<String>) {
    let base_url = std::env::var("AAMUP_EMBED_BASE_URL")
        .or_else(|_| std::env::var("AAMUP_LLM_BASE_URL"))
        .unwrap_or_default()
        .trim_end_matches('/')
        .to_string();

    let model = std::env::var("AAMUP_EMBED_MODEL").unwrap_or_default();

    let api_key = std::env::var("AAMUP_EMBED_API_KEY")
        .or_else(|_| std::env::var("AAMUP_LLM_API_KEY"))
        .ok()
        .filter(|value| !value.trim().is_empty());

    (base_url, model, api_key)
}

fn validate_embeddings(embeddings: &[Vec<f32>], expected: usize) -> Result<(), String> {
    if embeddings.len() != expected {
        return Err(format!(
            "embedding provider returned {} vectors for {} inputs",
            embeddings.len(),
            expected
        ));
    }

    if embeddings.iter().any(Vec::is_empty) {
        return Err("embedding provider returned an empty vector".to_string());
    }

    let dimensions = embeddings[0].len();

    if embeddings
        .iter()
        .any(|embedding| embedding.len() != dimensions)
    {
        return Err("embedding provider returned inconsistent vector dimensions".to_string());
    }

    Ok(())
}

fn ollama_root(base_url: &str) -> &str {
    base_url
        .strip_suffix("/v1")
        .unwrap_or(base_url)
        .trim_end_matches('/')
}

#[tauri::command]
pub fn get_embedding_status() -> EmbeddingStatus {
    let (base_url, model, api_key) = config();

    EmbeddingStatus {
        configured: !base_url.is_empty() && !model.is_empty(),
        provider: "AUTO".to_string(),
        base_url,
        model,
        has_api_key: api_key.is_some(),
    }
}

#[tauri::command]
pub async fn embed_texts(request: EmbeddingRequest) -> Result<EmbeddingResponse, String> {
    let (base_url, model, api_key) = config();

    if base_url.is_empty() || model.is_empty() {
        return Err(
            "embedding provider is not configured; set AAMUP_EMBED_MODEL and optionally AAMUP_EMBED_BASE_URL"
                .to_string(),
        );
    }

    if request.input.is_empty() {
        return Err("embedding input cannot be empty".to_string());
    }

    if request.input.len() > 128 {
        return Err("embedding batch exceeds 128 inputs".to_string());
    }

    if request
        .input
        .iter()
        .any(|value| value.trim().is_empty() || value.len() > 8_000)
    {
        return Err(
            "embedding inputs must be non-empty and at most 8000 characters each".to_string(),
        );
    }

    let expected = request.input.len();

    let payload = ProviderEmbeddingRequest {
        model: model.clone(),
        input: request.input,
    };

    let client = Client::builder()
        .user_agent("AAMUP-OS-Semantic-Memory")
        .build()
        .map_err(|error| format!("unable to create embedding client: {error}"))?;

    // First attempt the OpenAI-compatible embedding endpoint. Some providers
    // expose this route directly, while some Ollama builds do not.
    let openai_endpoint = format!("{base_url}/embeddings");
    let mut openai_call = client.post(&openai_endpoint).json(&payload);

    if let Some(key) = api_key.as_deref() {
        openai_call = openai_call.bearer_auth(key);
    }

    let openai_response = openai_call
        .send()
        .await
        .map_err(|error| format!("embedding request failed: {error}"))?;

    if openai_response.status().is_success() {
        let response = openai_response
            .json::<ProviderEmbeddingResponse>()
            .await
            .map_err(|error| format!("invalid OpenAI-compatible embedding response: {error}"))?;

        let mut data = response.data;
        data.sort_by_key(|item| item.index);

        let embeddings: Vec<Vec<f32>> = data.into_iter().map(|item| item.embedding).collect();

        validate_embeddings(&embeddings, expected)?;

        return Ok(EmbeddingResponse {
            provider: "OPENAI_COMPATIBLE".to_string(),
            model: response.model.unwrap_or(model),
            embeddings,
        });
    }

    let openai_status = openai_response.status();

    // A 404/405 usually means the provider does not expose /v1/embeddings.
    // In that case, retry against Ollama's native /api/embed endpoint.
    if openai_status != StatusCode::NOT_FOUND && openai_status != StatusCode::METHOD_NOT_ALLOWED {
        let body = openai_response
            .text()
            .await
            .unwrap_or_default()
            .trim()
            .to_string();

        return Err(if body.is_empty() {
            format!(
                "embedding provider returned HTTP {} from {}",
                openai_status, openai_endpoint
            )
        } else {
            format!(
                "embedding provider returned HTTP {} from {}: {}",
                openai_status, openai_endpoint, body
            )
        });
    }

    let native_endpoint = format!("{}/api/embed", ollama_root(&base_url));

    let mut native_call = client.post(&native_endpoint).json(&payload);

    if let Some(key) = api_key.as_deref() {
        native_call = native_call.bearer_auth(key);
    }

    let native_response = native_call
        .send()
        .await
        .map_err(|error| format!("Ollama native embedding request failed: {error}"))?;

    let native_status = native_response.status();

    if !native_status.is_success() {
        let body = native_response
            .text()
            .await
            .unwrap_or_default()
            .trim()
            .to_string();

        return Err(if body.is_empty() {
            format!(
                "Ollama native embedding endpoint returned HTTP {} from {}",
                native_status, native_endpoint
            )
        } else {
            format!(
                "Ollama native embedding endpoint returned HTTP {} from {}: {}",
                native_status, native_endpoint, body
            )
        });
    }

    let response = native_response
        .json::<OllamaEmbeddingResponse>()
        .await
        .map_err(|error| format!("invalid Ollama native embedding response: {error}"))?;

    validate_embeddings(&response.embeddings, expected)?;

    Ok(EmbeddingResponse {
        provider: "OLLAMA_NATIVE".to_string(),
        model: response.model.unwrap_or(model),
        embeddings: response.embeddings,
    })
}

use reqwest::Client;
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

#[tauri::command]
pub fn get_embedding_status() -> EmbeddingStatus {
    let (base_url, model, api_key) = config();

    EmbeddingStatus {
        configured: !base_url.is_empty() && !model.is_empty(),
        provider: "OPENAI_COMPATIBLE".to_string(),
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

    let endpoint = format!("{base_url}/embeddings");

    let client = Client::builder()
        .user_agent("AAMUP-OS-Semantic-Memory")
        .build()
        .map_err(|error| format!("unable to create embedding client: {error}"))?;

    let mut call = client.post(endpoint).json(&payload);

    if let Some(key) = api_key {
        call = call.bearer_auth(key);
    }

    let response = call
        .send()
        .await
        .map_err(|error| format!("embedding request failed: {error}"))?
        .error_for_status()
        .map_err(|error| format!("embedding provider returned an error: {error}"))?
        .json::<ProviderEmbeddingResponse>()
        .await
        .map_err(|error| format!("invalid embedding response: {error}"))?;

    let mut data = response.data;
    data.sort_by_key(|item| item.index);

    if data.len() != expected {
        return Err(format!(
            "embedding provider returned {} vectors for {} inputs",
            data.len(),
            expected
        ));
    }

    if data.iter().any(|item| item.embedding.is_empty()) {
        return Err("embedding provider returned an empty vector".to_string());
    }

    let dimensions = data[0].embedding.len();

    if data.iter().any(|item| item.embedding.len() != dimensions) {
        return Err("embedding provider returned inconsistent vector dimensions".to_string());
    }

    Ok(EmbeddingResponse {
        provider: "OPENAI_COMPATIBLE".to_string(),
        model: response.model.unwrap_or(model),
        embeddings: data.into_iter().map(|item| item.embedding).collect(),
    })
}

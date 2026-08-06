#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NewsArticle {
    category: String,
    title: String,
    source: String,
    url: String,
    published: String,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NewsFeedError {
    category: String,
    message: String,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NewsIntelligence {
    articles: Vec<NewsArticle>,
    errors: Vec<NewsFeedError>,
    feed_count: usize,
    source: String,
}

struct FeedSpec {
    category: &'static str,
    url: &'static str,
}

const FEEDS: &[FeedSpec] = &[
    FeedSpec {
        category: "LOCAL",
        url: "https://news.google.com/rss/search?q=Portland%20Oregon&hl=en-US&gl=US&ceid=US:en",
    },
    FeedSpec {
        category: "AI",
        url: "https://news.google.com/rss/search?q=artificial%20intelligence&hl=en-US&gl=US&ceid=US:en",
    },
    FeedSpec {
        category: "TECH",
        url: "https://news.google.com/rss/search?q=technology&hl=en-US&gl=US&ceid=US:en",
    },
];

fn decode_entities(value: &str) -> String {
    value
        .replace("<![CDATA[", "")
        .replace("]]>", "")
        .replace("&amp;", "&")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&apos;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .trim()
        .to_string()
}

fn extract_tag(block: &str, tag: &str) -> Option<String> {
    let open = format!("<{tag}");
    let start = block.find(&open)?;
    let open_end = block[start..].find('>')? + start;
    let content_start = open_end + 1;
    let close = format!("</{tag}>");
    let end = block[content_start..].find(&close)? + content_start;
    Some(decode_entities(&block[content_start..end]))
}

fn parse_feed(category: &str, body: &str) -> Vec<NewsArticle> {
    body.split("<item>")
        .skip(1)
        .take(6)
        .filter_map(|item| {
            let title = extract_tag(item, "title")?;
            if title.is_empty() {
                return None;
            }

            Some(NewsArticle {
                category: category.to_string(),
                title,
                source: extract_tag(item, "source").unwrap_or_else(|| "UNKNOWN SOURCE".to_string()),
                url: extract_tag(item, "link").unwrap_or_default(),
                published: extract_tag(item, "pubDate").unwrap_or_default(),
            })
        })
        .collect()
}

async fn fetch_feed(client: &reqwest::Client, feed: &FeedSpec) -> Result<Vec<NewsArticle>, String> {
    let body = client
        .get(feed.url)
        .send()
        .await
        .map_err(|error| format!("news request failed: {error}"))?
        .error_for_status()
        .map_err(|error| format!("news feed returned an error: {error}"))?
        .text()
        .await
        .map_err(|error| format!("unable to read news feed: {error}"))?;

    let articles = parse_feed(feed.category, &body);

    if articles.is_empty() {
        Err("feed contained no readable articles".to_string())
    } else {
        Ok(articles)
    }
}

#[tauri::command]
pub async fn get_news_intelligence() -> Result<NewsIntelligence, String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 AAMUP-OS-News-Intelligence/0.1")
        .build()
        .map_err(|error| format!("unable to create news client: {error}"))?;

    let mut articles = Vec::new();
    let mut errors = Vec::new();
    let mut feed_count = 0_usize;

    for feed in FEEDS {
        match fetch_feed(&client, feed).await {
            Ok(mut next) => {
                feed_count += 1;
                articles.append(&mut next);
            }
            Err(message) => errors.push(NewsFeedError {
                category: feed.category.to_string(),
                message,
            }),
        }
    }

    if articles.is_empty() {
        return Err(errors
            .first()
            .map(|error| format!("{}: {}", error.category, error.message))
            .unwrap_or_else(|| "no news data returned".to_string()));
    }

    Ok(NewsIntelligence {
        articles,
        errors,
        feed_count,
        source: "Google News RSS".to_string(),
    })
}

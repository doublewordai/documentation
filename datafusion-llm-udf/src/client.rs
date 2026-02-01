use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum LlmError {
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Batch failed: {0}")]
    BatchFailed(String),
    #[error("Batch expired")]
    BatchExpired,
    #[error("Batch cancelled")]
    BatchCancelled,
    #[error("Missing output file")]
    MissingOutputFile,
    #[error("Result not found for request: {0}")]
    ResultNotFound(String),
}

#[derive(Debug, Clone)]
pub struct LlmClient {
    client: Client,
    base_url: String,
    api_key: String,
    model: String,
}

// Request types for batch API
#[derive(Serialize)]
struct BatchRequest {
    custom_id: String,
    method: String,
    url: String,
    body: ChatCompletionRequest,
}

#[derive(Serialize)]
struct ChatCompletionRequest {
    model: String,
    messages: Vec<Message>,
}

#[derive(Serialize)]
struct Message {
    role: String,
    content: String,
}

// Response types
#[derive(Deserialize, Debug)]
struct FileUploadResponse {
    id: String,
}

#[derive(Deserialize, Debug)]
struct BatchResponse {
    id: String,
    status: String,
    output_file_id: Option<String>,
    error_file_id: Option<String>,
}

#[derive(Deserialize, Debug)]
struct BatchResultLine {
    custom_id: String,
    response: Option<BatchResultResponse>,
    error: Option<BatchResultError>,
}

#[derive(Deserialize, Debug)]
struct BatchResultResponse {
    body: ChatCompletionResponse,
}

#[derive(Deserialize, Debug)]
struct BatchResultError {
    message: String,
}

#[derive(Deserialize, Debug)]
struct ChatCompletionResponse {
    choices: Vec<Choice>,
}

#[derive(Deserialize, Debug)]
struct Choice {
    message: MessageResponse,
}

#[derive(Deserialize, Debug)]
struct MessageResponse {
    content: String,
}

impl LlmClient {
    pub fn new(base_url: impl Into<String>, api_key: impl Into<String>, model: impl Into<String>) -> Self {
        Self {
            client: Client::new(),
            base_url: base_url.into(),
            api_key: api_key.into(),
            model: model.into(),
        }
    }

    /// Process multiple (content, prompt) pairs using the batch API
    pub async fn process_batch(
        &self,
        requests: Vec<(String, String)>, // (content, prompt) pairs
    ) -> Result<Vec<String>, LlmError> {
        if requests.is_empty() {
            return Ok(vec![]);
        }

        // Build JSONL content
        let jsonl = self.build_jsonl(&requests)?;

        // Upload file
        let file_id = self.upload_file(&jsonl).await?;

        // Create batch
        let batch_id = self.create_batch(&file_id).await?;

        // Poll until complete
        let output_file_id = self.poll_batch(&batch_id).await?;

        // Download and parse results
        let results = self.download_results(&output_file_id, requests.len()).await?;

        Ok(results)
    }

    fn build_jsonl(&self, requests: &[(String, String)]) -> Result<String, LlmError> {
        let mut lines = Vec::with_capacity(requests.len());

        for (i, (content, prompt)) in requests.iter().enumerate() {
            let user_message = format!("{}\n\nContent:\n{}", prompt, content);

            let batch_req = BatchRequest {
                custom_id: format!("req-{}", i),
                method: "POST".to_string(),
                url: "/v1/chat/completions".to_string(),
                body: ChatCompletionRequest {
                    model: self.model.clone(),
                    messages: vec![Message {
                        role: "user".to_string(),
                        content: user_message,
                    }],
                },
            };

            lines.push(serde_json::to_string(&batch_req)?);
        }

        Ok(lines.join("\n"))
    }

    async fn upload_file(&self, jsonl: &str) -> Result<String, LlmError> {
        let form = reqwest::multipart::Form::new()
            .text("purpose", "batch")
            .part(
                "file",
                reqwest::multipart::Part::text(jsonl.to_string())
                    .file_name("batch_input.jsonl")
                    .mime_str("application/jsonl")
                    .unwrap(),
            );

        let resp: FileUploadResponse = self
            .client
            .post(format!("{}/files", self.base_url))
            .bearer_auth(&self.api_key)
            .multipart(form)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;

        Ok(resp.id)
    }

    async fn create_batch(&self, input_file_id: &str) -> Result<String, LlmError> {
        let body = serde_json::json!({
            "input_file_id": input_file_id,
            "endpoint": "/v1/chat/completions",
            "completion_window": "24h"
        });

        let resp: BatchResponse = self
            .client
            .post(format!("{}/batches", self.base_url))
            .bearer_auth(&self.api_key)
            .json(&body)
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;

        Ok(resp.id)
    }

    async fn poll_batch(&self, batch_id: &str) -> Result<String, LlmError> {
        loop {
            let resp: BatchResponse = self
                .client
                .get(format!("{}/batches/{}", self.base_url, batch_id))
                .bearer_auth(&self.api_key)
                .send()
                .await?
                .error_for_status()?
                .json()
                .await?;

            match resp.status.as_str() {
                "completed" => {
                    return resp.output_file_id.ok_or(LlmError::MissingOutputFile);
                }
                "failed" => {
                    return Err(LlmError::BatchFailed(
                        "Batch processing failed".to_string(),
                    ));
                }
                "expired" => return Err(LlmError::BatchExpired),
                "cancelled" => return Err(LlmError::BatchCancelled),
                // in_progress, validating, finalizing, etc.
                _ => {
                    tokio::time::sleep(Duration::from_secs(2)).await;
                }
            }
        }
    }

    async fn download_results(
        &self,
        file_id: &str,
        expected_count: usize,
    ) -> Result<Vec<String>, LlmError> {
        let content = self
            .client
            .get(format!("{}/files/{}/content", self.base_url, file_id))
            .bearer_auth(&self.api_key)
            .send()
            .await?
            .error_for_status()?
            .text()
            .await?;

        // Parse JSONL results into a map by custom_id
        let mut results_map: HashMap<String, String> = HashMap::new();

        for line in content.lines() {
            if line.trim().is_empty() {
                continue;
            }

            let result: BatchResultLine = serde_json::from_str(line)?;

            let output = if let Some(resp) = result.response {
                resp.body
                    .choices
                    .first()
                    .map(|c| c.message.content.clone())
                    .unwrap_or_default()
            } else if let Some(err) = result.error {
                format!("Error: {}", err.message)
            } else {
                String::new()
            };

            results_map.insert(result.custom_id, output);
        }

        // Reconstruct results in original order
        let mut results = Vec::with_capacity(expected_count);
        for i in 0..expected_count {
            let custom_id = format!("req-{}", i);
            let result = results_map
                .remove(&custom_id)
                .ok_or_else(|| LlmError::ResultNotFound(custom_id))?;
            results.push(result);
        }

        Ok(results)
    }
}

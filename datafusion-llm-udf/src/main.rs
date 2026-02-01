use arrow::array::StringArray;
use arrow::datatypes::{DataType, Field, Schema};
use arrow::record_batch::RecordBatch;
use datafusion::datasource::MemTable;
use datafusion::logical_expr::ScalarUDF;
use datafusion::prelude::*;
use datafusion_llm_udf::{LlmClient, LlmExtractUdf};
use std::sync::Arc;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Configuration from environment
    let api_key = std::env::var("DOUBLEWORD_API_KEY")
        .expect("DOUBLEWORD_API_KEY environment variable must be set");
    let base_url =
        std::env::var("DOUBLEWORD_API_URL").unwrap_or_else(|_| "https://api.doubleword.ai/v1".to_string());
    let model = std::env::var("DOUBLEWORD_MODEL")
        .unwrap_or_else(|_| "meta-llama/Llama-3.3-70B-Instruct".to_string());

    println!("Using API: {}", base_url);
    println!("Using model: {}", model);

    // Create the LLM client
    let client = LlmClient::new(base_url, api_key, model);

    // Create DataFusion session
    let ctx = SessionContext::new();

    // Register the UDF
    let llm_extract = ScalarUDF::from(LlmExtractUdf::new(client));
    ctx.register_udf(llm_extract);

    // Create test data
    let schema = Arc::new(Schema::new(vec![
        Field::new("id", DataType::Int32, false),
        Field::new("content", DataType::Utf8, false),
    ]));

    let content = StringArray::from(vec![
        "Meeting scheduled for January 15th, 2024 at 3pm",
        "The invoice #12345 was issued on 2024-02-20",
        "Project deadline: March 1st, 2024",
    ]);

    let ids = arrow::array::Int32Array::from(vec![1, 2, 3]);

    let batch = RecordBatch::try_new(schema.clone(), vec![Arc::new(ids), Arc::new(content)])?;

    // Register as a table
    let table = MemTable::try_new(schema, vec![vec![batch]])?;
    ctx.register_table("test_table", Arc::new(table))?;

    // Run query with llm_extract UDF
    println!("\nRunning query: SELECT id, llm_extract(content, 'Extract the date from this text. Return only the date in YYYY-MM-DD format.') as extracted_date FROM test_table\n");

    let df = ctx
        .sql("SELECT id, llm_extract(content, 'Extract the date from this text. Return only the date in YYYY-MM-DD format.') as extracted_date FROM test_table")
        .await?;

    // Display results
    df.show().await?;

    Ok(())
}

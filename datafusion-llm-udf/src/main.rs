use arrow::util::pretty::pretty_format_batches;
use clap::Parser;
use datafusion::execution::context::SessionContext;
use datafusion::logical_expr::ScalarUDF;
use datafusion_llm_udf::{LlmClient, LlmExtractUdf};
use rustyline::error::ReadlineError;
use rustyline::DefaultEditor;
use std::path::PathBuf;

#[derive(Parser, Debug)]
#[command(name = "llmql")]
#[command(about = "SQL shell with LLM-powered UDFs via Doubleword batch API")]
#[command(version)]
struct Args {
    /// SQL file to execute (if not provided, starts interactive mode)
    #[arg(short = 'f', long)]
    file: Option<PathBuf>,

    /// Execute SQL statement and exit
    #[arg(short = 'c', long)]
    command: Option<String>,

    /// Data files to load as tables (CSV, Parquet, JSON)
    /// Use name=path syntax to specify table name, or just path to use filename
    #[arg(short = 't', long = "table", value_name = "NAME=PATH")]
    tables: Vec<String>,

    /// API key for Doubleword
    #[arg(long, env = "DOUBLEWORD_API_KEY")]
    api_key: String,

    /// API base URL
    #[arg(long, env = "DOUBLEWORD_API_URL", default_value = "https://api.doubleword.ai/v1")]
    api_url: String,

    /// Model to use
    #[arg(long, env = "DOUBLEWORD_MODEL", default_value = "Qwen/Qwen3-VL-235B-A22B-Instruct-FP8")]
    model: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();

    // Create DataFusion session
    let ctx = SessionContext::new();

    // Register LLM UDF
    let client = LlmClient::new(&args.api_url, &args.api_key, &args.model);
    let llm_extract = ScalarUDF::from(LlmExtractUdf::new(client));
    ctx.register_udf(llm_extract);

    // Load any specified tables
    for table_spec in &args.tables {
        load_table(&ctx, table_spec).await?;
    }

    // Execute based on mode
    if let Some(sql) = args.command {
        // Execute single command
        execute_sql(&ctx, &sql).await?;
    } else if let Some(file) = args.file {
        // Execute SQL file
        let sql = std::fs::read_to_string(&file)?;
        for statement in sql.split(';') {
            let statement = statement.trim();
            if !statement.is_empty() {
                execute_sql(&ctx, statement).await?;
            }
        }
    } else {
        // Interactive mode
        run_repl(&ctx).await?;
    }

    Ok(())
}

async fn load_table(ctx: &SessionContext, spec: &str) -> Result<(), Box<dyn std::error::Error>> {
    let (name, path) = if let Some((name, path)) = spec.split_once('=') {
        (name.to_string(), PathBuf::from(path))
    } else {
        let path = PathBuf::from(spec);
        let name = path
            .file_stem()
            .and_then(|s| s.to_str())
            .ok_or("Invalid file path")?
            .to_string();
        (name, path)
    };

    let path_str = path.to_string_lossy();
    let extension = path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();

    match extension.as_str() {
        "csv" => {
            ctx.register_csv(&name, &path_str, Default::default()).await?;
            eprintln!("Loaded CSV '{}' as table '{}'", path_str, name);
        }
        "parquet" => {
            ctx.register_parquet(&name, &path_str, Default::default()).await?;
            eprintln!("Loaded Parquet '{}' as table '{}'", path_str, name);
        }
        "json" | "jsonl" | "ndjson" => {
            ctx.register_json(&name, &path_str, Default::default()).await?;
            eprintln!("Loaded JSON '{}' as table '{}'", path_str, name);
        }
        _ => {
            return Err(format!("Unsupported file format: {}", extension).into());
        }
    }

    Ok(())
}

async fn execute_sql(ctx: &SessionContext, sql: &str) -> Result<(), Box<dyn std::error::Error>> {
    let df = ctx.sql(sql).await?;
    let batches = df.collect().await?;

    if batches.is_empty() || batches.iter().all(|b| b.num_rows() == 0) {
        println!("OK");
    } else {
        let formatted = pretty_format_batches(&batches)?;
        println!("{}", formatted);
    }

    Ok(())
}

async fn run_repl(ctx: &SessionContext) -> Result<(), Box<dyn std::error::Error>> {
    println!("llmql - SQL shell with LLM UDFs");
    println!("Type .help for commands, .quit to exit\n");

    let mut rl = DefaultEditor::new()?;

    // Load history
    let history_path = dirs::data_local_dir()
        .map(|p| p.join("llmql_history"))
        .unwrap_or_else(|| PathBuf::from(".llmql_history"));
    let _ = rl.load_history(&history_path);

    let mut buffer = String::new();

    loop {
        let prompt = if buffer.is_empty() { "llmql> " } else { "   ...> " };

        match rl.readline(prompt) {
            Ok(line) => {
                let line = line.trim();

                // Handle dot commands
                if buffer.is_empty() && line.starts_with('.') {
                    match handle_dot_command(ctx, line).await {
                        Ok(true) => continue,
                        Ok(false) => break,
                        Err(e) => {
                            eprintln!("Error: {}", e);
                            continue;
                        }
                    }
                }

                buffer.push_str(line);
                buffer.push(' ');

                // Check if statement is complete (ends with semicolon)
                if line.ends_with(';') {
                    let sql = buffer.trim().trim_end_matches(';');
                    if !sql.is_empty() {
                        let _ = rl.add_history_entry(buffer.trim());
                        if let Err(e) = execute_sql(ctx, sql).await {
                            eprintln!("Error: {}", e);
                        }
                    }
                    buffer.clear();
                }
            }
            Err(ReadlineError::Interrupted) => {
                buffer.clear();
                println!("^C");
            }
            Err(ReadlineError::Eof) => {
                println!("Goodbye!");
                break;
            }
            Err(err) => {
                eprintln!("Error: {:?}", err);
                break;
            }
        }
    }

    // Save history
    let _ = rl.save_history(&history_path);

    Ok(())
}

async fn handle_dot_command(
    ctx: &SessionContext,
    cmd: &str,
) -> Result<bool, Box<dyn std::error::Error>> {
    let parts: Vec<&str> = cmd.split_whitespace().collect();
    let command = parts.first().map(|s| s.to_lowercase()).unwrap_or_default();

    match command.as_str() {
        ".quit" | ".exit" | ".q" => Ok(false),
        ".help" | ".h" => {
            println!("Commands:");
            println!("  .help           Show this help");
            println!("  .quit           Exit the shell");
            println!("  .tables         List all tables");
            println!("  .schema <table> Show schema of a table");
            println!("  .load <path>    Load a file as a table");
            println!("  .functions      List available functions");
            println!();
            println!("SQL:");
            println!("  Enter SQL statements ending with semicolon (;)");
            println!("  Multi-line statements are supported");
            println!();
            println!("LLM UDF:");
            println!("  llm_extract(content, prompt) - Process text with LLM");
            println!("  Example: SELECT llm_extract(text, 'summarize') FROM docs;");
            Ok(true)
        }
        ".tables" | ".t" => {
            let df = ctx.sql("SHOW TABLES").await?;
            let batches = df.collect().await?;
            if batches.iter().all(|b| b.num_rows() == 0) {
                println!("No tables loaded");
            } else {
                let formatted = pretty_format_batches(&batches)?;
                println!("{}", formatted);
            }
            Ok(true)
        }
        ".schema" | ".s" => {
            if parts.len() < 2 {
                println!("Usage: .schema <table_name>");
            } else {
                let table = parts[1];
                let df = ctx.sql(&format!("DESCRIBE {}", table)).await?;
                let batches = df.collect().await?;
                let formatted = pretty_format_batches(&batches)?;
                println!("{}", formatted);
            }
            Ok(true)
        }
        ".load" | ".l" => {
            if parts.len() < 2 {
                println!("Usage: .load <path> or .load <name>=<path>");
            } else {
                let spec = parts[1..].join(" ");
                load_table(ctx, &spec).await?;
            }
            Ok(true)
        }
        ".functions" | ".f" => {
            let df = ctx.sql("SHOW FUNCTIONS").await?;
            let batches = df.collect().await?;
            let formatted = pretty_format_batches(&batches)?;
            println!("{}", formatted);
            Ok(true)
        }
        _ => {
            println!("Unknown command: {}. Type .help for available commands.", command);
            Ok(true)
        }
    }
}

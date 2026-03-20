//! Lumo Daemon
//!
//! Receives OTLP telemetry data from Claude Code and stores it in SQLite.

use anyhow::Result;
use clap::{Parser, Subcommand};
use tracing::{error, info};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod handlers;
mod routes;
mod server;
mod services;
mod uninstall;

use config::Config;
use server::{create_app, shutdown_signal, AppState};

#[derive(Parser)]
#[command(name = "lumo-daemon", version, about = "Lumo daemon service")]
struct Cli {
    #[command(subcommand)]
    command: Option<Command>,
}

#[derive(Subcommand)]
enum Command {
    /// Uninstall the daemon: stop service, remove files, optionally delete all data
    Uninstall {
        /// Also delete all user data (~/.lumo/ directory)
        #[arg(long)]
        delete_data: bool,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Some(Command::Uninstall { delete_data }) => {
            // Minimal logging for uninstall
            tracing_subscriber::registry()
                .with(tracing_subscriber::fmt::layer())
                .init();
            uninstall::run(delete_data).await
        }
        None => run_server().await,
    }
}

async fn run_server() -> Result<()> {
    // Load configuration
    let config = Config::from_env()?;
    config.validate()?;

    // Initialize tracing/logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| config.log_level.clone().into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    info!("Starting Lumo Daemon v{}", env!("CARGO_PKG_VERSION"));

    // Initialize database
    let db_path = shared::get_db_path()?;
    info!("Database path: {}", db_path.display());

    let pool = shared::create_pool(&db_path).await?;

    // Run migrations
    info!("Running database migrations...");
    shared::run_migrations(&pool).await?;
    info!("Database migrations completed");

    // Create application state
    let state = AppState::new(pool, config.clone());

    // Create Axum app
    let app = create_app(state);

    // Create TCP listener
    let listener = tokio::net::TcpListener::bind(&config.server_address)
        .await
        .map_err(|e| {
            error!("Failed to bind to {}: {}", config.server_address, e);
            e
        })?;

    info!("Server listening on http://{}", listener.local_addr()?);
    info!("Health check: http://{}/health", listener.local_addr()?);
    info!("OTLP endpoints:");
    info!("  - Metrics: http://{}/v1/metrics", listener.local_addr()?);
    info!("  - Logs:    http://{}/v1/logs", listener.local_addr()?);
    info!("Press Ctrl+C to stop");

    // Run server with graceful shutdown
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    info!("Server shut down gracefully");
    Ok(())
}

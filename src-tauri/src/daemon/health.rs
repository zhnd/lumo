use std::time::Duration;

use serde::Deserialize;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;

const DEFAULT_DAEMON_ADDR: &str = "127.0.0.1:4318";
const HEALTH_TIMEOUT: Duration = Duration::from_secs(2);

fn daemon_addr() -> String {
    std::env::var("LUMO_SERVER_ADDRESS").unwrap_or_else(|_| DEFAULT_DAEMON_ADDR.to_string())
}

#[derive(Debug, Deserialize)]
pub struct HealthResponse {
    #[allow(dead_code)]
    pub status: String,
    pub version: String,
}

/// Send a GET /health request to the daemon and parse the response.
/// Returns None if the daemon is not reachable.
pub async fn check_daemon_health() -> Option<HealthResponse> {
    tokio::time::timeout(HEALTH_TIMEOUT, async {
        let addr = daemon_addr();
        let mut stream = TcpStream::connect(&addr).await.ok()?;

        let request = format!("GET /health HTTP/1.1\r\nHost: {}\r\nConnection: close\r\n\r\n", addr);
        stream.write_all(request.as_bytes()).await.ok()?;

        let mut response = Vec::new();
        stream.read_to_end(&mut response).await.ok()?;

        let response_str = String::from_utf8_lossy(&response);

        // Find JSON body after the blank line
        let body = response_str.split("\r\n\r\n").nth(1)?;

        serde_json::from_str::<HealthResponse>(body).ok()
    })
    .await
    .ok()
    .flatten()
}

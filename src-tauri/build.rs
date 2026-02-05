fn main() {
  // Read daemon version from its Cargo.toml and expose as DAEMON_VERSION env var.
  let daemon_manifest =
    std::fs::read_to_string("../crates/daemon/Cargo.toml").expect("Failed to read daemon Cargo.toml");
  let daemon_version = daemon_manifest
    .parse::<toml::Table>()
    .expect("Failed to parse daemon Cargo.toml")["package"]["version"]
    .as_str()
    .expect("Missing version in daemon Cargo.toml")
    .to_string();

  println!("cargo:rustc-env=DAEMON_VERSION={daemon_version}");
  println!("cargo:rerun-if-changed=../crates/daemon/Cargo.toml");

  tauri_build::build()
}

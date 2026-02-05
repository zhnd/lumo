#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

const releaseType = process.argv[2]
if (!releaseType) {
  console.error('Usage: node bump-version.js <patch|minor|major|prepatch|preminor|premajor|prerelease>')
  process.exit(1)
}

// Read current version from root package.json
const rootPkgPath = path.join(ROOT, 'package.json')
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'))
const oldVersion = rootPkg.version

// Calculate new version
const newVersion = execSync(`semver ${oldVersion} -i ${releaseType}`, {
  encoding: 'utf-8',
}).trim()

if (!newVersion) {
  console.error(`Failed to bump version from "${oldVersion}" using type "${releaseType}"`)
  process.exit(1)
}

console.log(`Bumping version: ${oldVersion} -> ${newVersion}`)

// --- JSON files ---
const jsonFiles = [
  'package.json',
  'packages/ui/package.json',
  'src-tauri/tauri.conf.json',
]

for (const rel of jsonFiles) {
  const abs = path.join(ROOT, rel)
  const json = JSON.parse(fs.readFileSync(abs, 'utf8'))
  json.version = newVersion
  fs.writeFileSync(abs, JSON.stringify(json, null, 2) + '\n')
  console.log(`  Updated ${rel}`)
}

// --- Cargo.toml files (replace version in [package] section) ---
const cargoFiles = [
  'src-tauri/Cargo.toml',
  'crates/daemon/Cargo.toml',
  'crates/shared/Cargo.toml',
]

for (const rel of cargoFiles) {
  const abs = path.join(ROOT, rel)
  let content = fs.readFileSync(abs, 'utf8')

  // Replace the first `version = "..."` (which is in [package])
  const replaced = content.replace(
    /^(version\s*=\s*)"[^"]*"/m,
    `$1"${newVersion}"`
  )

  if (replaced === content) {
    console.error(`  Warning: no version field found in ${rel}`)
    continue
  }

  fs.writeFileSync(abs, replaced)
  console.log(`  Updated ${rel}`)
}

console.log(`\nVersion bumped to ${newVersion}`)

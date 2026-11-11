# Local-only production stack bootstrap.
#
#   ./local-up.ps1
#
# Creates docker/.env once with fresh random secrets, then starts Postgres +
# the published Paperclip image. Later runs reuse the same .env.

# No $ErrorActionPreference = "Stop": docker writes progress to stderr, which
# PowerShell 5.1 turns into a terminating NativeCommandError. Exit codes are
# checked explicitly instead.
Set-Location -LiteralPath $PSScriptRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "docker is not on PATH. Install Docker Desktop first."
}
docker info *> $null
if ($LASTEXITCODE -ne 0) {
  throw "Docker engine is not running. Start Docker Desktop, then re-run this script."
}

function New-HexSecret {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  return -join ($bytes | ForEach-Object { $_.ToString("x2") })
}

if (-not (Test-Path -LiteralPath ".env")) {
  $envText = Get-Content -LiteralPath ".env.example" -Raw
  $envText = $envText -replace "(?m)^BETTER_AUTH_SECRET=.*$", "BETTER_AUTH_SECRET=$(New-HexSecret)"
  $envText = $envText -replace "(?m)^PAPERCLIP_TOOL_ACTION_SIGNING_SECRET=.*$", "PAPERCLIP_TOOL_ACTION_SIGNING_SECRET=$(New-HexSecret)"
  Set-Content -LiteralPath ".env" -Value $envText -NoNewline
  Write-Host "Created docker/.env with new secrets. Keep it - existing sessions depend on it."
}

docker compose -f docker-compose.local.yml up -d --pull always
if ($LASTEXITCODE -ne 0) { throw "docker compose failed." }

Write-Host "Paperclip is starting at http://localhost:3100 (health: /api/health)."

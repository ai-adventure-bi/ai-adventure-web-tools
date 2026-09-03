$ErrorActionPreference = "Stop"
$hubFolder = $PSScriptRoot
Set-Location $hubFolder

Write-Host "AI Adventure Web Tools - GitHub publisher" -ForegroundColor Cyan
Write-Host "Create an empty repository on GitHub first, then copy its HTTPS address."
$repositoryUrl = Read-Host "Paste the repository address (ending in .git)"

if ([string]::IsNullOrWhiteSpace($repositoryUrl) -or $repositoryUrl -notmatch '^https://github\.com/.+/.+(\.git)?$') {
  throw "That does not look like a GitHub HTTPS repository address."
}

if (-not (Test-Path ".git")) {
  git init -b main
}

git add .
$changes = git status --porcelain
if ($changes) {
  $message = Read-Host "Short description of this update"
  if ([string]::IsNullOrWhiteSpace($message)) { $message = "Update teacher web tools" }
  git commit -m $message
}

$hasOrigin = git remote 2>$null | Select-String -SimpleMatch "origin"
if ($hasOrigin) {
  git remote set-url origin $repositoryUrl
} else {
  git remote add origin $repositoryUrl
}

git branch -M main
git push -u origin main

Write-Host "Uploaded successfully." -ForegroundColor Green
Write-Host "On GitHub, open Settings > Pages, choose 'Deploy from a branch', main, and /(root)."
Read-Host "Press Enter to close"


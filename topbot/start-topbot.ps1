$ErrorActionPreference = "Stop"
try {
  Clear-Host
  Write-Host "TOPBOT + HEYOTTO" -ForegroundColor Green
  Write-Host "This window must stay open while TopBot is running.`n"

  $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
  if (-not $nodeCommand) {
    throw "Node.js was not found. Install Node.js from https://nodejs.org and then try again."
  }

  $plainKey = Read-Host "Paste this student's HeyOtto API key (it will briefly be visible)"
  Clear-Host
  Write-Host "TOPBOT + HEYOTTO" -ForegroundColor Green
  Write-Host "This window must stay open while TopBot is running.`n"
  $plainKey = ($plainKey -replace '^\s*Bearer\s+', '') -replace '[^\x21-\x7E]', ''
  $plainKey = $plainKey.Trim([char[]]@(34,39))
  if ([string]::IsNullOrWhiteSpace($plainKey)) {
    throw "No API key was entered."
  }
  $env:HEYOTTO_API_KEY = $plainKey

  Write-Host "`nStarting TopBot..." -ForegroundColor Cyan
  Start-Process powershell.exe -WindowStyle Hidden -ArgumentList "-NoProfile", "-Command", "Start-Sleep -Milliseconds 1200; Start-Process 'http://127.0.0.1:4173'"
  & $nodeCommand.Source "$PSScriptRoot\server.mjs"
  if ($LASTEXITCODE -ne 0) {
    throw "The TopBot server stopped with error code $LASTEXITCODE."
  }
}
catch {
  Write-Host "`nTopBot could not start:" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Yellow
  Write-Host "`nThe window will stay open so you can read this message."
  Read-Host "Press Enter to close"
  exit 1
}
finally {
  Remove-Item Env:HEYOTTO_API_KEY -ErrorAction SilentlyContinue
}

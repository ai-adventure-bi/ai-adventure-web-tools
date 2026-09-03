$ErrorActionPreference = "Stop"

try {
  $hubFolder = $PSScriptRoot
  $quakeFolder = Join-Path $hubFolder "quake-quest"
  $quakeLauncher = Join-Path $quakeFolder "node_modules\vinext\dist\cli.js"
  $codexNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

  if (-not (Test-Path $quakeLauncher)) {
    throw "Quake Quest is missing its node_modules folder."
  }

  $nodeProgram = if (Test-Path $codexNode) { $codexNode } else { (Get-Command "node.exe").Source }

  Write-Host "Starting your teacher tools..." -ForegroundColor Cyan
  $quakeArguments = "--max-old-space-size=4096 `"$quakeLauncher`" dev"
  $quakeProcess = Start-Process -FilePath $nodeProgram -ArgumentList $quakeArguments -WorkingDirectory $quakeFolder -WindowStyle Hidden -PassThru
  $hubProcess = Start-Process -FilePath "python" -ArgumentList @("-m", "http.server", "8080") -WorkingDirectory $hubFolder -WindowStyle Hidden -PassThru

  Write-Host "Waiting for Quake Quest to wake up..." -ForegroundColor Cyan
  $ready = $false
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Seconds 1
    try {
      $hubReady = (Invoke-WebRequest -UseBasicParsing "http://localhost:8080" -TimeoutSec 1).StatusCode -eq 200
      $quakeReady = (Invoke-WebRequest -UseBasicParsing "http://localhost:3000" -TimeoutSec 1).StatusCode -eq 200
      if ($hubReady -and $quakeReady) { $ready = $true; break }
    } catch { }
  }

  if (-not $ready) { throw "Quake Quest did not start within 30 seconds." }

  Start-Process "http://localhost:8080"
  Write-Host "Everything is ready." -ForegroundColor Green
  Write-Host "Keep this window open while using the tools."
  Read-Host "Press Enter when you want to stop"

  Stop-Process -Id $quakeProcess.Id -Force -ErrorAction SilentlyContinue
  Stop-Process -Id $hubProcess.Id -Force -ErrorAction SilentlyContinue
}
catch {
  Write-Host "`nThe tools could not start:" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Yellow
  Write-Host "`nNothing is running automatically."
  Read-Host "Press Enter to close"
  exit 1
}

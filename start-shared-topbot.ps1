$ErrorActionPreference = 'Stop'
try {
  $nodeCommand = Get-Command node.exe -ErrorAction Stop
  Write-Host 'TOPBOT — SHARED SCHOOL TEST' -ForegroundColor Green
  Write-Host 'Run database/001_topbot.sql in your new Supabase project first.'
  $env:SUPABASE_URL = (Read-Host 'Supabase project URL (https://...supabase.co)').Trim().TrimEnd('/')
  if (-not $env:SUPABASE_URL.StartsWith('https://')) { throw 'Use the HTTPS project URL from Supabase.' }
  $databaseKey = Read-Host 'Supabase secret API key (hidden)' -AsSecureString
  $env:SUPABASE_SECRET_KEY = [System.Net.NetworkCredential]::new('', $databaseKey).Password
  $adminCode = Read-Host 'Choose the TopBot admin code (hidden)' -AsSecureString
  $env:TOPBOT_ADMIN_CODE = [System.Net.NetworkCredential]::new('', $adminCode).Password
  if (-not $env:TOPBOT_ADMIN_CODE) { throw 'Choose a non-empty admin code.' }
  $sessionBytes = New-Object byte[] 32
  $random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $random.GetBytes($sessionBytes)
  $random.Dispose()
  $env:TOPBOT_SESSION_SECRET = [Convert]::ToBase64String($sessionBytes)
  Write-Host 'Checking the shared database connection...' -ForegroundColor Cyan
  & $nodeCommand.Source "$PSScriptRoot\server\check-database.mjs"
  if ($LASTEXITCODE -ne 0) { throw 'TopBot has not started. Resolve the connection message above and restart this launcher.' }
  Write-Host 'Open http://127.0.0.1:4173 in each browser. Keep this window open.' -ForegroundColor Cyan
  Write-Host 'Settings are used for this server process only; no keys are saved to files.'
  & $nodeCommand.Source "$PSScriptRoot\topbot\server.mjs"
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Red
} finally {
  foreach ($setting in @('SUPABASE_URL','SUPABASE_SECRET_KEY','TOPBOT_ADMIN_CODE','TOPBOT_SESSION_SECRET')) {
    Remove-Item "Env:$setting" -ErrorAction SilentlyContinue
  }
}

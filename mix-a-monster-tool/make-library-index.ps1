# Creates library/library.json from image files, with no filename convention required.
$imageExtensions = @('.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif')
$names = Get-ChildItem -LiteralPath "$PSScriptRoot/library" -File |
  Where-Object { $imageExtensions -contains $_.Extension.ToLowerInvariant() } |
  Sort-Object Name |
  ForEach-Object { $_.Name }
$json = ConvertTo-Json -InputObject @($names)
Set-Content -LiteralPath "$PSScriptRoot/library/library.json" -Value $json -Encoding utf8
Write-Host "Indexed $($names.Count) image(s) in library/library.json"

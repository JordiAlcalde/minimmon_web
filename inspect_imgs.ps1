[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Drawing

$baseDir = (Get-Location).Path
$dir = Join-Path $baseDir "public\imatges\projectes"
$outDir = Join-Path $baseDir "public\imatges_editorial\post_01_herboristeria"

if (!(Test-Path $outDir)) {
    New-Item -ItemType Directory -Force -Path $outDir | Out-Null
}

Get-ChildItem -Path $dir -Filter "herboristeria_*.jpg" | ForEach-Object {
    $img = [System.Drawing.Image]::FromFile($_.FullName)
    Write-Host "$($_.Name) : $($img.Width)x$($img.Height)"
    $img.Dispose()
}

Add-Type -AssemblyName System.Drawing

$dir = Join-Path (Get-Location) "public\imatges\productes"
$item = Get-ChildItem $dir | Where-Object { $_.Name -like "*finestra*vol.png" }

Write-Host "Found item: $($item.FullName)"
$backup = Join-Path $dir "marc_finestra_nuvol_orig_527x716.png"
if (-not (Test-Path $backup)) {
    Copy-Item $item.FullName $backup
    Write-Host "Backed up to $backup"
}

$bytes = [System.IO.File]::ReadAllBytes($backup)
$ms = New-Object System.IO.MemoryStream($bytes, 0, $bytes.Length)
$bmp = [System.Drawing.Bitmap]::FromStream($ms)

$cropRect = New-Object System.Drawing.Rectangle(25, 32, 454, 643)
$cropped = $bmp.Clone($cropRect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$bmp.Dispose()
$ms.Dispose()

# Save to temp and replace
$tmp = Join-Path $dir "tmp_nuvol.png"
$cropped.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Png)
$cropped.Dispose()

[System.IO.File]::Copy($tmp, $item.FullName, $true)
Remove-Item $tmp
Write-Host "Successfully replaced $($item.Name) with 454x643 cropped version"

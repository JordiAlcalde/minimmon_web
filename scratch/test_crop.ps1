Add-Type -AssemblyName System.Drawing

# Let's inspect cropping
$batecPath = Join-Path (Get-Location) "public\imatges\productes\marc_finestra_batec.png"
$bmp = [System.Drawing.Bitmap]::FromFile($batecPath)
Write-Host "Batec size: $($bmp.Width) x $($bmp.Height)"

# Opaque bounds were X=32..484 (W=453), Y=32..674 (H=643)
# If we crop rectangle X=31, Y=32, W=454, H=643
$cropRect = New-Object System.Drawing.Rectangle(31, 32, 454, 643)
$cropped = $bmp.Clone($cropRect, $bmp.PixelFormat)
Write-Host "Cropped size: $($cropped.Width) x $($cropped.Height)"
$cropped.Dispose()
$bmp.Dispose()

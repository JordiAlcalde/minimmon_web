Add-Type -AssemblyName System.Drawing

$testIn = Join-Path (Get-Location) "public\imatges\productes\marc_finestra_batec.png"
$testOut = Join-Path (Get-Location) "scratch\test_batec_cropped.png"

$bmp = [System.Drawing.Bitmap]::FromFile($testIn)
$cropRect = New-Object System.Drawing.Rectangle(31, 32, 454, 643)
$cropped = $bmp.Clone($cropRect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$cropped.Save($testOut, [System.Drawing.Imaging.ImageFormat]::Png)
$cropped.Dispose()
$bmp.Dispose()

# Analyze testOut
$bmp2 = [System.Drawing.Bitmap]::FromFile($testOut)
Write-Host "Output: $($bmp2.Width) x $($bmp2.Height)"
$pCenter = $bmp2.GetPixel([int]($bmp2.Width/2), [int]($bmp2.Height/2))
$pCorner = $bmp2.GetPixel(10, 10)
Write-Host "Center Alpha: $($pCenter.A)"
Write-Host "Corner Alpha: $($pCorner.A)"
$bmp2.Dispose()

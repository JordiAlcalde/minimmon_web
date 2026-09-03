Add-Type -AssemblyName System.Drawing

$files = @("marc_finestra_onada.png", "marc_finestra_núvol.png", "marc_finestra_batec.png")

foreach ($f in $files) {
    $path = Join-Path (Get-Location) "public\imatges\productes\$f"
    if (-not (Test-Path $path)) {
        # Try getting by wildcard in case of utf8
        $item = Get-ChildItem "public\imatges\productes" | Where-Object { $_.Name -like "*$($f.Substring(0,12))*" }
        $path = $item.FullName
    }
    $bmp = [System.Drawing.Bitmap]::FromFile($path)
    Write-Host "File: $($f) ($($bmp.Width) x $($bmp.Height))"
    
    # Check pixels at corners
    $p00 = $bmp.GetPixel(0, 0)
    $pMid = $bmp.GetPixel([int]($bmp.Width/2), [int]($bmp.Height/2))
    $pEdge = $bmp.GetPixel(10, [int]($bmp.Height/2))
    Write-Host "  (0,0): R=$($p00.R) G=$($p00.G) B=$($p00.B) A=$($p00.A)"
    Write-Host "  (10, mid): R=$($pEdge.R) G=$($pEdge.G) B=$($pEdge.B) A=$($pEdge.A)"
    Write-Host "  Center: R=$($pMid.R) G=$($pMid.G) B=$($pMid.B) A=$($pMid.A)"
    $bmp.Dispose()
}

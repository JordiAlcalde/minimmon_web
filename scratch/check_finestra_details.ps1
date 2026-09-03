Add-Type -AssemblyName System.Drawing

function Check-Image([string]$f) {
    $p = Join-Path "public\imatges\productes" $f
    $bmp = [System.Drawing.Bitmap]::FromFile((Join-Path (Get-Location) $p))
    $w = $bmp.Width
    $h = $bmp.Height
    
    # Check if corners are transparent or opaque
    $topLeft = $bmp.GetPixel(0, 0)
    $center = $bmp.GetPixel([int]($w/2), [int]($h/2))
    
    # Count transparent pixels vs opaque pixels
    $transparent = 0
    $opaque = 0
    $minX = $w; $maxX = 0; $minY = $h; $maxY = 0
    
    for ($y = 0; $y -lt $h; $y += 5) {
        for ($x = 0; $x -lt $w; $x += 5) {
            $px = $bmp.GetPixel($x, $y)
            if ($px.A -lt 50) {
                $transparent++
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            } else {
                $opaque++
            }
        }
    }
    
    $bmp.Dispose()
    Write-Host "$f ($w x $h)"
    Write-Host "  TopLeft Alpha: $($topLeft.A), Center Alpha: $($center.A)"
    Write-Host "  Transp sampled: $transparent, Opaque sampled: $opaque"
    Write-Host "  Transp bounds: X: $minX..$maxX, Y: $minY..$maxY"
}

Check-Image "marc_finestra_onada.png"
Check-Image "marc_finestra_onada_foto.png"
Check-Image "marc_finestra_núvol.png"
Check-Image "marc_finestra_batec.png"

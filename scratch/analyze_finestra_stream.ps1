Add-Type -AssemblyName System.Drawing

function Analyze-Stream([string]$f) {
    $path = Join-Path "public\imatges\productes" $f
    $bytes = [System.IO.File]::ReadAllBytes($path)
    $ms = New-Object System.IO.MemoryStream($bytes, 0, $bytes.Length)
    $bmp = [System.Drawing.Bitmap]::FromStream($ms)
    $w = $bmp.Width
    $h = $bmp.Height
    
    $minX = $w; $maxX = 0; $minY = $h; $maxY = 0
    $transp = 0; $opaque = 0
    
    for ($y = 0; $y -lt $h; $y += 2) {
        for ($x = 0; $x -lt $w; $x += 2) {
            $p = $bmp.GetPixel($x, $y)
            if ($p.A -lt 30) {
                $transp++
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
    $ms.Dispose()
    
    Write-Host "$f ($w x $h):"
    Write-Host "  Transp pixels sampled: $transp, Opaque sampled: $opaque"
    Write-Host "  Transp box: X=$minX..$maxX (W=$($maxX - $minX + 1)), Y=$minY..$maxY (H=$($maxY - $minY + 1))"
    Write-Host "  Margins: Left=$minX, Right=$($w - 1 - $maxX), Top=$minY, Bottom=$($h - 1 - $maxY)"
}

Analyze-Stream "marc_finestra_onada.png"
Analyze-Stream "marc_finestra_núvol.png"
Analyze-Stream "marc_finestra_batec.png"

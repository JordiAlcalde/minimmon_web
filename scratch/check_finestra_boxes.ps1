Add-Type -AssemblyName System.Drawing

$files = Get-ChildItem "public\imatges\productes\*finestra*.png"

foreach ($file in $files) {
    $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
    $ms = New-Object System.IO.MemoryStream($bytes, 0, $bytes.Length)
    $bmp = [System.Drawing.Bitmap]::FromStream($ms)
    $w = $bmp.Width
    $h = $bmp.Height
    
    # Check bounding box of OPAQUE pixels (the frame itself)
    $minOpX = $w; $maxOpX = 0; $minOpY = $h; $maxOpY = 0
    $minTrX = $w; $maxTrX = 0; $minTrY = $h; $maxTrY = 0
    $transp = 0; $opaque = 0
    
    for ($y = 0; $y -lt $h; $y += 2) {
        for ($x = 0; $x -lt $w; $x += 2) {
            $p = $bmp.GetPixel($x, $y)
            if ($p.A -lt 30) {
                $transp++
                if ($x -lt $minTrX) { $minTrX = $x }
                if ($x -gt $maxTrX) { $maxTrX = $x }
                if ($y -lt $minTrY) { $minTrY = $y }
                if ($y -gt $maxTrY) { $maxTrY = $y }
            } else {
                $opaque++
                if ($x -lt $minOpX) { $minOpX = $x }
                if ($x -gt $maxOpX) { $maxOpX = $x }
                if ($y -lt $minOpY) { $minOpY = $y }
                if ($y -gt $maxOpY) { $maxOpY = $y }
            }
        }
    }
    $bmp.Dispose()
    $ms.Dispose()
    
    Write-Host "$($file.Name) ($w x $h):"
    Write-Host "  Opaque sample: $opaque, Transp sample: $transp"
    Write-Host "  Opaque box (Frame): X=$minOpX..$maxOpX (W=$($maxOpX - $minOpX + 1)), Y=$minOpY..$maxOpY (H=$($maxOpY - $minOpY + 1))"
    Write-Host "  Transp box: X=$minTrX..$maxTrX, Y=$minTrY..$maxTrY"
}

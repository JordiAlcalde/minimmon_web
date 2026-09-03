Add-Type -AssemblyName System.Drawing

function Analyze-Png([string]$filePath) {
    $bmp = [System.Drawing.Bitmap]::FromFile($filePath)
    $w = $bmp.Width
    $h = $bmp.Height
    
    $minX = $w
    $maxX = 0
    $minY = $h
    $maxY = 0
    $transparentCount = 0
    $opaqueCount = 0

    for ($y = 0; $y -lt $h; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            $pixel = $bmp.GetPixel($x, $y)
            if ($pixel.A -lt 30) {
                $transparentCount++
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            } else {
                $opaqueCount++
            }
        }
    }
    
    $bmp.Dispose()
    
    $innerW = if ($maxX -ge $minX) { $maxX - $minX + 1 } else { 0 }
    $innerH = if ($maxY -ge $minY) { $maxY - $minY + 1 } else { 0 }
    $ratio = if ($h -gt 0) { [math]::Round($w / $h, 4) } else { 0 }
    $innerRatio = if ($innerH -gt 0) { [math]::Round($innerW / $innerH, 4) } else { 0 }

    return [PSCustomObject]@{
        File = [System.IO.Path]::GetFileName($filePath)
        Width = $w
        Height = $h
        TotalRatio = $ratio
        TransparentPixels = $transparentCount
        OpaquePixels = $opaqueCount
        InnerMinX = $minX
        InnerMaxX = $maxX
        InnerMinY = $minY
        InnerMaxY = $maxY
        InnerWidth = $innerW
        InnerHeight = $innerH
        InnerRatio = $innerRatio
        MarginL = $minX
        MarginR = ($w - 1 - $maxX)
        MarginT = $minY
        MarginB = ($h - 1 - $maxY)
    }
}

$dir = Join-Path (Get-Location) "public\imatges\productes"
$files = Get-ChildItem -Path $dir -Filter "*finestra*.png"

foreach ($fileItem in $files) {
    $res = Analyze-Png $fileItem.FullName
    Write-Host "$($res.File.PadRight(35)) -> Total: $($res.Width)x$($res.Height) | Inner: $($res.InnerWidth)x$($res.InnerHeight) | Margins: L=$($res.MarginL) R=$($res.MarginR) T=$($res.MarginT) B=$($res.MarginB) | Transp: $($res.TransparentPixels) | Opaque: $($res.OpaquePixels)"
}

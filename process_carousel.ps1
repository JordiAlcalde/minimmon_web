[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Drawing

$baseDir = (Get-Location).Path
$srcDir = Join-Path $baseDir "public\imatges\projectes"
$outDir = Join-Path $baseDir "public\imatges_editorial\post_01_herboristeria"

function Process-Carousel-Image {
    param (
        [string]$fileName,
        [string]$outputName,
        [int]$rotateAngle,
        [float]$cropLeftPct,
        [float]$cropTopPct,
        [float]$cropWidthPct,
        [float]$cropHeightPct,
        [int]$targetWidth = 1080,
        [int]$targetHeight = 1080
    )

    $srcPath = Join-Path $srcDir $fileName
    $destPath = Join-Path $outDir $outputName

    $origImg = [System.Drawing.Image]::FromFile($srcPath)
    
    if ($rotateAngle -eq 90) {
        $origImg.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone)
    } elseif ($rotateAngle -eq 270) {
        $origImg.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone)
    } elseif ($rotateAngle -eq 180) {
        $origImg.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone)
    }

    $w = $origImg.Width
    $h = $origImg.Height

    $srcX = [int]($w * $cropLeftPct)
    $srcY = [int]($h * $cropTopPct)
    $srcW = [int]($w * $cropWidthPct)
    $srcH = [int]($h * $cropHeightPct)

    if ($srcX + $srcW -gt $w) { $srcW = $w - $srcX }
    if ($srcY + $srcH -gt $h) { $srcH = $h - $srcY }

    $cropRect = New-Object System.Drawing.Rectangle($srcX, $srcY, $srcW, $srcH)
    $destRect = New-Object System.Drawing.Rectangle(0, 0, $targetWidth, $targetHeight)

    $bmp = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $g.DrawImage($origImg, $destRect, $cropRect, [System.Drawing.GraphicsUnit]::Pixel)

    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]95)

    $bmp.Save($destPath, $codec, $encoderParams)

    $g.Dispose()
    $bmp.Dispose()
    $origImg.Dispose()

    Write-Host "Generat correctament: $outputName"
}

# Diapo 1: Gir 90 graus (la façana queda dreta amunt)
Process-Carousel-Image -fileName "herboristeria_08.jpg" -outputName "diapo_01_facana.jpg" -rotateAngle 90 -cropLeftPct 0.05 -cropTopPct 0.15 -cropWidthPct 0.90 -cropHeightPct 0.68

# Diapo 2: Gir 90 graus (la calaixera queda amb les potes a baix i els calaixos a dalt)
Process-Carousel-Image -fileName "herboristeria_05.jpg" -outputName "diapo_02_calaixera_herbes.jpg" -rotateAngle 90 -cropLeftPct 0.06 -cropTopPct 0.12 -cropWidthPct 0.88 -cropHeightPct 0.66

# Diapo 3: Gir 90 graus (els flascons pengen amunt sobre el mostrador i el gravat queda dret)
Process-Carousel-Image -fileName "herboristeria_07.jpg" -outputName "diapo_03_flascons_aroma.jpg" -rotateAngle 90 -cropLeftPct 0.05 -cropTopPct 0.16 -cropWidthPct 0.90 -cropHeightPct 0.68

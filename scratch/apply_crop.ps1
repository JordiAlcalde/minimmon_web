Add-Type -AssemblyName System.Drawing

function Crop-Frame([string]$fileName, [int]$x, [int]$y, [int]$w, [int]$h) {
    $dir = Join-Path (Get-Location) "public\imatges\productes"
    $target = Join-Path $dir $fileName
    
    # If not found directly due to utf8 encoding, find by wildcards
    if (-not (Test-Path $target)) {
        $prefix = $fileName.Substring(0, 12)
        $item = Get-ChildItem $dir | Where-Object { $_.Name -like "$prefix*" }
        $target = $item.FullName
    }
    
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($target)
    $backup = Join-Path $dir "$($baseName)_orig_527x716.png"
    
    if (-not (Test-Path $backup)) {
        Copy-Item $target $backup
        Write-Host "Backed up $fileName to $backup"
    }
    
    $bytes = [System.IO.File]::ReadAllBytes($backup)
    $ms = New-Object System.IO.MemoryStream($bytes, 0, $bytes.Length)
    $bmp = [System.Drawing.Bitmap]::FromStream($ms)
    
    $cropRect = New-Object System.Drawing.Rectangle($x, $y, $w, $h)
    $cropped = $bmp.Clone($cropRect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    
    $bmp.Dispose()
    $ms.Dispose()
    
    $cropped.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
    $cropped.Dispose()
    
    Write-Host "Cropped $fileName to $($w)x$($h)"
}

Crop-Frame "marc_finestra_batec.png" 31 32 454 643
Crop-Frame "marc_finestra_núvol.png" 25 32 454 643

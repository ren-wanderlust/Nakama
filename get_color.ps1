Add-Type -AssemblyName System.Drawing
$image = [System.Drawing.Bitmap]::FromFile("c:\Users\renta\OneDrive\デスクトップ\BizYouApp\Bizyou\assets\pogg_logo_header.png")
$color = $image.GetPixel(0, 0)
Write-Output "$($color.R),$($color.G),$($color.B)"
$image.Dispose()

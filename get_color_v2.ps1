try {
    Add-Type -AssemblyName System.Drawing
    $files = Get-ChildItem -Path "assets" -Filter "pogg_logo_header.png" -Recurse
    if ($files.Count -eq 0) {
        Write-Error "File not found"
        exit 1
    }
    $path = $files[0].FullName
    $image = [System.Drawing.Bitmap]::FromFile($path)
    $color = $image.GetPixel(0, 0)
    Write-Output "$($color.R),$($color.G),$($color.B)"
    $image.Dispose()
} catch {
    Write-Error $_
}

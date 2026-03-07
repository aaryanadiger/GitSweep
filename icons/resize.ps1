Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('C:\Cool shit\GitSweep\icons\Whisk_emyjz2yygjz2ygmk1ymwatytazyhrtllvjm50iy-removebg-preview.png')
foreach ($size in @(16, 48, 128)) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, $size, $size)
    $g.Dispose()
    $savePath = 'C:\Cool shit\GitSweep\icons\icon' + $size + '.png'
    $bmp.Save($savePath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}
$img.Dispose()
Write-Host "Icons generated successfully"

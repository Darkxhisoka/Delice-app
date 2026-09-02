const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const psScript = `
Add-Type -AssemblyName System.Drawing
$srcPath = '${path.resolve('src/assets/images/delice_patisserie_logo_1785935126990.jpg').replace(/\\/g, '\\\\')}'
$destIco = '${path.resolve('electron/assets/appIcon.ico').replace(/\\/g, '\\\\')}'
$destPng = '${path.resolve('electron/assets/appIcon.png').replace(/\\/g, '\\\\')}'

$srcBmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$srcBmp.Save($destPng, [System.Drawing.Imaging.ImageFormat]::Png)

$sizes = @(16, 24, 32, 48, 64, 128, 256)
$pngBytesList = @()

foreach ($s in $sizes) {
    $resized = New-Object System.Drawing.Bitmap($s, $s)
    $g = [System.Drawing.Graphics]::FromImage($resized)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($srcBmp, 0, 0, $s, $s)
    $g.Dispose()

    $ms = New-Object System.IO.MemoryStream
    $resized.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $resized.Dispose()
    $pngBytesList += ,$ms.ToArray()
    $ms.Dispose()
}
$srcBmp.Dispose()

$fs = [System.IO.File]::Create($destIco)
$bw = New-Object System.IO.BinaryWriter($fs)

$bw.Write([uint16]0)
$bw.Write([uint16]1)
$bw.Write([uint16]$sizes.Count)

$offset = 6 + (16 * $sizes.Count)

for ($i = 0; $i -lt $sizes.Count; $i++) {
    $s = $sizes[$i]
    $bytes = $pngBytesList[$i]

    $bw.Write([byte]$(if ($s -ge 256) { 0 } else { $s }))
    $bw.Write([byte]$(if ($s -ge 256) { 0 } else { $s }))
    $bw.Write([byte]0)
    $bw.Write([byte]0)
    $bw.Write([uint16]1)
    $bw.Write([uint16]32)
    $bw.Write([uint32]$bytes.Length)
    $bw.Write([uint32]$offset)

    $offset += $bytes.Length
}

for ($i = 0; $i -lt $sizes.Count; $i++) {
    $bw.Write($pngBytesList[$i])
}

$bw.Close()
$fs.Close()
Write-Output 'Success'
`;

fs.writeFileSync(path.resolve('electron/make_icon.ps1'), psScript);
const output = execSync('powershell.exe -ExecutionPolicy Bypass -File "' + path.resolve('electron/make_icon.ps1') + '"');
console.log('Result:', output.toString());

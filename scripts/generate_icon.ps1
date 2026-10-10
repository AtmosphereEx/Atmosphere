Add-Type -AssemblyName System.Drawing

function Create-PulseBitmap([int]$size) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $scale = [float]($size / 256.0)

    # 1. Background rounded squircle
    $pad = [float](12.0 * $scale)
    $rectW = [float]($size - (2.0 * $pad))
    $radius = [float](48.0 * $scale)

    $bgPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $bgPath.AddArc($pad, $pad, [float]($radius * 2), [float]($radius * 2), 180, 90)
    $bgPath.AddArc([float]($pad + $rectW - ($radius * 2)), $pad, [float]($radius * 2), [float]($radius * 2), 270, 90)
    $bgPath.AddArc([float]($pad + $rectW - ($radius * 2)), [float]($pad + $rectW - ($radius * 2)), [float]($radius * 2), [float]($radius * 2), 0, 90)
    $bgPath.AddArc($pad, [float]($pad + $rectW - ($radius * 2)), [float]($radius * 2), [float]($radius * 2), 90, 90)
    $bgPath.CloseFigure()

    # Dark background gradient
    $pt1 = New-Object System.Drawing.PointF 0.0, 0.0
    $pt2 = New-Object System.Drawing.PointF ([float]$size), ([float]$size)
    $cBg1 = [System.Drawing.Color]::FromArgb(255, 12, 18, 28)
    $cBg2 = [System.Drawing.Color]::FromArgb(255, 5, 8, 14)
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $pt1, $pt2, $cBg1, $cBg2
    $g.FillPath($bgBrush, $bgPath)
    $bgBrush.Dispose()

    # Border gradient (Emerald to Cyan)
    $cBorder1 = [System.Drawing.Color]::FromArgb(240, 16, 185, 129)
    $cBorder2 = [System.Drawing.Color]::FromArgb(240, 6, 182, 212)
    $borderBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $pt1, $pt2, $cBorder1, $cBorder2
    $borderPen = New-Object System.Drawing.Pen $borderBrush, [float](7.0 * $scale)
    $g.DrawPath($borderPen, $bgPath)
    $borderPen.Dispose()
    $borderBrush.Dispose()

    # Subtle radial glow in center
    $centerGlowBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush $bgPath
    $centerGlowBrush.CenterColor = [System.Drawing.Color]::FromArgb(40, 16, 185, 129)
    $centerGlowBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 5, 8, 14))
    $g.FillPath($centerGlowBrush, $bgPath)
    $centerGlowBrush.Dispose()

    # 2. Pulse Waveform Points
    $rawPoints = [System.Drawing.PointF[]]@(
        (New-Object System.Drawing.PointF ([float](36.0 * $scale)), ([float](128.0 * $scale))),
        (New-Object System.Drawing.PointF ([float](76.0 * $scale)), ([float](128.0 * $scale))),
        (New-Object System.Drawing.PointF ([float](94.0 * $scale)), ([float](146.0 * $scale))),
        (New-Object System.Drawing.PointF ([float](118.0 * $scale)), ([float](56.0 * $scale))),
        (New-Object System.Drawing.PointF ([float](142.0 * $scale)), ([float](200.0 * $scale))),
        (New-Object System.Drawing.PointF ([float](166.0 * $scale)), ([float](94.0 * $scale))),
        (New-Object System.Drawing.PointF ([float](182.0 * $scale)), ([float](136.0 * $scale))),
        (New-Object System.Drawing.PointF ([float](220.0 * $scale)), ([float](128.0 * $scale)))
    )

    # Outer glow behind pulse line
    $glowPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(65, 16, 185, 129)), [float](22.0 * $scale)
    $glowPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $glowPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $glowPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $g.DrawLines($glowPen, $rawPoints)
    $glowPen.Dispose()

    # Secondary glow
    $glowPen2 = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(110, 6, 182, 212)), [float](13.0 * $scale)
    $glowPen2.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $glowPen2.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $glowPen2.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $g.DrawLines($glowPen2, $rawPoints)
    $glowPen2.Dispose()

    # Main foreground pulse line with bright gradient
    $ptLine1 = New-Object System.Drawing.PointF 0.0, 0.0
    $ptLine2 = New-Object System.Drawing.PointF ([float]$size), 0.0
    $cP1 = [System.Drawing.Color]::FromArgb(255, 52, 211, 153)
    $cP2 = [System.Drawing.Color]::FromArgb(255, 56, 189, 248)
    $pulseBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $ptLine1, $ptLine2, $cP1, $cP2
    $mainPen = New-Object System.Drawing.Pen $pulseBrush, [float](8.5 * $scale)
    $mainPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $mainPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $mainPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $g.DrawLines($mainPen, $rawPoints)
    $mainPen.Dispose()
    $pulseBrush.Dispose()

    # Glowing dots at end nodes
    $dotBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 240, 253, 250))
    $dotR = [float](4.5 * $scale)
    $g.FillEllipse($dotBrush, [float](36.0 * $scale - $dotR), [float](128.0 * $scale - $dotR), [float]($dotR * 2), [float]($dotR * 2))
    $g.FillEllipse($dotBrush, [float](220.0 * $scale - $dotR), [float](128.0 * $scale - $dotR), [float]($dotR * 2), [float]($dotR * 2))

    # Peak highlight dot
    $peakR = [float](5.0 * $scale)
    $g.FillEllipse($dotBrush, [float](118.0 * $scale - $peakR), [float](56.0 * $scale - $peakR), [float]($peakR * 2), [float]($peakR * 2))
    $dotBrush.Dispose()

    $bgPath.Dispose()
    $g.Dispose()
    return $bmp
}

# Generate PNGs and multi-res ICO
$sizes = @(256, 128, 64, 48, 32, 16)
$pngStreams = @()

foreach ($s in $sizes) {
    $bmp = Create-PulseBitmap $s
    if ($s -eq 256) {
        $bmp.Save("assets\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
        if (Test-Path "dist") {
            $bmp.Save("dist\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
        }
    }
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $pngStreams += $ms
}

# Write multi-res ICO file
$fs = [System.IO.File]::Create("assets\icon.ico")
$bw = New-Object System.IO.BinaryWriter $fs

# ICONDIR header
$bw.Write([uint16]0) # Reserved
$bw.Write([uint16]1) # Type: 1 = ICO
$bw.Write([uint16]$sizes.Length) # Image count

$offset = 6 + ($sizes.Length * 16)

for ($i = 0; $i -lt $sizes.Length; $i++) {
    $s = $sizes[$i]
    $dataLen = [uint32]$pngStreams[$i].Length
    
    # ICONDIRENTRY
    $bw.Write([byte]($s -band 0xFF)) # Width (0 = 256)
    $bw.Write([byte]($s -band 0xFF)) # Height (0 = 256)
    $bw.Write([byte]0)               # Color count
    $bw.Write([byte]0)               # Reserved
    $bw.Write([uint16]1)             # Color planes
    $bw.Write([uint16]32)            # Bits per pixel
    $bw.Write([uint32]$dataLen)      # Size of image data
    $bw.Write([uint32]$offset)       # Offset of image data
    
    $offset += $dataLen
}

# Write PNG byte payloads
for ($i = 0; $i -lt $sizes.Length; $i++) {
    $bytes = $pngStreams[$i].ToArray()
    $bw.Write($bytes)
    $pngStreams[$i].Dispose()
}

$bw.Flush()
$bw.Close()
$fs.Close()

Write-Output "Successfully generated assets\icon.ico and assets\icon.png"

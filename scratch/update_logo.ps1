$srcPath = "C:\Users\atifa\.gemini\antigravity-ide\brain\c09e2f1d-799a-43ba-9a0c-8344b9ca2912\fixed_dairy_logo_1781363892384.png"
$destAppIcon = "c:\GitDairy\DairyWeb\public\icons\dairy_app_icon.png"
$dest512 = "c:\GitDairy\DairyWeb\public\icons\icon-512x512.png"
$dest192 = "c:\GitDairy\DairyWeb\public\icons\icon-192x192.png"

# Copy 512x512 images
Copy-Item -Path $srcPath -Destination $destAppIcon -Force
Copy-Item -Path $srcPath -Destination $dest512 -Force

# Resize for 192x192 image
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile($srcPath)
$dst = New-Object System.Drawing.Bitmap(192, 192)
$g = [System.Drawing.Graphics]::FromImage($dst)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($src, 0, 0, 192, 192)
$g.Dispose()

# Save the resized image
$dst.Save($dest192, [System.Drawing.Imaging.ImageFormat]::Png)
$dst.Dispose()
$src.Dispose()

Write-Output "Logo files successfully updated and resized!"

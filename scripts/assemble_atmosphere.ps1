$src = 'C:\Users\user\Desktop\happ-client'
$dst = 'C:\Users\user\Desktop\AtmosphereEx'

if (!(Test-Path $dst)) { New-Item -ItemType Directory -Path $dst -Force | Out-Null }
if (!(Test-Path "$dst\bin")) { New-Item -ItemType Directory -Path "$dst\bin" -Force | Out-Null }
if (!(Test-Path "$dst\assets")) { New-Item -ItemType Directory -Path "$dst\assets" -Force | Out-Null }
if (!(Test-Path "$dst\dist")) { New-Item -ItemType Directory -Path "$dst\dist" -Force | Out-Null }

Copy-Item "$src\AtmosphereEx.exe" "$dst\AtmosphereEx.exe" -Force
Copy-Item "$src\Microsoft.Web.WebView2.Core.dll" "$dst\Microsoft.Web.WebView2.Core.dll" -Force
Copy-Item "$src\Microsoft.Web.WebView2.WinForms.dll" "$dst\Microsoft.Web.WebView2.WinForms.dll" -Force
Copy-Item "$src\WebView2Loader.dll" "$dst\WebView2Loader.dll" -Force

Copy-Item "$src\assets\*" "$dst\assets" -Recurse -Force
Copy-Item "$src\dist\*" "$dst\dist" -Recurse -Force

Copy-Item "$src\bin\sing-box.exe" "$dst\bin\sing-box.exe" -Force
Copy-Item "$src\bin\xray.exe" "$dst\bin\xray.exe" -Force
Copy-Item "$src\bin\wintun.dll" "$dst\bin\wintun.dll" -Force
if (Test-Path "$src\bin\geoip.dat") { Copy-Item "$src\bin\geoip.dat" "$dst\bin\geoip.dat" -Force }
if (Test-Path "$src\bin\geosite.dat") { Copy-Item "$src\bin\geosite.dat" "$dst\bin\geosite.dat" -Force }

Write-Host "AtmosphereEx assembly completed successfully!"

$ErrorActionPreference = "Stop"

$happDir = (Resolve-Path "$PSScriptRoot\..").Path
$desktop = [Environment]::GetFolderPath([Environment+SpecialFolder]::Desktop)
$zipPath = "$env:TEMP\atmosphere-data.zip"
$wvSetup = "C:\Users\user\Downloads\MicrosoftEdgeWebview2Setup.exe"
$outInstaller = "$desktop\AtmosphereEx-Setup.exe"

# Stop AtmosphereEx if running
Stop-Process -Name AtmosphereEx -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 500

Write-Host "Creating atmosphere-data.zip payload..."
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

# Create a clean staging folder
$staging = "$env:TEMP\atmosphere-staging"
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging | Out-Null

# Copy release files to staging
Copy-Item "$happDir\AtmosphereEx.exe" "$staging\" -Force
Copy-Item "$happDir\Microsoft.Web.WebView2.Core.dll" "$staging\" -Force
Copy-Item "$happDir\Microsoft.Web.WebView2.WinForms.dll" "$staging\" -Force
Copy-Item "$happDir\WebView2Loader.dll" "$staging\" -Force

Copy-Item "$happDir\assets" "$staging\assets" -Recurse -Force
Copy-Item "$happDir\bin" "$staging\bin" -Recurse -Force
Copy-Item "$happDir\dist" "$staging\dist" -Recurse -Force

# Zip staging folder into atmosphere-data.zip
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($staging, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)
Remove-Item $staging -Recurse -Force

$zipSize = (Get-Item $zipPath).Length / 1MB
Write-Host ("atmosphere-data.zip created successfully: {0:N2} MB" -f $zipSize)

# Compile AtmosphereEx-Setup.exe
Write-Host "Compiling AtmosphereEx-Setup.exe with csc.exe..."
$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$icon = "$happDir\assets\icon.ico"
$src = "$happDir\scripts\AtmosphereInstaller.cs"

$compileArgs = @(
    "/target:winexe",
    "/out:$outInstaller",
    "/win32icon:$icon",
    "/reference:System.Windows.Forms.dll,System.Drawing.dll,System.IO.Compression.dll,System.IO.Compression.FileSystem.dll",
    "/resource:$zipPath,atmosphere-data.zip"
)

if (Test-Path $wvSetup) {
    $compileArgs += "/resource:$wvSetup,MicrosoftEdgeWebview2Setup.exe"
}

$compileArgs += "$src"

& $csc $compileArgs

if ($LASTEXITCODE -eq 0 -and (Test-Path $outInstaller)) {
    $instSize = (Get-Item $outInstaller).Length / 1MB
    Write-Host ("AtmosphereEx-Setup.exe successfully compiled on Desktop: {0:N2} MB" -f $instSize)
} else {
    Write-Error "Compilation of AtmosphereEx-Setup.exe failed!"
}

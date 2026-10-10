$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut('C:\Users\user\Desktop\AtmosphereEx.lnk')
$Shortcut.TargetPath = 'C:\Program Files\AtmosphereEx\AtmosphereEx.exe'
$Shortcut.WorkingDirectory = 'C:\Program Files\AtmosphereEx'
$Shortcut.IconLocation = 'C:\Program Files\AtmosphereEx\AtmosphereEx.exe,0'
$Shortcut.Description = 'AtmosphereEx - Next-Gen Proxy & Tunnel Suite'
$Shortcut.Save()
Write-Host "AtmosphereEx shortcut created successfully on Desktop!"

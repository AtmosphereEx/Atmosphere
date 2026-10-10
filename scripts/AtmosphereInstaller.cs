using System;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Principal;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Win32;

namespace AtmosphereInstaller
{
    static class Program
    {
        private static bool IsAdministrator()
        {
            try
            {
                var identity = WindowsIdentity.GetCurrent();
                var principal = new WindowsPrincipal(identity);
                return principal.IsInRole(WindowsBuiltInRole.Administrator);
            }
            catch { return false; }
        }

        [STAThread]
        static void Main()
        {
            if (!IsAdministrator())
            {
                ProcessStartInfo elevate = new ProcessStartInfo
                {
                    FileName = Application.ExecutablePath,
                    UseShellExecute = true,
                    Verb = "runas"
                };
                try
                {
                    Process.Start(elevate);
                    return;
                }
                catch { return; }
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new InstallerForm());
        }
    }

    public class InstallerForm : Form
    {
        [DllImport("dwmapi.dll", PreserveSig = true)]
        private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

        private Label lblTitle;
        private Label lblSubtitle;
        private Label lblPath;
        private TextBox txtPath;
        private Button btnBrowse;
        private CheckBox chkDesktopShortcut;
        private CheckBox chkStartMenuShortcut;
        private CheckBox chkInstallWebView2;
        private CheckBox chkLaunchAfter;
        private ProgressBar progressBar;
        private Label lblStatus;
        private Button btnInstall;
        private Button btnCancel;
        private Panel pnlHeader;

        private bool isFinished = false;

        public InstallerForm()
        {
            InitializeComponent();
        }

        private void InitializeComponent()
        {
            this.Text = "Установка AtmosphereEx";
            this.ClientSize = new Size(520, 480);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(11, 15, 23);
            this.ForeColor = Color.White;
            this.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);

            try
            {
                int darkMode = 1;
                DwmSetWindowAttribute(this.Handle, 20, ref darkMode, sizeof(int));
                DwmSetWindowAttribute(this.Handle, 19, ref darkMode, sizeof(int));
            }
            catch { }

            try
            {
                this.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            }
            catch { }

            // Header Banner
            pnlHeader = new Panel
            {
                Dock = DockStyle.Top,
                Height = 85,
                BackColor = Color.FromArgb(15, 23, 38)
            };
            this.Controls.Add(pnlHeader);

            lblTitle = new Label
            {
                Text = "AtmosphereEx v1.0.0",
                Font = new Font("Segoe UI", 15f, FontStyle.Bold),
                ForeColor = Color.White,
                Location = new Point(24, 16),
                AutoSize = true
            };
            pnlHeader.Controls.Add(lblTitle);

            lblSubtitle = new Label
            {
                Text = "Мастер быстрой установки клиента и компонентов защиты",
                Font = new Font("Segoe UI", 9.5f, FontStyle.Regular),
                ForeColor = Color.FromArgb(148, 163, 184),
                Location = new Point(25, 48),
                AutoSize = true
            };
            pnlHeader.Controls.Add(lblSubtitle);

            // Path Selector
            lblPath = new Label
            {
                Text = "Папка установки:",
                ForeColor = Color.FromArgb(209, 213, 219),
                Location = new Point(24, 105),
                AutoSize = true
            };
            this.Controls.Add(lblPath);

            string defaultDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "AtmosphereEx");
            txtPath = new TextBox
            {
                Text = defaultDir,
                Location = new Point(26, 130),
                Width = 360,
                BackColor = Color.FromArgb(18, 24, 38),
                ForeColor = Color.White,
                BorderStyle = BorderStyle.FixedSingle
            };
            this.Controls.Add(txtPath);

            btnBrowse = new Button
            {
                Text = "Обзор...",
                Location = new Point(396, 128),
                Width = 96,
                Height = 27,
                BackColor = Color.FromArgb(30, 41, 59),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat
            };
            btnBrowse.FlatAppearance.BorderColor = Color.FromArgb(51, 65, 85);
            btnBrowse.Click += (s, e) =>
            {
                using (var fbd = new FolderBrowserDialog())
                {
                    fbd.SelectedPath = txtPath.Text;
                    if (fbd.ShowDialog() == DialogResult.OK)
                    {
                        txtPath.Text = fbd.SelectedPath;
                    }
                }
            };
            this.Controls.Add(btnBrowse);

            // Options
            chkDesktopShortcut = new CheckBox
            {
                Text = "Создать ярлык на рабочем столе",
                Checked = true,
                Location = new Point(28, 175),
                AutoSize = true,
                ForeColor = Color.FromArgb(229, 231, 235)
            };
            this.Controls.Add(chkDesktopShortcut);

            chkStartMenuShortcut = new CheckBox
            {
                Text = "Создать ярлык в меню Пуск",
                Checked = true,
                Location = new Point(28, 205),
                AutoSize = true,
                ForeColor = Color.FromArgb(229, 231, 235)
            };
            this.Controls.Add(chkStartMenuShortcut);

            chkInstallWebView2 = new CheckBox
            {
                Text = "Проверить и установить Microsoft WebView2 Runtime",
                Checked = true,
                Location = new Point(28, 235),
                AutoSize = true,
                ForeColor = Color.FromArgb(229, 231, 235)
            };
            this.Controls.Add(chkInstallWebView2);

            chkLaunchAfter = new CheckBox
            {
                Text = "Запустить AtmosphereEx после завершения установки",
                Checked = true,
                Location = new Point(28, 265),
                AutoSize = true,
                ForeColor = Color.FromArgb(229, 231, 235)
            };
            this.Controls.Add(chkLaunchAfter);

            // Progress Bar
            progressBar = new ProgressBar
            {
                Location = new Point(26, 315),
                Width = 466,
                Height = 18,
                Style = ProgressBarStyle.Continuous,
                Visible = false
            };
            this.Controls.Add(progressBar);

            // Status Label
            lblStatus = new Label
            {
                Text = "Нажмите «Установить» для начала процесса распаковки.",
                Location = new Point(26, 345),
                Width = 466,
                Height = 35,
                ForeColor = Color.FromArgb(148, 163, 184)
            };
            this.Controls.Add(lblStatus);

            // Bottom Buttons
            btnInstall = new Button
            {
                Text = "Установить",
                Location = new Point(276, 410),
                Width = 106,
                Height = 34,
                BackColor = Color.White,
                ForeColor = Color.Black,
                Font = new Font("Segoe UI", 9.5f, FontStyle.Bold),
                FlatStyle = FlatStyle.Flat,
                Cursor = Cursors.Hand
            };
            btnInstall.FlatAppearance.BorderSize = 0;
            btnInstall.Click += BtnInstall_Click;
            this.Controls.Add(btnInstall);

            btnCancel = new Button
            {
                Text = "Отмена",
                Location = new Point(396, 410),
                Width = 96,
                Height = 34,
                BackColor = Color.FromArgb(30, 41, 59),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Cursor = Cursors.Hand
            };
            btnCancel.FlatAppearance.BorderColor = Color.FromArgb(51, 65, 85);
            btnCancel.Click += (s, e) => this.Close();
            this.Controls.Add(btnCancel);
        }

        private async void BtnInstall_Click(object sender, EventArgs e)
        {
            if (isFinished)
            {
                if (chkLaunchAfter.Checked)
                {
                    string targetExe = Path.Combine(txtPath.Text, "AtmosphereEx.exe");
                    if (File.Exists(targetExe))
                    {
                        try { Process.Start(new ProcessStartInfo(targetExe) { UseShellExecute = true }); } catch { }
                    }
                }
                this.Close();
                return;
            }

            string installDir = txtPath.Text.Trim();
            if (string.IsNullOrEmpty(installDir))
            {
                MessageBox.Show("Пожалуйста, укажите папку для установки.", "AtmosphereEx", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            btnInstall.Enabled = false;
            btnCancel.Enabled = false;
            btnBrowse.Enabled = false;
            txtPath.Enabled = false;
            chkDesktopShortcut.Enabled = false;
            chkStartMenuShortcut.Enabled = false;
            chkInstallWebView2.Enabled = false;
            progressBar.Visible = true;
            progressBar.Value = 10;

            bool success = false;
            string errMessage = null;

            await Task.Run(() =>
            {
                try
                {
                    // 1. Check & Install WebView2 Runtime if requested
                    if (chkInstallWebView2.Checked)
                    {
                        UpdateStatus("Проверка Microsoft Edge WebView2 Runtime...", 20);
                        if (!IsWebView2Installed())
                        {
                            UpdateStatus("Установка Microsoft Edge WebView2 Runtime...", 35);
                            InstallWebView2Runtime();
                        }
                    }

                    // 2. Prepare Destination Directory
                    UpdateStatus("Подготовка каталога установки...", 50);
                    if (!Directory.Exists(installDir))
                    {
                        Directory.CreateDirectory(installDir);
                    }

                    // 3. Extract Payload
                    UpdateStatus("Распаковка файлов AtmosphereEx...", 65);
                    ExtractPayload(installDir);

                    // 4. Create Shortcuts
                    UpdateStatus("Создание ярлыков...", 85);
                    string mainExe = Path.Combine(installDir, "AtmosphereEx.exe");
                    string iconFile = Path.Combine(installDir, @"assets\atmosphere.ico");
                    if (!File.Exists(iconFile)) iconFile = Path.Combine(installDir, @"assets\icon.ico");
                    if (!File.Exists(iconFile)) iconFile = mainExe;

                    if (chkDesktopShortcut.Checked)
                    {
                        string desktopLink = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Desktop), "AtmosphereEx.lnk");
                        CreateShortcut(desktopLink, mainExe, iconFile, "AtmosphereEx - Next-Gen Proxy & Tunnel Suite");
                    }

                    if (chkStartMenuShortcut.Checked)
                    {
                        string programsFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonPrograms), "AtmosphereEx");
                        if (!Directory.Exists(programsFolder)) Directory.CreateDirectory(programsFolder);
                        string startLink = Path.Combine(programsFolder, "AtmosphereEx.lnk");
                        CreateShortcut(startLink, mainExe, iconFile, "AtmosphereEx - Next-Gen Proxy & Tunnel Suite");
                    }

                    // 5. Register in Windows Add/Remove Programs
                    UpdateStatus("Регистрация программы в Windows...", 95);
                    RegisterUninstall(installDir, mainExe, iconFile);

                    success = true;
                }
                catch (Exception ex)
                {
                    errMessage = ex.Message;
                }
            });

            progressBar.Value = 100;
            if (success)
            {
                lblStatus.Text = "Установка успешно завершена!";
                lblStatus.ForeColor = Color.FromArgb(56, 189, 248);
                btnInstall.Text = "Готово";
                btnInstall.Enabled = true;
                btnCancel.Visible = false;
                isFinished = true;
            }
            else
            {
                lblStatus.Text = "Ошибка установки: " + errMessage;
                lblStatus.ForeColor = Color.FromArgb(248, 113, 113);
                MessageBox.Show("Произошла ошибка при установке:\n" + errMessage, "AtmosphereEx Installer", MessageBoxButtons.OK, MessageBoxIcon.Error);
                btnInstall.Enabled = true;
                btnCancel.Enabled = true;
            }
        }

        private void UpdateStatus(string text, int progress)
        {
            if (this.InvokeRequired)
            {
                this.BeginInvoke((Action)(() => UpdateStatus(text, progress)));
                return;
            }
            lblStatus.Text = text;
            if (progress >= 0 && progress <= 100) progressBar.Value = progress;
        }

        private bool IsWebView2Installed()
        {
            try
            {
                string[] subKeys = new string[]
                {
                    @"SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BCD-66C3A86E786E}",
                    @"SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BCD-66C3A86E786E}"
                };

                foreach (var k in subKeys)
                {
                    using (var reg = Registry.LocalMachine.OpenSubKey(k))
                    {
                        if (reg != null)
                        {
                            object pv = reg.GetValue("pv");
                            if (pv != null && !string.IsNullOrEmpty(pv.ToString()) && pv.ToString() != "0.0.0.0")
                            {
                                return true;
                            }
                        }
                    }
                    using (var reg = Registry.CurrentUser.OpenSubKey(k))
                    {
                        if (reg != null)
                        {
                            object pv = reg.GetValue("pv");
                            if (pv != null && !string.IsNullOrEmpty(pv.ToString()) && pv.ToString() != "0.0.0.0")
                            {
                                return true;
                            }
                        }
                    }
                }
            }
            catch { }
            return false;
        }

        private void InstallWebView2Runtime()
        {
            string tempInstaller = Path.Combine(Path.GetTempPath(), "MicrosoftEdgeWebview2Setup.exe");
            
            var asm = Assembly.GetExecutingAssembly();
            Stream s = asm.GetManifestResourceStream("MicrosoftEdgeWebview2Setup.exe");
            if (s == null)
            {
                foreach (var name in asm.GetManifestResourceNames())
                {
                    if (name.EndsWith("MicrosoftEdgeWebview2Setup.exe", StringComparison.OrdinalIgnoreCase))
                    {
                        s = asm.GetManifestResourceStream(name);
                        break;
                    }
                }
            }

            if (s != null)
            {
                using (s)
                using (var fs = new FileStream(tempInstaller, FileMode.Create, FileAccess.Write))
                {
                    s.CopyTo(fs);
                }
            }
            else
            {
                string localSetup = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "MicrosoftEdgeWebview2Setup.exe");
                if (File.Exists(localSetup))
                {
                    File.Copy(localSetup, tempInstaller, true);
                }
            }

            if (File.Exists(tempInstaller))
            {
                try
                {
                    var p = Process.Start(new ProcessStartInfo
                    {
                        FileName = tempInstaller,
                        Arguments = "/silent /install",
                        UseShellExecute = true
                    });
                    if (p != null) p.WaitForExit(90000);
                }
                catch { }
                finally
                {
                    try { File.Delete(tempInstaller); } catch { }
                }
            }
        }

        private void ExtractPayload(string destinationDir)
        {
            var asm = Assembly.GetExecutingAssembly();
            Stream zipStream = asm.GetManifestResourceStream("atmosphere-data.zip");
            if (zipStream == null)
            {
                foreach (var name in asm.GetManifestResourceNames())
                {
                    if (name.EndsWith("atmosphere-data.zip", StringComparison.OrdinalIgnoreCase))
                    {
                        zipStream = asm.GetManifestResourceStream(name);
                        break;
                    }
                }
            }

            if (zipStream != null)
            {
                string fullDestDir = Path.GetFullPath(destinationDir);
                if (!fullDestDir.EndsWith(Path.DirectorySeparatorChar.ToString()))
                {
                    fullDestDir += Path.DirectorySeparatorChar;
                }

                using (zipStream)
                using (var archive = new ZipArchive(zipStream, ZipArchiveMode.Read))
                {
                    foreach (var entry in archive.Entries)
                    {
                        string completeFileName = Path.GetFullPath(Path.Combine(destinationDir, entry.FullName));
                        if (!completeFileName.StartsWith(fullDestDir, StringComparison.OrdinalIgnoreCase))
                        {
                            // Zip Slip protection: skip entries that attempt to break out of destinationDir
                            continue;
                        }

                        string directory = Path.GetDirectoryName(completeFileName);
                        if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
                        {
                            Directory.CreateDirectory(directory);
                        }

                        if (!string.IsNullOrEmpty(entry.Name))
                        {
                            entry.ExtractToFile(completeFileName, true);
                        }
                    }
                }
            }
            else
            {
                // Fallback: Copy directly from adjacent AtmosphereEx folder
                string sourceDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "AtmosphereEx");
                if (!Directory.Exists(sourceDir))
                {
                    sourceDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Desktop), "AtmosphereEx");
                }

                if (Directory.Exists(sourceDir))
                {
                    CopyDirectory(sourceDir, destinationDir);
                }
                else
                {
                    throw new FileNotFoundException("Файлы дистрибутива AtmosphereEx (atmosphere-data.zip) не найдены.");
                }
            }
        }

        private void CopyDirectory(string sourceDir, string targetDir)
        {
            Directory.CreateDirectory(targetDir);
            foreach (var file in Directory.GetFiles(sourceDir))
            {
                File.Copy(file, Path.Combine(targetDir, Path.GetFileName(file)), true);
            }
            foreach (var dir in Directory.GetDirectories(sourceDir))
            {
                CopyDirectory(dir, Path.Combine(targetDir, Path.GetFileName(dir)));
            }
        }

        private void CreateShortcut(string shortcutPath, string targetPath, string iconPath, string description)
        {
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                dynamic shell = Activator.CreateInstance(shellType);
                dynamic shortcut = shell.CreateShortcut(shortcutPath);
                shortcut.TargetPath = targetPath;
                shortcut.WorkingDirectory = Path.GetDirectoryName(targetPath);
                shortcut.IconLocation = iconPath + ",0";
                shortcut.Description = description;
                shortcut.Save();
            }
            catch { }
        }

        private void RegisterUninstall(string installDir, string mainExe, string iconFile)
        {
            try
            {
                string uninstKey = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\AtmosphereEx";
                using (var key = Registry.LocalMachine.CreateSubKey(uninstKey))
                {
                    if (key != null)
                    {
                        key.SetValue("DisplayName", "AtmosphereEx", RegistryValueKind.String);
                        key.SetValue("DisplayIcon", iconFile + ",0", RegistryValueKind.String);
                        key.SetValue("DisplayVersion", "1.0.0", RegistryValueKind.String);
                        key.SetValue("Publisher", "AtmosphereEx Team", RegistryValueKind.String);
                        key.SetValue("InstallLocation", installDir, RegistryValueKind.String);
                        key.SetValue("UninstallString", string.Format("cmd.exe /c rmdir /s /q \"{0}\"", installDir), RegistryValueKind.String);
                        key.SetValue("NoModify", 1, RegistryValueKind.DWord);
                        key.SetValue("NoRepair", 1, RegistryValueKind.DWord);
                    }
                }
            }
            catch { }
        }
    }
}

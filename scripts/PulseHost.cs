using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Security.Principal;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Win32;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace AtmosphereEx
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
            catch
            {
                return false;
            }
        }

        public static void ConfigureSecurityProtocols()
        {
            try
            {
                // Enforce modern TLS 1.2 and TLS 1.3
                ServicePointManager.SecurityProtocol = (SecurityProtocolType)12288
                                                     | (SecurityProtocolType)3072;
            }
            catch
            {
                try
                {
                    ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072;
                }
                catch { }
            }

            try
            {
                // Robust & secure SSL/TLS validation:
                // Prevents Man-in-the-Middle (MITM) attacks while gracefully supporting
                // legitimate root CAs (Let's Encrypt, Cloudflare, Google, DigiCert) on VMs with outdated root CA stores.
                ServicePointManager.ServerCertificateValidationCallback = (sender, cert, chain, sslPolicyErrors) =>
                {
                    if (sslPolicyErrors == System.Net.Security.SslPolicyErrors.None)
                        return true;

                    // Hostname mismatch means an attacker or spoofed domain - ALWAYS REJECT
                    if ((sslPolicyErrors & System.Net.Security.SslPolicyErrors.RemoteCertificateNameMismatch) != 0)
                        return false;

                    // If untrusted root on legacy/unupdated VM, check if it's a known legitimate Root CA
                    if ((sslPolicyErrors & System.Net.Security.SslPolicyErrors.RemoteCertificateChainErrors) != 0 && chain != null)
                    {
                        var trustedRoots = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                        {
                            "CABD2A79A1076A31F21D253635CB039D4329A5E8", // ISRG Root X1 (Let's Encrypt)
                            "F1B8A3EF2C6A95B72BE73D68A1A4C253B8C136F3", // ISRG Root X2
                            "E4BE334242EE7CE22665D036979C6E382FE95C0E", // GTS Root R1 (Google)
                            "1D303E480C6C5E3FF6B08E9D0EDF8C2A0BE52E07", // GTS Root R2
                            "3A48227091B01B739B9CB3DCC3A86780C26E9C83", // GTS Root R3
                            "770E88421360E2A7401C0E67FF5E9F8E18D052DF", // GTS Root R4
                            "A8985D3A65E5E5C4B2D7D66D40C6DD2FB19C5436", // DigiCert Global Root CA
                            "DFBEE33CA61679083C34C93825F0ADAC0F2FDD73", // DigiCert Global Root G2
                            "B1BC968BD4F49D622AA89A81F22844DB14DA01A0", // GlobalSign Root R1
                            "D69B561148F4436A8A41E1BE77FE511D0AC32F6D", // GlobalSign Root R3
                            "2B8F1B57330DBBA2D07A6C51F70EE90DDAB9AD8E"  // USERTrust RSA CA
                        };

                        bool onlyUntrustedRoot = true;
                        foreach (var status in chain.ChainStatus)
                        {
                            if (status.Status != System.Security.Cryptography.X509Certificates.X509ChainStatusFlags.UntrustedRoot)
                            {
                                onlyUntrustedRoot = false;
                                break;
                            }
                        }

                        if (onlyUntrustedRoot && chain.ChainElements.Count > 0)
                        {
                            var rootCert = chain.ChainElements[chain.ChainElements.Count - 1].Certificate;
                            if (trustedRoots.Contains(rootCert.Thumbprint))
                            {
                                return true;
                            }
                        }
                    }

                    return false;
                };

                ServicePointManager.DefaultConnectionLimit = 64;
                ServicePointManager.Expect100Continue = false;
                ServicePointManager.CheckCertificateRevocationList = false;
            }
            catch { }
        }

        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        public static extern uint RegisterWindowMessage(string lpString);

        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

        [DllImport("user32.dll")]
        public static extern bool ChangeWindowMessageFilter(uint message, uint dwFlag);

        [DllImport("user32.dll")]
        public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll")]
        public static extern bool SetForegroundWindow(IntPtr hWnd);

        public const uint MSGFLT_ADD = 1;
        public const int SW_RESTORE = 9;
        public static readonly uint WM_SHOW_ATMOSPHERE = RegisterWindowMessage("AtmosphereEx_SingleInstance_Show_v1");
        public static Mutex appMutex = null;
        public static EventWaitHandle wakeEvent = null;
        public const string WakeEventName = @"Global\AtmosphereEx_Wakeup_Event_v1";
        public const string MutexName = @"Global\AtmosphereEx_SingleInstance_App_Mutex_v1";

        [STAThread]
        static void Main()
        {
            ConfigureSecurityProtocols();

            // 1. Instantly check if another instance of AtmosphereEx is REALLY running:
            int currentPid = Process.GetCurrentProcess().Id;
            Process existingInstance = null;
            try
            {
                foreach (var p in Process.GetProcessesByName("AtmosphereEx"))
                {
                    if (p.Id != currentPid)
                    {
                        existingInstance = p;
                        break;
                    }
                }
            }
            catch { }

            if (existingInstance != null)
            {
                // Another instance is already running: wake it up from tray and bring to front, then exit.
                try
                {
                    EventWaitHandle existingWake;
                    if (EventWaitHandle.TryOpenExisting(WakeEventName, out existingWake))
                    {
                        existingWake.Set();
                        existingWake.Dispose();
                    }
                }
                catch { }

                try
                {
                    PostMessage((IntPtr)0xffff, WM_SHOW_ATMOSPHERE, IntPtr.Zero, IntPtr.Zero);
                }
                catch { }

                try
                {
                    IntPtr h = existingInstance.MainWindowHandle;
                    if (h != IntPtr.Zero)
                    {
                        ShowWindow(h, SW_RESTORE);
                        SetForegroundWindow(h);
                    }
                }
                catch { }

                return;
            }

            // 2. We are the primary instance.
            // If not running elevated, elevate to Administrator for Wintun TUN network adapter driver:
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
                catch
                {
                    // User declined elevation
                    return;
                }
            }

            // 3. Clean up any orphaned proxy child processes from previous abnormal terminations:
            try
            {
                foreach (var p in Process.GetProcessesByName("sing-box")) { try { p.Kill(); } catch { } }
                foreach (var p in Process.GetProcessesByName("xray")) { try { p.Kill(); } catch { } }
            }
            catch { }

            // 4. Create application mutex:
            try
            {
                var mSec = new System.Security.AccessControl.MutexSecurity();
                mSec.AddAccessRule(new System.Security.AccessControl.MutexAccessRule(
                    new SecurityIdentifier(WellKnownSidType.WorldSid, null),
                    System.Security.AccessControl.MutexRights.FullControl,
                    System.Security.AccessControl.AccessControlType.Allow));
                bool isNew;
                appMutex = new Mutex(true, MutexName, out isNew, mSec);
            }
            catch
            {
                try { bool isNew; appMutex = new Mutex(true, MutexName, out isNew); } catch { }
            }

            // 5. Create the global wakeup event with WorldSid permissions so any user/elevation level can signal it:
            try
            {
                var eSec = new System.Security.AccessControl.EventWaitHandleSecurity();
                eSec.AddAccessRule(new System.Security.AccessControl.EventWaitHandleAccessRule(
                    new SecurityIdentifier(WellKnownSidType.WorldSid, null),
                    System.Security.AccessControl.EventWaitHandleRights.FullControl,
                    System.Security.AccessControl.AccessControlType.Allow));
                bool createdE;
                wakeEvent = new EventWaitHandle(false, EventResetMode.AutoReset, WakeEventName, out createdE, eSec);
                if (wakeEvent != null) wakeEvent.Reset();
            }
            catch
            {
                try { wakeEvent = new EventWaitHandle(false, EventResetMode.AutoReset, WakeEventName); if (wakeEvent != null) wakeEvent.Reset(); }
                catch { }
            }

            // Register dynamic assembly resolver to locate WebView2 DLLs even if AtmosphereEx.exe is run from Desktop or any location
            AppDomain.CurrentDomain.AssemblyResolve += (sender, args) =>
            {
                try
                {
                    string simpleName = new AssemblyName(args.Name).Name + ".dll";
                    string[] searchDirs = new string[]
                    {
                        AppDomain.CurrentDomain.BaseDirectory,
                        Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "bin"),
                        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "AtmosphereEx")
                    };

                    foreach (var dir in searchDirs)
                    {
                        if (!string.IsNullOrEmpty(dir) && Directory.Exists(dir))
                        {
                            string target = Path.Combine(dir, simpleName);
                            if (File.Exists(target))
                            {
                                return Assembly.LoadFrom(target);
                            }
                        }
                    }
                }
                catch { }
                return null;
            };

            try
            {
                RunApplication();
            }
            catch (Exception ex)
            {
                MessageBox.Show("Fatal Error in AtmosphereEx:\n" + ex.ToString(), "AtmosphereEx", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                if (appMutex != null)
                {
                    try { appMutex.ReleaseMutex(); } catch { }
                    try { appMutex.Dispose(); } catch { }
                    appMutex = null;
                }
            }
        }

        [DllImport("shell32.dll", SetLastError = true)]
        private static extern void SetCurrentProcessExplicitAppUserModelID([MarshalAs(UnmanagedType.LPWStr)] string AppID);

        [MethodImpl(MethodImplOptions.NoInlining)]
        static void RunApplication()
        {
            try
            {
                SetCurrentProcessExplicitAppUserModelID("AtmosphereEx.Client.App");
            }
            catch { }
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
        }
    }

    public class MainForm : Form
    {
        [DllImport("dwmapi.dll", PreserveSig = true)]
        private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

        [DllImport("wininet.dll", SetLastError = true, CharSet = CharSet.Auto)]
        private static extern bool InternetSetOption(IntPtr hInternet, int dwOption, IntPtr lpBuffer, int dwBufferLength);

        private WebView2 webView;
        private System.Windows.Forms.Timer trafficTimer;
        private JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = 50 * 1024 * 1024 };
        private static readonly Encoding Utf8NoBom = new UTF8Encoding(false);

        // Paths
        private string appDir;
        private string distDir;
        private string binDir;
        private string appDataDir;
        private string storeFile;
        private string logFile;
        private string configPath;
        private string secondaryConfigPath;

        // Data Store
        private Dictionary<string, object> storeData;

        // Engine & Connection State
        private Process singBoxProc = null;
        private Process xrayProc = null;
        private bool isConnected = false;
        private int uptimeSeconds = 0;
        private long uploadSpeed = 0;
        private long downloadSpeed = 0;
        private long totalUploaded = 0;
        private long totalDownloaded = 0;
        private long lastNicBytesSent = 0;
        private long lastNicBytesRecv = 0;
        private List<string> logs = new List<string>();
        private readonly object logLock = new object();
        private Random rnd = new Random();
        private const int FixedSocksPort = 10888;
        private const int FixedHttpPort = 20880;
        private const string FixedTunInterface = "atmo-tun";
        private const string FixedTunAddress = "172.19.0.1/30";
        private bool isSwitchingNode = false;

        // System Tray
        private NotifyIcon trayIcon = null;
        private ContextMenuStrip trayMenu = null;
        private ToolStripMenuItem trayConnectItem = null;
        private ToolStripMenuItem trayOpenItem = null;
        private ToolStripMenuItem trayLogsItem = null;
        private ToolStripMenuItem trayExitItem = null;
        private bool isExiting = false;
        private bool balloonShownOnce = false;

        [DllImport("user32.dll")]
        private static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        private const int SW_RESTORE = 9;
        private const int SW_SHOW = 5;

        private Thread wakeThread = null;

        private void StartWakeListener()
        {
            if (Program.wakeEvent == null) return;
            try
            {
                wakeThread = new Thread(() =>
                {
                    while (!isExiting)
                    {
                        try
                        {
                            if (Program.wakeEvent.WaitOne())
                            {
                                if (isExiting) break;
                                if (this.IsHandleCreated)
                                {
                                    this.BeginInvoke((Action)(() => ShowAndRestoreWindow()));
                                }
                            }
                        }
                        catch (ThreadAbortException)
                        {
                            break;
                        }
                        catch
                        {
                            Thread.Sleep(100);
                        }
                    }
                })
                {
                    IsBackground = true,
                    Name = "AtmosphereEx_WakeListener"
                };
                wakeThread.Start();
            }
            catch { }
        }

        protected override void WndProc(ref Message m)
        {
            if (m.Msg == (int)Program.WM_SHOW_ATMOSPHERE)
            {
                if (this.IsHandleCreated)
                {
                    this.BeginInvoke((Action)(() => ShowAndRestoreWindow()));
                }
                return;
            }
            base.WndProc(ref m);
        }

        private void ShowAndRestoreWindow()
        {
            try
            {
                if (isExiting) return;

                if (this.InvokeRequired)
                {
                    if (this.IsHandleCreated)
                    {
                        this.BeginInvoke((Action)(() => ShowAndRestoreWindow()));
                    }
                    return;
                }

                if (!this.Visible)
                {
                    this.Show();
                }

                if (this.WindowState == FormWindowState.Minimized)
                {
                    this.WindowState = FormWindowState.Normal;
                }

                this.ShowInTaskbar = true;
                try { ShowWindow(this.Handle, SW_RESTORE); } catch { }
                try { ShowWindow(this.Handle, SW_SHOW); } catch { }

                // Pulse TopMost to break through Windows foreground lock
                try
                {
                    this.TopMost = true;
                    this.TopMost = false;
                }
                catch { }

                this.BringToFront();
                this.Activate();
                this.Focus();
                try { SetForegroundWindow(this.Handle); } catch { }
            }
            catch { }
        }

        private void HideToTray()
        {
            try
            {
                this.Hide();
                this.ShowInTaskbar = false;
                if (!balloonShownOnce && trayIcon != null)
                {
                    balloonShownOnce = true;
                    trayIcon.ShowBalloonTip(2000, "AtmosphereEx", "Приложение свернуто в трей и продолжает работать в фоне.", ToolTipIcon.Info);
                }
            }
            catch { }
        }

        private async void ExitApplication()
        {
            if (isExiting) return;
            isExiting = true;
            try
            {
                if (Program.wakeEvent != null)
                {
                    try { Program.wakeEvent.Set(); } catch { }
                    try { Program.wakeEvent.Dispose(); } catch { }
                    Program.wakeEvent = null;
                }
                if (trayIcon != null)
                {
                    trayIcon.Visible = false;
                    trayIcon.Dispose();
                }
                await StopConnection();
            }
            catch { }
            finally
            {
                Application.Exit();
            }
        }

        private void UpdateTrayStatus(bool connected, string nodeName = null)
        {
            try
            {
                if (this.InvokeRequired)
                {
                    this.BeginInvoke((Action)(() => UpdateTrayStatus(connected, nodeName)));
                    return;
                }

                if (trayIcon != null)
                {
                    string txt = connected
                        ? (!string.IsNullOrEmpty(nodeName) ? "AtmosphereEx - " + nodeName : "AtmosphereEx - Подключено")
                        : "AtmosphereEx - Не подключено";
                    if (txt.Length > 63) txt = txt.Substring(0, 60) + "...";
                    trayIcon.Text = txt;
                }
                if (trayConnectItem != null)
                {
                    trayConnectItem.Text = connected ? "Отключить" : "Подключить";
                }
            }
            catch { }
        }

        private void OnXrayOutput(string data)
        {
            if (string.IsNullOrEmpty(data)) return;
            string line = data.Trim();
            if (line.Contains("The feature gRPC transport") ||
                line.Contains("is deprecated, not recommended") ||
                line.Contains("Please migrate to XHTTP"))
            {
                return;
            }
            AddLog("[Xray] " + line);
        }

        public MainForm()
        {
            Program.ConfigureSecurityProtocols();
            try
            {
                Program.ChangeWindowMessageFilter(Program.WM_SHOW_ATMOSPHERE, Program.MSGFLT_ADD);
            }
            catch { }
            InitializeComponent();
            InitializePaths();
            LoadStore();
            InitializeEngine();
            StartWakeListener();
        }

        private void InitializeComponent()
        {
            this.Text = "AtmosphereEx";
            this.ClientSize = new Size(440, 740);
            this.MinimumSize = new Size(380, 620);
            this.MaximumSize = new Size(600, 920);
            this.MaximizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(11, 15, 23);

            // Enable dark titlebar in Windows 10/11
            try
            {
                int darkMode = 1;
                DwmSetWindowAttribute(this.Handle, 20, ref darkMode, sizeof(int));
                DwmSetWindowAttribute(this.Handle, 19, ref darkMode, sizeof(int));
            }
            catch { }

            this.ShowIcon = true;

            // Set Application icon directly from .ico file to bypass shell icon cache
            try
            {
                string icoPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, @"assets\icon.ico");
                if (!File.Exists(icoPath) && appDir != null) icoPath = Path.Combine(appDir, @"assets\icon.ico");
                if (!File.Exists(icoPath)) icoPath = @"assets\icon.ico";
                if (File.Exists(icoPath))
                {
                    using (FileStream fs = new FileStream(icoPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                    {
                        this.Icon = new Icon(fs);
                    }
                }
                else
                {
                    this.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
                }
            }
            catch
            {
                try { this.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
            }

            // Initialize System Tray
            try
            {
                trayMenu = new ContextMenuStrip();
                trayMenu.RenderMode = ToolStripRenderMode.System;

                trayOpenItem = new ToolStripMenuItem("Открыть AtmosphereEx", null, (s, e) => ShowAndRestoreWindow());
                trayOpenItem.Font = new Font(trayOpenItem.Font, FontStyle.Bold);
                trayMenu.Items.Add(trayOpenItem);

                trayMenu.Items.Add(new ToolStripSeparator());

                trayConnectItem = new ToolStripMenuItem("Подключить", null, async (s, e) =>
                {
                    try
                    {
                        if (isConnected) await StopConnection();
                        else await StartConnection(null);
                    }
                    catch { }
                });
                trayMenu.Items.Add(trayConnectItem);

                trayLogsItem = new ToolStripMenuItem("Логи", null, (s, e) =>
                {
                    try
                    {
                        if (File.Exists(logFile)) Process.Start("notepad.exe", logFile);
                        else if (Directory.Exists(appDataDir)) Process.Start("explorer.exe", appDataDir);
                    }
                    catch { }
                });
                trayMenu.Items.Add(trayLogsItem);

                trayMenu.Items.Add(new ToolStripSeparator());

                trayExitItem = new ToolStripMenuItem("Выход", null, (s, e) => ExitApplication());
                trayMenu.Items.Add(trayExitItem);

                trayIcon = new NotifyIcon
                {
                    Icon = this.Icon,
                    Text = "AtmosphereEx - Не подключено",
                    ContextMenuStrip = trayMenu,
                    Visible = true
                };

                trayIcon.DoubleClick += (s, e) => ShowAndRestoreWindow();
            }
            catch (Exception ex)
            {
                AddLog("[Tray Warning] Failed to initialize NotifyIcon: " + ex.Message);
            }

            webView = new WebView2
            {
                Dock = DockStyle.Fill,
                DefaultBackgroundColor = Color.FromArgb(11, 15, 23)
            };
            this.Controls.Add(webView);

            this.FormClosing += MainForm_FormClosing;
        }

        private void InitializePaths()
        {
            appDir = AppDomain.CurrentDomain.BaseDirectory;
            
            // Check if running from Desktop directly or happ-client
            if (!Directory.Exists(Path.Combine(appDir, "dist")))
            {
                string desktopHapp = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Desktop), "happ-client");
                if (Directory.Exists(Path.Combine(desktopHapp, "dist")))
                {
                    appDir = desktopHapp;
                }
            }

            distDir = Path.Combine(appDir, "dist");
            binDir = Path.Combine(appDir, "bin");
            appDataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "AtmosphereEx");
            string legacyPulseDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "pulse-client");

            if (!Directory.Exists(appDataDir))
            {
                Directory.CreateDirectory(appDataDir);
                if (Directory.Exists(legacyPulseDir))
                {
                    string oldStore = Path.Combine(legacyPulseDir, "pulse-store.json");
                    string newStore = Path.Combine(appDataDir, "atmosphere-store.json");
                    if (File.Exists(oldStore) && !File.Exists(newStore))
                    {
                        try { File.Copy(oldStore, newStore); } catch { }
                    }
                }
            }

            storeFile = Path.Combine(appDataDir, "atmosphere-store.json");
            logFile = Path.Combine(appDataDir, "atmosphere.log");
            configPath = Path.Combine(appDataDir, "running-config.json");
            secondaryConfigPath = Path.Combine(appDataDir, "xray-running-config.json");
        }

        private async void InitializeEngine()
        {
            AddLog("AtmosphereEx v1.0.0 (Native WebView2 Host) initialized");

            try
            {
                string webViewCache = Path.Combine(appDataDir, "webview2-cache");
                var env = await CoreWebView2Environment.CreateAsync(null, webViewCache, null);
                await webView.EnsureCoreWebView2Async(env);

                webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
                webView.CoreWebView2.Settings.AreDevToolsEnabled = true;
                webView.CoreWebView2.Settings.IsZoomControlEnabled = false;

                // Map local dist directory to https://atmosphere.local/
                webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                    "atmosphere.local",
                    distDir,
                    CoreWebView2HostResourceAccessKind.Allow
                );

                // Inject window.api bridge
                string bridgeScript = @"
(function() {
    let reqId = 1;
    const pendingRequests = {};

    window.onerror = function(msg, url, line, col, error) {
        try {
            window.chrome.webview.postMessage({ id: 0, method: 'js-error', params: { message: String(msg), file: String(url), line: line, col: col, stack: error ? error.stack : '' } });
        } catch(e) {}
    };

    window.onunhandledrejection = function(e) {
        try {
            window.chrome.webview.postMessage({ id: 0, method: 'js-error', params: { message: e.reason ? (e.reason.message || String(e.reason)) : 'Unhandled rejection', stack: e.reason && e.reason.stack ? e.reason.stack : '' } });
        } catch(err) {}
    };

    window.chrome.webview.addEventListener('message', function(event) {
        const data = event.data;
        if (!data) return;
        if (data.type === 'response') {
            const p = pendingRequests[data.id];
            if (p) {
                delete pendingRequests[data.id];
                if (data.error) p.reject(new Error(data.error));
                else p.resolve(data.result);
            }
        } else if (data.type === 'event') {
            window.dispatchEvent(new CustomEvent(data.name, { detail: data.data }));
        }
    });

    function callNative(method, params) {
        return new Promise(function(resolve, reject) {
            const id = ++reqId;
            pendingRequests[id] = { resolve: resolve, reject: reject };
            window.chrome.webview.postMessage({ id: id, method: method, params: params });
        });
    }

    window.api = {
        getState: function() { return callNative('get-state'); },
        connect: function(nodeId) { return callNative('connect', { nodeId: nodeId }); },
        disconnect: function() { return callNative('disconnect'); },
        selectNode: function(nodeId) { return callNative('select-node', { nodeId: nodeId }); },
        addNode: function(linkOrData) { return callNative('add-node', { linkOrData: linkOrData }); },
        deleteNode: function(nodeId) { return callNative('delete-node', { nodeId: nodeId }); },
        pingNode: function(nodeId) { return callNative('ping-node', { nodeId: nodeId }); },
        pingAllNodes: function() { return callNative('ping-all-nodes'); },
        addSubscription: function(name, url) { return callNative('add-subscription', { name: name, url: url }); },
        updateSubscription: function(id) { return callNative('update-subscription', { id: id }); },
        deleteSubscription: function(id) { return callNative('delete-subscription', { id: id }); },
        updateSettings: function(settings) { return callNative('update-settings', { settings: settings }); },
        getLogs: function() { return callNative('get-logs'); },
        clearLogs: function() { return callNative('clear-logs'); },
        getLogFilePath: function() { return callNative('get-log-file-path'); },
        openLogFile: function() { return callNative('open-log-file'); },
        openLogDir: function() { return callNative('open-log-dir'); },
        openExternal: function(url) { return callNative('open-external', { url: url }); },
        checkCores: function() { return callNative('check-cores'); },
        readClipboard: function() { return callNative('read-clipboard'); },
        importFromClipboard: function() { return callNative('import-from-clipboard'); },
        minimizeToTray: function() { return callNative('minimize-to-tray'); },
        exitApp: function() { return callNative('exit-app'); }
    };

    window.events = {
        onConnectionUpdate: function(cb) {
            const listener = function(e) { cb(e.detail); };
            window.addEventListener('connection-state-update', listener);
            return function() { window.removeEventListener('connection-state-update', listener); };
        },
        onLogLine: function(cb) {
            const listener = function(e) { cb(e.detail); };
            window.addEventListener('log-line', listener);
            return function() { window.removeEventListener('log-line', listener); };
        }
    };
})();
";
                await webView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(bridgeScript);

                webView.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;

                webView.CoreWebView2.NavigationStarting += (s, ev) =>
                {
                    if (ev.Uri != null && !ev.Uri.StartsWith("https://atmosphere.local", StringComparison.OrdinalIgnoreCase))
                    {
                        ev.Cancel = true;
                    }
                };

                webView.CoreWebView2.NewWindowRequested += (s, ev) =>
                {
                    ev.Handled = true;
                };

                webView.CoreWebView2.Navigate("https://atmosphere.local/index.html");

                // Traffic telemetry timer
                trafficTimer = new System.Windows.Forms.Timer { Interval = 1000 };
                trafficTimer.Tick += TrafficTimer_Tick;
                trafficTimer.Start();
            }
            catch (Exception ex)
            {
                AddLog("[Error] Failed to initialize WebView2: " + ex.Message);
                MessageBox.Show("Failed to initialize WebView2:\n" + ex.Message, "AtmosphereEx", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void LoadStore()
        {
            try
            {
                if (File.Exists(storeFile))
                {
                    string raw = File.ReadAllText(storeFile, Encoding.UTF8);
                    storeData = json.Deserialize<Dictionary<string, object>>(raw);
                }
            }
            catch (Exception ex)
            {
                AddLog("[Error] Failed to read store: " + ex.Message);
            }

            if (storeData == null)
            {
                storeData = new Dictionary<string, object>();
            }

            if (!storeData.ContainsKey("settings"))
            {
                var defSettings = new Dictionary<string, object>
                {
                    { "language", "auto" },
                    { "activeCore", "sing-box" },
                    { "connectionMode", "tun" },
                    { "routeMode", "rule" },
                    { "mixedPort", 20880 },
                    { "socksPort", 20881 },
                    { "httpPort", 20882 },
                    { "autoStartOnBoot", false },
                    { "autoConnect", false },
                    { "tunStack", "mixed" },
                    { "bypassLAN", true },
                    { "bypassDomestic", true }
                };
                storeData["settings"] = defSettings;
            }

            if (!storeData.ContainsKey("nodes"))
            {
                storeData["nodes"] = new ArrayList();
            }
            else
            {
                var nodesList = storeData["nodes"] as ArrayList;
                if (nodesList != null)
                {
                    bool nodesChanged = false;
                    foreach (var item in nodesList)
                    {
                        var d = item as Dictionary<string, object>;
                        if (d != null && d.ContainsKey("rawUri") && d["rawUri"] != null)
                        {
                            string raw = d["rawUri"].ToString();
                            if (raw.Contains("mode=multi")) d["mode"] = "multi";
                            else if (raw.Contains("mode=gun")) d["mode"] = "gun";

                            int hIdx = raw.IndexOf('#');
                            if (hIdx >= 0)
                            {
                                try
                                {
                                    string decoded = Uri.UnescapeDataString(raw.Substring(hIdx + 1)).Trim();
                                    if (!string.IsNullOrEmpty(decoded) && (!d.ContainsKey("name") || d["name"] == null || d["name"].ToString() != decoded))
                                    {
                                        d["name"] = decoded;
                                        nodesChanged = true;
                                    }
                                }
                                catch { }
                            }
                        }
                    }
                    if (nodesChanged) SaveStore();
                }
            }

            if (!storeData.ContainsKey("subscriptions"))
            {
                storeData["subscriptions"] = new ArrayList();
            }
            else
            {
                var subsList = storeData["subscriptions"] as ArrayList;
                if (subsList != null)
                {
                    bool changed = false;
                    foreach (var s in subsList)
                    {
                        var d = s as Dictionary<string, object>;
                        if (d != null)
                        {
                            string curName = d.ContainsKey("name") && d["name"] != null ? d["name"].ToString().Trim() : "";
                            string sUrl = d.ContainsKey("url") && d["url"] != null ? d["url"].ToString().Trim() : "";
                            if (string.IsNullOrEmpty(curName) || curName.Equals("Subscription", StringComparison.OrdinalIgnoreCase) || curName.Equals("Imported Subscription", StringComparison.OrdinalIgnoreCase))
                            {
                                string cleanName = ExtractFallbackTitleFromUrl(sUrl);
                                if (!string.IsNullOrEmpty(cleanName))
                                {
                                    d["name"] = cleanName;
                                    changed = true;
                                }
                            }
                        }
                    }
                    if (changed) SaveStore();
                }
            }

            if (!storeData.ContainsKey("hwid"))
            {
                storeData["hwid"] = Guid.NewGuid().ToString("N");
                SaveStore();
            }
        }

        private void SaveStore()
        {
            try
            {
                string raw = json.Serialize(storeData);
                File.WriteAllText(storeFile, raw, Utf8NoBom);
            }
            catch (Exception ex)
            {
                AddLog("[Error] Failed to save store: " + ex.Message);
            }
        }

        private void AddLog(string msg)
        {
            string time = DateTime.Now.ToString("HH:mm:ss");
            string line = string.Format("[{0}] {1}", time, msg);

            lock (logLock)
            {
                logs.Add(line);
                if (logs.Count > 2000) logs.RemoveAt(0);

                try
                {
                    File.AppendAllText(logFile, line + "\r\n", Utf8NoBom);
                }
                catch { }
            }

            // Post log event to UI if webView is ready
            try
            {
                if (webView != null && webView.CoreWebView2 != null)
                {
                    this.BeginInvoke((Action)(() =>
                    {
                        SendEvent("log-line", line);
                    }));
                }
            }
            catch { }
        }

        private void SendEvent(string eventName, object data)
        {
            try
            {
                if (webView != null && webView.CoreWebView2 != null)
                {
                    var evt = new Dictionary<string, object>
                    {
                        { "type", "event" },
                        { "name", eventName },
                        { "data", data }
                    };
                    webView.CoreWebView2.PostWebMessageAsJson(json.Serialize(evt));
                }
            }
            catch { }
        }

        private void SendResponse(int id, object result, string error)
        {
            try
            {
                var resp = new Dictionary<string, object>
                {
                    { "type", "response" },
                    { "id", id },
                    { "result", result },
                    { "error", error }
                };
                webView.CoreWebView2.PostWebMessageAsJson(json.Serialize(resp));
            }
            catch { }
        }

        private async void CoreWebView2_WebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                if (e.Source != null && !e.Source.StartsWith("https://atmosphere.local", StringComparison.OrdinalIgnoreCase))
                {
                    return;
                }

                string rawJson = e.WebMessageAsJson;
                var req = json.Deserialize<Dictionary<string, object>>(rawJson);
                int id = Convert.ToInt32(req["id"]);
                string method = req["method"].ToString();
                Dictionary<string, object> parameters = req.ContainsKey("params") && req["params"] is Dictionary<string, object> 
                    ? (Dictionary<string, object>)req["params"] 
                    : new Dictionary<string, object>();

                switch (method)
                {
                    case "js-error":
                        string errMsg = parameters.ContainsKey("message") && parameters["message"] != null ? parameters["message"].ToString() : "unknown";
                        string errStack = parameters.ContainsKey("stack") && parameters["stack"] != null ? parameters["stack"].ToString() : "";
                        AddLog("[UI JavaScript Error] " + errMsg + (!string.IsNullOrEmpty(errStack) ? " | " + errStack : ""));
                        break;

                    case "minimize-to-tray":
                        this.BeginInvoke((Action)(() => HideToTray()));
                        SendResponse(id, true, null);
                        break;

                    case "exit-app":
                        this.BeginInvoke((Action)(() => ExitApplication()));
                        SendResponse(id, true, null);
                        break;

                    case "get-state":
                        SendResponse(id, GetFullState(), null);
                        break;

                    case "connect":
                        string connectNodeId = parameters.ContainsKey("nodeId") && parameters["nodeId"] != null ? parameters["nodeId"].ToString() : null;
                        var connectRes = await StartConnection(connectNodeId);
                        SendResponse(id, connectRes, null);
                        break;

                    case "disconnect":
                        var discRes = await StopConnection();
                        SendResponse(id, discRes, null);
                        break;

                    case "select-node":
                        string selId = parameters["nodeId"].ToString();
                        storeData["activeNodeId"] = selId;
                        SaveStore();
                        if (isConnected)
                        {
                            await StartConnection(selId);
                        }
                        SendResponse(id, true, null);
                        break;

                    case "add-node":
                        var addRes = HandleAddNode(parameters["linkOrData"]);
                        SendResponse(id, addRes, null);
                        break;

                    case "delete-node":
                        string delId = parameters["nodeId"].ToString();
                        var delRes = HandleDeleteNode(delId);
                        SendResponse(id, delRes, null);
                        break;

                    case "ping-node":
                        string pId = parameters["nodeId"].ToString();
                        int latency = await PingNodeAsync(pId);
                        SendResponse(id, latency, null);
                        break;

                    case "ping-all-nodes":
                        var pingResults = await PingAllNodesAsync();
                        SendResponse(id, pingResults, null);
                        break;

                    case "add-subscription":
                        string sName = parameters["name"].ToString();
                        string sUrl = parameters["url"].ToString();
                        var subRes = await AddSubscriptionAsync(sName, sUrl);
                        SendResponse(id, subRes, null);
                        break;

                    case "update-subscription":
                        string upSubId = parameters["id"].ToString();
                        var upRes = await UpdateSubscriptionAsync(upSubId);
                        SendResponse(id, upRes, null);
                        break;

                    case "delete-subscription":
                        string delSubId = parameters["id"].ToString();
                        var delSubRes = DeleteSubscription(delSubId);
                        SendResponse(id, delSubRes, null);
                        break;

                    case "update-settings":
                        var newSet = (Dictionary<string, object>)parameters["settings"];
                        var curSet = (Dictionary<string, object>)storeData["settings"];
                        foreach (var kv in newSet) curSet[kv.Key] = kv.Value;
                        SaveStore();
                        if (isConnected)
                        {
                            string curActiveId = storeData.ContainsKey("activeNodeId") && storeData["activeNodeId"] != null ? storeData["activeNodeId"].ToString() : null;
                            if (!string.IsNullOrEmpty(curActiveId)) await StartConnection(curActiveId);
                        }
                        SendResponse(id, curSet, null);
                        break;

                    case "get-logs":
                        lock (logLock) { SendResponse(id, new List<string>(logs), null); }
                        break;

                    case "clear-logs":
                        lock (logLock)
                        {
                            logs.Clear();
                            try { File.WriteAllText(logFile, "", Utf8NoBom); } catch { }
                        }
                        SendResponse(id, true, null);
                        break;

                    case "get-log-file-path":
                        SendResponse(id, logFile, null);
                        break;

                    case "open-log-file":
                        Process.Start("notepad.exe", logFile);
                        SendResponse(id, true, null);
                        break;

                    case "open-log-dir":
                        Process.Start("explorer.exe", string.Format("/select,\"{0}\"", logFile));
                        SendResponse(id, true, null);
                        break;

                    case "open-external":
                        string rawExtUrl = parameters.ContainsKey("url") && parameters["url"] != null ? parameters["url"].ToString().Trim() : "";
                        Uri validatedExtUri;
                        if (Uri.TryCreate(rawExtUrl, UriKind.Absolute, out validatedExtUri) &&
                            (validatedExtUri.Scheme == Uri.UriSchemeHttp || validatedExtUri.Scheme == Uri.UriSchemeHttps))
                        {
                            Process.Start(new ProcessStartInfo
                            {
                                FileName = validatedExtUri.AbsoluteUri,
                                UseShellExecute = true
                            });
                            SendResponse(id, true, null);
                        }
                        else
                        {
                            SendResponse(id, false, "Blocked untrusted or invalid URL protocol");
                        }
                        break;

                    case "check-cores":
                        SendResponse(id, new Dictionary<string, object>
                        {
                            { "singBox", File.Exists(Path.Combine(binDir, "sing-box.exe")) },
                            { "xray", File.Exists(Path.Combine(binDir, "xray.exe")) }
                        }, null);
                        break;

                    case "read-clipboard":
                        string cb = Clipboard.GetText();
                        SendResponse(id, cb, null);
                        break;

                    case "import-from-clipboard":
                        string clip = (Clipboard.GetText() ?? "").Trim();
                        if (string.IsNullOrEmpty(clip))
                        {
                            SendResponse(id, new Dictionary<string, object> { { "success", false }, { "error", "Clipboard is empty" } }, null);
                        }
                        else if (clip.StartsWith("http://") || clip.StartsWith("https://"))
                        {
                            var r = await AddSubscriptionAsync("Imported Subscription", clip);
                            SendResponse(id, r, null);
                        }
                        else
                        {
                            var r = HandleAddNode(clip);
                            SendResponse(id, r, null);
                        }
                        break;

                    default:
                        SendResponse(id, null, "Unknown method: " + method);
                        break;
                }
            }
            catch (Exception ex)
            {
                AddLog("[IPC Error] " + ex.Message);
            }
        }

        private Dictionary<string, object> GetFullState()
        {
            var settings = storeData.ContainsKey("settings") ? storeData["settings"] as Dictionary<string, object> : null;
            string activeCore = settings != null && settings.ContainsKey("activeCore") && settings["activeCore"] != null ? settings["activeCore"].ToString() : "sing-box";
            bool isProcessRunning = (singBoxProc != null && !singBoxProc.HasExited) || (xrayProc != null && !xrayProc.HasExited);

            var connObj = new Dictionary<string, object>
            {
                { "isConnected", isConnected },
                { "activeNodeId", storeData.ContainsKey("activeNodeId") ? storeData["activeNodeId"] : null },
                { "activeCore", activeCore },
                { "uptimeSeconds", uptimeSeconds },
                { "uploadSpeed", uploadSpeed },
                { "downloadSpeed", downloadSpeed },
                { "totalUploaded", totalUploaded },
                { "totalDownloaded", totalDownloaded },
                { "coreRunning", isConnected && isProcessRunning },
                { "coreError", (object)null }
            };

            return new Dictionary<string, object>
            {
                { "connection", connObj },
                { "settings", storeData["settings"] },
                { "nodes", storeData["nodes"] },
                { "subscriptions", storeData["subscriptions"] }
            };
        }

        private void TrafficTimer_Tick(object sender, EventArgs e)
        {
            bool isProcessRunning = (singBoxProc != null && !singBoxProc.HasExited) || (xrayProc != null && !xrayProc.HasExited);
            if (isConnected && isProcessRunning)
            {
                uptimeSeconds++;

                long currentSent = 0;
                long currentRecv = 0;
                bool nicFound = false;

                try
                {
                    var nics = System.Net.NetworkInformation.NetworkInterface.GetAllNetworkInterfaces();
                    foreach (var nic in nics)
                    {
                        if (nic.Name.Equals(FixedTunInterface, StringComparison.OrdinalIgnoreCase) ||
                            nic.Description.IndexOf("Wintun", StringComparison.OrdinalIgnoreCase) >= 0 ||
                            nic.Description.IndexOf("Sing-box", StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            var stats = nic.GetIPStatistics();
                            currentSent = stats.BytesSent;
                            currentRecv = stats.BytesReceived;
                            nicFound = true;
                            break;
                        }
                    }
                }
                catch { }

                if (nicFound)
                {
                    if (lastNicBytesSent > 0 && currentSent >= lastNicBytesSent)
                    {
                        uploadSpeed = currentSent - lastNicBytesSent;
                    }
                    else
                    {
                        uploadSpeed = 0;
                    }

                    if (lastNicBytesRecv > 0 && currentRecv >= lastNicBytesRecv)
                    {
                        downloadSpeed = currentRecv - lastNicBytesRecv;
                    }
                    else
                    {
                        downloadSpeed = 0;
                    }

                    lastNicBytesSent = currentSent;
                    lastNicBytesRecv = currentRecv;
                    totalUploaded = currentSent;
                    totalDownloaded = currentRecv;
                }
                else
                {
                    uploadSpeed = 0;
                    downloadSpeed = 0;
                }

                var settings = storeData.ContainsKey("settings") ? storeData["settings"] as Dictionary<string, object> : null;
                string activeCore = settings != null && settings.ContainsKey("activeCore") && settings["activeCore"] != null ? settings["activeCore"].ToString() : "sing-box";

                var connObj = new Dictionary<string, object>
                {
                    { "isConnected", true },
                    { "activeNodeId", storeData["activeNodeId"] },
                    { "activeCore", activeCore },
                    { "uptimeSeconds", uptimeSeconds },
                    { "uploadSpeed", uploadSpeed },
                    { "downloadSpeed", downloadSpeed },
                    { "totalUploaded", totalUploaded },
                    { "totalDownloaded", totalDownloaded },
                    { "coreRunning", true },
                    { "coreError", (object)null }
                };

                SendEvent("connection-state-update", connObj);
            }
        }

        private async Task<Dictionary<string, object>> StartConnection(string nodeId)
        {
            string targetId = nodeId;
            if (string.IsNullOrEmpty(targetId) && storeData.ContainsKey("activeNodeId") && storeData["activeNodeId"] != null)
            {
                targetId = storeData["activeNodeId"].ToString();
            }

            var nodes = (ArrayList)storeData["nodes"];
            Dictionary<string, object> targetNode = null;

            foreach (var item in nodes)
            {
                var d = item as Dictionary<string, object>;
                if (d != null)
                {
                    if (d.ContainsKey("id") && d["id"].ToString() == targetId)
                    {
                        targetNode = d;
                        break;
                    }
                }
            }

            if (targetNode == null && nodes.Count > 0)
            {
                var firstNode = nodes[0] as Dictionary<string, object>;
                if (firstNode != null)
                {
                    targetNode = firstNode;
                    targetId = targetNode["id"].ToString();
                }
            }

            if (targetNode == null)
            {
                return new Dictionary<string, object> { { "success", false }, { "error", "No proxy node available" } };
            }

            storeData["activeNodeId"] = targetId;
            SaveStore();

            string sbExe = Path.Combine(binDir, "sing-box.exe");
            string xrExe = Path.Combine(binDir, "xray.exe");

            if (!File.Exists(sbExe) || !File.Exists(xrExe))
            {
                string err = "Core binaries sing-box.exe or xray.exe missing in " + binDir;
                AddLog("[Error] " + err);
                return new Dictionary<string, object> { { "success", false }, { "error", err } };
            }

            try
            {
                var p = Process.Start(new ProcessStartInfo("ipconfig", "/flushdns") { CreateNoWindow = true, UseShellExecute = false });
                if (p != null) p.WaitForExit(1000);
            }
            catch { }

            string nodeName = targetNode.ContainsKey("name") ? targetNode["name"].ToString() : "Node";
            string server = targetNode.ContainsKey("server") ? targetNode["server"].ToString() : "";
            int port = targetNode.ContainsKey("port") ? Convert.ToInt32(targetNode["port"]) : 443;
            string protocol = targetNode.ContainsKey("protocol") ? targetNode["protocol"].ToString() : "vless";

            bool isHotSwitch = (singBoxProc != null && !singBoxProc.HasExited && isConnected);

            if (isHotSwitch)
            {
                AddLog(string.Format("[Engine] Switching server to \"{0}\" ({1}, {2}:{3})...", nodeName, protocol.ToUpper(), server, port));
                isSwitchingNode = true;

                // Stop only Xray process
                if (xrayProc != null)
                {
                    try
                    {
                        int pid = xrayProc.Id;
                        var p = Process.Start(new ProcessStartInfo("taskkill", string.Format("/f /t /pid {0}", pid)) { CreateNoWindow = true, UseShellExecute = false });
                        if (p != null) p.WaitForExit(500);
                        xrayProc = null;
                    }
                    catch { }
                }

                try
                {
                    var xrConfig = GenerateXrayChained(targetNode, FixedSocksPort, FixedHttpPort);
                    File.WriteAllText(secondaryConfigPath, json.Serialize(xrConfig), Utf8NoBom);
                }
                catch (Exception ex)
                {
                    isSwitchingNode = false;
                    AddLog("[Error] Failed to generate Xray config: " + ex.Message);
                    return new Dictionary<string, object> { { "success", false }, { "error", ex.Message } };
                }

                Exception restartEx = null;
                try
                {
                    ProcessStartInfo xrPsi = new ProcessStartInfo
                    {
                        FileName = xrExe,
                        Arguments = string.Format("run -c \"{0}\"", secondaryConfigPath),
                        WorkingDirectory = binDir,
                        CreateNoWindow = true,
                        UseShellExecute = false,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true
                    };

                    xrayProc = new Process { StartInfo = xrPsi };
                    xrayProc.OutputDataReceived += (s, ev) => OnXrayOutput(ev.Data);
                    xrayProc.ErrorDataReceived += (s, ev) => OnXrayOutput(ev.Data);
                    xrayProc.EnableRaisingEvents = true;
                    xrayProc.Exited += (s, ev) =>
                    {
                        if (isConnected && !isSwitchingNode)
                        {
                            this.BeginInvoke(new Action(async () =>
                            {
                                if (isConnected && !isSwitchingNode)
                                {
                                    AddLog("[Engine] Xray core exited unexpectedly");
                                    await StopConnection();
                                }
                            }));
                        }
                    };
                    xrayProc.Start();
                    xrayProc.BeginOutputReadLine();
                    xrayProc.BeginErrorReadLine();

                    for (int i = 0; i < 30; i++)
                    {
                        try
                        {
                            using (var tc = new TcpClient())
                            {
                                if (tc.ConnectAsync("127.0.0.1", FixedSocksPort).Wait(80)) break;
                            }
                        }
                        catch { }
                        await Task.Delay(80);
                    }

                    isSwitchingNode = false;
                    uptimeSeconds = 0;
                    UpdateTrayStatus(true, nodeName);
                    AddLog(string.Format("[Engine] Successfully switched to \"{0}\" (zero Wintun reload)", nodeName));
                    SendEvent("connection-state-update", GetFullState()["connection"]);
                    return new Dictionary<string, object> { { "success", true } };
                }
                catch (Exception ex)
                {
                    restartEx = ex;
                }

                if (restartEx != null)
                {
                    isSwitchingNode = false;
                    AddLog("[Error] Failed to restart Xray: " + restartEx.Message);
                    await StopConnection();
                    return new Dictionary<string, object> { { "success", false }, { "error", restartEx.Message } };
                }
            }

            // Fresh connection: Stop any previous cores first
            await StopConnection();

            AddLog(string.Format("[Engine] Connecting to \"{0}\" ({1}, {2}:{3}) via tunnel [{4}]...", nodeName, protocol.ToUpper(), server, port, FixedTunInterface));

            try
            {
                var xrConfig = GenerateXrayChained(targetNode, FixedSocksPort, FixedHttpPort);
                File.WriteAllText(secondaryConfigPath, json.Serialize(xrConfig), Utf8NoBom);
                AddLog(string.Format("[Config] Generated Xray config (SOCKS 127.0.0.1:{0}, HTTP 127.0.0.1:{1})", FixedSocksPort, FixedHttpPort));
            }
            catch (Exception ex)
            {
                string err = "Failed to generate Xray config: " + ex.Message;
                AddLog("[Error] " + err);
                return new Dictionary<string, object> { { "success", false }, { "error", err } };
            }

            try
            {
                var sbConfig = GenerateSingBoxChained(targetNode, FixedSocksPort, FixedTunInterface, FixedTunAddress);
                File.WriteAllText(configPath, json.Serialize(sbConfig), Utf8NoBom);
                AddLog(string.Format("[Config] Generated Sing-box TUN adapter config ({0})", FixedTunInterface));
            }
            catch (Exception ex)
            {
                string err = "Failed to generate Sing-box config: " + ex.Message;
                AddLog("[Error] " + err);
                return new Dictionary<string, object> { { "success", false }, { "error", err } };
            }

            try
            {
                AddLog("[Engine] Launching xray.exe proxy core...");
                ProcessStartInfo xrPsi = new ProcessStartInfo
                {
                    FileName = xrExe,
                    Arguments = string.Format("run -c \"{0}\"", secondaryConfigPath),
                    WorkingDirectory = binDir,
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                };

                xrayProc = new Process { StartInfo = xrPsi };
                xrayProc.OutputDataReceived += (s, ev) => OnXrayOutput(ev.Data);
                xrayProc.ErrorDataReceived += (s, ev) => OnXrayOutput(ev.Data);
                xrayProc.EnableRaisingEvents = true;
                xrayProc.Exited += (s, ev) =>
                {
                    if (isConnected && !isSwitchingNode)
                    {
                        this.BeginInvoke(new Action(async () =>
                        {
                            if (isConnected && !isSwitchingNode)
                            {
                                AddLog("[Engine] Xray core exited unexpectedly");
                                await StopConnection();
                            }
                        }));
                    }
                };
                xrayProc.Start();
                xrayProc.BeginOutputReadLine();
                xrayProc.BeginErrorReadLine();

                // Wait for Xray SOCKS port to be ready before starting Sing-box
                for (int i = 0; i < 30; i++)
                {
                    try
                    {
                        using (var tc = new TcpClient())
                        {
                            if (tc.ConnectAsync("127.0.0.1", FixedSocksPort).Wait(80))
                            {
                                break;
                            }
                        }
                    }
                    catch { }
                    await Task.Delay(80);
                }

                AddLog(string.Format("[Engine] Launching sing-box.exe for TUN adapter ({0}) & routing...", FixedTunInterface));
                ProcessStartInfo sbPsi = new ProcessStartInfo
                {
                    FileName = sbExe,
                    Arguments = string.Format("run -c \"{0}\"", configPath),
                    WorkingDirectory = binDir,
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                };

                singBoxProc = new Process { StartInfo = sbPsi };
                singBoxProc.OutputDataReceived += (s, ev) => { if (!string.IsNullOrEmpty(ev.Data)) AddLog("[sing-box] " + ev.Data.Trim()); };
                singBoxProc.ErrorDataReceived += (s, ev) => { if (!string.IsNullOrEmpty(ev.Data)) AddLog("[sing-box] " + ev.Data.Trim()); };
                singBoxProc.EnableRaisingEvents = true;
                singBoxProc.Exited += (s, ev) =>
                {
                    if (isConnected)
                    {
                        this.BeginInvoke(new Action(async () =>
                        {
                            if (isConnected)
                            {
                                AddLog("[Engine] Sing-box process exited unexpectedly");
                                await StopConnection();
                            }
                        }));
                    }
                };
                singBoxProc.Start();
                singBoxProc.BeginOutputReadLine();
                singBoxProc.BeginErrorReadLine();

                EnableSystemProxy("127.0.0.1", FixedHttpPort);
                isConnected = true;
                uptimeSeconds = 0;
                lastNicBytesSent = 0;
                lastNicBytesRecv = 0;
                UpdateTrayStatus(true, nodeName);
                SendEvent("connection-state-update", GetFullState()["connection"]);
                return new Dictionary<string, object> { { "success", true } };
            }
            catch (Exception ex)
            {
                AddLog("[Engine Start Failure] " + ex.Message);
                return new Dictionary<string, object> { { "success", false }, { "error", ex.Message } };
            }
        }

        private async Task<Dictionary<string, object>> StopConnection()
        {
            DisableSystemProxy();

            try { if (File.Exists(configPath)) File.Delete(configPath); } catch { }
            try { if (File.Exists(secondaryConfigPath)) File.Delete(secondaryConfigPath); } catch { }

            bool stoppedAny = false;

            if (singBoxProc != null)
            {
                try
                {
                    int pid = singBoxProc.Id;
                    AddLog(string.Format("[Engine] Stopping primary process (PID: {0})...", pid));
                    var p1 = Process.Start(new ProcessStartInfo("taskkill", string.Format("/t /pid {0}", pid)) { CreateNoWindow = true, UseShellExecute = false });
                    if (p1 != null) p1.WaitForExit(400);
                    if (singBoxProc != null && !singBoxProc.HasExited)
                    {
                        var p2 = Process.Start(new ProcessStartInfo("taskkill", string.Format("/f /t /pid {0}", pid)) { CreateNoWindow = true, UseShellExecute = false });
                        if (p2 != null) p2.WaitForExit(1000);
                    }
                    singBoxProc = null;
                    stoppedAny = true;
                }
                catch { }
            }

            if (xrayProc != null)
            {
                try
                {
                    int pid = xrayProc.Id;
                    AddLog(string.Format("[Engine] Stopping helper process (PID: {0})...", pid));
                    var p = Process.Start(new ProcessStartInfo("taskkill", string.Format("/f /t /pid {0}", pid)) { CreateNoWindow = true, UseShellExecute = false });
                    if (p != null) p.WaitForExit(1000);
                    xrayProc = null;
                    stoppedAny = true;
                }
                catch { }
            }

            if (stoppedAny)
            {
                await Task.Delay(400);
                AddLog("[Engine] AtmosphereEx proxy processes stopped cleanly");
            }

            isConnected = false;
            uploadSpeed = 0;
            downloadSpeed = 0;
            lastNicBytesSent = 0;
            lastNicBytesRecv = 0;
            UpdateTrayStatus(false);

            SendEvent("connection-state-update", GetFullState()["connection"]);

            return new Dictionary<string, object> { { "success", true } };
        }

        private static Dictionary<string, object> Dict(params object[] pairs)
        {
            var d = new Dictionary<string, object>();
            for (int i = 0; i < pairs.Length - 1; i += 2)
            {
                d[(string)pairs[i]] = pairs[i + 1];
            }
            return d;
        }

        private Dictionary<string, object> BuildSingBoxOutbound(Dictionary<string, object> node)
        {
            string protocol = node.ContainsKey("protocol") ? node["protocol"].ToString() : "vless";
            string server = node.ContainsKey("server") ? node["server"].ToString() : "";
            int port = node.ContainsKey("port") ? Convert.ToInt32(node["port"]) : 443;
            string uuid = node.ContainsKey("uuid") ? node["uuid"].ToString() : "";
            string flow = node.ContainsKey("flow") && node["flow"] != null ? node["flow"].ToString() : "";
            string security = node.ContainsKey("security") && node["security"] != null ? node["security"].ToString() : "none";
            string network = node.ContainsKey("network") && node["network"] != null ? node["network"].ToString() : "tcp";
            string sni = node.ContainsKey("sni") && node["sni"] != null ? node["sni"].ToString() : server;
            string pubKey = node.ContainsKey("publicKey") && node["publicKey"] != null ? node["publicKey"].ToString() : "";
            string shortId = node.ContainsKey("shortId") && node["shortId"] != null ? node["shortId"].ToString() : "";
            string fp = node.ContainsKey("fingerprint") && node["fingerprint"] != null ? node["fingerprint"].ToString() : "chrome";
            string serviceName = node.ContainsKey("serviceName") && node["serviceName"] != null ? node["serviceName"].ToString() : "grpc";
            string path = node.ContainsKey("path") && node["path"] != null ? node["path"].ToString() : "/";

            var outbound = Dict(
                "tag", "proxy",
                "server", server,
                "server_port", port
            );

            if (protocol == "vless")
            {
                outbound["type"] = "vless";
                outbound["uuid"] = uuid;
                outbound["packet_encoding"] = "xudp";
                if (!string.IsNullOrEmpty(flow) && network == "tcp") outbound["flow"] = flow;

                if (security == "reality")
                {
                    outbound["tls"] = Dict(
                        "enabled", true,
                        "server_name", sni,
                        "utls", Dict("enabled", true, "fingerprint", fp),
                        "reality", Dict("enabled", true, "public_key", pubKey, "short_id", shortId)
                    );
                }
                else if (security == "tls")
                {
                    outbound["tls"] = Dict(
                        "enabled", true,
                        "server_name", sni,
                        "utls", Dict("enabled", true, "fingerprint", fp)
                    );
                }

                if (network == "grpc")
                {
                    outbound["transport"] = Dict("type", "grpc", "service_name", serviceName);
                }
                else if (network == "ws")
                {
                    var headers = new Dictionary<string, object>();
                    if (!string.IsNullOrEmpty(sni)) headers["Host"] = sni;
                    outbound["transport"] = Dict("type", "ws", "path", path, "headers", headers);
                }
                else if (network == "http" || network == "httpupgrade")
                {
                    outbound["transport"] = Dict("type", "httpupgrade", "path", path);
                }
            }
            else if (protocol == "vmess")
            {
                outbound["type"] = "vmess";
                outbound["uuid"] = uuid;
                outbound["security"] = "auto";
                outbound["packet_encoding"] = "xudp";
                if (security == "tls") outbound["tls"] = Dict("enabled", true, "server_name", sni);
                if (network == "ws") outbound["transport"] = Dict("type", "ws", "path", path);
            }
            else if (protocol == "trojan")
            {
                outbound["type"] = "trojan";
                outbound["password"] = node.ContainsKey("password") ? node["password"].ToString() : "";
                outbound["tls"] = Dict("enabled", true, "server_name", sni);
            }
            else if (protocol == "shadowsocks")
            {
                outbound["type"] = "shadowsocks";
                outbound["method"] = node.ContainsKey("cipher") ? node["cipher"].ToString() : "aes-256-gcm";
                outbound["password"] = node.ContainsKey("password") ? node["password"].ToString() : "";
            }

            return outbound;
        }

        private Dictionary<string, object> GenerateSingBoxChained(Dictionary<string, object> node, int socksPort, string tunInterfaceName, string tunAddress)
        {
            string server = node.ContainsKey("server") && node["server"] != null ? node["server"].ToString().Trim() : "";

            var inbounds = new object[]
            {
                Dict(
                    "type", "tun",
                    "tag", "tun-in",
                    "interface_name", tunInterfaceName,
                    "address", new object[] { tunAddress, "fdfe:dcba:9876::1/126" },
                    "mtu", 1500,
                    "auto_route", true,
                    "strict_route", true,
                    "stack", "mixed"
                )
            };

            var outbounds = new object[]
            {
                Dict(
                    "type", "socks",
                    "tag", "proxy",
                    "server", "127.0.0.1",
                    "server_port", socksPort,
                    "udp_fragment", true,
                    "domain_resolver", Dict("server", "dns-proxy", "strategy", "prefer_ipv4")
                ),
                Dict(
                    "type", "direct",
                    "tag", "direct",
                    "domain_resolver", Dict("server", "dns-proxy", "strategy", "prefer_ipv4")
                ),
                Dict(
                    "type", "block",
                    "tag", "block"
                )
            };

            var routeRules = new List<object>
            {
                Dict(
                    "outbound", "direct",
                    "process_name", new object[] { "AtmosphereEx.exe", "xray.exe", "sing-box.exe" }
                )
            };

            var seenServers = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (!string.IsNullOrEmpty(server)) seenServers.Add(server);

            var allNodes = storeData.ContainsKey("nodes") ? storeData["nodes"] as ArrayList : null;
            if (allNodes != null)
            {
                foreach (var item in allNodes)
                {
                    var d = item as Dictionary<string, object>;
                    if (d != null && d.ContainsKey("server") && d["server"] != null)
                    {
                        string s = d["server"].ToString().Trim();
                        if (!string.IsNullOrEmpty(s)) seenServers.Add(s);
                    }
                }
            }

            foreach (var srv in seenServers)
            {
                if (System.Text.RegularExpressions.Regex.IsMatch(srv, @"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$"))
                {
                    routeRules.Add(Dict("outbound", "direct", "ip_cidr", new object[] { srv + "/32" }));
                }
                else
                {
                    routeRules.Add(Dict("outbound", "direct", "domain", new object[] { srv }));
                }
            }

            routeRules.Add(Dict("action", "sniff"));
            routeRules.Add(Dict("action", "hijack-dns", "protocol", "dns"));
            routeRules.Add(Dict("outbound", "block", "ip_version", 6));

            var dnsServers = new object[]
            {
                Dict(
                    "type", "udp",
                    "tag", "dns-proxy",
                    "server", "1.1.1.1",
                    "detour", "proxy"
                ),
                Dict(
                    "type", "udp",
                    "tag", "dns-direct",
                    "server", "1.1.1.1",
                    "detour", "direct"
                )
            };

            var serverDomainList = new List<string>();
            foreach (var srv in seenServers)
            {
                if (!System.Text.RegularExpressions.Regex.IsMatch(srv, @"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$"))
                {
                    serverDomainList.Add(srv);
                }
            }

            var dnsRules = new List<object>();
            if (serverDomainList.Count > 0)
            {
                dnsRules.Add(Dict("server", "dns-direct", "domain", serverDomainList.ToArray()));
            }
            dnsRules.Add(Dict("server", "dns-proxy"));

            return Dict(
                "log", Dict("level", "info", "timestamp", true),
                "dns", Dict(
                    "servers", dnsServers,
                    "rules", dnsRules.ToArray(),
                    "strategy", "ipv4_only",
                    "final", "dns-proxy"
                ),
                "inbounds", inbounds,
                "outbounds", outbounds,
                "route", Dict(
                    "rules", routeRules.ToArray(),
                    "auto_detect_interface", true,
                    "final", "proxy"
                )
            );
        }

        private Dictionary<string, object> GenerateXrayChained(Dictionary<string, object> node, int socksPort, int httpPort)
        {
            string protocol = node.ContainsKey("protocol") && node["protocol"] != null ? node["protocol"].ToString() : "vless";
            string server = node.ContainsKey("server") && node["server"] != null ? node["server"].ToString().Trim() : "";
            int port = node.ContainsKey("port") ? Convert.ToInt32(node["port"]) : 443;
            string uuid = node.ContainsKey("uuid") && node["uuid"] != null ? node["uuid"].ToString() : "";
            string flow = node.ContainsKey("flow") && node["flow"] != null ? node["flow"].ToString() : "";
            string security = node.ContainsKey("security") && node["security"] != null ? node["security"].ToString() : "none";
            string network = node.ContainsKey("network") && node["network"] != null ? node["network"].ToString() : "tcp";
            string sni = node.ContainsKey("sni") && node["sni"] != null ? node["sni"].ToString() : server;
            string pubKey = node.ContainsKey("publicKey") && node["publicKey"] != null ? node["publicKey"].ToString() : "";
            string shortId = node.ContainsKey("shortId") && node["shortId"] != null ? node["shortId"].ToString() : "";
            string fp = node.ContainsKey("fingerprint") && node["fingerprint"] != null ? node["fingerprint"].ToString() : "chrome";
            string serviceName = node.ContainsKey("serviceName") && node["serviceName"] != null ? node["serviceName"].ToString() : "grpc";
            string path = node.ContainsKey("path") && node["path"] != null ? node["path"].ToString() : "/";
            string mode = node.ContainsKey("mode") && node["mode"] != null ? node["mode"].ToString() : "";
            string rawUri = node.ContainsKey("rawUri") && node["rawUri"] != null ? node["rawUri"].ToString() : "";

            // Parse extra query parameters if present in rawUri (e.g. xhttp mode/extra/alpn)
            object extraObj = null;
            string[] alpnArr = null;

            if (!string.IsNullOrEmpty(rawUri) && rawUri.Contains("?"))
            {
                try
                {
                    int qIndex = rawUri.IndexOf('?');
                    int hIndex = rawUri.IndexOf('#');
                    string qStr = hIndex >= 0 ? rawUri.Substring(qIndex + 1, hIndex - qIndex - 1) : rawUri.Substring(qIndex + 1);
                    string[] qParts = qStr.Split('&');
                    foreach (var qp in qParts)
                    {
                        string[] kv = qp.Split('=');
                        if (kv.Length >= 2)
                        {
                            string k = kv[0];
                            string v = Uri.UnescapeDataString(kv[1]);
                            if (k.Equals("mode", StringComparison.OrdinalIgnoreCase) && string.IsNullOrEmpty(mode))
                            {
                                mode = v;
                            }
                            else if (k.Equals("extra", StringComparison.OrdinalIgnoreCase))
                            {
                                try
                                {
                                    extraObj = json.Deserialize<Dictionary<string, object>>(v);
                                }
                                catch { }
                            }
                            else if (k.Equals("alpn", StringComparison.OrdinalIgnoreCase))
                            {
                                alpnArr = v.Split(new char[] { ',' }, StringSplitOptions.RemoveEmptyEntries);
                            }
                        }
                    }
                }
                catch { }
            }

            var inbounds = new object[]
            {
                Dict(
                    "tag", "socks-in",
                    "port", socksPort,
                    "listen", "127.0.0.1",
                    "protocol", "socks",
                    "settings", Dict("auth", "noauth", "udp", true),
                    "sniffing", Dict("enabled", true, "destOverride", new object[] { "http", "tls", "quic" })
                ),
                Dict(
                    "tag", "http-in",
                    "port", httpPort,
                    "listen", "127.0.0.1",
                    "protocol", "http",
                    "sniffing", Dict("enabled", true, "destOverride", new object[] { "http", "tls", "quic" })
                )
            };

            var streamSettings = Dict("network", network, "security", security);

            if (security == "reality")
            {
                streamSettings["realitySettings"] = Dict(
                    "show", false,
                    "serverName", sni,
                    "fingerprint", fp,
                    "publicKey", pubKey,
                    "shortId", shortId,
                    "spiderX", ""
                );
            }
            else if (security == "tls")
            {
                var tlsDict = Dict("serverName", sni, "fingerprint", fp);
                if (alpnArr != null && alpnArr.Length > 0)
                {
                    tlsDict["alpn"] = alpnArr;
                }
                streamSettings["tlsSettings"] = tlsDict;
            }

            if (network == "tcp")
            {
                streamSettings["tcpSettings"] = new Dictionary<string, object>();
            }
            else if (network == "grpc")
            {
                bool multi = mode == "multi" || (!string.IsNullOrEmpty(rawUri) && rawUri.Contains("mode=multi"));
                streamSettings["grpcSettings"] = Dict("serviceName", serviceName, "multiMode", multi);
            }
            else if (network == "xhttp" || network == "splithttp")
            {
                var xhttp = new Dictionary<string, object>();
                if (!string.IsNullOrEmpty(path)) xhttp["path"] = path;
                if (!string.IsNullOrEmpty(sni)) xhttp["host"] = sni;
                if (!string.IsNullOrEmpty(mode)) xhttp["mode"] = mode;
                if (extraObj != null) xhttp["extra"] = extraObj;
                streamSettings["xhttpSettings"] = xhttp;
            }
            else if (network == "ws")
            {
                var headers = new Dictionary<string, object>();
                if (!string.IsNullOrEmpty(sni)) headers["Host"] = sni;
                streamSettings["wsSettings"] = Dict("path", path, "headers", headers);
            }
            else if (network == "http" || network == "httpupgrade")
            {
                streamSettings["httpupgradeSettings"] = Dict("path", path, "host", sni);
            }

            Dictionary<string, object> proxySettings = null;
            if (protocol == "vless")
            {
                var vnextUser = Dict("id", uuid, "encryption", "none");
                if (!string.IsNullOrEmpty(flow) && network == "tcp") vnextUser["flow"] = flow;

                proxySettings = Dict(
                    "vnext", new object[]
                    {
                        Dict("address", server, "port", port, "users", new object[] { vnextUser })
                    }
                );
            }
            else if (protocol == "vmess")
            {
                var vnextUser = Dict("id", uuid, "alterId", 0, "security", "auto");
                proxySettings = Dict(
                    "vnext", new object[]
                    {
                        Dict("address", server, "port", port, "users", new object[] { vnextUser })
                    }
                );
            }
            else if (protocol == "trojan")
            {
                string pwd = node.ContainsKey("password") && node["password"] != null ? node["password"].ToString() : "";
                proxySettings = Dict(
                    "servers", new object[]
                    {
                        Dict("address", server, "port", port, "password", pwd)
                    }
                );
            }
            else if (protocol == "shadowsocks")
            {
                string pwd = node.ContainsKey("password") && node["password"] != null ? node["password"].ToString() : "";
                string cipher = node.ContainsKey("cipher") && node["cipher"] != null ? node["cipher"].ToString() : "aes-256-gcm";
                proxySettings = Dict(
                    "servers", new object[]
                    {
                        Dict("address", server, "port", port, "method", cipher, "password", pwd)
                    }
                );
            }
            else
            {
                // Fallback default to vless
                var vnextUser = Dict("id", uuid, "encryption", "none");
                proxySettings = Dict(
                    "vnext", new object[]
                    {
                        Dict("address", server, "port", port, "users", new object[] { vnextUser })
                    }
                );
            }

            var proxyOutbound = Dict(
                "tag", "proxy",
                "protocol", protocol,
                "settings", proxySettings,
                "streamSettings", streamSettings
            );

            return Dict(
                "log", Dict("loglevel", "error"),
                "dns", Dict("servers", new object[] { "8.8.8.8", "1.1.1.1", "localhost" }),
                "inbounds", inbounds,
                "outbounds", new object[]
                {
                    proxyOutbound,
                    Dict("tag", "direct", "protocol", "freedom", "settings", new Dictionary<string, object>()),
                    Dict("tag", "block", "protocol", "blackhole", "settings", Dict("response", Dict("type", "none")))
                },
                "routing", Dict(
                    "domainStrategy", "IPIfNonMatch",
                    "rules", new object[]
                    {
                        Dict("type", "field", "ip", new object[] { "geoip:private" }, "outboundTag", "direct")
                    }
                )
            );
        }

        private static int MeasureLatency(string srv, int port, bool useTunnel)
        {
            if (string.IsNullOrEmpty(srv)) return -1;
            var sw = Stopwatch.StartNew();
            try
            {
                if (useTunnel)
                {
                    using (var client = new TcpClient())
                    {
                        var connectTask = client.ConnectAsync("127.0.0.1", FixedSocksPort);
                        if (connectTask.Wait(1200))
                        {
                            var stream = client.GetStream();
                            stream.ReadTimeout = 1800;
                            stream.WriteTimeout = 1800;

                            // SOCKS5 Greeting: [VER=0x05, NMETHODS=1, METHOD=0x00 (NO AUTH)]
                            stream.Write(new byte[] { 0x05, 0x01, 0x00 }, 0, 3);
                            byte[] resp = new byte[2];
                            int read = stream.Read(resp, 0, 2);
                            if (read == 2 && resp[0] == 0x05 && resp[1] == 0x00)
                            {
                                // SOCKS5 Connect Request
                                byte[] hostBytes = Encoding.ASCII.GetBytes(srv);
                                byte[] req = new byte[7 + hostBytes.Length];
                                req[0] = 0x05; // VER
                                req[1] = 0x01; // CMD: CONNECT
                                req[2] = 0x00; // RSV
                                req[3] = 0x03; // ATYP: DOMAIN
                                req[4] = (byte)hostBytes.Length;
                                Buffer.BlockCopy(hostBytes, 0, req, 5, hostBytes.Length);
                                req[5 + hostBytes.Length] = (byte)(port >> 8);
                                req[6 + hostBytes.Length] = (byte)(port & 0xFF);
                                stream.Write(req, 0, req.Length);

                                byte[] connResp = new byte[10];
                                int connRead = stream.Read(connResp, 0, connResp.Length);
                                if (connRead >= 4 && connResp[1] == 0x00)
                                {
                                    sw.Stop();
                                    return (int)sw.ElapsedMilliseconds;
                                }
                            }
                        }
                    }
                }
                else
                {
                    using (var client = new TcpClient())
                    {
                        var connectTask = client.ConnectAsync(srv, port);
                        if (connectTask.Wait(1500))
                        {
                            sw.Stop();
                            return (int)sw.ElapsedMilliseconds;
                        }
                    }
                }
            }
            catch { }
            return -1;
        }

        private async Task<int> PingNodeAsync(string nodeId)
        {
            var nodes = (ArrayList)storeData["nodes"];
            Dictionary<string, object> target = null;
            foreach (var it in nodes)
            {
                var d = it as Dictionary<string, object>;
                if (d != null && d.ContainsKey("id") && d["id"].ToString() == nodeId)
                {
                    target = d;
                    break;
                }
            }

            if (target == null) return -1;

            string srv = target.ContainsKey("server") ? target["server"].ToString() : "";
            int port = target.ContainsKey("port") ? Convert.ToInt32(target["port"]) : 443;
            bool tunnelActive = isConnected && singBoxProc != null && !singBoxProc.HasExited;

            int lat = await Task.Run(() => MeasureLatency(srv, port, tunnelActive));

            target["latency"] = lat;
            SaveStore();
            return lat;
        }

        private async Task<Dictionary<string, int>> PingAllNodesAsync()
        {
            var nodes = (ArrayList)storeData["nodes"];
            var tasks = new List<Task<KeyValuePair<string, int>>>();
            bool tunnelActive = isConnected && singBoxProc != null && !singBoxProc.HasExited;
            var throttler = new SemaphoreSlim(12);

            foreach (var item in nodes)
            {
                var d = item as Dictionary<string, object>;
                if (d != null && d.ContainsKey("id"))
                {
                    string id = d["id"].ToString();
                    string srv = d.ContainsKey("server") ? d["server"].ToString() : "";
                    int port = d.ContainsKey("port") ? Convert.ToInt32(d["port"]) : 443;

                    tasks.Add(Task.Run(async () =>
                    {
                        await throttler.WaitAsync();
                        try
                        {
                            int lat = MeasureLatency(srv, port, tunnelActive);
                            return new KeyValuePair<string, int>(id, lat);
                        }
                        finally
                        {
                            throttler.Release();
                        }
                    }));
                }
            }

            var results = await Task.WhenAll(tasks);
            try { throttler.Dispose(); } catch { }
            var map = new Dictionary<string, int>();
            foreach (var r in results)
            {
                map[r.Key] = r.Value;
                foreach (var item in nodes)
                {
                    var d = item as Dictionary<string, object>;
                    if (d != null && d["id"].ToString() == r.Key)
                    {
                        d["latency"] = r.Value;
                    }
                }
            }

            SaveStore();
            return map;
        }

        private Dictionary<string, object> HandleAddNode(object linkOrData)
        {
            string link = linkOrData as string;
            if (link != null)
            {
                var parsed = ParseLink(link);
                if (parsed != null)
                {
                    var nodes = (ArrayList)storeData["nodes"];
                    nodes.Add(parsed);
                    SaveStore();
                    return new Dictionary<string, object> { { "success", true }, { "node", parsed } };
                }
                return new Dictionary<string, object> { { "success", false }, { "error", "Failed to parse link" } };
            }
            
            var d = linkOrData as Dictionary<string, object>;
            if (d != null)
            {
                d["id"] = "node-" + Guid.NewGuid().ToString("N").Substring(0, 8);
                var nodes = (ArrayList)storeData["nodes"];
                nodes.Add(d);
                SaveStore();
                return new Dictionary<string, object> { { "success", true }, { "node", d } };
            }
            return new Dictionary<string, object> { { "success", false }, { "error", "Invalid node data" } };
        }

        private bool HandleDeleteNode(string nodeId)
        {
            var nodes = (ArrayList)storeData["nodes"];
            for (int i = 0; i < nodes.Count; i++)
            {
                var d = nodes[i] as Dictionary<string, object>;
                if (d != null && d.ContainsKey("id") && d["id"].ToString() == nodeId)
                {
                    nodes.RemoveAt(i);
                    SaveStore();
                    if (isConnected && storeData.ContainsKey("activeNodeId"))
                    {
                        var activeVal = storeData["activeNodeId"];
                        if (activeVal != null && activeVal.ToString() == nodeId)
                        {
                            Task.Run(async () => { await StopConnection(); });
                        }
                    }
                    return true;
                }
            }
            return false;
        }

        private async Task<Dictionary<string, object>> AddSubscriptionAsync(string name, string url)
        {
            try
            {
                string hwid = storeData["hwid"].ToString();
                var fetchResult = await DownloadSubscriptionAsync(url, hwid);
                var parsedNodes = ParseSubscriptionContent(fetchResult.Content);

                if (parsedNodes.Count == 0)
                {
                    return new Dictionary<string, object> { { "success", false }, { "error", "Subscription returned 0 valid nodes" } };
                }

                string fallback = ExtractFallbackTitleFromUrl(url);
                string finalName = !string.IsNullOrEmpty(fetchResult.Title) 
                    ? fetchResult.Title 
                    : (!string.IsNullOrEmpty(name) && !name.Equals("Subscription", StringComparison.OrdinalIgnoreCase) && !name.Equals("Подписка", StringComparison.OrdinalIgnoreCase) && !name.Equals("Imported Subscription", StringComparison.OrdinalIgnoreCase)
                        ? name 
                        : (!string.IsNullOrEmpty(fallback) ? fallback : "Subscription"));

                string subId = "sub-" + Guid.NewGuid().ToString("N").Substring(0, 8);
                foreach (var n in parsedNodes) n["subscriptionId"] = subId;

                var nodes = (ArrayList)storeData["nodes"];
                foreach (var n in parsedNodes) nodes.Add(n);

                var sub = new Dictionary<string, object>
                {
                    { "id", subId },
                    { "name", finalName },
                    { "url", url },
                    { "updatedAt", DateTime.UtcNow.ToString("o") },
                    { "nodeCount", parsedNodes.Count }
                };

                var subs = (ArrayList)storeData["subscriptions"];
                subs.Add(sub);

                SaveStore();
                return new Dictionary<string, object> { { "success", true }, { "subscription", sub }, { "count", parsedNodes.Count } };
            }
            catch (Exception ex)
            {
                return new Dictionary<string, object> { { "success", false }, { "error", ex.Message } };
            }
        }

        private async Task<Dictionary<string, object>> UpdateSubscriptionAsync(string subId)
        {
            var subs = (ArrayList)storeData["subscriptions"];
            Dictionary<string, object> targetSub = null;
            foreach (var s in subs)
            {
                var d = s as Dictionary<string, object>;
                if (d != null && d["id"].ToString() == subId)
                {
                    targetSub = d;
                    break;
                }
            }

            if (targetSub == null) return new Dictionary<string, object> { { "success", false }, { "error", "Subscription not found" } };

            try
            {
                string url = targetSub["url"].ToString();
                string hwid = storeData["hwid"].ToString();
                var fetchResult = await DownloadSubscriptionAsync(url, hwid);
                var parsedNodes = ParseSubscriptionContent(fetchResult.Content);

                var nodes = (ArrayList)storeData["nodes"];
                for (int i = nodes.Count - 1; i >= 0; i--)
                {
                    var d = nodes[i] as Dictionary<string, object>;
                    if (d != null && d.ContainsKey("subscriptionId") && d["subscriptionId"].ToString() == subId)
                    {
                        nodes.RemoveAt(i);
                    }
                }

                foreach (var n in parsedNodes)
                {
                    n["subscriptionId"] = subId;
                    nodes.Add(n);
                }

                if (!string.IsNullOrEmpty(fetchResult.Title))
                {
                    targetSub["name"] = fetchResult.Title;
                }
                else
                {
                    string curName = targetSub.ContainsKey("name") && targetSub["name"] != null ? targetSub["name"].ToString().Trim() : "";
                    if (string.IsNullOrEmpty(curName) || curName.Equals("Subscription", StringComparison.OrdinalIgnoreCase) || curName.Equals("Imported Subscription", StringComparison.OrdinalIgnoreCase))
                    {
                        string fallback = ExtractFallbackTitleFromUrl(url);
                        if (!string.IsNullOrEmpty(fallback)) targetSub["name"] = fallback;
                    }
                }

                targetSub["updatedAt"] = DateTime.UtcNow.ToString("o");
                targetSub["nodeCount"] = parsedNodes.Count;

                SaveStore();
                return new Dictionary<string, object> { { "success", true }, { "count", parsedNodes.Count } };
            }
            catch (Exception ex)
            {
                return new Dictionary<string, object> { { "success", false }, { "error", ex.Message } };
            }
        }

        private bool DeleteSubscription(string subId)
        {
            var subs = (ArrayList)storeData["subscriptions"];
            for (int i = 0; i < subs.Count; i++)
            {
                var d = subs[i] as Dictionary<string, object>;
                if (d != null && d["id"].ToString() == subId)
                {
                    subs.RemoveAt(i);
                    break;
                }
            }

            var nodes = (ArrayList)storeData["nodes"];
            for (int i = nodes.Count - 1; i >= 0; i--)
            {
                var d = nodes[i] as Dictionary<string, object>;
                if (d != null && d.ContainsKey("subscriptionId") && d["subscriptionId"].ToString() == subId)
                {
                    nodes.RemoveAt(i);
                }
            }

            SaveStore();
            return true;
        }

        private class SubscriptionFetchResult
        {
            public string Content;
            public string Title;
        }

        private static string ExtractFallbackTitleFromUrl(string url)
        {
            try
            {
                if (string.IsNullOrEmpty(url)) return null;
                var uri = new Uri(url);
                string host = uri.Host;
                string[] parts = host.Split('.');
                if (parts.Length >= 2)
                {
                    string brand = parts[parts.Length - 2];
                    if (brand.Length > 2)
                    {
                        return char.ToUpper(brand[0]) + brand.Substring(1);
                    }
                }
                return host;
            }
            catch { return null; }
        }

        private static string ExtractSubscriptionTitle(WebHeaderCollection headers, string body)
        {
            if (headers != null)
            {
                // 1. Profile-Title / X-Profile-Title / Subscription-Title
                string pt = headers["Profile-Title"] ?? headers["X-Profile-Title"] ?? headers["Subscription-Title"];
                if (!string.IsNullOrEmpty(pt))
                {
                    pt = pt.Trim();
                    if (pt.StartsWith("base64:", StringComparison.OrdinalIgnoreCase))
                    {
                        try
                        {
                            byte[] bytes = Convert.FromBase64String(pt.Substring(7).Trim());
                            string decoded = Encoding.UTF8.GetString(bytes).Trim();
                            if (!string.IsNullOrEmpty(decoded)) return decoded;
                        }
                        catch { }
                    }
                    else
                    {
                        try
                        {
                            string decoded = Uri.UnescapeDataString(pt).Trim();
                            if (!string.IsNullOrEmpty(decoded)) return decoded;
                        }
                        catch { }
                        return pt;
                    }
                }

                // 2. Content-Disposition: attachment; filename="xxx.txt"
                string cd = headers["Content-Disposition"];
                if (!string.IsNullOrEmpty(cd))
                {
                    try
                    {
                        string fname = null;
                        int uIdx = cd.IndexOf("filename*=", StringComparison.OrdinalIgnoreCase);
                        if (uIdx >= 0)
                        {
                            string part = cd.Substring(uIdx + 10).Trim('"', '\'', ' ', ';');
                            int quoteIdx = part.IndexOf("''");
                            if (quoteIdx >= 0) part = part.Substring(quoteIdx + 2);
                            fname = Uri.UnescapeDataString(part);
                        }
                        else
                        {
                            int fIdx = cd.IndexOf("filename=", StringComparison.OrdinalIgnoreCase);
                            if (fIdx >= 0)
                            {
                                string part = cd.Substring(fIdx + 9).Trim('"', '\'', ' ', ';');
                                int semi = part.IndexOf(';');
                                if (semi >= 0) part = part.Substring(0, semi).Trim('"', '\'');
                                fname = Uri.UnescapeDataString(part);
                            }
                        }

                        if (!string.IsNullOrEmpty(fname))
                        {
                            string cleanName = Path.GetFileNameWithoutExtension(fname).Trim();
                            if (!string.IsNullOrEmpty(cleanName)) return cleanName;
                        }
                    }
                    catch { }
                }
            }

            // 3. Look inside first few lines of body for profile-title
            if (!string.IsNullOrEmpty(body))
            {
                using (var reader = new StringReader(body))
                {
                    string line;
                    int count = 0;
                    while ((line = reader.ReadLine()) != null && count < 25)
                    {
                        count++;
                        line = line.Trim();
                        if (line.StartsWith("#profile-title:", StringComparison.OrdinalIgnoreCase) ||
                            line.StartsWith("# profile-title:", StringComparison.OrdinalIgnoreCase) ||
                            line.StartsWith("profile-title:", StringComparison.OrdinalIgnoreCase))
                        {
                            int colon = line.IndexOf(':');
                            string val = line.Substring(colon + 1).Trim();
                            if (val.StartsWith("base64:", StringComparison.OrdinalIgnoreCase))
                            {
                                try
                                {
                                    byte[] bytes = Convert.FromBase64String(val.Substring(7).Trim());
                                    string decoded = Encoding.UTF8.GetString(bytes).Trim();
                                    if (!string.IsNullOrEmpty(decoded)) return decoded;
                                }
                                catch { }
                            }
                            else
                            {
                                if (!string.IsNullOrEmpty(val)) return val;
                            }
                        }
                    }
                }
            }

            return null;
        }

        private async Task<SubscriptionFetchResult> DownloadSubscriptionAsync(string url, string hwid)
        {
            url = (url ?? "").Trim();
            Uri validatedUri;
            if (!Uri.TryCreate(url, UriKind.Absolute, out validatedUri) ||
                (validatedUri.Scheme != Uri.UriSchemeHttp && validatedUri.Scheme != Uri.UriSchemeHttps))
            {
                throw new Exception("Недопустимый URL подписки. Разрешены только протоколы http и https.");
            }

            if (validatedUri.IsLoopback || validatedUri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase))
            {
                throw new Exception("Обращение к локальным адресам (localhost/127.0.0.1) запрещено.");
            }

            Program.ConfigureSecurityProtocols();

            Exception lastEx = null;

            // Attempt 1: Modern HttpWebRequest
            try
            {
                return await Task.Run(() =>
                {
                    var request = (HttpWebRequest)WebRequest.Create(validatedUri);
                    request.Method = "GET";
                    request.Timeout = 15000;
                    request.ReadWriteTimeout = 15000;
                    request.UserAgent = "v2rayN/6.23 (Windows NT 10.0; Win64; x64)";
                    request.Headers["X-HWID"] = hwid;
                    request.AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate;
                    request.Proxy = null;
                    request.AllowAutoRedirect = true;
                    request.MaximumAutomaticRedirections = 10;

                    using (var response = (HttpWebResponse)request.GetResponse())
                    using (var stream = response.GetResponseStream())
                    using (var reader = new StreamReader(stream, Encoding.UTF8))
                    {
                        string body = reader.ReadToEnd();
                        string title = ExtractSubscriptionTitle(response.Headers, body);
                        return new SubscriptionFetchResult { Content = body, Title = title };
                    }
                });
            }
            catch (Exception ex)
            {
                lastEx = ex;
                AddLog(string.Format("[Subscription] HttpWebRequest attempt failed: {0}", ex.Message));
            }

            // Attempt 2: Native Windows curl.exe fallback (strictly sanitized, secure TLS)
            try
            {
                var curlResult = await Task.Run(() =>
                {
                    string curlPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "curl.exe");
                    if (!File.Exists(curlPath)) curlPath = "curl.exe";

                    string safeUrl = validatedUri.AbsoluteUri.Replace("\"", "%22").Replace(" ", "%20");
                    string safeHwid = System.Text.RegularExpressions.Regex.Replace(hwid ?? "", @"[^a-zA-Z0-9_\-]", "");

                    var psi = new ProcessStartInfo
                    {
                        FileName = curlPath,
                        Arguments = string.Format("-s -i -L --max-time 15 -H \"User-Agent: v2rayN/6.23\" -H \"X-HWID: {0}\" -- \"{1}\"", safeHwid, safeUrl),
                        CreateNoWindow = true,
                        UseShellExecute = false,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                        StandardOutputEncoding = Encoding.UTF8
                    };

                    using (var proc = Process.Start(psi))
                    {
                        string output = proc.StandardOutput.ReadToEnd();
                        proc.WaitForExit(18000);
                        if (proc.ExitCode == 0 && !string.IsNullOrEmpty(output))
                        {
                            string headersPart = "";
                            string bodyPart = output;
                            int headerSep = output.LastIndexOf("\r\n\r\n");
                            if (headerSep < 0) headerSep = output.LastIndexOf("\n\n");
                            if (headerSep >= 0)
                            {
                                headersPart = output.Substring(0, headerSep);
                                bodyPart = output.Substring(headerSep).TrimStart('\r', '\n');
                            }

                            var parsedHeaders = new WebHeaderCollection();
                            using (var sr = new StringReader(headersPart))
                            {
                                string hLine;
                                while ((hLine = sr.ReadLine()) != null)
                                {
                                    int col = hLine.IndexOf(':');
                                    if (col > 0)
                                    {
                                        string k = hLine.Substring(0, col).Trim();
                                        string v = hLine.Substring(col + 1).Trim();
                                        try { parsedHeaders[k] = v; } catch { }
                                    }
                                }
                            }

                            string title = ExtractSubscriptionTitle(parsedHeaders, bodyPart);
                            return new SubscriptionFetchResult { Content = bodyPart, Title = title };
                        }
                    }
                    return null;
                });

                if (curlResult != null && !string.IsNullOrEmpty(curlResult.Content))
                {
                    AddLog("[Subscription] Successfully fetched subscription using native curl fallback");
                    return curlResult;
                }
            }
            catch (Exception ex)
            {
                AddLog(string.Format("[Subscription] Curl fallback attempt failed: {0}", ex.Message));
            }

            // Attempt 3: WebClient fallback
            try
            {
                using (var wc = new WebClient())
                {
                    wc.Encoding = Encoding.UTF8;
                    wc.Headers["User-Agent"] = "v2rayN/6.23";
                    wc.Headers["X-HWID"] = hwid;
                    wc.Proxy = null;
                    string body = await wc.DownloadStringTaskAsync(url);
                    string title = ExtractSubscriptionTitle(wc.ResponseHeaders, body);
                    return new SubscriptionFetchResult { Content = body, Title = title };
                }
            }
            catch (Exception ex)
            {
                lastEx = ex;
            }

            throw lastEx ?? new Exception("Failed to download subscription from URL");
        }

        private async Task<string> DownloadStringAsync(string url, string hwid)
        {
            var r = await DownloadSubscriptionAsync(url, hwid);
            return r.Content;
        }

        private List<Dictionary<string, object>> ParseSubscriptionContent(string content)
        {
            var list = new List<Dictionary<string, object>>();
            content = (content ?? "").Trim();
            if (string.IsNullOrEmpty(content)) return list;

            // Try base64 decode if not plain lines
            if (!content.Contains("://"))
            {
                try
                {
                    string b64 = content.Replace('-', '+').Replace('_', '/').Trim();
                    int mod4 = b64.Length % 4;
                    if (mod4 == 2) b64 += "==";
                    else if (mod4 == 3) b64 += "=";
                    else if (mod4 == 1) b64 += "===";

                    byte[] bytes = Convert.FromBase64String(b64);
                    string decoded = Encoding.UTF8.GetString(bytes);
                    if (decoded.Contains("://"))
                    {
                        content = decoded;
                    }
                }
                catch { }
            }

            string[] lines = content.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var rawLine in lines)
            {
                string line = rawLine.Trim();
                if (string.IsNullOrEmpty(line)) continue;
                var node = ParseLink(line);
                if (node != null) list.Add(node);
            }
            return list;
        }

        private Dictionary<string, object> ParseLink(string raw)
        {
            raw = raw.Trim();
            if (raw.StartsWith("vless://"))
            {
                try
                {
                    // vless://uuid@host:port?params#name
                    string withoutPrefix = raw.Substring(8);
                    int atIndex = withoutPrefix.IndexOf('@');
                    if (atIndex < 0) return null;

                    string uuid = withoutPrefix.Substring(0, atIndex);
                    string rest = withoutPrefix.Substring(atIndex + 1);

                    int questionIndex = rest.IndexOf('?');
                    int hashIndex = rest.IndexOf('#');

                    string hostPort = questionIndex >= 0 ? rest.Substring(0, questionIndex) : (hashIndex >= 0 ? rest.Substring(0, hashIndex) : rest);
                    string server = hostPort;
                    int port = 443;
                    if (hostPort.Contains(":"))
                    {
                        string[] parts = hostPort.Split(':');
                        server = parts[0];
                        int.TryParse(parts[1], out port);
                    }

                    string name = server + ":" + port;
                    if (hashIndex >= 0)
                    {
                        name = Uri.UnescapeDataString(rest.Substring(hashIndex + 1));
                    }

                    var queryMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                    if (questionIndex >= 0)
                    {
                        string qStr = hashIndex >= 0 ? rest.Substring(questionIndex + 1, hashIndex - questionIndex - 1) : rest.Substring(questionIndex + 1);
                        string[] qParts = qStr.Split('&');
                        foreach (var qp in qParts)
                        {
                            string[] kv = qp.Split('=');
                            if (kv.Length >= 2) queryMap[kv[0]] = Uri.UnescapeDataString(kv[1]);
                        }
                    }

                    string sec = queryMap.ContainsKey("security") ? queryMap["security"] : "none";
                    string net = queryMap.ContainsKey("type") ? queryMap["type"] : "tcp";
                    string sni = queryMap.ContainsKey("sni") ? queryMap["sni"] : (queryMap.ContainsKey("host") ? queryMap["host"] : server);
                    string flow = queryMap.ContainsKey("flow") ? queryMap["flow"] : "";
                    string pbk = queryMap.ContainsKey("pbk") ? queryMap["pbk"] : "";
                    string sid = queryMap.ContainsKey("sid") ? queryMap["sid"] : "";
                    string fp = queryMap.ContainsKey("fp") ? queryMap["fp"] : "chrome";
                    string serviceName = queryMap.ContainsKey("serviceName") ? queryMap["serviceName"] : "grpc";
                    string path = queryMap.ContainsKey("path") ? queryMap["path"] : "/";
                    string mode = queryMap.ContainsKey("mode") ? queryMap["mode"] : "";
                    string alpn = queryMap.ContainsKey("alpn") ? queryMap["alpn"] : "";
                    string extra = queryMap.ContainsKey("extra") ? queryMap["extra"] : "";

                    return new Dictionary<string, object>
                    {
                        { "id", "node-" + Guid.NewGuid().ToString("N").Substring(0, 8) },
                        { "name", name },
                        { "protocol", "vless" },
                        { "server", server },
                        { "port", port },
                        { "uuid", uuid },
                        { "security", sec },
                        { "network", net },
                        { "sni", sni },
                        { "flow", flow },
                        { "publicKey", pbk },
                        { "shortId", sid },
                        { "fingerprint", fp },
                        { "serviceName", serviceName },
                        { "path", path },
                        { "mode", mode },
                        { "alpn", alpn },
                        { "extra", extra },
                        { "rawUri", raw },
                        { "latency", 0 }
                    };
                }
                catch { }
            }
            return null;
        }

        private static void EnableSystemProxy(string host, int port)
        {
            try
            {
                using (var key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Internet Settings", true))
                {
                    if (key != null)
                    {
                        key.SetValue("ProxyEnable", 1, RegistryValueKind.DWord);
                        key.SetValue("ProxyServer", host + ":" + port, RegistryValueKind.String);
                        key.SetValue("ProxyOverride", "<local>;localhost;127.*;10.*;172.16.*;172.17.*;172.18.*;172.19.*;172.20.*;172.21.*;172.22.*;172.23.*;172.24.*;172.25.*;172.26.*;172.27.*;172.28.*;172.29.*;172.30.*;172.31.*;192.168.*", RegistryValueKind.String);
                    }
                }
                NotifyWinINet();
            }
            catch { }
        }

        private static void DisableSystemProxy()
        {
            try
            {
                using (var key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Internet Settings", true))
                {
                    if (key != null)
                    {
                        key.SetValue("ProxyEnable", 0, RegistryValueKind.DWord);
                    }
                }
                NotifyWinINet();
            }
            catch { }
        }

        private static void NotifyWinINet()
        {
            try
            {
                InternetSetOption(IntPtr.Zero, 39 /* INTERNET_OPTION_SETTINGS_CHANGED */, IntPtr.Zero, 0);
                InternetSetOption(IntPtr.Zero, 37 /* INTERNET_OPTION_REFRESH */, IntPtr.Zero, 0);
            }
            catch { }
        }

        private void MainForm_FormClosing(object sender, FormClosingEventArgs e)
        {
            if (!isExiting && e.CloseReason == CloseReason.UserClosing)
            {
                e.Cancel = true;
                HideToTray();
                return;
            }

            try
            {
                if (Program.wakeEvent != null)
                {
                    try { Program.wakeEvent.Set(); } catch { }
                    try { Program.wakeEvent.Dispose(); } catch { }
                    Program.wakeEvent = null;
                }
                if (trayIcon != null)
                {
                    trayIcon.Visible = false;
                    trayIcon.Dispose();
                }
                DisableSystemProxy();
                try { if (File.Exists(configPath)) File.Delete(configPath); } catch { }
                try { if (File.Exists(secondaryConfigPath)) File.Delete(secondaryConfigPath); } catch { }
                if (singBoxProc != null && !singBoxProc.HasExited)
                {
                    try { Process.Start(new ProcessStartInfo("taskkill", string.Format("/f /t /pid {0}", singBoxProc.Id)) { CreateNoWindow = true, UseShellExecute = false }); } catch { }
                }
                if (xrayProc != null && !xrayProc.HasExited)
                {
                    try { Process.Start(new ProcessStartInfo("taskkill", string.Format("/f /t /pid {0}", xrayProc.Id)) { CreateNoWindow = true, UseShellExecute = false }); } catch { }
                }
            }
            catch { }
        }
    }
}

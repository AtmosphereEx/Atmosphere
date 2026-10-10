import { execFile } from 'child_process';
import util from 'util';

const execFileAsync = util.promisify(execFile);

export class ProxyManager {
  private static isProxySet = false;

  public static async enableSystemProxy(host = '127.0.0.1', port = 20880): Promise<boolean> {
    if (process.platform !== 'win32') return true;

    // Sanitize host and port strictly
    const safeHost = host.replace(/[^0-9a-zA-Z\.\-]/g, '') || '127.0.0.1';
    const numPort = typeof port === 'number' ? port : parseInt(String(port), 10);
    const safePort = !isNaN(numPort) && numPort > 0 && numPort <= 65535 ? numPort : 20880;

    try {
      const server = `${safeHost}:${safePort}`;
      const bypass = '<local>;localhost;127.*;10.*;172.16.*;172.17.*;172.18.*;172.19.*;172.20.*;172.21.*;172.22.*;172.23.*;172.24.*;172.25.*;172.26.*;172.27.*;172.28.*;172.29.*;172.30.*;172.31.*;192.168.*';
      
      await execFileAsync('reg', ['add', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings', '/v', 'ProxyEnable', '/t', 'REG_DWORD', '/d', '1', '/f']);
      await execFileAsync('reg', ['add', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings', '/v', 'ProxyServer', '/t', 'REG_SZ', '/d', server, '/f']);
      await execFileAsync('reg', ['add', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings', '/v', 'ProxyOverride', '/t', 'REG_SZ', '/d', bypass, '/f']);

      await this.notifyWindowsSettings();
      this.isProxySet = true;
      console.log(`[ProxyManager] System proxy enabled -> ${server}`);
      return true;
    } catch (e) {
      console.error('[ProxyManager] Failed to enable system proxy:', e);
      return false;
    }
  }

  public static async disableSystemProxy(): Promise<boolean> {
    if (process.platform !== 'win32') return true;

    try {
      await execFileAsync('reg', ['add', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings', '/v', 'ProxyEnable', '/t', 'REG_DWORD', '/d', '0', '/f']);
      await this.notifyWindowsSettings();
      this.isProxySet = false;
      console.log('[ProxyManager] System proxy disabled');
      return true;
    } catch (e) {
      console.error('[ProxyManager] Failed to disable system proxy:', e);
      return false;
    }
  }

  private static async notifyWindowsSettings(): Promise<void> {
    const psScript = `
$sig = @'
[DllImport("wininet.dll", SetLastError = true, CharSet=CharSet.Auto)]
public static extern bool InternetSetOption(IntPtr hInternet, int dwOption, IntPtr lpBuffer, int dwBufferLength);
'@
try {
  $wininet = Add-Type -MemberDefinition $sig -Name "WinINet_${Date.now()}" -Namespace "Win32" -PassThru -ErrorAction SilentlyContinue
  if ($wininet) {
    [void]$wininet::InternetSetOption([IntPtr]::Zero, 39, [IntPtr]::Zero, 0)
    [void]$wininet::InternetSetOption([IntPtr]::Zero, 37, [IntPtr]::Zero, 0)
  }
} catch {}
    `.trim();

    try {
      await execFileAsync('powershell', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', psScript]);
    } catch (e) {
      // ignore
    }
  }

  public static isEnabled(): boolean {
    return this.isProxySet;
  }
}

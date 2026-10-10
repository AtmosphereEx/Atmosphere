import { ChildProcess, spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { CoreType, AppSettings, ProxyNode } from '../shared/types';
import { ConfigGenerator } from './config-generator';
import { ProxyManager } from './proxy-manager';

export class EngineManager {
  private currentProcess: ChildProcess | null = null;
  private secondaryProcess: ChildProcess | null = null;
  private activeCore: CoreType = 'sing-box';
  private logs: string[] = [];
  private maxLogs = 2000;
  private baseDir: string;
  private configPath: string;
  private secondaryConfigPath: string;
  private logFilePath: string;
  private binDir: string;
  private onStatusChange?: (running: boolean, error?: string) => void;
  public onLog?: (line: string) => void;

  constructor(
    onStatusChange?: (running: boolean, error?: string) => void,
    onLog?: (line: string) => void
  ) {
    this.onStatusChange = onStatusChange;
    this.onLog = onLog;
    this.baseDir = process.cwd();
    try {
      if (app && app.getPath) {
        this.baseDir = app.getPath('userData');
      }
    } catch (e) {}

    this.configPath = path.join(this.baseDir, 'running-config.json');
    this.secondaryConfigPath = path.join(this.baseDir, 'xray-running-config.json');
    this.logFilePath = path.join(this.baseDir, 'pulse.log');
    this.binDir = path.resolve(__dirname, '../../bin');
    if (!fs.existsSync(this.binDir)) {
      this.binDir = path.resolve(process.cwd(), 'bin');
    }

    try {
      fs.mkdirSync(this.baseDir, { recursive: true });
      fs.appendFileSync(this.logFilePath, `\n=== Session started at ${new Date().toISOString()} ===\n`, 'utf-8');
    } catch (e) {}
  }

  public getCoresAvailable(): { singBox: boolean; xray: boolean } {
    const sb = path.join(this.binDir, 'sing-box.exe');
    const xr = path.join(this.binDir, 'xray.exe');
    return {
      singBox: fs.existsSync(sb),
      xray: fs.existsSync(xr),
    };
  }

  public async start(node: ProxyNode, settings: AppSettings): Promise<{ success: boolean; error?: string }> {
    await this.stop();

    const sbExe = path.join(this.binDir, 'sing-box.exe');
    const xrExe = path.join(this.binDir, 'xray.exe');

    const isTun = settings.connectionMode === 'tun' || !settings.connectionMode;
    const needsChainedXray = isTun;

    try {
      if (process.platform === 'win32') {
        try { execSync('ipconfig /flushdns', { stdio: 'ignore' }); } catch (e) {}
      }
    } catch (e) {}

    this.addLog(`[Engine] Starting connection to node: "${node.name}" (${node.protocol}, ${node.server}:${node.port})`);

    if (needsChainedXray) {
      if (!fs.existsSync(sbExe) || !fs.existsSync(xrExe)) {
        const err = `Required cores not found: sing-box or xray missing in ${this.binDir}`;
        this.addLog(`[Error] ${err}`);
        return { success: false, error: err };
      }

      this.activeCore = 'sing-box';
      const socksPort = 10888;

      const xrayConfig = ConfigGenerator.generateXrayChained(node, socksPort);
      const sbConfig = ConfigGenerator.generateSingBox(node, settings, socksPort);

      try {
        fs.writeFileSync(this.secondaryConfigPath, JSON.stringify(xrayConfig, null, 2), 'utf-8');
        fs.writeFileSync(this.configPath, JSON.stringify(sbConfig, null, 2), 'utf-8');
        this.addLog(`[Config] Generated hybrid chained config (Sing-box TUN/FakeIP + Xray gRPC tunnel)`);
      } catch (e: any) {
        const err = `Failed to write configs: ${e.message}`;
        this.addLog(`[Error] ${err}`);
        return { success: false, error: err };
      }

      try {
        // 1. Launch Xray helper
        this.addLog(`[Engine] Launching xray.exe for gRPC transport tunnel...`);
        this.secondaryProcess = spawn(xrExe, ['run', '-c', this.secondaryConfigPath], {
          cwd: this.binDir,
          windowsHide: true,
        });

        this.secondaryProcess.stdout?.on('data', (d) => {
          const text = d.toString().trim();
          if (text) this.addLog(`[Xray] ${text}`);
        });
        this.secondaryProcess.stderr?.on('data', (d) => {
          const text = d.toString().trim();
          if (text) this.addLog(`[Xray] ${text}`);
        });

        // 2. Launch Sing-box as TUN + DNS manager
        this.addLog(`[Engine] Launching sing-box.exe for TUN adapter and FakeIP DNS...`);
        this.currentProcess = spawn(sbExe, ['run', '-c', this.configPath], {
          cwd: this.binDir,
          windowsHide: true,
        });

        this.currentProcess.stdout?.on('data', (d) => {
          const text = d.toString().trim();
          if (text) this.addLog(`[sing-box] ${text}`);
        });
        this.currentProcess.stderr?.on('data', (d) => {
          const text = d.toString().trim();
          if (text) this.addLog(`[sing-box] ${text}`);
        });

        this.currentProcess.on('error', (err) => {
          this.addLog(`[sing-box Process Error] ${err.message}`);
          this.currentProcess = null;
          if (this.onStatusChange) this.onStatusChange(false, err.message);
        });

        this.currentProcess.on('exit', (code, signal) => {
          this.addLog(`[sing-box] Process exited with code ${code}, signal ${signal}`);
          this.currentProcess = null;
          if (this.onStatusChange) this.onStatusChange(false);
        });

        await ProxyManager.enableSystemProxy('127.0.0.1', settings.mixedPort || 20880);
        if (this.onStatusChange) this.onStatusChange(true);
        return { success: true };
      } catch (err: any) {
        this.addLog(`[Engine Start Failure] ${err.message}`);
        return { success: false, error: err.message };
      }
    }

    // Direct mode (single engine)
    this.activeCore = settings.activeCore || 'sing-box';
    const exeName = this.activeCore === 'sing-box' ? 'sing-box.exe' : 'xray.exe';
    const exePath = path.join(this.binDir, exeName);

    if (!fs.existsSync(exePath)) {
      const err = `Core executable not found at: ${exePath}`;
      this.addLog(`[Error] ${err}`);
      return { success: false, error: err };
    }

    const configObj = this.activeCore === 'sing-box'
      ? ConfigGenerator.generateSingBox(node, settings)
      : ConfigGenerator.generateXray(node, settings);

    try {
      fs.writeFileSync(this.configPath, JSON.stringify(configObj, null, 2), 'utf-8');
      this.addLog(`[Config] Generated config for ${this.activeCore} (${node.name})`);
    } catch (e: any) {
      const err = `Failed to write config file: ${e.message}`;
      this.addLog(`[Error] ${err}`);
      return { success: false, error: err };
    }

    try {
      this.addLog(`[Engine] Launching ${exeName}...`);
      this.currentProcess = spawn(exePath, ['run', '-c', this.configPath], {
        cwd: this.binDir,
        windowsHide: true,
      });

      this.currentProcess.stdout?.on('data', (d) => {
        const text = d.toString().trim();
        if (text) this.addLog(`[${this.activeCore}] ${text}`);
      });

      this.currentProcess.stderr?.on('data', (d) => {
        const text = d.toString().trim();
        if (text) this.addLog(`[${this.activeCore}] ${text}`);
      });

      this.currentProcess.on('error', (err) => {
        this.addLog(`[${this.activeCore} Process Error] ${err.message}`);
        this.currentProcess = null;
        if (this.onStatusChange) this.onStatusChange(false, err.message);
      });

      this.currentProcess.on('exit', (code, signal) => {
        this.addLog(`[${this.activeCore}] Process exited with code ${code}, signal ${signal}`);
        this.currentProcess = null;
        if (this.onStatusChange) this.onStatusChange(false);
      });

      await ProxyManager.enableSystemProxy('127.0.0.1', settings.mixedPort || 20880);
      if (this.onStatusChange) this.onStatusChange(true);
      return { success: true };
    } catch (err: any) {
      this.addLog(`[Engine Start Failure] ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  public async stop(): Promise<{ success: boolean; error?: string }> {
    await ProxyManager.disableSystemProxy();

    let stoppedAny = false;

    if (this.currentProcess) {
      const pid = this.currentProcess.pid;
      this.addLog(`[Engine] Stopping primary process (PID: ${pid})...`);
      if (process.platform === 'win32' && pid) {
        try { execSync(`taskkill /f /t /pid ${pid}`, { stdio: 'ignore' }); } catch (e) {}
      } else {
        this.currentProcess.kill('SIGTERM');
      }
      this.currentProcess = null;
      stoppedAny = true;
    }

    if (this.secondaryProcess) {
      const pid = this.secondaryProcess.pid;
      this.addLog(`[Engine] Stopping helper process (PID: ${pid})...`);
      if (process.platform === 'win32' && pid) {
        try { execSync(`taskkill /f /t /pid ${pid}`, { stdio: 'ignore' }); } catch (e) {}
      } else {
        this.secondaryProcess.kill('SIGTERM');
      }
      this.secondaryProcess = null;
      stoppedAny = true;
    }

    // NEVER run taskkill by image name (/im) so we do not kill user's active external VPN!
    // Pulse only stops its own spawned child processes by PID.

    if (stoppedAny) {
      // Cooldown to ensure Windows Wintun driver cleanly releases adapter handle
      await new Promise((resolve) => setTimeout(resolve, 600));
      this.addLog('[Engine] Pulse proxy processes stopped cleanly');
    }
    if (this.onStatusChange) this.onStatusChange(false);
    return { success: true };
  }

  public isRunning(): boolean {
    return this.currentProcess !== null && !this.currentProcess.killed;
  }

  public addLog(msg: string): void {
    const time = new Date().toLocaleTimeString();
    const entry = `[${time}] ${msg}`;
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    console.log(entry);

    try {
      fs.appendFileSync(this.logFilePath, entry + '\n', 'utf-8');
    } catch (e) {}

    if (this.onLog) {
      try {
        this.onLog(entry);
      } catch (e) {}
    }
  }

  public getLogFilePath(): string {
    return this.logFilePath;
  }

  public getLogs(): string[] {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
    try {
      fs.writeFileSync(this.logFilePath, '', 'utf-8');
    } catch (e) {}
  }
}

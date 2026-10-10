import { ProxyNode } from '../shared/types';
import https from 'https';
import http from 'http';
import { URL } from 'url';

export class LinkParser {
  public static parseLink(link: string): ProxyNode | null {
    link = link.trim();
    if (!link) return null;

    try {
      if (link.startsWith('vless://')) {
        return this.parseVless(link);
      } else if (link.startsWith('vmess://')) {
        return this.parseVmess(link);
      } else if (link.startsWith('trojan://')) {
        return this.parseTrojan(link);
      } else if (link.startsWith('ss://')) {
        return this.parseShadowsocks(link);
      }
    } catch (e) {
      console.warn(`Failed to parse link: ${link.slice(0, 30)}...`, e);
    }
    return null;
  }

  private static parseVless(raw: string): ProxyNode | null {
    // Format: vless://uuid@host:port?query#name
    const url = new URL(raw);
    const uuid = url.username;
    const server = url.hostname;
    const port = parseInt(url.port, 10) || 443;
    const name = decodeURIComponent(url.hash ? url.hash.replace(/^#/, '') : `${server}:${port}`);
    
    const params = url.searchParams;
    const security = (params.get('security') as any) || (params.get('tls') === 'tls' ? 'tls' : 'none');
    const network = (params.get('type') as any) || 'tcp';
    const sni = params.get('sni') || params.get('host') || undefined;
    const flow = params.get('flow') || undefined;
    const publicKey = params.get('pbk') || undefined;
    const shortId = params.get('sid') || undefined;
    const fingerprint = params.get('fp') || 'chrome';
    const path = params.get('path') || undefined;
    const serviceName = params.get('serviceName') || undefined;

    return {
      id: 'node-' + Math.random().toString(36).substring(2, 10),
      name: name.trim() || `VLESS - ${server}`,
      protocol: 'vless',
      server,
      port,
      uuid,
      security,
      network,
      sni,
      flow,
      publicKey,
      shortId,
      fingerprint,
      path,
      serviceName,
      rawUri: raw,
    };
  }

  private static parseVmess(raw: string): ProxyNode | null {
    // Format: vmess://base64(json)
    const base64Str = raw.replace(/^vmess:\/\//, '').trim();
    const jsonStr = Buffer.from(base64Str, 'base64').toString('utf-8');
    const data = JSON.parse(jsonStr);

    const server = data.add;
    const port = parseInt(data.port, 10);
    const uuid = data.id;
    const alterId = parseInt(data.aid, 10) || 0;
    const name = data.ps || `${server}:${port}`;
    const network = data.net === 'ws' ? 'ws' : (data.net === 'grpc' ? 'grpc' : 'tcp');
    const security = (data.tls === 'tls' || data.tls === 'reality') ? data.tls : 'none';
    const sni = data.sni || data.host || undefined;
    const path = data.path || undefined;
    const fingerprint = data.fp || 'chrome';

    return {
      id: 'node-' + Math.random().toString(36).substring(2, 10),
      name: name.trim() || `VMess - ${server}`,
      protocol: 'vmess',
      server,
      port,
      uuid,
      alterId,
      network,
      security,
      sni,
      path,
      fingerprint,
      rawUri: raw,
    };
  }

  private static parseTrojan(raw: string): ProxyNode | null {
    // Format: trojan://password@host:port?query#name
    const url = new URL(raw);
    const password = url.username;
    const server = url.hostname;
    const port = parseInt(url.port, 10) || 443;
    const name = decodeURIComponent(url.hash ? url.hash.replace(/^#/, '') : `${server}:${port}`);
    const params = url.searchParams;
    const sni = params.get('sni') || params.get('peer') || server;
    const network = (params.get('type') as any) || 'tcp';

    return {
      id: 'node-' + Math.random().toString(36).substring(2, 10),
      name: name.trim() || `Trojan - ${server}`,
      protocol: 'trojan',
      server,
      port,
      password,
      security: 'tls',
      network,
      sni,
      rawUri: raw,
    };
  }

  private static parseShadowsocks(raw: string): ProxyNode | null {
    // Format: ss://base64(method:password@host:port)#name
    // or: ss://base64(method:password)@host:port#name
    const afterScheme = raw.replace(/^ss:\/\//, '');
    const [mainPart, hash] = afterScheme.split('#');
    const name = hash ? decodeURIComponent(hash) : 'Shadowsocks';

    if (mainPart.includes('@')) {
      const [userinfoB64, hostPort] = mainPart.split('@');
      let method = 'aes-256-gcm';
      let password = '';
      try {
        const decoded = Buffer.from(userinfoB64, 'base64').toString('utf-8');
        const [m, p] = decoded.split(':');
        method = m;
        password = p;
      } catch (e) {
        // direct
      }
      const [server, portStr] = hostPort.split(':');
      return {
        id: 'node-' + Math.random().toString(36).substring(2, 10),
        name,
        protocol: 'shadowsocks',
        server,
        port: parseInt(portStr, 10),
        cipher: method,
        password,
        rawUri: raw,
      };
    } else {
      // Entire mainPart is base64
      try {
        const decoded = Buffer.from(mainPart, 'base64').toString('utf-8');
        // method:pass@host:port
        const atIdx = decoded.indexOf('@');
        if (atIdx !== -1) {
          const userinfo = decoded.slice(0, atIdx);
          const hostPort = decoded.slice(atIdx + 1);
          const [cipher, password] = userinfo.split(':');
          const [server, portStr] = hostPort.split(':');
          return {
            id: 'node-' + Math.random().toString(36).substring(2, 10),
            name,
            protocol: 'shadowsocks',
            server,
            port: parseInt(portStr, 10),
            cipher,
            password,
            rawUri: raw,
          };
        }
      } catch (e) {
        // failed
      }
    }
    return null;
  }

  public static async fetchSubscription(subUrl: string, hwid?: string): Promise<ProxyNode[]> {
    return new Promise((resolve, reject) => {
      const client = subUrl.startsWith('https') ? https : http;
      const effectiveHwid = hwid || 'a1b2c3d4e5f60718293a4b5c6d7e8f90';

      const headers = {
        'User-Agent': 'v2raytun/1.0.0',
        'x-hwid': effectiveHwid,
        'x-device-os': 'Windows',
        'x-ver-os': '10.0.22631',
        'x-device-model': 'PC',
        'Accept': '*/*',
      };

      const req = client.get(subUrl, { headers }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return this.fetchSubscription(res.headers.location, effectiveHwid).then(resolve).catch(reject);
        }

        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            let decoded = body.trim();
            // Try base64 decode if not plain links
            if (!decoded.includes('vless://') && !decoded.includes('vmess://') && !decoded.includes('trojan://') && !decoded.includes('ss://')) {
              try {
                decoded = Buffer.from(body.replace(/\s+/g, ''), 'base64').toString('utf-8');
              } catch (e) {
                // not base64
              }
            }

            const lines = decoded.split(/\r?\n/);
            const nodes: ProxyNode[] = [];
            for (const line of lines) {
              const node = LinkParser.parseLink(line);
              // Filter out valid nodes, ignoring dummy error / HWID notice nodes (e.g. 0.0.0.0:1)
              if (node && node.server !== '0.0.0.0' && node.port !== 1 && !node.name.includes('HWID') && !node.name.includes('Смените клиент')) {
                nodes.push(node);
              }
            }
            resolve(nodes);
          } catch (err) {
            reject(err);
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(15000, () => {
        req.destroy(new Error('Subscription fetch timeout'));
      });
    });
  }
}

import { AppSettings, ProxyNode } from '../shared/types';

export class ConfigGenerator {
  public static generateSingBox(node: ProxyNode, settings: AppSettings, socksDetourPort?: number): any {
    const inbounds: any[] = [
      {
        type: 'mixed',
        tag: 'mixed-in',
        listen: '127.0.0.1',
        listen_port: settings.mixedPort || 20880,
      }
    ];

    if (settings.connectionMode === 'tun' || !settings.connectionMode) {
      inbounds.push({
        type: 'tun',
        tag: 'tun-in',
        address: ['172.19.0.1/30'],
        auto_route: true,
        strict_route: true,
        stack: settings.tunStack || 'mixed',
      });
    }

    const proxyOutbound = socksDetourPort
      ? {
          tag: 'proxy',
          type: 'socks',
          server: '127.0.0.1',
          server_port: socksDetourPort,
        }
      : this.buildSingBoxOutbound(node);

    const outbounds: any[] = [
      proxyOutbound,
      { type: 'direct', tag: 'direct' },
      { type: 'block', tag: 'block' },
    ];

    const routeRules: any[] = [
      {
        process_name: ['xray.exe', 'sing-box.exe', 'electron.exe', 'AtmosphereEx.exe', 'Pulse.exe'],
        outbound: 'direct',
      },
      {
        protocol: 'dns',
        action: 'hijack-dns',
      },
      {
        port: 53,
        action: 'hijack-dns',
      },
      {
        ip_is_private: true,
        outbound: 'direct',
      }
    ];

    if (node.server) {
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(node.server)) {
        routeRules.push({
          ip_cidr: [`${node.server}/32`],
          outbound: 'direct',
        });
      } else {
        routeRules.push({
          domain: [node.server],
          outbound: 'direct',
        });
      }
    }

    if (settings.routeMode === 'direct') {
      routeRules.push({ outbound: 'direct' });
    } else {
      if (settings.routeMode === 'rule' && settings.bypassLAN) {
        routeRules.push({
          ip_cidr: [
            '10.0.0.0/8',
            '172.16.0.0/12',
            '192.168.0.0/16',
            '127.0.0.0/8',
            '169.254.0.0/16'
          ],
          outbound: 'direct'
        });
      }
      routeRules.push({ outbound: 'proxy' });
    }

    return {
      log: {
        level: 'info',
        timestamp: true,
      },
      dns: {
        servers: [
          {
            tag: 'dns-fakeip',
            type: 'fakeip',
            inet4_range: '198.18.0.0/15',
          },
          {
            tag: 'dns-remote',
            type: 'udp',
            server: '1.1.1.1',
            detour: 'proxy',
          },
          {
            tag: 'dns-local',
            type: 'local',
            detour: 'direct',
          },
        ],
        rules: [
          {
            query_type: ['A', 'AAAA'],
            server: 'dns-fakeip',
          },
        ],
        final: 'dns-remote',
        strategy: 'prefer_ipv4',
      },
      inbounds,
      outbounds,
      route: {
        rules: routeRules,
        auto_detect_interface: true,
        default_domain_resolver: 'dns-local',
      },
      experimental: {
        cache_file: {
          enabled: true,
          store_fakeip: true,
        },
      },
    };
  }

  private static buildSingBoxOutbound(node: ProxyNode): any {
    const base: any = {
      tag: 'proxy',
      server: node.server,
      server_port: node.port,
    };

    if (node.protocol === 'vless') {
      base.type = 'vless';
      base.uuid = node.uuid;
      if (node.flow) base.flow = node.flow;
      base.packet_encoding = 'xudp';

      if (node.security === 'reality') {
        base.tls = {
          enabled: true,
          server_name: node.sni || node.server,
          utls: {
            enabled: true,
            fingerprint: node.fingerprint || 'chrome',
          },
          reality: {
            enabled: true,
            public_key: node.publicKey || '',
            short_id: node.shortId || '',
          },
        };
      } else if (node.security === 'tls') {
        base.tls = {
          enabled: true,
          server_name: node.sni || node.server,
          utls: {
            enabled: true,
            fingerprint: node.fingerprint || 'chrome',
          },
        };
      }

      if (node.network === 'ws') {
        base.transport = {
          type: 'ws',
          path: node.path || '/',
          headers: node.sni ? { Host: node.sni } : undefined,
        };
      } else if (node.network === 'grpc') {
        base.transport = {
          type: 'grpc',
          service_name: node.serviceName || '',
        };
      }
      return base;
    }

    if (node.protocol === 'vmess') {
      base.type = 'vmess';
      base.uuid = node.uuid;
      base.alter_id = node.alterId || 0;
      base.security = 'auto';
      base.packet_encoding = 'xudp';

      if (node.security === 'tls') {
        base.tls = {
          enabled: true,
          server_name: node.sni || node.server,
        };
      }

      if (node.network === 'ws') {
        base.transport = {
          type: 'ws',
          path: node.path || '/',
        };
      }
      return base;
    }

    if (node.protocol === 'trojan') {
      base.type = 'trojan';
      base.password = node.password;
      base.tls = {
        enabled: true,
        server_name: node.sni || node.server,
      };
      return base;
    }

    if (node.protocol === 'shadowsocks') {
      base.type = 'shadowsocks';
      base.method = node.cipher || 'aes-256-gcm';
      base.password = node.password;
      return base;
    }

    return base;
  }

  public static generateXrayChained(node: ProxyNode, socksPort: number): any {
    const outbound = this.buildXrayOutbound(node);
    return {
      log: { loglevel: 'warning' },
      inbounds: [
        {
          port: socksPort,
          listen: '127.0.0.1',
          protocol: 'socks',
          settings: { auth: 'noauth', udp: true },
        },
      ],
      outbounds: [
        outbound,
        {
          tag: 'direct',
          protocol: 'freedom',
          settings: {},
        },
      ],
    };
  }

  public static generateXray(node: ProxyNode, settings: AppSettings): any {
    const inbounds: any[] = [
      {
        tag: 'http-in',
        port: settings.mixedPort || 20880,
        listen: '127.0.0.1',
        protocol: 'http',
        settings: {
          timeout: 0,
        },
      },
      {
        tag: 'socks-in',
        port: settings.socksPort || 20881,
        listen: '127.0.0.1',
        protocol: 'socks',
        settings: {
          auth: 'noauth',
          udp: true,
        },
      }
    ];

    const proxyOutbound = this.buildXrayOutbound(node);

    const outbounds: any[] = [
      proxyOutbound,
      {
        tag: 'direct',
        protocol: 'freedom',
        settings: {},
      },
      {
        tag: 'block',
        protocol: 'blackhole',
        settings: {
          response: { type: 'http' },
        },
      },
    ];

    const rules: any[] = [
      {
        type: 'field',
        outboundTag: 'direct',
        ip: ['geoip:private'],
      }
    ];

    if (settings.routeMode === 'direct') {
      rules.push({ type: 'field', outboundTag: 'direct', network: 'tcp,udp' });
    } else if (settings.routeMode === 'global') {
      rules.push({ type: 'field', outboundTag: 'proxy', network: 'tcp,udp' });
    } else {
      if (settings.bypassLAN) {
        rules.push({
          type: 'field',
          outboundTag: 'direct',
          ip: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '127.0.0.0/8'],
        });
      }
      rules.push({
        type: 'field',
        outboundTag: 'proxy',
        network: 'tcp,udp',
      });
    }

    return {
      log: {
        loglevel: 'warning',
      },
      inbounds,
      outbounds,
      routing: {
        domainStrategy: 'IPIfNonMatch',
        rules,
      },
    };
  }

  private static buildXrayOutbound(node: ProxyNode): any {
    if (node.protocol === 'vless') {
      const streamSettings: any = {
        network: node.network || 'tcp',
        security: node.security || 'none',
      };

      if (node.security === 'reality') {
        streamSettings.realitySettings = {
          show: false,
          serverName: node.sni || node.server,
          fingerprint: node.fingerprint || 'chrome',
          publicKey: node.publicKey || '',
          shortId: node.shortId || '',
          spiderX: '',
        };
      } else if (node.security === 'tls') {
        streamSettings.tlsSettings = {
          serverName: node.sni || node.server,
          fingerprint: node.fingerprint || 'chrome',
        };
      }

      if (node.network === 'ws') {
        streamSettings.wsSettings = {
          path: node.path || '/',
          headers: node.sni ? { Host: node.sni } : {},
        };
      } else if (node.network === 'grpc') {
        streamSettings.grpcSettings = {
          serviceName: node.serviceName || 'grpc',
          multiMode: true,
        };
      }

      return {
        tag: 'proxy',
        protocol: 'vless',
        settings: {
          vnext: [
            {
              address: node.server,
              port: node.port,
              users: [
                {
                  id: node.uuid,
                  encryption: 'none',
                  flow: node.flow || '',
                }
              ]
            }
          ]
        },
        streamSettings,
      };
    }

    if (node.protocol === 'vmess') {
      const streamSettings: any = {
        network: node.network || 'tcp',
        security: node.security === 'tls' ? 'tls' : 'none',
      };

      if (node.security === 'tls') {
        streamSettings.tlsSettings = {
          serverName: node.sni || node.server,
        };
      }

      if (node.network === 'ws') {
        streamSettings.wsSettings = {
          path: node.path || '/',
        };
      }

      return {
        tag: 'proxy',
        protocol: 'vmess',
        settings: {
          vnext: [
            {
              address: node.server,
              port: node.port,
              users: [
                {
                  id: node.uuid,
                  alterId: node.alterId || 0,
                  security: 'auto',
                }
              ]
            }
          ]
        },
        streamSettings,
      };
    }

    if (node.protocol === 'trojan') {
      return {
        tag: 'proxy',
        protocol: 'trojan',
        settings: {
          servers: [
            {
              address: node.server,
              port: node.port,
              password: node.password,
            }
          ]
        },
        streamSettings: {
          security: 'tls',
          tlsSettings: {
            serverName: node.sni || node.server,
          }
        }
      };
    }

    if (node.protocol === 'shadowsocks') {
      return {
        tag: 'proxy',
        protocol: 'shadowsocks',
        settings: {
          servers: [
            {
              address: node.server,
              port: node.port,
              method: node.cipher || 'aes-256-gcm',
              password: node.password,
            }
          ]
        }
      };
    }

    return { tag: 'proxy', protocol: 'freedom' };
  }
}

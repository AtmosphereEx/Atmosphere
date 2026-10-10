import net from 'net';
import { ProxyNode } from '../shared/types';

export class PingService {
  public static async pingNode(node: ProxyNode, timeout = 2500): Promise<number> {
    return new Promise((resolve) => {
      const start = Date.now();
      const socket = new net.Socket();

      let resolved = false;
      const done = (latency: number) => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          resolve(latency);
        }
      };

      socket.setTimeout(timeout);

      socket.connect(node.port, node.server, () => {
        const elapsed = Date.now() - start;
        done(elapsed);
      });

      socket.on('timeout', () => {
        done(-1); // timeout
      });

      socket.on('error', () => {
        done(-1); // error
      });
    });
  }

  public static async pingAll(nodes: ProxyNode[], concurrency = 8): Promise<Record<string, number>> {
    const results: Record<string, number> = {};
    const queue = [...nodes];

    const workers = Array.from({ length: concurrency }).map(async () => {
      while (queue.length > 0) {
        const node = queue.shift();
        if (!node) break;
        const latency = await this.pingNode(node);
        results[node.id] = latency;
      }
    });

    await Promise.all(workers);
    return results;
  }
}

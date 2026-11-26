// Start the server exactly as the README client configuration would, from a directory without the repo.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const url = 'https://github.com/shoka-jp/obd2-mcp/releases/download/v0.3.0/obd2-mcp-0.3.0.tgz';
const npxArgs = ['-y', `--package=${url}`, 'obd2-mcp'];
const variants = process.platform === 'win32'
  ? [['cmd', ['/c', 'npx', ...npxArgs]], ['npx', npxArgs]]
  : [['npx', npxArgs]];
const cwd = mkdtempSync(join(tmpdir(), 'npx-check-'));
let failures = 0;
for (const [command, args] of variants) {
  const label = `${command} ${args.join(' ')}`;
  const transport = new StdioClientTransport({ command, args, cwd, env: { ...process.env, OBD2MCP_CONNECTION: 'mock' }, stderr: 'inherit' });
  const client = new Client({ name: 'npx-check', version: '1' });
  try {
    const started = Date.now();
    await client.connect(transport);
    const tools = (await client.listTools()).tools.map(t => t.name).sort();
    const r = await client.callTool({ name: 'read_dtcs', arguments: {} });
    const body = JSON.parse(r.content[0].text);
    console.log(`PASS [${process.platform}] ${label}: ${tools.length} tools, stored=${JSON.stringify(body.stored_dtcs)}, simulated=${body.simulated}, ${Date.now() - started} ms`);
    await client.close();
  } catch (err) {
    failures++;
    console.log(`FAIL [${process.platform}] ${label}: ${err?.message ?? err}`);
    try { await client.close(); } catch {}
  }
}
process.exit(failures && process.platform !== 'win32' ? 1 : (process.platform === 'win32' && failures === 2 ? 1 : 0));

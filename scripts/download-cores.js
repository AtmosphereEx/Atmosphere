const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const binDir = path.resolve(__dirname, '../bin');
if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Happ-Client-Downloader' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJson(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${data.slice(0, 100)}`));
        }
      });
    }).on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading from ${url} ...`);
    const file = fs.createWriteStream(dest);
    
    function makeReq(currentUrl) {
      https.get(currentUrl, { headers: { 'User-Agent': 'Happ-Client-Downloader' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return makeReq(res.headers.location);
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlinkSync(dest);
          return reject(new Error(`Download failed with status: ${res.statusCode}`));
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close(() => resolve(dest));
        });
      }).on('error', (err) => {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        reject(err);
      });
    }
    
    makeReq(url);
  });
}

async function installSingBox() {
  const targetExe = path.join(binDir, 'sing-box.exe');
  if (fs.existsSync(targetExe)) {
    console.log('[sing-box] Already exists at', targetExe);
    return;
  }
  console.log('[sing-box] Fetching latest release info...');
  try {
    const release = await fetchJson('https://api.github.com/repos/SagerNet/sing-box/releases/latest');
    const asset = release.assets.find(a => a.name.includes('windows-amd64.zip'));
    if (!asset) throw new Error('No windows-amd64.zip found for sing-box');
    
    const zipPath = path.join(binDir, 'sing-box.zip');
    await downloadFile(asset.browser_download_url, zipPath);
    
    console.log('[sing-box] Extracting...');
    const tempExtract = path.join(binDir, 'temp-sb');
    if (fs.existsSync(tempExtract)) fs.rmSync(tempExtract, { recursive: true, force: true });
    fs.mkdirSync(tempExtract, { recursive: true });
    
    execSync(`tar -xf "${zipPath}" -C "${tempExtract}"`);
    
    // Find sing-box.exe in tempExtract
    const subdirs = fs.readdirSync(tempExtract);
    let found = false;
    for (const sub of subdirs) {
      const candidate = path.join(tempExtract, sub, 'sing-box.exe');
      if (fs.existsSync(candidate)) {
        fs.copyFileSync(candidate, targetExe);
        found = true;
        break;
      }
    }
    if (!found) {
      const rootCandidate = path.join(tempExtract, 'sing-box.exe');
      if (fs.existsSync(rootCandidate)) {
        fs.copyFileSync(rootCandidate, targetExe);
        found = true;
      }
    }
    
    // Cleanup
    fs.rmSync(tempExtract, { recursive: true, force: true });
    fs.unlinkSync(zipPath);
    console.log('[sing-box] Installed successfully to', targetExe);
  } catch (err) {
    console.error('[sing-box] Error:', err.message);
  }
}

async function installXray() {
  const targetExe = path.join(binDir, 'xray.exe');
  if (fs.existsSync(targetExe)) {
    console.log('[Xray] Already exists at', targetExe);
    return;
  }
  console.log('[Xray] Fetching latest release info...');
  try {
    const release = await fetchJson('https://api.github.com/repos/XTLS/Xray-core/releases/latest');
    const asset = release.assets.find(a => a.name.toLowerCase() === 'xray-windows-64.zip');
    if (!asset) throw new Error('No Xray-windows-64.zip found');
    
    const zipPath = path.join(binDir, 'xray.zip');
    await downloadFile(asset.browser_download_url, zipPath);
    
    console.log('[Xray] Extracting...');
    execSync(`tar -xf "${zipPath}" -C "${binDir}"`);
    fs.unlinkSync(zipPath);
    console.log('[Xray] Installed successfully to', targetExe);
  } catch (err) {
    console.error('[Xray] Error:', err.message);
  }
}

async function main() {
  console.log('=== Downloading core engines (sing-box & Xray) ===');
  await installSingBox();
  await installXray();
  console.log('=== Core engines ready in bin/ ===');
}

main().catch(console.error);

/**
 * Fully Automated Zero-Friction OnlyOffice Lifecycle Manager
 * 
 * 1. Checks configured ports (8082, 8080, process.env.ONLYOFFICE_PORT).
 * 2. If offline, auto-launches Docker Desktop (if installed on Windows/Mac) in background.
 * 3. Auto-starts or creates the OnlyOffice container (onlyoffice-ds) on port 8082.
 * 4. Also attempts native OS service (net start DSCommunity) on Windows.
 * 5. Degrades gracefully to built-in in-browser Word editor if initializing.
 */

const { exec, spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CANDIDATE_PORTS = [
  process.env.ONLYOFFICE_PORT ? Number(process.env.ONLYOFFICE_PORT) : null,
  8082,
  8080
].filter(Boolean);

const ONLYOFFICE_HOST = process.env.ONLYOFFICE_HOST || 'localhost';

function pingPort(port, timeout = 1000) {
  return new Promise((resolve) => {
    const url = `http://${ONLYOFFICE_HOST}:${port}/web-apps/apps/api/documents/api.js`;
    const req = http.get(url, { timeout }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function findActivePort() {
  for (const port of CANDIDATE_PORTS) {
    if (await pingPort(port, 800)) {
      return port;
    }
  }
  return null;
}

function execPromise(cmd) {
  return new Promise((resolve) => {
    exec(cmd, (err, stdout, stderr) => {
      resolve({ err, stdout: (stdout || '').trim(), stderr: (stderr || '').trim() });
    });
  });
}

async function tryStartDockerWorkflow(targetPort = 8082) {
  // Check if docker CLI is available
  const { err: dockerCliErr } = await execPromise('docker --version');
  if (dockerCliErr) return false;

  // Check if docker daemon is responsive
  let { err: daemonErr } = await execPromise('docker ps');
  
  if (daemonErr) {
    // Docker daemon not running. Try auto-launching Docker Desktop on Windows
    const winDockerDesktop = 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe';
    if (process.platform === 'win32' && fs.existsSync(winDockerDesktop)) {
      console.log('[OnlyOffice-Auto] Launching Docker Desktop in the background...');
      try {
        const p = spawn(winDockerDesktop, { detached: true, stdio: 'ignore' });
        p.unref();
      } catch {}
      
      // Poll for daemon readiness up to 15 seconds
      for (let i = 0; i < 15; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const check = await execPromise('docker ps');
        if (!check.err) {
          console.log('[OnlyOffice-Auto] Docker engine is ready.');
          daemonErr = null;
          break;
        }
      }
    }
  }

  if (daemonErr) return false;

  // Docker daemon is ready. Check for existing container
  const { stdout: containerList } = await execPromise('docker ps -a --filter name=onlyoffice-ds --format "{{.Names}}"');
  
  if (containerList.includes('onlyoffice-ds')) {
    console.log('[OnlyOffice-Auto] Starting existing onlyoffice-ds container...');
    await execPromise('docker start onlyoffice-ds');
  } else {
    console.log(`[OnlyOffice-Auto] Creating and starting onlyoffice-ds container on port ${targetPort}...`);
    // Run container with JWT disabled or default configuration
    const runCmd = `docker run -i -t -d -p ${targetPort}:80 --restart=always -e JWT_ENABLED=false --name onlyoffice-ds onlyoffice/documentserver:latest`;
    await execPromise(runCmd);
  }

  return true;
}

async function tryStartNativeService() {
  const isWindows = process.platform === 'win32';
  const startCmd = isWindows 
    ? 'net start DSCommunity 2>nul || sc start DSCommunity 2>nul'
    : 'systemctl start ds-documentserver 2>/dev/null || service ds-documentserver start 2>/dev/null';

  await execPromise(startCmd);
}

async function ensureOnlyOffice() {
  console.log('[OnlyOffice-Auto] Scanning for active OnlyOffice Document Server...');
  let activePort = await findActivePort();

  if (activePort) {
    console.log(`[OnlyOffice-Auto] [OK] Document Server is active on port ${activePort}.`);
    process.env.ONLYOFFICE_DS_URL = `http://localhost:${activePort}`;
    return activePort;
  }

  console.log('[OnlyOffice-Auto] Document Server is offline. Initiating automated zero-friction start sequence...');
  
  // 1. Try Docker workflow
  const dockerStarted = await tryStartDockerWorkflow(8082);
  
  // 2. Try native OS service
  await tryStartNativeService();

  if (dockerStarted) {
    // Wait briefly for OnlyOffice Node API inside container to boot
    console.log('[OnlyOffice-Auto] Waiting for Document Server initialization...');
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      activePort = await findActivePort();
      if (activePort) {
        console.log(`[OnlyOffice-Auto] [OK] Document Server is online on port ${activePort}.`);
        process.env.ONLYOFFICE_DS_URL = `http://localhost:${activePort}`;
        return activePort;
      }
    }
  }

  activePort = await findActivePort();
  if (activePort) {
    console.log(`[OnlyOffice-Auto] [OK] Document Server is online on port ${activePort}.`);
    return activePort;
  }

  console.log('[OnlyOffice-Auto] Notice: Background boot initiated. Application will seamlessly use in-browser A4 Word suite until ready.');
  return null;
}

if (require.main === module) {
  ensureOnlyOffice().then(() => {
    process.exit(0);
  }).catch(() => {
    process.exit(0);
  });
}

module.exports = { pingPort, findActivePort, ensureOnlyOffice };

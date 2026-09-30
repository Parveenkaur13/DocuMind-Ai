import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fileCandidates = [
  'C:/Users/hp/Desktop/Ai/.venv/Scripts/python.exe',
  'C:\\Users\\hp\\Desktop\\Ai\\.venv\\Scripts\\python.exe',
  path.join(__dirname, '..', '.venv', 'Scripts', 'python.exe'),
];

let pythonExe = '';
for (const cand of fileCandidates) {
  if (fs.existsSync(cand)) {
    pythonExe = cand;
    break;
  }
}

if (!pythonExe) {
  pythonExe = 'py';
}

import http from 'http';

function checkAlreadyRunning() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:8000/api/health', (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

const isRunning = await checkAlreadyRunning();
if (isRunning) {
  console.log('DocuMind backend is ALREADY running and active at http://localhost:8000');
  console.log('Ready to receive requests! Press Ctrl+C to close.');
  setInterval(() => {}, 60000);
} else {
  console.log(`Starting DocuMind backend using: ${pythonExe}`);
  const child = spawn(pythonExe, [serverScript], {
    stdio: 'inherit',
    shell: true,
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}

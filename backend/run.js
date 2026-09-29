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

const serverScript = path.join(__dirname, 'server.py');
console.log(`Starting DocuMind backend using: ${pythonExe}`);

const child = spawn(pythonExe, [serverScript], {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

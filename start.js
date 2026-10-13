import { spawn } from 'child_process';

// Start Vite dev server
const vite = spawn('npx', ['vite'], { shell: true, stdio: 'inherit' });

// Wait 2.5 seconds for Vite to start up, then launch Electron
setTimeout(() => {
  console.log('Launching Electron...');
  const electron = spawn('npx', ['electron', '.'], { shell: true, stdio: 'inherit' });
  
  electron.on('close', (code) => {
    vite.kill();
    process.exit(code);
  });
}, 2500);

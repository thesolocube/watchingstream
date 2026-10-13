import { app, BrowserWindow, session } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    backgroundColor: '#141414',
    title: 'tafaraj m3a atlas',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Check if we are running in development
  const isDev = !app.isPackaged;

  if (isDev) {
    // Load Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Load production build files
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Block popups from iframe (ads, unwanted windows)
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // Block navigation initiated by iframe content
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowedPrefixes = isDev
      ? ['http://localhost:5173', 'file://', 'data:']
      : ['file://', 'data:'];
    const isAllowed = allowedPrefixes.some(prefix => url.startsWith(prefix));
    if (!isAllowed) {
      event.preventDefault();
    }
  });

  // Enable embedding of third-party video players in iframes
  // Only bypass security headers for trusted streaming domains
  const trustedDomains = ['vaplayer.ru', 'vidapi.ru', 'raw.githubusercontent.com'];
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const url = new URL(details.url);
    const isTrustedDomain = trustedDomains.some(domain => url.hostname.endsWith(domain));

    if (isTrustedDomain) {
      const responseHeaders = { ...details.responseHeaders };
      
      // Remove headers that might prevent embedding in iframes
      Object.keys(responseHeaders).forEach((header) => {
        if (header.toLowerCase() === 'x-frame-options' || header.toLowerCase() === 'content-security-policy') {
          delete responseHeaders[header];
        }
      });

      callback({
        cancel: false,
        responseHeaders,
      });
    } else {
      callback({ cancel: false, responseHeaders: details.responseHeaders });
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

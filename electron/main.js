/**
 * EBI 循证投资 — Electron Main Process
 * Wraps the web app as a macOS native application
 */

const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'EBI 循证投资',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a1628',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    icon: path.join(__dirname, '..', 'src', 'assets', 'icons', 'icon.png'),
  });

  // Load the web app
  const isDev = process.argv.includes('--dev');

  if (isDev) {
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  }

  // Custom menu
  const template = [
    {
      label: 'EBI 循证投资',
      submenu: [
        { label: '关于 EBI 循证投资', click: () => showAbout() },
        { type: 'separator' },
        { label: '隐藏', accelerator: 'Command+H', role: 'hide' },
        { label: '退出', accelerator: 'Command+Q', click: () => app.quit() },
      ],
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() },
        { label: '开发者工具', accelerator: 'Alt+Command+I', click: () => mainWindow.webContents.toggleDevTools() },
        { type: 'separator' },
        { label: '全屏', accelerator: 'Ctrl+Command+F', click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
      ],
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: '关闭', accelerator: 'CmdOrCtrl+W', role: 'close' },
      ],
    },
    {
      label: '帮助',
      submenu: [
        { label: 'GitHub', click: () => shell.openExternal('https://github.com/dcpwilliam/ebi-investment') },
        { label: '问题反馈', click: () => shell.openExternal('https://github.com/dcpwilliam/ebi-investment/issues') },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function showAbout() {
  const { dialog } = require('electron');
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: '关于 EBI 循证投资',
    message: 'EBI 循证投资 v0.1.0',
    detail: 'Evidence Based Investment\n循证投资 · 分布式投资智能平台\n开源免费使用\n\n市场数据：Yahoo Finance / Finnhub\nAI引擎：OpenAI Compatible / Ollama\n分布式数据库：Gun.js',
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
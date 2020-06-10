const path = require('path');
const os = require('os');
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const imagemin = require('imagemin');
const slash = require('slash');
const imageminPngquant = require('imagemin-pngquant');
const imageminMozjpeg = require('imagemin-mozjpeg');
const log = require('electron-log');

// Set env
process.env.NODE_ENV = 'production';

const isDev = process.env.NODE_ENV !== 'production';
const isMac = process.platform === 'darwin';

let mainWindow;
let aboutWindow;

function createMainWindow() {
    mainWindow = new BrowserWindow({
       title: 'ImageShrink',
       width: isDev ? 800 : 500,
       height: 600,
       icon: './assets/icons/Icon_256x256.png',
       resizable: !!isDev,
       backgroundColor: 'white',
       webPreferences: {
           nodeIntegration: true
       }
    });

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.loadFile(`./app/index.html`);
}

function createAboutWindow() {
    aboutWindow = new BrowserWindow({
       title: 'About ImageShrink',
       width: 300,
       height: 300,
       icon: './assets/icons/Icon_256x256.png',
       resizable: false,
       backgroundColor: 'white'
    });

    aboutWindow.loadFile(`./app/about.html`);
}

app.on('ready', () => {
    createMainWindow();

    const mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu);

    mainWindow.on('ready', () => mainWindow = null);
});

const menu = [
    ...(isMac ? [{
        label: app.name,
        submenu: [
            {
                label: 'About',
                click: createAboutWindow()
            }
        ]
    }] : []),
    {
        role: 'fileMenu'
    },
    ...(!isMac ? [
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About',
                    click: createAboutWindow
                }
            ]
        }
    ] : []),
    ...(isDev ? [
        {
            label: 'Developer',
            submenu: [
                { role: 'reload' },
                { role: 'forcereload' },
                { type: 'separator' },
                { role: 'toggledevtools' },
            ]
        }
    ] : [])
];

ipcMain.on('image:minimize', async (e, options) => {
    options.dest = path.join(os.homedir(), 'imageshrink');
    await shrinkImage(options);
});

async function shrinkImage({ imgPath, quality, dest }) {
    try {
        const pngQuality = quality / 100;

        const files = await imagemin([slash(imgPath)], {
            destination: dest,
            plugins: [
                imageminMozjpeg({ quality }),
                imageminPngquant({
                    quality: [pngQuality, pngQuality]
                }),
            ]
        });

        // Write log
        log.info(files);
        // Show in Explorer
        shell.openPath(dest);
        // Send Client
        mainWindow.webContents.send('image:done');
    } catch (err) {
        console.log(err);
        log.error(err);
    }
}

app.on('window-all-closed', () => {
    if (!isMac) {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});

app.allowRendererProcessReuse = true;

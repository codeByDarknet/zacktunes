const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const os = require('os');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const { execFile } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');

let mainWindow;
let proxyServer;
let proxyPort;
let YTDLP_PATH;
let FFMPEG_PATH;

// Chemins
// app.getPath('music') suit le dossier Musique localisé (ex. ~/Musique sous Ubuntu FR)
const TUNESPOCKET_DIR = path.join(app.getPath('music'), 'TunesPocket');
const BIBLIOTHEQUE_PATH = path.join(TUNESPOCKET_DIR, 'bibliotheque.json');
const IMAGES_DIR = path.join(TUNESPOCKET_DIR, 'images');
const AUDIO_DIR = path.join(TUNESPOCKET_DIR, 'audio');

// Exécuter yt-dlp avec child_process.execFile natif
function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    if (!YTDLP_PATH || !fsSync.existsSync(YTDLP_PATH)) {
      return reject(new Error('yt-dlp introuvable'));
    }

    const timeout = setTimeout(() => {
      reject(new Error('Timeout'));
    }, 120000);

    execFile(YTDLP_PATH, args, { 
      maxBuffer: 10 * 1024 * 1024,
      timeout: 120000,
      windowsHide: true
    }, (error, stdout, stderr) => {
      clearTimeout(timeout);
      if (error) {
        console.error('yt-dlp stderr:', stderr);
        return reject(error);
      }
      resolve(stdout);
    });
  });
}

// Trouver les binaires (yt-dlp et ffmpeg)
function findBinaries() {
  const exe = process.platform === 'win32' ? '.exe' : '';
  const resourceDirs = [
    process.resourcesPath,
    path.join(__dirname, 'resources'),
    path.join(path.dirname(process.execPath), 'resources')
  ];
  // Sous Linux, on préfère le yt-dlp de l'utilisateur (tenu à jour) au binaire embarqué
  const systemDirs = process.platform === 'win32' ? [] : [
    path.join(os.homedir(), '.local', 'bin'),
    '/usr/local/bin',
    '/usr/bin'
  ];

  // Trouver yt-dlp
  for (const dir of [...systemDirs, ...resourceDirs]) {
    const p = path.join(dir, 'yt-dlp' + exe);
    if (fsSync.existsSync(p)) {
      YTDLP_PATH = p;
      console.log('yt-dlp trouvé:', p);
      break;
    }
  }
  if (!YTDLP_PATH) console.error('yt-dlp introuvable');

  // Trouver ffmpeg
  for (const dir of [...resourceDirs, ...systemDirs]) {
    const p = path.join(dir, 'ffmpeg' + exe);
    if (fsSync.existsSync(p)) {
      FFMPEG_PATH = p;
      ffmpeg.setFfmpegPath(p);
      console.log('ffmpeg trouvé:', p);
      break;
    }
  }

  // Fallback sur le module npm (mode dev)
  if (!FFMPEG_PATH) {
    try {
      const npmPath = require('@ffmpeg-installer/ffmpeg').path;
      if (fsSync.existsSync(npmPath)) {
        FFMPEG_PATH = npmPath;
        ffmpeg.setFfmpegPath(npmPath);
        console.log('ffmpeg (npm):', npmPath);
      }
    } catch (e) {
      console.error('ffmpeg introuvable');
    }
  }
}

// Créer un serveur proxy pour le streaming avec conversion MP3
function createProxyServer() {
  proxyServer = http.createServer((req, res) => {
    const reqUrl = new URL(req.url, 'http://localhost');
    const targetUrl = reqUrl.searchParams.get('url');

    if (!targetUrl) {
      res.writeHead(400);
      res.end('URL manquante');
      return;
    }

    console.log('Proxy streaming...');

    const parsedUrl = new URL(targetUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const audioReq = client.request(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*'
      }
    }, (audioRes) => {
      if (audioRes.statusCode !== 200) {
        console.error('Erreur HTTP:', audioRes.statusCode);
        res.writeHead(500);
        res.end('Erreur');
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Transfer-Encoding': 'chunked',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      });

      const ffmpegProcess = ffmpeg(audioRes)
        .inputFormat('mp4')
        .audioBitrate(128)
        .audioChannels(2)
        .audioFrequency(44100)
        .toFormat('mp3')
        .on('error', (err) => {
          console.error('Erreur ffmpeg stream:', err.message);
          if (!res.writableEnded) res.end();
        })
        .on('end', () => {
          console.log('Stream terminé');
        });

      ffmpegProcess.pipe(res, { end: true });

      req.on('close', () => {
        audioRes.destroy();
        ffmpegProcess.kill('SIGKILL');
      });
    });

    audioReq.on('error', (err) => {
      console.error('Erreur proxy:', err.message);
      if (!res.headersSent) res.writeHead(500);
      res.end('Erreur');
    });

    audioReq.end();
  });

  proxyServer.listen(0, '127.0.0.1', () => {
    proxyPort = proxyServer.address().port;
    console.log(`Proxy sur port ${proxyPort}`);
  });
}

async function createWindow() {
  await ensureDirectories();
  findBinaries();
  createProxyServer();

  require('electron').Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false
  });

  mainWindow.loadFile('index.html');
  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') mainWindow.webContents.toggleDevTools();
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

async function ensureDirectories() {
  try {
    await fs.mkdir(TUNESPOCKET_DIR, { recursive: true });
    await fs.mkdir(IMAGES_DIR, { recursive: true });
    await fs.mkdir(AUDIO_DIR, { recursive: true });

    try {
      await fs.access(BIBLIOTHEQUE_PATH);
    } catch {
      await fs.writeFile(BIBLIOTHEQUE_PATH, JSON.stringify({
        musiques: [],
        version: "1.0",
        derniereModification: new Date().toISOString()
      }, null, 2));
    }
  } catch (error) {
    console.error('Erreur dossiers:', error);
  }
}

// IPC Handlers
ipcMain.handle('get-paths', () => ({
  tunespocketDir: TUNESPOCKET_DIR,
  bibliothequeFile: BIBLIOTHEQUE_PATH,
  imagesDir: IMAGES_DIR,
  audioDir: AUDIO_DIR
}));

ipcMain.handle('get-proxy-port', () => proxyPort);
ipcMain.handle('show-error-dialog', (event, title, content) => dialog.showErrorBox(title, content));
ipcMain.handle('show-message-dialog', (event, options) => dialog.showMessageBox(mainWindow, options));

// Traduire du texte
ipcMain.handle('translate-text', async (event, text, targetLang) => {
  try {
    const encodedText = encodeURIComponent(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodedText}`;

    const response = await new Promise((resolve, reject) => {
      https.get(url, { timeout: 30000 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });

    const json = JSON.parse(response);
    return json[0].map(item => item[0]).join('') || text;
  } catch (error) {
    throw new Error('Impossible de traduire le texte');
  }
});

// Récupérer les paroles
ipcMain.handle('get-lyrics', async (event, artist, title) => {
  try {
    const lrclibUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`;

    try {
      const response = await new Promise((resolve, reject) => {
        https.get(lrclibUrl, { timeout: 10000 }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(data));
        }).on('error', reject);
      });

      const json = JSON.parse(response);
      if (json.syncedLyrics || json.plainLyrics) {
        return {
          synced: json.syncedLyrics || null,
          plain: json.plainLyrics || json.syncedLyrics?.replace(/\[\d+:\d+\.\d+\]/g, '').trim()
        };
      }
    } catch (err) {}

    const ovhUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;

    try {
      const response = await new Promise((resolve, reject) => {
        https.get(ovhUrl, { timeout: 10000 }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(data));
        }).on('error', reject);
      });

      const json = JSON.parse(response);
      if (json.lyrics) {
        return { synced: null, plain: json.lyrics.trim() };
      }
    } catch (err) {}

    throw new Error('Paroles non trouvées');
  } catch (error) {
    throw new Error('Paroles non disponibles');
  }
});

// Obtenir les infos d'une vidéo via yt-dlp (child_process direct)
ipcMain.handle('get-video-info', async (event, url) => {
  try {
    const cleanUrl = url.split('&list=')[0].split('&index=')[0];
    console.log('Récupération infos pour:', cleanUrl);

    const result = await runYtDlp([cleanUrl, '--no-playlist', '-j']);
    const info = JSON.parse(result);

    console.log('Infos obtenues:', info.title);

    return {
      id: info.id,
      title: info.title,
      author: info.uploader || info.channel || 'Artiste inconnu',
      thumbnail: info.thumbnail,
      duration: info.duration
    };
  } catch (error) {
    console.error('Erreur get-video-info:', error.message);
    throw new Error('Impossible de récupérer les informations');
  }
});

// Obtenir l'URL de streaming audio
ipcMain.handle('get-audio-url', async (event, url) => {
  try {
    const cleanUrl = url.split('&list=')[0].split('&index=')[0];
    console.log('Récupération URL audio pour:', cleanUrl);

    const result = await runYtDlp([
      cleanUrl,
      '-f', 'bestaudio[ext=m4a]/bestaudio',
      '-g',
      '--no-playlist'
    ]);

    const audioUrl = result.trim();
    console.log('URL audio obtenue');
    return `http://127.0.0.1:${proxyPort}/?url=${encodeURIComponent(audioUrl)}`;
  } catch (error) {
    console.error('Erreur get-audio-url:', error.message);
    throw new Error('Impossible d\'obtenir l\'URL audio');
  }
});

// Télécharger l'audio
ipcMain.handle('download-audio', async (event, url, videoId, audioDir, title) => {
  const cleanUrl = url.split('&list=')[0].split('&index=')[0];
  const safeName = title
    ? title.replace(/[<>:"/\\|?*]/g, '').substring(0, 100).trim()
    : videoId;
  const outputPath = path.join(audioDir, `${safeName}.mp3`);

  if (fsSync.existsSync(outputPath)) {
    console.log('Déjà téléchargé:', outputPath);
    return outputPath;
  }

  try {
    console.log('Téléchargement:', cleanUrl);

    await runYtDlp([
      cleanUrl,
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '192K',
      '--ffmpeg-location', FFMPEG_PATH,
      '--no-playlist',
      '-o', outputPath
    ]);

    // Si le fichier n'a pas été créé directement en mp3, convertir
    if (!fsSync.existsSync(outputPath)) {
      const possibleExts = ['.webm', '.m4a', '.opus', '.mp3.mp3'];
      for (const ext of possibleExts) {
        const file = outputPath.replace('.mp3', ext);
        if (fsSync.existsSync(file)) {
          console.log('Conversion:', file);
          await new Promise((resolve, reject) => {
            ffmpeg(file)
              .audioBitrate(192)
              .toFormat('mp3')
              .on('error', reject)
              .on('end', () => {
                try { fsSync.unlinkSync(file); } catch {}
                resolve();
              })
              .save(outputPath);
          });
          break;
        }
      }
    }

    if (!fsSync.existsSync(outputPath)) {
      throw new Error('Fichier MP3 non créé');
    }

    console.log('Téléchargement terminé:', outputPath);
    return outputPath;
  } catch (error) {
    console.error('Erreur download:', error.message);
    throw new Error('Erreur lors du téléchargement');
  }
});

// Convertir en MP3
ipcMain.handle('convert-to-mp3', async (event, inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioBitrate(192)
      .toFormat('mp3')
      .on('error', reject)
      .on('end', () => {
        try { fsSync.unlinkSync(inputPath); } catch {}
        resolve(outputPath);
      })
      .save(outputPath);
  });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (proxyServer) proxyServer.close();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

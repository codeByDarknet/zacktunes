const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const os = require('os');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const { spawn } = require('child_process');

// Configurer ffmpeg avec le binaire bundlé
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

// yt-dlp
const YTDlpWrap = require('yt-dlp-wrap').default;
let ytDlp = null;

let mainWindow;
let proxyServer;
let proxyPort;

// Chemins
const TUNESPOCKET_DIR = path.join(os.homedir(), 'Music', 'TunesPocket');
const BIBLIOTHEQUE_PATH = path.join(TUNESPOCKET_DIR, 'bibliotheque.json');
const IMAGES_DIR = path.join(TUNESPOCKET_DIR, 'images');
const AUDIO_DIR = path.join(TUNESPOCKET_DIR, 'audio');
const TEMP_DIR = path.join(os.tmpdir(), 'tunespocket-cache');
const YTDLP_PATH = path.join(TEMP_DIR, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');

// Télécharger yt-dlp si nécessaire
async function ensureYtDlp() {
  try {
    if (!fsSync.existsSync(YTDLP_PATH)) {
      console.log('Téléchargement de yt-dlp...');
      await YTDlpWrap.downloadFromGithub(YTDLP_PATH);
      console.log('yt-dlp téléchargé avec succès');
    }
    ytDlp = new YTDlpWrap(YTDLP_PATH);
    return true;
  } catch (error) {
    console.error('Erreur téléchargement yt-dlp:', error);
    return false;
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

    console.log('Proxy streaming avec conversion MP3...');

    // Télécharger le stream via https et le piper vers ffmpeg
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
        res.end('Erreur de téléchargement');
        return;
      }

      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Transfer-Encoding': 'chunked',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      });

      // Utiliser ffmpeg pour convertir le stream en MP3
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
      console.error('Erreur requête audio:', err.message);
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
  await ensureYtDlp();
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
    icon: path.join(__dirname, 'assets', 'default-cover1.jpg'),
    show: false
  });

  mainWindow.loadFile('index.html');
  mainWindow.once('ready-to-show', () => mainWindow.show());

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

async function ensureDirectories() {
  try {
    await fs.mkdir(TUNESPOCKET_DIR, { recursive: true });
    await fs.mkdir(IMAGES_DIR, { recursive: true });
    await fs.mkdir(AUDIO_DIR, { recursive: true });
    await fs.mkdir(TEMP_DIR, { recursive: true });
    
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
  audioDir: AUDIO_DIR,
  tempDir: TEMP_DIR
}));

ipcMain.handle('get-proxy-port', () => proxyPort);

ipcMain.handle('show-error-dialog', (event, title, content) => dialog.showErrorBox(title, content));
ipcMain.handle('show-message-dialog', (event, options) => dialog.showMessageBox(mainWindow, options));

// Traduire du texte via Google Translate (API publique)
ipcMain.handle('translate-text', async (event, text, targetLang) => {
  try {
    console.log(`Traduction vers ${targetLang}...`);
    
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
    const translated = json[0].map(item => item[0]).join('');
    console.log('Traduction réussie');
    return translated || text;
    
  } catch (error) {
    console.error('Erreur traduction:', error.message);
    throw new Error('Impossible de traduire le texte');
  }
});

// Récupérer les paroles via API
ipcMain.handle('get-lyrics', async (event, artist, title) => {
  try {
    console.log(`Recherche paroles: ${artist} - ${title}`);
    
    // API lrclib.net avec paroles synchronisées
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
        console.log('Paroles trouvées via lrclib.net');
        return {
          synced: json.syncedLyrics || null,
          plain: json.plainLyrics || json.syncedLyrics?.replace(/\[\d+:\d+\.\d+\]/g, '').trim()
        };
      }
    } catch (err) {
      console.log('lrclib.net échoué:', err.message);
    }
    
    // API lyrics.ovh (fallback sans sync)
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
        console.log('Paroles trouvées via lyrics.ovh');
        return { synced: null, plain: json.lyrics.trim() };
      }
    } catch (err) {
      console.log('lyrics.ovh échoué:', err.message);
    }
    
    throw new Error('Paroles non trouvées');
  } catch (error) {
    console.error('Erreur recherche paroles:', error.message);
    throw new Error('Paroles non disponibles');
  }
});

// Obtenir les infos d'une vidéo via yt-dlp
ipcMain.handle('get-video-info', async (event, url) => {
  if (!ytDlp) throw new Error('yt-dlp non disponible');
  
  try {
    // Nettoyer l'URL des paramètres de playlist
    const cleanUrl = url.split('&list=')[0].split('&index=')[0];
    console.log('Récupération infos pour:', cleanUrl);
    
    // Timeout de 60 secondes
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout - Vérifiez votre connexion')), 60000)
    );
    
    // Utiliser execPromise avec --no-playlist pour être plus rapide
    const resultPromise = ytDlp.execPromise([
      cleanUrl,
      '--no-playlist',
      '-j'
    ]);
    
    const result = await Promise.race([resultPromise, timeoutPromise]);
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
    console.error('Erreur get-video-info:', error);
    throw new Error('Impossible de récupérer les informations');
  }
});

// Obtenir l'URL de streaming audio
ipcMain.handle('get-audio-url', async (event, url) => {
  if (!ytDlp) throw new Error('yt-dlp non disponible');
  
  try {
    // Nettoyer l'URL des paramètres de playlist
    const cleanUrl = url.split('&list=')[0].split('&index=')[0];
    console.log('Récupération URL audio pour:', cleanUrl);
    
    // Timeout de 60 secondes
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 60000)
    );
    
    const execPromise = ytDlp.execPromise([
      cleanUrl,
      '-f', 'bestaudio[ext=m4a]/bestaudio',
      '-g',
      '--no-playlist'
    ]);
    
    const result = await Promise.race([execPromise, timeoutPromise]);
    const audioUrl = result.trim();
    
    console.log('URL audio obtenue');
    return `http://127.0.0.1:${proxyPort}/?url=${encodeURIComponent(audioUrl)}`;
  } catch (error) {
    console.error('Erreur get-audio-url:', error);
    throw new Error('Impossible d\'obtenir l\'URL audio');
  }
});

// Télécharger l'audio
ipcMain.handle('download-audio', async (event, url, videoId, audioDir, title) => {
  if (!ytDlp) throw new Error('yt-dlp non disponible');
  
  // Nettoyer l'URL
  const cleanUrl = url.split('&list=')[0].split('&index=')[0];
  
  // Créer un nom de fichier sécurisé basé sur le titre ou l'ID
  const safeName = title 
    ? title.replace(/[<>:"/\\|?*]/g, '').substring(0, 100).trim()
    : videoId;
  const outputPath = path.join(audioDir, `${safeName}.mp3`);
  
  // Vérifier si déjà téléchargé
  if (fsSync.existsSync(outputPath)) {
    console.log('Fichier déjà téléchargé:', outputPath);
    return outputPath;
  }

  try {
    console.log('Téléchargement audio:', cleanUrl);
    console.log('Destination:', outputPath);
    
    // Télécharger avec yt-dlp et convertir directement en MP3
    await ytDlp.execPromise([
      cleanUrl,
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '192K',
      '--ffmpeg-location', ffmpegPath,
      '--no-playlist',
      '-o', outputPath
    ]);

    // Vérifier si le fichier existe avec une extension différente
    if (!fsSync.existsSync(outputPath)) {
      const possibleFiles = [
        outputPath.replace('.mp3', '.webm'),
        outputPath.replace('.mp3', '.m4a'),
        outputPath.replace('.mp3', '.opus'),
        outputPath.replace('.mp3', '.mp3.mp3')
      ];

      for (const file of possibleFiles) {
        if (fsSync.existsSync(file)) {
          console.log('Conversion de:', file);
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
    console.error('Erreur download-audio:', error);
    throw new Error('Erreur lors du téléchargement: ' + error.message);
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

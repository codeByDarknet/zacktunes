const https = require('https');
const fs = require('fs');
const path = require('path');

// Binaire autonome adapté à la plateforme de build (yt-dlp.exe sous Windows, yt-dlp_linux sous Linux)
const isWin = process.platform === 'win32';
const YTDLP_URL = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${isWin ? 'yt-dlp.exe' : 'yt-dlp_linux'}`;
const YTDLP_PATH = path.join(__dirname, 'resources', isWin ? 'yt-dlp.exe' : 'yt-dlp');

console.log('Téléchargement de yt-dlp...');

// GitHub redirige "latest/download" vers le fichier réel : on suit les redirections
function download(url, redirects = 0) {
  https.get(url, (response) => {
    if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location && redirects < 5) {
      response.resume();
      return download(response.headers.location, redirects + 1);
    }
    if (response.statusCode !== 200) {
      console.error('Erreur: HTTP', response.statusCode);
      process.exit(1);
    }
    const file = fs.createWriteStream(YTDLP_PATH, { mode: 0o755 });
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log('yt-dlp téléchargé avec succès dans resources/');
    });
  }).on('error', (err) => {
    fs.unlink(YTDLP_PATH, () => {});
    console.error('Erreur:', err.message);
    process.exit(1);
  });
}

download(YTDLP_URL);

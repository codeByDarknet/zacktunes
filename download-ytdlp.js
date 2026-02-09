const https = require('https');
const fs = require('fs');
const path = require('path');

const YTDLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
const YTDLP_PATH = path.join(__dirname, 'resources', 'yt-dlp.exe');

console.log('Téléchargement de yt-dlp...');

const file = fs.createWriteStream(YTDLP_PATH);
https.get(YTDLP_URL, (response) => {
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

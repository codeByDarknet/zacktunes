// Télécharge les binaires embarqués dans l'application, selon la plateforme de build :
//   Linux   : resources/yt-dlp                      (ffmpeg vient du système)
//   Windows : resources/yt-dlp.exe                  (ffmpeg.exe est déjà dans le dépôt)
//   macOS   : resources/mac/yt-dlp                  (binaire universel)
//             resources/mac/{arm64,x64}/ffmpeg      (binaires statiques ffmpeg-static)
// Usage : node download-ytdlp.js [linux|win|mac]
const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const target = process.argv[2]
  || { win32: 'win', darwin: 'mac' }[process.platform]
  || 'linux';

const RES = path.join(__dirname, 'resources');
const YTDLP = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/';
// Version figée pour des builds reproductibles
const FFMPEG = 'https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/';

const jobs = {
  linux: [{ url: YTDLP + 'yt-dlp_linux', dest: 'yt-dlp' }],
  win: [{ url: YTDLP + 'yt-dlp.exe', dest: 'yt-dlp.exe' }],
  mac: [
    { url: YTDLP + 'yt-dlp_macos', dest: 'mac/yt-dlp' },
    { url: FFMPEG + 'ffmpeg-darwin-arm64.gz', dest: 'mac/arm64/ffmpeg', gunzip: true },
    { url: FFMPEG + 'ffmpeg-darwin-x64.gz', dest: 'mac/x64/ffmpeg', gunzip: true }
  ]
}[target];

if (!jobs) {
  console.error(`Plateforme inconnue : ${target} (attendu : linux, win ou mac)`);
  process.exit(1);
}

// GitHub redirige "latest/download" vers le fichier réel : on suit les redirections
function get(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'zacktunes-build' } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects < 5) {
        res.resume();
        return resolve(get(new URL(res.headers.location, url).href, redirects + 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} pour ${url}`));
      }
      resolve(res);
    }).on('error', reject);
  });
}

async function download({ url, dest, gunzip }) {
  const out = path.join(RES, dest);
  const tmp = out + '.part';
  fs.mkdirSync(path.dirname(out), { recursive: true });
  console.log(`Téléchargement de ${path.basename(url)} -> resources/${dest}`);
  const res = await get(url);
  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(tmp, { mode: 0o755 });
    const stream = gunzip ? res.pipe(zlib.createGunzip()) : res;
    stream.on('error', reject);
    file.on('error', reject);
    file.on('finish', resolve);
    stream.pipe(file);
  });
  fs.renameSync(tmp, out);
  fs.chmodSync(out, 0o755);
}

(async () => {
  for (const job of jobs) await download(job);
  console.log(`Binaires prêts pour ${target}.`);
})().catch((err) => {
  console.error('Erreur :', err.message);
  process.exit(1);
});

(function() {
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { ipcRenderer } = require('electron');
const sanitize = require('sanitize-filename');

class YouTubeUtils {
  constructor() {
    console.log('YouTubeUtils: Initialisation...');
    this.isOnline = navigator.onLine;
    this.setupConnectionListener();
    console.log('YouTubeUtils: Initialisé avec succès');
  }

  setupConnectionListener() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.updateConnectionStatus();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.updateConnectionStatus();
    });
  }

  updateConnectionStatus() {
    const icon = document.getElementById('connectionIcon');
    const text = document.getElementById('connectionText');
    
    if (icon && text) {
      if (this.isOnline) {
        icon.className = 'fas fa-circle text-success';
        text.textContent = 'En ligne';
      } else {
        icon.className = 'fas fa-circle text-danger';
        text.textContent = 'Hors ligne';
      }
    }
  }

  // Valider un lien YouTube
  isValidYouTubeUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    const cleanUrl = url.split('&list=')[0].split('&start_radio=')[0];
    
    const patterns = [
      /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^(https?:\/\/)?youtu\.be\/[\w-]+/,
      /^(https?:\/\/)?(www\.)?youtube\.com\/embed\/[\w-]+/
    ];
    
    return patterns.some(pattern => pattern.test(cleanUrl));
  }

  // Extraire l'ID YouTube depuis l'URL
  extractVideoId(url) {
    const cleanUrl = url.split('&list=')[0].split('&start_radio=')[0];
    
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = cleanUrl.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  }

  // Récupérer les informations d'une vidéo YouTube via yt-dlp
  async getVideoInfo(url) {
    if (!this.isOnline) {
      throw new Error('Connexion internet requise pour ajouter une musique');
    }

    try {
      const videoId = this.extractVideoId(url);
      if (!videoId) {
        throw new Error('Lien YouTube invalide');
      }

      const info = await ipcRenderer.invoke('get-video-info', url);

      return {
        id: videoId,
        titre: info.title,
        artiste: info.author,
        lienYoutube: url,
        thumbnail: info.thumbnail,
        duree: info.duration || 0,
        dateAjout: new Date().toISOString(),
        estTelecharge: false,
        cheminAudio: null
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des infos:', error);
      throw new Error('Impossible de récupérer les informations. Vérifiez le lien et votre connexion.');
    }
  }

  // Télécharger le thumbnail
  async downloadThumbnail(thumbnailUrl, videoId, imagesDir) {
    const https = require('https');
    const fsSync = require('fs');
    
    return new Promise((resolve, reject) => {
      const filename = `${videoId}.jpg`;
      const filepath = require('path').join(imagesDir, filename);
      
      // Utiliser l'URL YouTube directe
      const url = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      
      console.log('Téléchargement thumbnail:', url);
      console.log('Vers:', filepath);
      
      const file = fsSync.createWriteStream(filepath);
      
      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log('Thumbnail téléchargé avec succès');
          resolve(filepath);
        });
      }).on('error', (err) => {
        fsSync.unlink(filepath, () => {});
        reject(err);
      });
      
      file.on('error', (err) => {
        fsSync.unlink(filepath, () => {});
        reject(err);
      });
    });
  }

  // Télécharger l'audio en MP3 via yt-dlp
  async downloadAudio(url, videoId, audioDir, onProgress = null, title = null) {
    if (!this.isOnline) {
      throw new Error('Connexion internet requise pour télécharger');
    }

    try {
      const filepath = await ipcRenderer.invoke('download-audio', url, sanitize(videoId), audioDir, title);
      
      if (onProgress) onProgress(100);
      
      return filepath;
    } catch (error) {
      console.error('Erreur téléchargement audio:', error);
      throw new Error('Impossible de télécharger l\'audio');
    }
  }

  // Obtenir l'URL de streaming via proxy local
  async getStreamingUrl(url) {
    if (!this.isOnline) {
      throw new Error('Connexion internet requise pour le streaming');
    }

    try {
      const streamUrl = await ipcRenderer.invoke('get-audio-url', url);
      return streamUrl;
    } catch (error) {
      console.error('Erreur streaming URL:', error);
      throw new Error('Impossible de lire cette musique en streaming');
    }
  }

  // Récupérer les paroles d'une chanson
  async getLyrics(titre, artiste) {
    if (!this.isOnline) {
      throw new Error('Connexion internet requise');
    }

    try {
      // Parser le titre YouTube
      let songArtist = artiste;
      let songTitle = titre;
      
      if (titre.includes(' - ')) {
        const parts = titre.split(' - ');
        songArtist = parts[0].trim();
        songTitle = parts.slice(1).join(' - ').trim();
      }
      
      // Nettoyer
      songArtist = songArtist.replace(/\(feat\..*?\)|\(ft\..*?\)|VEVO|Topic|Official/gi, '').trim();
      songTitle = songTitle.replace(/\(.*?\)|\[.*?\]|official|video|audio|lyrics|hd|4k|music|mv|clip/gi, '').trim();
      
      console.log(`Recherche paroles: "${songArtist}" - "${songTitle}"`);
      
      const result = await ipcRenderer.invoke('get-lyrics', songArtist, songTitle);
      return result;
      
    } catch (error) {
      console.error('Erreur:', error.message);
      throw new Error('Paroles non disponibles pour cette chanson');
    }
  }

  // Traduire du texte en français
  async translateText(text, targetLang = 'fr') {
    if (!this.isOnline) {
      throw new Error('Connexion internet requise');
    }

    try {
      const translated = await ipcRenderer.invoke('translate-text', text, targetLang);
      return translated;
    } catch (error) {
      console.error('Erreur traduction:', error.message);
      throw new Error('Impossible de traduire le texte');
    }
  }

  // Formater la durée en minutes:secondes
  formatDuration(seconds) {
    if (!seconds || seconds === 0) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

// Instance globale
console.log('Création de l\'instance YouTubeUtils...');
window.youtubeUtils = new YouTubeUtils();
console.log('YouTubeUtils disponible:', !!window.youtubeUtils);
})();

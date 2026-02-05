(function() {
const fs = require('fs').promises;
const path = require('path');
const { ipcRenderer } = require('electron');

class FileUtils {
  constructor() {
    console.log('FileUtils: Initialisation...');
    this.paths = null;
    this.initPromise = this.initPaths();
    console.log('FileUtils: Initialisé avec succès');
  }

  async initPaths() {
    if (this.paths) return this.paths;
    this.paths = await ipcRenderer.invoke('get-paths');
    return this.paths;
  }

  async ensurePaths() {
    if (!this.paths) {
      await this.initPromise;
    }
    return this.paths;
  }

  // Charger la bibliothèque depuis le fichier JSON
  async loadBibliotheque() {
    try {
      await this.ensurePaths();
      
      const data = await fs.readFile(this.paths.bibliothequeFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Erreur lors du chargement de la bibliothèque:', error);
      
      // Créer une bibliothèque vide si le fichier n'existe pas
      const emptyBibliotheque = {
        musiques: [],
        version: "1.0",
        derniereModification: new Date().toISOString()
      };
      
      await this.saveBibliotheque(emptyBibliotheque);
      return emptyBibliotheque;
    }
  }

  // Sauvegarder la bibliothèque dans le fichier JSON
  async saveBibliotheque(bibliotheque) {
    try {
      await this.ensurePaths();
      
      bibliotheque.derniereModification = new Date().toISOString();
      const data = JSON.stringify(bibliotheque, null, 2);
      await fs.writeFile(this.paths.bibliothequeFile, data, 'utf8');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      throw new Error('Impossible de sauvegarder la bibliothèque');
    }
  }

  // Ajouter une musique à la bibliothèque
  async addMusic(musicInfo) {
    try {
      await this.ensurePaths();
      const bibliotheque = await this.loadBibliotheque();
      
      console.log('Ajout musique:', musicInfo.titre);
      
      // Vérifier si la musique existe déjà
      const exists = bibliotheque.musiques.some(m => m.id === musicInfo.id);
      if (exists) {
        throw new Error('Cette musique est déjà dans votre bibliothèque');
      }

      // Télécharger le thumbnail
      try {
        const thumbnailPath = await window.youtubeUtils.downloadThumbnail(
          musicInfo.thumbnail,
          musicInfo.id,
          this.paths.imagesDir
        );
        musicInfo.thumbnail = path.relative(this.paths.tunespocketDir, thumbnailPath);
      } catch (thumbnailError) {
        console.error('Erreur thumbnail:', thumbnailError);
        musicInfo.thumbnail = null;
      }
      
      // Récupérer les paroles automatiquement
      try {
        const lyrics = await window.youtubeUtils.getLyrics(musicInfo.titre, musicInfo.artiste);
        musicInfo.lyrics = lyrics;
        console.log('Paroles récupérées et enregistrées');
      } catch (lyricsError) {
        console.log('Paroles non disponibles:', lyricsError.message);
        musicInfo.lyrics = null;
      }
      
      // Ajouter à la bibliothèque
      bibliotheque.musiques.unshift(musicInfo);
      await this.saveBibliotheque(bibliotheque);
      
      console.log('Musique ajoutée avec succès');
      return musicInfo;
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error);
      throw error;
    }
  }

  // Supprimer une musique de la bibliothèque
  async removeMusic(musicId, deleteAudioFile = false) {
    try {
      const bibliotheque = await this.loadBibliotheque();
      const musicIndex = bibliotheque.musiques.findIndex(m => m.id === musicId);
      
      if (musicIndex === -1) {
        throw new Error('Musique non trouvée');
      }

      const music = bibliotheque.musiques[musicIndex];
      
      // Supprimer les fichiers
      await this.deleteFiles(music, deleteAudioFile);
      
      // Retirer de la bibliothèque
      bibliotheque.musiques.splice(musicIndex, 1);
      await this.saveBibliotheque(bibliotheque);
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      throw error;
    }
  }

  // Supprimer les fichiers associés à une musique
  async deleteFiles(music, deleteAudio = false) {
    try {
      // Supprimer le thumbnail
      if (music.thumbnail) {
        const thumbnailPath = path.join(this.paths.tunespocketDir, music.thumbnail);
        try {
          await fs.unlink(thumbnailPath);
        } catch (error) {
          console.warn('Impossible de supprimer le thumbnail:', error.message);
        }
      }

      // Supprimer l'audio si demandé et s'il existe
      if (deleteAudio && music.cheminAudio) {
        const audioPath = path.join(this.paths.tunespocketDir, music.cheminAudio);
        try {
          await fs.unlink(audioPath);
        } catch (error) {
          console.warn('Impossible de supprimer le fichier audio:', error.message);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la suppression des fichiers:', error);
    }
  }

  // Marquer une musique comme téléchargée
  async markAsDownloaded(musicId, audioPath) {
    try {
      const bibliotheque = await this.loadBibliotheque();
      const music = bibliotheque.musiques.find(m => m.id === musicId);
      
      if (!music) {
        throw new Error('Musique non trouvée');
      }

      music.estTelecharge = true;
      music.cheminAudio = path.relative(this.paths.tunespocketDir, audioPath);
      
      await this.saveBibliotheque(bibliotheque);
      return music;
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      throw error;
    }
  }

  // Rechercher dans la bibliothèque
  searchMusic(musiques, query) {
    if (!query || query.trim() === '') {
      return musiques;
    }

    const searchTerm = query.toLowerCase().trim();
    return musiques.filter(music => 
      music.titre.toLowerCase().includes(searchTerm) ||
      music.artiste.toLowerCase().includes(searchTerm)
    );
  }

  // Obtenir le chemin complet d'un fichier
  getFullPath(relativePath) {
    if (!relativePath || !this.paths) return '';
    return path.join(this.paths.tunespocketDir, relativePath);
  }

  // Vérifier si un fichier existe
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // Obtenir la taille d'un fichier
  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  // Formater la taille d'un fichier
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Nettoyer les fichiers orphelins
  async cleanupOrphanedFiles() {
    try {
      const bibliotheque = await this.loadBibliotheque();
      const usedFiles = new Set();
      
      // Collecter tous les fichiers utilisés
      bibliotheque.musiques.forEach(music => {
        if (music.thumbnail) {
          usedFiles.add(path.basename(music.thumbnail));
        }
        if (music.cheminAudio) {
          usedFiles.add(path.basename(music.cheminAudio));
        }
      });

      // Nettoyer le dossier images
      const imageFiles = await fs.readdir(this.paths.imagesDir);
      for (const file of imageFiles) {
        if (!usedFiles.has(file)) {
          await fs.unlink(path.join(this.paths.imagesDir, file));
        }
      }

      // Nettoyer le dossier audio
      const audioFiles = await fs.readdir(this.paths.audioDir);
      for (const file of audioFiles) {
        if (!usedFiles.has(file)) {
          await fs.unlink(path.join(this.paths.audioDir, file));
        }
      }
    } catch (error) {
      console.error('Erreur lors du nettoyage:', error);
    }
  }

  // Exporter la bibliothèque
  async exportBibliotheque(exportPath) {
    try {
      const bibliotheque = await this.loadBibliotheque();
      const exportData = {
        ...bibliotheque,
        exportDate: new Date().toISOString(),
        exportVersion: "1.0"
      };
      
      await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      throw new Error('Impossible d\'exporter la bibliothèque');
    }
  }

  // Importer une bibliothèque
  async importBibliotheque(importPath) {
    try {
      const data = await fs.readFile(importPath, 'utf8');
      const importedData = JSON.parse(data);
      
      if (!importedData.musiques || !Array.isArray(importedData.musiques)) {
        throw new Error('Format de fichier invalide');
      }

      const currentBibliotheque = await this.loadBibliotheque();
      const existingIds = new Set(currentBibliotheque.musiques.map(m => m.id));
      
      // Ajouter seulement les nouvelles musiques
      const newMusics = importedData.musiques.filter(m => !existingIds.has(m.id));
      currentBibliotheque.musiques.push(...newMusics);
      
      await this.saveBibliotheque(currentBibliotheque);
      return newMusics.length;
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      throw new Error('Impossible d\'importer la bibliothèque');
    }
  }
}

// Instance globale
console.log('Création de l\'instance FileUtils...');
window.fileUtils = new FileUtils();
console.log('FileUtils disponible:', !!window.fileUtils);
})();
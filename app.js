class ZackTunesApp {
  constructor() {
    this.currentMusic = null;
    this.currentPlaylist = [];
    this.currentIndex = -1;
    this.isPlaying = false;
    this.bibliotheque = { musiques: [] };
    this.filteredMusics = [];
    this.lyricsTimestamps = [];
    this.currentLyricIndex = -1;
    this.originalLyrics = null;
    this.isTranslated = false;
    
    this.initializeApp();
  }

  async initializeApp() {
    await this.waitForUtils();
    await this.loadBibliotheque();
    this.setupEventListeners();
    this.renderMusicLibrary();
    this.updateConnectionStatus();
    
    // Charger la première musique au démarrage
    if (this.bibliotheque.musiques.length > 0) {
      this.currentMusic = this.bibliotheque.musiques[0];
      this.updateCurrentPlaylist();
      this.updatePlayerDisplay();
    }
  }

  // Attendre que tous les utilitaires soient initialisés
  async waitForUtils() {
    let attempts = 0;
    while ((!window.fileUtils || !window.youtubeUtils) && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!window.fileUtils || !window.youtubeUtils) {
      throw new Error('Erreur d\'initialisation des utilitaires');
    }
    
    // S'assurer que fileUtils est complètement initialisé
    await window.fileUtils.ensurePaths();
  }

  // Charger la bibliothèque
  async loadBibliotheque() {
    try {
      this.bibliotheque = await window.fileUtils.loadBibliotheque();
      this.filteredMusics = [...this.bibliotheque.musiques];
    } catch (error) {
      this.showToast('Erreur lors du chargement de la bibliothèque', 'error');
    }
  }

  // Configuration des événements
  setupEventListeners() {
    console.log('Configuration des événements...');
    
    // Ajout de musique
    const addBtn = document.getElementById('addMusicBtn');
    const input = document.getElementById('youtubeInput');
    
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        console.log('Bouton ajouter cliqué');
        this.addMusic();
      });
    } else {
      console.error('Bouton addMusicBtn non trouvé');
    }
    
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          console.log('Entrée pressée');
          this.addMusic();
        }
      });
    } else {
      console.error('Input youtubeInput non trouvé');
    }

    // Recherche
    document.getElementById('searchInput')?.addEventListener('input', (e) => this.searchMusic(e.target.value));
    document.getElementById('clearSearchBtn')?.addEventListener('click', () => this.clearSearch());

    // Téléchargement global
    document.getElementById('downloadAllBtn')?.addEventListener('click', () => this.downloadAll());

    // Lecteur audio
    document.getElementById('playPauseBtn')?.addEventListener('click', () => this.togglePlayPause());
    document.getElementById('prevBtn')?.addEventListener('click', () => this.previousTrack());
    document.getElementById('nextBtn')?.addEventListener('click', () => this.nextTrack());
    document.getElementById('progressBar')?.addEventListener('input', (e) => this.seekTo(e.target.value));
    document.getElementById('volumeBar')?.addEventListener('input', (e) => this.setVolume(e.target.value));

    // Audio element events
    const audio = document.getElementById('audioElement');
    if (audio) {
      audio.addEventListener('loadedmetadata', () => this.updatePlayerInfo());
      audio.addEventListener('timeupdate', () => this.updateProgress());
      audio.addEventListener('ended', () => this.nextTrack());
      audio.addEventListener('error', (e) => this.handleAudioError(e));
    }

    // Dialog events
    document.getElementById('dialogCancel')?.addEventListener('click', () => this.hideDialog());
    document.getElementById('dialogConfirm')?.addEventListener('click', () => this.confirmDelete());
    document.getElementById('lyricsClose')?.addEventListener('click', () => this.hideLyricsDialog());
    document.getElementById('translateBtn')?.addEventListener('click', () => this.translateLyrics());
    
    console.log('Événements configurés');
  }

  // Ajouter une musique
  async addMusic() {
    console.log('addMusic appelée');
    
    const input = document.getElementById('youtubeInput');
    const url = input.value.trim();
    
    console.log('URL saisie:', url);

    if (!url) {
      this.showToast('Veuillez coller un lien YouTube', 'warning');
      return;
    }

    // Vérifier que les utilitaires sont prêts
    console.log('Vérification des utilitaires...');
    console.log('youtubeUtils:', !!window.youtubeUtils);
    console.log('fileUtils:', !!window.fileUtils);
    
    if (!window.youtubeUtils || !window.fileUtils) {
      this.showToast('Application en cours d\'initialisation, veuillez patienter...', 'warning');
      return;
    }

    if (!window.youtubeUtils.isValidYouTubeUrl(url)) {
      this.showToast('Lien YouTube invalide', 'error');
      return;
    }

    // UI non-bloquante : spinner sur le bouton et input
    const addBtn = document.getElementById('addMusicBtn');
    const originalBtnText = addBtn.innerHTML;
    addBtn.innerHTML = '<span class="mini-spinner"></span>';
    addBtn.disabled = true;
    input.classList.add('loading');

    try {
      console.log('Récupération des infos vidéo...');
      const musicInfo = await window.youtubeUtils.getVideoInfo(url);
      console.log('Infos récupérées:', musicInfo);
      
      console.log('Ajout à la bibliothèque...');
      const addedMusic = await window.fileUtils.addMusic(musicInfo);
      console.log('Musique ajoutée:', addedMusic);
      
      this.bibliotheque.musiques.unshift(addedMusic);
      this.filteredMusics = [...this.bibliotheque.musiques];
      
      this.renderMusicLibrary();
      input.value = '';
      
      this.showToast(`"${addedMusic.titre}" ajoutée`, 'success');
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error);
      this.showToast(error.message, 'error');
    } finally {
      addBtn.innerHTML = originalBtnText;
      addBtn.disabled = false;
      input.classList.remove('loading');
    }
  }

  // Rechercher dans la bibliothèque
  searchMusic(query) {
    this.filteredMusics = window.fileUtils.searchMusic(this.bibliotheque.musiques, query);
    this.renderMusicLibrary();
    
    const count = this.filteredMusics.length;
    const resultText = query.trim() ? `${count} résultat${count > 1 ? 's' : ''} trouvé${count > 1 ? 's' : ''}` : '';
    document.getElementById('searchResultsCount').textContent = resultText;
  }

  // Effacer la recherche
  clearSearch() {
    document.getElementById('searchInput').value = '';
    this.searchMusic('');
  }

  // Afficher la bibliothèque
  renderMusicLibrary() {
    const container = document.getElementById('musicLibrary');
    const emptyState = document.getElementById('emptyState');

    if (this.filteredMusics.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';
    container.innerHTML = this.filteredMusics.map(music => this.createMusicCard(music)).join('');
  }

  // Créer une carte de musique
  createMusicCard(music) {
    const isPlaying = this.currentMusic && this.currentMusic.id === music.id;
    const statusIcon = music.estTelecharge ? '<i class="fas fa-hdd"></i>' : '<i class="fas fa-cloud"></i>';
    const statusText = music.estTelecharge ? 'Local' : 'Streaming';
    
    let thumbnailHtml = '';
    if (music.thumbnail) {
      const thumbnailPath = window.fileUtils.getFullPath(music.thumbnail).replace(/\\/g, '/');
      thumbnailHtml = `<img src="file:///${thumbnailPath}" alt="${music.titre}" class="music-thumbnail" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`;
    } else {
      thumbnailHtml = `<div class="thumbnail-placeholder" style="display:flex; width:80px; height:60px; background:#E5E5E5; border-radius:8px; align-items:center; justify-content:center; font-size:24px;">🎵</div>`;
    }

    return `
      <div class="music-card ${isPlaying ? 'playing' : ''}" data-id="${music.id}" style="position: relative;">
        <div class="music-header">
          ${thumbnailHtml}
          <div class="thumbnail-placeholder" style="display:none; width:80px; height:60px; background:#E5E5E5; border-radius:8px; align-items:center; justify-content:center; font-size:24px;">🎵</div>
          <div class="music-info">
            <div class="music-title" title="${music.titre}">${music.titre}</div>
            <div class="music-artist" title="${music.artiste}">${music.artiste}</div>
          </div>
        </div>
        <div class="music-actions">
          <div class="music-status">
            ${statusIcon}
            <span>${statusText}</span>
          </div>
          <div class="music-buttons">
            <button class="btn btn-ghost music-btn play-btn-${music.id}" onclick="app.playMusic('${music.id}')" title="Lire">
              <i class="fas ${isPlaying && this.isPlaying ? 'fa-pause' : 'fa-play'}"></i>
            </button>
            <button class="btn btn-ghost music-btn" onclick="app.showLyrics('${music.id}')" title="Paroles">
              <i class="fas fa-file-alt"></i>
            </button>
            ${!music.estTelecharge ? `
              <button class="btn btn-ghost music-btn download-btn-${music.id}" onclick="app.downloadMusic('${music.id}')" title="Télécharger">
                <i class="fas fa-download"></i>
              </button>
            ` : ''}
            <button class="btn btn-ghost music-btn" onclick="app.showDeleteDialog('${music.id}')" title="Supprimer">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        <div id="progress-${music.id}" class="card-loading-overlay" style="display: none;">
          <div class="circular-progress">
            <svg viewBox="0 0 44 44">
              <circle class="bg" cx="22" cy="22" r="20"></circle>
              <circle class="progress" cx="22" cy="22" r="20"></circle>
            </svg>
            <span class="percentage">0%</span>
          </div>
          <div class="loading-text">Téléchargement...</div>
        </div>
      </div>
    `;
  }

  // Lire une musique
  async playMusic(musicId) {
    const music = this.bibliotheque.musiques.find(m => m.id === musicId);
    if (!music) {
      console.error('Musique non trouvée:', musicId);
      return;
    }

    // Si c'est la même musique, toggle play/pause
    if (this.currentMusic && this.currentMusic.id === musicId && document.getElementById('audioElement').src) {
      this.togglePlayPause();
      return;
    }

    // Afficher un spinner sur le bouton play (non-bloquant)
    const playBtn = document.querySelector(`.play-btn-${musicId}`);
    if (playBtn) {
      playBtn.innerHTML = '<span class="mini-spinner"></span>';
      playBtn.disabled = true;
    }

    try {
      const audio = document.getElementById('audioElement');
      
      if (music.estTelecharge && music.cheminAudio) {
        // Lecture locale
        const audioPath = window.fileUtils.getFullPath(music.cheminAudio);
        console.log('Lecture locale:', audioPath);
        audio.src = `file://${audioPath}`;
      } else {
        // Streaming via serveur local
        if (!window.youtubeUtils.isOnline) {
          throw new Error('Connexion internet requise. Téléchargez cette musique pour l\'écouter hors ligne.');
        }
        
        console.log('Streaming: Obtention URL...');
        const streamUrl = await window.youtubeUtils.getStreamingUrl(music.lienYoutube);
        console.log('URL streaming:', streamUrl);
        audio.src = streamUrl;
      }

      this.currentMusic = music;
      this.updateCurrentPlaylist();
      this.updatePlayerDisplay();
      
      // Attendre que l'audio soit prêt
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout chargement audio')), 60000);
        audio.oncanplay = () => { clearTimeout(timeout); resolve(); };
        audio.onerror = () => { clearTimeout(timeout); reject(new Error('Erreur chargement audio')); };
        audio.load();
      });
      
      await audio.play();
      
      this.isPlaying = true;
      this.renderMusicLibrary();
      
    } catch (error) {
      console.error('Erreur playMusic:', error);
      this.showToast(error.message, 'error');
      // Restaurer le bouton en cas d'erreur
      if (playBtn) {
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        playBtn.disabled = false;
      }
    }
  }

  // Toggle play/pause
  togglePlayPause() {
    const audio = document.getElementById('audioElement');
    const btn = document.getElementById('playPauseBtn');

    if (this.isPlaying) {
      audio.pause();
      this.isPlaying = false;
      btn.innerHTML = '<i class="fas fa-play"></i>';
    } else {
      audio.play();
      this.isPlaying = true;
      btn.innerHTML = '<i class="fas fa-pause"></i>';
    }

    this.renderMusicLibrary();
  }

  // Piste précédente
  previousTrack() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      const prevMusic = this.currentPlaylist[this.currentIndex];
      this.playMusic(prevMusic.id);
    }
  }

  // Piste suivante
  nextTrack() {
    if (this.currentIndex < this.currentPlaylist.length - 1) {
      this.currentIndex++;
    } else {
      // Boucler au début
      this.currentIndex = 0;
    }
    
    const nextMusic = this.currentPlaylist[this.currentIndex];
    this.playMusic(nextMusic.id);
  }

  // Mettre à jour la playlist actuelle
  updateCurrentPlaylist() {
    this.currentPlaylist = [...this.filteredMusics];
    this.currentIndex = this.currentPlaylist.findIndex(m => m.id === this.currentMusic.id);
  }

  // Mettre à jour l'affichage du lecteur
  updatePlayerDisplay() {
    if (!this.currentMusic) {
      document.getElementById('playerTitle').textContent = 'Aucune musique';
      document.getElementById('playerArtist').textContent = 'Sélectionnez une musique';
      return;
    }

    const playerThumbnail = document.getElementById('playerThumbnail');
    
    if (this.currentMusic.thumbnail) {
      const thumbnailPath = window.fileUtils.getFullPath(this.currentMusic.thumbnail).replace(/\\/g, '/');
      playerThumbnail.src = `file:///${thumbnailPath}`;
      playerThumbnail.style.display = 'block';
      playerThumbnail.onerror = () => { 
        playerThumbnail.style.display = 'none';
      };
    } else {
      playerThumbnail.style.display = 'none';
    }
    
    document.getElementById('playerTitle').textContent = this.currentMusic.titre;
    document.getElementById('playerArtist').textContent = this.currentMusic.artiste;
  }

  // Mettre à jour les informations du lecteur
  updatePlayerInfo() {
    const audio = document.getElementById('audioElement');
    const totalTime = document.getElementById('totalTime');
    
    if (audio.duration && isFinite(audio.duration)) {
      totalTime.textContent = this.formatTime(audio.duration);
      document.getElementById('progressBar').max = audio.duration;
    } else if (this.currentMusic && this.currentMusic.duree) {
      // Utiliser la durée stockée si disponible
      totalTime.textContent = this.formatTime(this.currentMusic.duree);
      document.getElementById('progressBar').max = this.currentMusic.duree;
    } else {
      totalTime.textContent = '--:--';
    }
  }

  // Mettre à jour la barre de progression
  updateProgress() {
    const audio = document.getElementById('audioElement');
    const currentTime = document.getElementById('currentTime');
    const progressBar = document.getElementById('progressBar');
    
    if (audio.currentTime) {
      currentTime.textContent = this.formatTime(audio.currentTime);
      progressBar.value = audio.currentTime;
      
      // Mettre à jour la couleur de la barre
      const value = (audio.currentTime / audio.duration) * 100;
      progressBar.style.setProperty('--progress', `${value}%`);
      
      // Mettre à jour les paroles synchronisées seulement si la modale est ouverte ET que c'est la musique courante
      const lyricsDialog = document.getElementById('lyricsDialog');
      if (lyricsDialog.classList.contains('show') && this.isPlaying) {
        this.updateSyncedLyrics(audio.currentTime);
      }
    }
  }

  // Aller à une position spécifique
  seekTo(time) {
    const audio = document.getElementById('audioElement');
    audio.currentTime = time;
  }

  // Régler le volume
  setVolume(volume) {
    const audio = document.getElementById('audioElement');
    audio.volume = volume / 100;
  }

  // Gérer les erreurs audio
  handleAudioError(error) {
    console.error('Erreur audio:', error);
    this.showToast('Erreur lors de la lecture audio', 'error');
    this.isPlaying = false;
    document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>';
  }

  // Télécharger une musique
  async downloadMusic(musicId) {
    const music = this.bibliotheque.musiques.find(m => m.id === musicId);
    if (!music || music.estTelecharge) return;

    if (!window.youtubeUtils || !window.fileUtils) {
      this.showToast('Utilitaires non initialisés', 'error');
      return;
    }

    const progressContainer = document.getElementById(`progress-${musicId}`);
    if (progressContainer) progressContainer.style.display = 'flex';

    try {
      await window.fileUtils.ensurePaths();
      
      const audioPath = await window.youtubeUtils.downloadAudio(
        music.lienYoutube,
        music.id,
        window.fileUtils.paths.audioDir,
        null,
        music.titre
      );

      await window.fileUtils.markAsDownloaded(musicId, audioPath);
      
      music.estTelecharge = true;
      music.cheminAudio = require('path').relative(
        window.fileUtils.paths.tunespocketDir, 
        audioPath
      );

      this.renderMusicLibrary();
      this.showToast(`"${music.titre}" téléchargée`, 'success');
      
    } catch (error) {
      console.error('Erreur download:', error);
      this.showToast(`Erreur: ${error.message}`, 'error');
    } finally {
      if (progressContainer) progressContainer.style.display = 'none';
    }
  }

  // Télécharger toutes les musiques
  async downloadAll() {
    const musicsToDownload = this.bibliotheque.musiques.filter(m => !m.estTelecharge);
    
    if (musicsToDownload.length === 0) {
      this.showToast('Toutes vos musiques sont déjà téléchargées', 'warning');
      return;
    }

    this.showToast(`Téléchargement de ${musicsToDownload.length} musique(s)...`, 'success');

    for (const music of musicsToDownload) {
      try {
        await this.downloadMusic(music.id);
        // Petite pause entre les téléchargements
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Erreur pour ${music.titre}:`, error);
      }
    }
  }

  // Afficher les paroles
  async showLyrics(musicId) {
    const music = this.bibliotheque.musiques.find(m => m.id === musicId);
    if (!music) return;

    const lyricsDialog = document.getElementById('lyricsDialog');
    const lyricsTitle = document.getElementById('lyricsTitle');
    const lyricsContent = document.getElementById('lyricsContent');
    
    lyricsTitle.textContent = `${music.titre} - ${music.artiste}`;
    lyricsDialog.classList.add('show');

    // Vérifier si c'est la musique en cours de lecture
    const isCurrentMusic = this.currentMusic && this.currentMusic.id === musicId;

    // Si les paroles sont déjà enregistrées, les afficher directement
    if (music.lyrics) {
      this.displayLyrics(music.lyrics, isCurrentMusic);
      return;
    }

    // Sinon, les charger depuis l'API
    lyricsContent.innerHTML = '<div class="loading-spinner"></div><p>Chargement des paroles...</p>';

    try {
      const lyrics = await window.youtubeUtils.getLyrics(music.titre, music.artiste);
      this.displayLyrics(lyrics, isCurrentMusic);
      
      // Enregistrer les paroles pour la prochaine fois
      music.lyrics = lyrics;
      await window.fileUtils.saveBibliotheque(this.bibliotheque);
    } catch (error) {
      lyricsContent.innerHTML = `<p class="lyrics-error">❌ ${error.message}</p>`;
    }
  }

  // Afficher les paroles avec support de synchronisation
  displayLyrics(lyrics, isCurrentMusic) {
    const lyricsContent = document.getElementById('lyricsContent');
    const translateBtn = document.getElementById('translateBtn');
    
    // Sauvegarder les paroles originales
    this.originalLyrics = lyrics;
    this.isTranslated = false;
    
    // Afficher le bouton de traduction
    if (translateBtn) {
      translateBtn.style.display = 'flex';
      translateBtn.innerHTML = '<i class="fas fa-language"></i> Traduire en français';
    }
    
    // Activer la synchro seulement si c'est la musique courante
    if (lyrics.synced && isCurrentMusic) {
      // Parser les paroles LRC
      this.lyricsTimestamps = this.parseLRC(lyrics.synced);
      this.currentLyricIndex = -1;
      
      // Afficher avec spans pour le surlignage
      const html = this.lyricsTimestamps.map((line, index) => 
        `<div class="lyric-line" data-index="${index}">${line.text}</div>`
      ).join('');
      
      lyricsContent.innerHTML = `<div class="lyrics-synced">${html}</div>`;
      
      // Synchroniser immédiatement avec la position actuelle
      const audio = document.getElementById('audioElement');
      if (audio.currentTime) {
        this.updateSyncedLyrics(audio.currentTime);
      }
    } else {
      // Paroles simples sans synchronisation
      this.lyricsTimestamps = [];
      this.currentLyricIndex = -1;
      const plainText = lyrics.plain || lyrics.synced?.replace(/\[\d+:\d+\.\d+\]/g, '').trim() || lyrics;
      lyricsContent.innerHTML = `<pre class="lyrics-text">${plainText}</pre>`;
    }
  }

  // Parser le format LRC
  parseLRC(lrcText) {
    const lines = [];
    const regex = /\[(\d+):(\d+(?:\.\d+)?)\](.+)/g;
    let match;
    
    while ((match = regex.exec(lrcText)) !== null) {
      const minutes = parseInt(match[1]);
      const seconds = parseFloat(match[2]);
      const time = minutes * 60 + seconds;
      const text = match[3].trim();
      
      if (text) {
        lines.push({ time, text });
      }
    }
    
    return lines.sort((a, b) => a.time - b.time);
  }

  // Mettre à jour le surlignage des paroles
  updateSyncedLyrics(currentTime) {
    if (this.lyricsTimestamps.length === 0) return;
    
    // Trouver l'index de la ligne actuelle
    let newIndex = -1;
    for (let i = 0; i < this.lyricsTimestamps.length; i++) {
      if (currentTime >= this.lyricsTimestamps[i].time) {
        newIndex = i;
      } else {
        break;
      }
    }
    
    // Si l'index a changé, mettre à jour le surlignage
    if (newIndex !== this.currentLyricIndex) {
      // Retirer l'ancien surlignage
      if (this.currentLyricIndex >= 0) {
        const oldLine = document.querySelector(`.lyric-line[data-index="${this.currentLyricIndex}"]`);
        if (oldLine) oldLine.classList.remove('active');
      }
      
      // Ajouter le nouveau surlignage
      if (newIndex >= 0) {
        const newLine = document.querySelector(`.lyric-line[data-index="${newIndex}"]`);
        if (newLine) {
          newLine.classList.add('active');
          // Scroll automatique pour garder la ligne visible
          newLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      
      this.currentLyricIndex = newIndex;
    }
  }

  // Cacher le dialog de paroles
  hideLyricsDialog() {
    document.getElementById('lyricsDialog').classList.remove('show');
    // Réinitialiser la synchro
    this.lyricsTimestamps = [];
    this.currentLyricIndex = -1;
    this.originalLyrics = null;
    this.isTranslated = false;
  }

  // Traduire les paroles en français
  async translateLyrics() {
    const translateBtn = document.getElementById('translateBtn');
    const lyricsContent = document.getElementById('lyricsContent');
    
    if (!this.originalLyrics) return;
    
    // Si déjà traduit, revenir à l'original
    if (this.isTranslated) {
      const isCurrentMusic = this.currentMusic && this.currentMusic.id === this.originalLyrics.musicId;
      this.displayLyrics(this.originalLyrics, isCurrentMusic);
      return;
    }
    
    translateBtn.disabled = true;
    translateBtn.innerHTML = '<span class="mini-spinner"></span> Traduction...';
    
    try {
      const textToTranslate = this.originalLyrics.plain || 
        this.originalLyrics.synced?.replace(/\[\d+:\d+\.\d+\]/g, '').trim() || 
        this.originalLyrics;
      
      const originalLines = textToTranslate.split('\n').filter(l => l.trim());
      const translated = await window.youtubeUtils.translateText(textToTranslate, 'fr');
      const translatedLines = translated.split('\n').filter(l => l.trim());
      
      // Si on a des paroles synchronisées, garder les timestamps
      const isCurrentMusic = this.currentMusic && this.originalLyrics.synced;
      if (this.originalLyrics.synced && isCurrentMusic) {
        // Garder la synchro avec traduction
        let html = '<div class="lyrics-synced">';
        this.lyricsTimestamps.forEach((line, index) => {
          const trans = translatedLines[index] || line.text;
          html += `
            <div class="lyric-line lyrics-dual-inline" data-index="${index}">
              <div class="lyrics-original-inline">${line.text}</div>
              <div class="lyrics-translated-inline">${trans}</div>
            </div>
          `;
        });
        html += '</div>';
        lyricsContent.innerHTML = html;
      } else {
        // Afficher côte à côte sans synchro
        let html = '<div class="lyrics-dual">';
        const maxLines = Math.max(originalLines.length, translatedLines.length);
        
        for (let i = 0; i < maxLines; i++) {
          const original = originalLines[i] || '';
          const trans = translatedLines[i] || '';
          html += `
            <div class="lyrics-dual-row">
              <div class="lyrics-original">${original}</div>
              <div class="lyrics-translated">${trans}</div>
            </div>
          `;
        }
        
        html += '</div>';
        lyricsContent.innerHTML = html;
      }
      
      this.isTranslated = true;
      translateBtn.innerHTML = '<i class="fas fa-undo"></i> Version originale';
      translateBtn.disabled = false;
      
    } catch (error) {
      console.error('Erreur traduction:', error);
      this.showToast('Erreur lors de la traduction', 'error');
      translateBtn.innerHTML = '<i class="fas fa-language"></i> Traduire en français';
      translateBtn.disabled = false;
    }
  }

  // Afficher le dialog de suppression
  showDeleteDialog(musicId) {
    const music = this.bibliotheque.musiques.find(m => m.id === musicId);
    if (!music) return;

    document.getElementById('dialogTitle').textContent = 'Supprimer cette musique ?';
    document.getElementById('dialogMessage').innerHTML = `
      <strong>"${music.titre}"</strong><br>
      <em>par ${music.artiste}</em>
    `;
    
    const checkbox = document.getElementById('deleteAudioFile');
    checkbox.checked = false;
    checkbox.parentElement.style.display = music.estTelecharge ? 'block' : 'none';
    
    document.getElementById('confirmDialog').classList.add('show');
    document.getElementById('confirmDialog').dataset.musicId = musicId;
  }

  // Confirmer la suppression
  async confirmDelete() {
    const musicId = document.getElementById('confirmDialog').dataset.musicId;
    const deleteAudio = document.getElementById('deleteAudioFile').checked;
    
    this.hideDialog();
    this.showLoading('Suppression...');

    try {
      await window.fileUtils.removeMusic(musicId, deleteAudio);
      
      // Retirer de la bibliothèque locale
      this.bibliotheque.musiques = this.bibliotheque.musiques.filter(m => m.id !== musicId);
      this.filteredMusics = this.filteredMusics.filter(m => m.id !== musicId);
      
      // Si c'était la musique en cours, arrêter la lecture
      if (this.currentMusic && this.currentMusic.id === musicId) {
        document.getElementById('audioElement').pause();
        this.currentMusic = null;
        this.isPlaying = false;
        this.updatePlayerDisplay();
      }
      
      this.renderMusicLibrary();
      this.showToast('Musique supprimée', 'success');
      
    } catch (error) {
      this.showToast(`Erreur lors de la suppression: ${error.message}`, 'error');
    } finally {
      this.hideLoading();
    }
  }

  // Cacher le dialog
  hideDialog() {
    document.getElementById('confirmDialog').classList.remove('show');
  }

  // Mettre à jour le statut de connexion
  updateConnectionStatus() {
    window.youtubeUtils.updateConnectionStatus();
  }

  // Afficher une notification toast
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 5000);
  }

  // Afficher le loading
  showLoading(text = 'Chargement...') {
    document.getElementById('loadingText').textContent = text;
    document.getElementById('loadingOverlay').classList.add('show');
  }

  // Cacher le loading
  hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('show');
  }

  // Formater le temps en MM:SS
  formatTime(seconds) {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

// Initialiser l'application quand le DOM est prêt
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM chargé, initialisation de l\'application...');
  
  try {
    // Ajouter des logs pour déboguer
    console.log('Création de l\'instance ZackTunesApp...');
    window.app = new ZackTunesApp();
    console.log('Application initialisée avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation:', error);
    // Afficher une erreur à l'utilisateur
    document.body.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #EF4444;">
        <h2>Erreur d'initialisation</h2>
        <p>Impossible de démarrer l'application. Veuillez redémarrer.</p>
        <p><small>${error.message}</small></p>
        <button onclick="location.reload()">Redémarrer</button>
      </div>
    `;
  }
});


// Mettre à jour la couleur de la barre de progression
document.getElementById('progressBar')?.addEventListener('input', (e) => {
  const value = (e.target.value / e.target.max) * 100;
  e.target.style.setProperty('--progress', `${value}%`);
});

document.getElementById('volumeBar')?.addEventListener('input', (e) => {
  const value = (e.target.value / e.target.max) * 100;
  e.target.style.setProperty('--progress', `${value}%`);
});

// Écouter le statut yt-dlp depuis le processus principal
const { ipcRenderer } = require('electron');

ipcRenderer.on('ytdlp-status', (event, status) => {
  console.log('=== STATUT YT-DLP ===');
  console.log('Disponible:', status.available);
  console.log('Chemin:', status.path);
  console.log('Fichier existe:', status.exists);
  console.log('App packagée:', status.isPackaged);
  
  if (!status.available) {
    alert(`⚠️ yt-dlp non disponible!\n\nChemin: ${status.path}\nFichier existe: ${status.exists}\n\nLe streaming et téléchargement ne fonctionneront pas.`);
  }
});

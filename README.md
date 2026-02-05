# 🎵 TunesPocket

Gestionnaire de musiques YouTube - Streaming et téléchargement pour Windows

## 🚀 Installation

### Prérequis
- Node.js (version 16 ou supérieure)
- Windows 10/11
- Connexion internet (pour ajouter des musiques et streaming)

### Installation des dépendances

```bash
npm install
```

### Démarrage de l'application

```bash
npm start
```

Pour le mode développement avec DevTools :
```bash
npm run dev
```

## 📁 Structure des fichiers

L'application crée automatiquement ses dossiers dans :
```
C:/Users/[Utilisateur]/Music/TunesPocket/
│
├── 📄 bibliotheque.json          (Base de données)
├── 📁 images/                    (Thumbnails)
└── 📁 audio/                     (Fichiers MP3)
```

## 🎯 Fonctionnalités

### ➕ Ajouter une musique
1. Coller un lien YouTube dans le champ en haut
2. Cliquer sur "Ajouter" ou appuyer sur Entrée
3. La musique apparaît dans votre bibliothèque

### 🎵 Écouter une musique
- **Streaming** : Cliquer sur ▶️ (nécessite internet)
- **Local** : Télécharger d'abord, puis cliquer sur ▶️

### 💾 Télécharger
- **Une musique** : Cliquer sur 💾 sur la carte
- **Toutes** : Bouton "Télécharger tout"

### 🔍 Rechercher
- Taper dans la barre de recherche
- Recherche dans les titres et artistes
- Résultats en temps réel

### 🗑️ Supprimer
- Cliquer sur ❌ sur une carte
- Choisir de supprimer aussi le MP3
- Confirmer la suppression

## 🎮 Contrôles du lecteur

- **▶️/⏸️** : Lecture/Pause
- **⏮️/⏭️** : Piste précédente/suivante
- **Barre de progression** : Naviguer dans la piste
- **🔊** : Contrôle du volume

## 🌐 Statut de connexion

- **🟢 En ligne** : Toutes les fonctionnalités disponibles
- **🔴 Hors ligne** : Seules les musiques téléchargées sont lisibles

## 🔧 Technologies utilisées

- **Electron** : Framework desktop
- **@distube/ytdl-core** : Extraction YouTube
- **fluent-ffmpeg** : Conversion audio
- **HTML/CSS/JavaScript** : Interface utilisateur

## 📝 Notes importantes

- Les musiques sont téléchargées en MP3 haute qualité
- Les thumbnails sont automatiquement récupérés
- La bibliothèque est sauvegardée localement
- Aucune donnée n'est envoyée sur internet (sauf YouTube)

## 🐛 Dépannage

### Erreur "Video unavailable"
- La vidéo YouTube n'est plus disponible
- Essayer avec un autre lien

### Erreur de téléchargement
- Vérifier la connexion internet
- Vérifier l'espace disque disponible
- Redémarrer l'application

### Musique ne se lance pas
- Vérifier que le fichier MP3 existe
- Pour le streaming, vérifier la connexion internet

## 📄 Licence

MIT License - Libre d'utilisation et de modification
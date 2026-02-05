# 🧪 Guide de Test - TunesPocket

## 1️⃣ Installation

```bash
cd c:\Dev\Projets\tunespocket
npm install
```

## 2️⃣ Lancement en mode développement

```bash
npm run dev
```

Cela va :
- Lancer l'application
- Ouvrir automatiquement les DevTools (console)

## 3️⃣ Vérifications dans la console

Quand l'application démarre, vous devriez voir dans la console :

```
Création de l'instance YouTubeUtils...
YouTubeUtils: Initialisation...
YouTubeUtils: Initialisé avec succès
YouTubeUtils disponible: true

Création de l'instance FileUtils...
FileUtils: Initialisation...
FileUtils: Initialisé avec succès
FileUtils disponible: true

DOM chargé, initialisation de l'application...
Création de l'instance TunesPocketApp...
Configuration des événements...
Événements configurés
Application initialisée avec succès
```

## 4️⃣ Test d'ajout de musique

1. Coller ce lien dans le champ : `https://www.youtube.com/watch?v=CY53aoVz1FA`
2. Cliquer sur "Ajouter"
3. Dans la console, vous devriez voir :

```
Bouton ajouter cliqué
addMusic appelée
URL saisie: https://www.youtube.com/watch?v=CY53aoVz1FA
Vérification des utilitaires...
youtubeUtils: true
fileUtils: true
Récupération des infos vidéo...
Infos récupérées: {...}
Ajout à la bibliothèque...
Musique ajoutée: {...}
```

## 5️⃣ Si rien ne se passe

### Vérifier que les modules sont installés :
```bash
npm list @distube/ytdl-core axios sanitize-filename
```

### Vérifier les erreurs dans la console
Appuyez sur F12 et regardez l'onglet Console pour voir les erreurs en rouge.

## 6️⃣ Problèmes courants

### Erreur "Cannot find module"
```bash
npm install
```

### Erreur "ytdl-core"
```bash
npm install @distube/ytdl-core --save
```

### L'application ne démarre pas
Vérifier que Node.js est installé :
```bash
node --version
```
(Doit être >= 16)

## 7️⃣ Fichiers créés

L'application crée automatiquement :
```
C:\Users\[VotreNom]\Music\TunesPocket\
├── bibliotheque.json
├── images\
└── audio\
```

Vous pouvez vérifier que ces dossiers existent après le premier lancement.

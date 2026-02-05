# Spécifications - Application YouTube Music Player

## 📋 Vue d'ensemble

Application desktop Windows (Electron) permettant de gérer et écouter des musiques YouTube avec option de téléchargement local.

---

## 🎯 Objectif principal

Créer une bibliothèque musicale personnelle à partir de liens YouTube, avec possibilité de :
- Écouter en streaming (avec internet)
- Télécharger pour écoute hors ligne
- Gérer facilement sa collection

---

## 🔄 Workflow utilisateur

### 1. Ajout d'une musique

```
Utilisateur colle un lien YouTube
    ↓
Application récupère et enregistre :
    ├── ✅ Titre de la chanson
    ├── ✅ Nom de l'artiste/chaîne
    ├── ✅ Thumbnail (image miniature)
    ├── ✅ Lien YouTube original
    └── ❌ PAS l'audio MP3 (téléchargement optionnel ultérieur)
    ↓
Musique ajoutée instantanément à la bibliothèque
```

### 2. Écoute d'une musique

**Scénario A : Audio NON téléchargé + Internet disponible**
→ Lecture en streaming directement depuis YouTube ✅

**Scénario B : Audio NON téléchargé + PAS d'internet**
→ Message d'erreur : "Cette musique n'est pas disponible hors ligne. Téléchargez-la pour l'écouter sans internet." ⚠️

**Scénario C : Audio téléchargé (avec ou sans internet)**
→ Lecture du fichier MP3 local ✅

### 3. Téléchargement optionnel

- Bouton "Télécharger" (💾) disponible sur chaque musique
- Option "Tout télécharger" pour l'ensemble de la bibliothèque
- Indicateur visuel du statut de téléchargement
- Téléchargement en arrière-plan avec barre de progression

---

## 🖥️ Interface utilisateur

### Section 1 : Ajout de musique (Header)

```
┌────────────────────────────────────────────────────────┐
│  🎵 Mon Lecteur YouTube                                │
│                                                         │
│  🔗 [Coller le lien YouTube ici...]  [+ Ajouter]       │
└────────────────────────────────────────────────────────┘
```

**Éléments :**
- Champ de texte (input) pour coller le lien YouTube
- Bouton "Ajouter" qui déclenche l'enregistrement
- Support du raccourci clavier : Entrée = Ajouter

---

### Section 2 : Lecteur audio (Centre)

```
┌────────────────────────────────────────────────────────┐
│                                                         │
│              🖼️ [Image de la chanson]                   │
│                    (Thumbnail)                          │
│                                                         │
│              🎵 Titre de la chanson                     │
│                 👤 Nom de l'artiste                     │
│                                                         │
│                                                         │
│    [◀◀ Précédent]  [▶️ Play/Pause]  [▶▶ Suivant]       │
│                                                         │
│                                                         │
│    ━━━━━━━━━━━━●────────────────  2:30 / 4:15         │
│    (Barre de progression cliquable)                     │
│                                                         │
│    🔊 Volume: ━━━━━●──────                             │
│                                                         │
│    Status: 🌐 Lecture en streaming                      │
│       ou   💾 Lecture locale (hors ligne)               │
│                                                         │
└────────────────────────────────────────────────────────┘
```

**Fonctionnalités du lecteur :**
- Image de couverture (thumbnail YouTube)
- Affichage du titre et artiste
- Boutons de contrôle : Précédent / Play-Pause / Suivant
- Barre de progression interactive (cliquer pour avancer/reculer)
- Contrôle du volume
- Indicateur visuel du mode de lecture (streaming vs local)

---

### Section 3 : Bibliothèque musicale (Bas)

```
┌────────────────────────────────────────────────────────┐
│  🔍 [Rechercher dans ma bibliothèque...]                │
│                                                         │
│  📚 Ma Bibliothèque (24 musiques)                       │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │                                                   │  │
│  │  🖼️  Chanson 1 - Artiste 1        🌐  [💾] [❌]  │  │
│  │  🖼️  Chanson 2 - Artiste 2        💾  [💾] [❌]  │  │
│  │  🖼️  Chanson 3 - Artiste 3        🌐  [💾] [❌]  │  │
│  │  🖼️  Chanson 4 - Artiste 4        💾  [💾] [❌]  │  │
│  │                                                   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  [📥 Télécharger toute la bibliothèque]                 │
└────────────────────────────────────────────────────────┘
```

**Éléments de chaque musique :**
- Thumbnail miniature (cliquable pour lire)
- Titre - Artiste
- Icône de statut :
  - 🌐 = Non téléchargé (streaming uniquement)
  - 💾 = Téléchargé (disponible hors ligne)
- Bouton [💾] = Télécharger l'audio MP3
- Bouton [❌] = Supprimer de la bibliothèque

**Fonctionnalités :**
- Barre de recherche en temps réel (recherche par titre OU artiste)
- Compteur total de musiques
- Liste scrollable
- Clic sur une musique = Lecture immédiate
- Bouton "Télécharger tout" pour télécharger toute la bibliothèque

---

## 📊 Structure des données

### Fichier `bibliotheque.json`

Stocke toutes les informations des musiques (sauf les fichiers audio/images)

```json
{
  "musiques": [
    {
      "id": "abc123xyz",
      "titre": "Nom de la chanson",
      "artiste": "Nom de l'artiste",
      "lienYoutube": "https://youtube.com/watch?v=dQw4w9WgXcQ",
      "thumbnail": "images/abc123xyz.jpg",
      "dateAjout": "2026-02-04T14:30:00Z",
      "estTelecharge": false,
      "cheminAudio": null
    },
    {
      "id": "def456uvw",
      "titre": "Une autre chanson",
      "artiste": "Un autre artiste",
      "lienYoutube": "https://youtube.com/watch?v=xxxxxxxxxxx",
      "thumbnail": "images/def456uvw.jpg",
      "dateAjout": "2026-02-03T10:15:00Z",
      "estTelecharge": true,
      "cheminAudio": "audio/def456uvw.mp3"
    }
  ],
  "version": "1.0",
  "derniereModification": "2026-02-04T14:30:00Z"
}
```

**Champs obligatoires :**
- `id` : Identifiant unique (peut être l'ID YouTube)
- `titre` : Titre de la vidéo
- `artiste` : Nom de la chaîne/artiste
- `lienYoutube` : URL complète YouTube
- `thumbnail` : Chemin vers l'image locale
- `dateAjout` : Date/heure d'ajout (ISO 8601)
- `estTelecharge` : Boolean (true/false)
- `cheminAudio` : Chemin vers le MP3 (null si non téléchargé)

---

## 📁 Structure des fichiers

```
C:/Users/[Utilisateur]/Music/TunesPocket/
│
├── 📄 bibliotheque.json          (Base de données de toutes les musiques)
│
├── 📁 images/                    (Thumbnails)
│   ├── abc123xyz.jpg
│   ├── def456uvw.jpg
│   └── ...
│
└── 📁 audio/                     (Fichiers MP3 téléchargés)
    ├── abc123xyz.mp3
    ├── def456uvw.mp3
    └── ...
```

**Conventions de nommage :**
- Utiliser l'ID YouTube comme nom de fichier
- Format image : JPG
- Format audio : MP3
- Encodage des noms : UTF-8

---

## ⚙️ Fonctionnalités détaillées

### 1. Ajout d'une musique

**Input :** Lien YouTube (format accepté : `https://youtube.com/watch?v=...` ou `https://youtu.be/...`)

**Processus :**
1. Validation du lien YouTube
2. Extraction des métadonnées via API/bibliothèque :
   - Titre de la vidéo
   - Nom de la chaîne
   - URL du thumbnail
3. Téléchargement du thumbnail (image JPG)
4. Génération d'un ID unique
5. Sauvegarde dans `bibliotheque.json`
6. Affichage dans la bibliothèque

**Gestion d'erreurs :**
- Lien invalide → Message : "Lien YouTube invalide"
- Vidéo déjà dans la bibliothèque → Message : "Cette musique est déjà dans votre bibliothèque"
- Problème réseau → Message : "Impossible de récupérer les informations. Vérifiez votre connexion internet"

---

### 2. Lecture audio

**Mode Streaming (pas de téléchargement) :**
- Vérification de la connexion internet
- Si connecté : Extraction URL audio depuis YouTube + lecture
- Si non connecté : Message d'erreur + proposition de télécharger

**Mode Local (téléchargé) :**
- Lecture directe du fichier MP3
- Fonctionne avec ou sans internet

**Contrôles :**
- Play/Pause
- Précédent/Suivant (navigation dans la bibliothèque)
- Barre de progression interactive
- Contrôle du volume
- Affichage du temps écoulé / durée totale

---

### 3. Téléchargement MP3

**Déclenchement :**
- Bouton [💾] sur une musique spécifique
- Bouton "Télécharger tout"

**Processus :**
1. Extraction de l'audio depuis YouTube (qualité : meilleure disponible)
2. Conversion en MP3
3. Sauvegarde dans `/audio/`
4. Mise à jour de `bibliotheque.json` :
   - `estTelecharge`: true
   - `cheminAudio`: chemin du fichier
5. Changement de l'icône 🌐 → 💾

**Barre de progression :**
- Affichage du pourcentage de téléchargement
- Possibilité d'annuler le téléchargement

**Gestion d'erreurs :**
- Problème réseau → Reprise automatique du téléchargement
- Espace disque insuffisant → Message d'alerte
- Erreur YouTube → Message d'erreur explicite

---

### 4. Suppression

**Actions :**
- Bouton [❌] sur chaque musique

**Processus :**
1. Confirmation de suppression (popup)
2. Suppression de l'entrée dans `bibliotheque.json`
3. Suppression du thumbnail (`/images/`)
4. Suppression du MP3 si téléchargé (`/audio/`)
5. Mise à jour de l'interface

**Popup de confirmation :**
```
⚠️ Supprimer cette musique ?

"Titre de la chanson - Artiste"

[Option] Supprimer aussi le fichier MP3 (si téléchargé)

[Annuler]  [Supprimer]
```

---

### 5. Recherche

**Fonctionnement :**
- Recherche en temps réel (pendant la frappe)
- Recherche dans :
  - Titre de la chanson
  - Nom de l'artiste
- Insensible à la casse (majuscules/minuscules)
- Résultats filtrés affichés instantanément

**Interface :**
- Barre de recherche en haut de la bibliothèque
- Compteur de résultats : "X résultats trouvés"
- Bouton [X] pour effacer la recherche

---

### 6. Détection de la connexion internet

**Vérification automatique :**
- Au lancement de l'application
- Avant chaque tentative de streaming
- Avant chaque ajout de musique

**Affichage du statut :**
- Icône en haut : 
  - 🟢 En ligne
  - 🔴 Hors ligne
- En mode hors ligne : 
  - Affichage du nombre de musiques disponibles
  - Grisage des musiques non téléchargées

---

## 🔧 Technologies recommandées

### Framework principal
- **Electron** : Pour créer l'application desktop Windows

### Bibliothèques JavaScript

**Pour YouTube :**
- `ytdl-core` : Extraction audio/métadonnées YouTube
- `youtube-search-api` : Recherche et métadonnées (alternative)

**Pour l'audio :**
- `fluent-ffmpeg` : Conversion audio en MP3
- HTML5 `<audio>` : Lecteur audio natif

**Pour l'interface :**
- HTML/CSS/JavaScript vanilla (simple et rapide)
- OU React (si interface plus complexe souhaitée)

**Stockage :**
- `fs` (Node.js) : Gestion des fichiers
- `localStorage` ou fichier JSON : Base de données locale

**Utilitaires :**
- `axios` : Téléchargement de fichiers
- `sanitize-filename` : Nettoyage des noms de fichiers

---

## 📱 Spécifications techniques

### Configuration minimale
- **OS** : Windows 10/11
- **RAM** : 4 GB minimum
- **Espace disque** : Variable (dépend du nombre de téléchargements)
- **Internet** : Requis pour streaming et ajout de musiques

### Performance
- Démarrage rapide de l'application (< 3 secondes)
- Ajout d'une musique : < 5 secondes
- Téléchargement MP3 : Dépend de la connexion
- Interface fluide (60 FPS)

### Qualité audio
- **Streaming** : Meilleure qualité disponible sur YouTube
- **Téléchargement** : MP3 à 320 kbps (ou meilleur disponible)

---

## 🎨 Design et UX

### Principes de design
- **Simplicité** : Interface claire et intuitive
- **Rapidité** : Actions en 1-2 clics maximum
- **Feedback visuel** : Indicateurs clairs de statut
- **Cohérence** : Style visuel uniforme

### Palette de couleurs

**Thème Clair (par défaut)**
- **Background** : Blanc pur (#FFFFFF)
- **Foreground** : Gris très foncé (#0A0A0A)
- **Card** : Blanc cassé (#F9F9F9)
- **Border** : Gris clair (#E5E5E5)

**Couleurs d'accent**
- **Primaire** : Orange doux (#E67E22) ou Bleu subtil (#3B82F6)
- **Primaire Hover** : Orange foncé (#D35400) ou Bleu foncé (#2563EB)
- **Succès** : Vert (#10B981)
- **Danger** : Rouge doux (#EF4444)
- **Warning** : Jaune/Orange (#F59E0B)

**Texte**
- **Titre** : Noir (#0A0A0A)
- **Corps** : Gris foncé (#525252)
- **Secondaire** : Gris moyen (#737373)
- **Muted** : Gris clair (#A3A3A3)

**Thème Sombre (optionnel)**
- **Background** : Noir doux (#0A0A0A)
- **Foreground** : Blanc cassé (#FAFAFA)
- **Card** : Gris très foncé (#1A1A1A)
- **Border** : Gris foncé (#2A2A2A)

### Composants UI recommandés (shadcn/ui)

**Navigation & Structure**
- `Card` : Pour chaque musique dans la bibliothèque
- `Separator` : Lignes de séparation subtiles
- `ScrollArea` : Liste scrollable de la bibliothèque

**Entrées utilisateur**
- `Input` : Champ pour coller le lien YouTube + recherche
- `Button` : Tous les boutons (variants: default, ghost, outline, destructive)

**Feedback utilisateur**
- `Toast` : Notifications (musique ajoutée, téléchargement terminé, erreurs)
- `Progress` : Barre de progression pour téléchargement
- `Badge` : Indicateurs de statut (🌐 Streaming / 💾 Local)
- `Alert` : Messages d'information/avertissement

**Lecteur audio**
- `Slider` : Barre de progression audio + volume
- `Tooltip` : Infos au survol des boutons

**Actions**
- `DropdownMenu` : Menu contextuel (clic droit sur une musique)
- `Dialog` : Popup de confirmation de suppression
- `Command` : Recherche rapide (Ctrl+K style)

**États**
- `Skeleton` : Chargement des thumbnails
- `EmptyState` : Bibliothèque vide (illustration + message)


### Principes de design (style Claude/shadcn)

**Espacement**
- Marges généreuses (padding: 16px-24px)
- Espacement entre éléments : 8px-16px
- Respiration visuelle importante

**Bordures**
- Radius doux : 8px-12px (pas trop arrondis)
- Bordures fines : 1px
- Couleur subtile (#E5E5E5)

**Ombres**
- Très légères et subtiles
- shadow-sm pour les cards
- shadow-md pour les popups/dialogs
- Éviter les ombres trop prononcées

**Typographie**
- Font : Inter ou système (sans-serif)
- Poids : 400 (normal), 500 (medium), 600 (semibold)
- Tailles : 14px (corps), 16px (titres secondaires), 20px-24px (titres principaux)
- Line-height : 1.5-1.6 pour lisibilité

**Boutons**
- Hauteur standard : 40px
- Padding horizontal : 16px-20px
- Hover : Légère variation de couleur (pas trop prononcée)
- Focus : Ring subtil (#E67E22 ou #3B82F6)

**États interactifs**
- Hover : Changement subtil de background
- Active : Légère compression (scale: 0.98)
- Focus : Ring visible pour accessibilité
- Disabled : Opacité 50% + cursor not-allowed

**Animations**
- Transitions rapides : 150ms-200ms
- Easing : ease-in-out
- Pas d'animations flashy

### Typographie
- Police sans-serif moderne (ex: Segoe UI, Roboto)
- Titres : 18-24px
- Corps de texte : 14-16px
- Labels : 12-14px

---

## ⚡ Fonctionnalités futures (optionnelles)

### Phase 2
- [ ] Playlists personnalisées
- [ ] Système de favoris (étoiles)
- [ ] Tri de la bibliothèque (date, alphabétique, etc.)
- [ ] Mode lecture aléatoire (shuffle)
- [ ] Mode répétition (loop)
- [ ] Égaliseur audio
- [ ] Raccourcis clavier

### Phase 3
- [ ] Thèmes (mode sombre/clair)
- [ ] Export/Import de la bibliothèque
- [ ] Statistiques d'écoute
- [ ] Paroles des chansons
- [ ] Mini-player (fenêtre compacte)

---

## 🔒 Aspects légaux et éthiques

### Usage prévu
- **Strictement personnel** : Application pour usage privé uniquement
- **Pas de distribution** : Ne pas partager/vendre les fichiers téléchargés
- **Respect du droit d'auteur** : Télécharger uniquement pour écoute personnelle

### Avertissement à afficher
Au premier lancement de l'application :

```
⚠️ Avertissement légal

Cette application est destinée à un usage strictement personnel.
Le téléchargement de contenu YouTube peut être soumis aux conditions 
d'utilisation de YouTube et aux lois sur le droit d'auteur.

N'utilisez cette application que pour :
- Écouter de la musique pour votre usage personnel
- Sauvegarder des musiques que vous avez le droit d'utiliser

Ne partagez pas et ne distribuez pas les fichiers téléchargés.

[J'ai compris]
```

### Recommandations
- Suggérer YouTube Premium pour une alternative légale officielle
- Ne pas encourager le piratage
- Limiter l'usage aux musiques légalement accessibles

---

## 📝 Critères d'acceptation

### Fonctionnalités essentielles (MVP)
- ✅ Ajout de musique via lien YouTube
- ✅ Affichage de la bibliothèque avec thumbnails
- ✅ Lecture en streaming
- ✅ Téléchargement MP3 optionnel
- ✅ Indicateur visuel streaming vs local
- ✅ Contrôles de base (play/pause/suivant/précédent)
- ✅ Recherche dans la bibliothèque
- ✅ Suppression de musiques
- ✅ Détection de connexion internet
- ✅ Persistance des données (bibliothèque sauvegardée)

### Qualité du code
- Code propre et commenté
- Gestion d'erreurs robuste
- Tests fonctionnels réalisés
- Documentation technique fournie

### Interface utilisateur
- Responsive et fluide
- Pas de bugs visuels
- Messages d'erreur clairs
- Expérience utilisateur intuitive

---

## 🐛 Cas limites à gérer

1. **Vidéo YouTube supprimée/indisponible**
   - Détecter et afficher un message d'erreur
   - Option de supprimer de la bibliothèque

2. **Connexion internet instable**
   - Gestion de la reconnexion automatique
   - Buffer pour le streaming

3. **Espace disque saturé**
   - Vérification avant téléchargement
   - Message d'alerte avec espace disponible

4. **Doublons**
   - Détection de musiques déjà ajoutées
   - Empêcher l'ajout multiple

5. **Fichiers corrompus**
   - Vérification de l'intégrité après téléchargement
   - Option de re-télécharger

6. **Caractères spéciaux dans les titres**
   - Sanitisation des noms de fichiers
   - Support Unicode/UTF-8

---

## 📞 Contact et support

Pour toute question ou clarification sur ces spécifications, contacter l'initiateur du projet.

---

**Version du document** : 1.0  
**Date de création** : 04 février 2026  
**Dernière modification** : 04 février 2026

---

## 🚀 Prêt pour le développement !

Ce document contient toutes les informations nécessaires pour démarrer le développement de l'application. Bonne chance ! 🎵
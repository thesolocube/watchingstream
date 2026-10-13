# Walkthrough - Movie Stream (Desktop App)

L'application **Movie Stream** a été entièrement configurée et construite avec succès dans le répertoire courant. Elle propose une interface sombre premium inspirée de Netflix, une synchronisation en temps réel avec Firebase pour l'authentification, les favoris et la reprise de lecture, ainsi qu'un lecteur vidéo universel supportant le streaming VOD externe et les flux TV en direct (.m3u8).

## Fichiers créés et configurés

Voici la liste des fichiers créés et configurés pour le projet :

### Configuration & Electron principal
* [package.json](file:///c:/Users/HP/pc%20version/package.json) : Contient les dépendances du projet (`electron`, `firebase`, `video.js`, `lucide-react`, `tailwindcss`) et les scripts npm.
* [main.js](file:///c:/Users/HP/pc%20version/main.js) : Point d'entrée d'Electron. Configure la fenêtre en mode sécurisé avec isolation de contexte et contourne intelligemment les en-têtes CORS/X-Frame-Options pour permettre le rendu des iframes de streaming externes.
* [preload.js](file:///c:/Users/HP/pc%20version/preload.js) : Script de préchargement sécurisé pour Electron.
* [start.js](file:///c:/Users/HP/pc%20version/start.js) : Script de lancement multiplateforme qui démarre le serveur de développement Vite et lance Electron en simultané après initialisation.
* [vite.config.js](file:///c:/Users/HP/pc%20version/vite.config.js) : Configuration de build Vite 5 avec le chemin relatif `base: './'` requis pour la production Electron.
* [tailwind.config.js](file:///c:/Users/HP/pc%20version/tailwind.config.js) : Paramétrage du design system et de la palette de couleurs sombres et rouges.
* [postcss.config.js](file:///c:/Users/HP/pc%20version/postcss.config.js) : Configuration PostCSS pour compiler Tailwind CSS v3.

### Code source et Composants React
* [src/main.jsx](file:///c:/Users/HP/pc%20version/src/main.jsx) : Point d'entrée de React.
* [src/index.css](file:///c:/Users/HP/pc%20version/src/index.css) : Directives Tailwind et styles personnalisés (barres de défilement masquées pour les carrousels, surcharges de thèmes premium pour `video.js`, effet de dégradé Netflix).
* [src/firebase.js](file:///c:/Users/HP/pc%20version/src/firebase.js) : Initialisation de Firebase Auth et Firestore à l'aide des clés automatiquement récupérées de votre fichier `google-services.json`.
* [src/App.jsx](file:///c:/Users/HP/pc%20version/src/App.jsx) : Orchestrateur central de l'application (gestion de l'état d'authentification, de la navigation par onglets, et affichage en plein écran du lecteur).
* [src/components/Login.jsx](file:///c:/Users/HP/pc%20version/src/components/Login.jsx) : Écran d'authentification style Netflix (connexion, inscription, gestion des erreurs et mode démo).
* [src/components/Navbar.jsx](file:///c:/Users/HP/pc%20version/src/components/Navbar.jsx) : Barre latérale de navigation premium avec profil utilisateur.
* [src/components/Home.jsx](file:///c:/Users/HP/pc%20version/src/components/Home.jsx) : Accueil avec bannière dynamique TMDB, carrousels horizontaux avec boutons de défilement, et intégration des sections favoris/reprise de lecture.
* [src/components/VideoPlayer.jsx](file:///c:/Users/HP/pc%20version/src/components/VideoPlayer.jsx) : Lecteur vidéo universel.
* [src/components/LiveTV.jsx](file:///c:/Users/HP/pc%20version/src/components/LiveTV.jsx) : Grille TV en direct (filtre beIN SPORTS, requêtes IPTV-org et chaînes françaises intégrées).
* [src/components/Search.jsx](file:///c:/Users/HP/pc%20version/src/components/Search.jsx) : Recherche TMDB en temps réel avec debounce pour limiter la charge réseau.
* [src/components/MyList.jsx](file:///c:/Users/HP/pc%20version/src/components/MyList.jsx) : Grille de favoris synchronisée avec Firestore en temps réel.

---

## Fonctionnement technique & Améliorations Premium

### 1. Suivi de progression précis (Continue Watching) via postMessage
Grâce à l'intégration de la messagerie `postMessage` documentée :
* **VOD (Iframes) :** L'application écoute les événements de type `PLAYER_EVENT` envoyés par le lecteur `vaplayer.ru`. Lorsque l'utilisateur regarde la vidéo, met en pause ou effectue un saut dans la chronologie, le lecteur renvoie le temps de visionnage précis (`player_progress`) et la durée totale (`player_duration`). Ces données sont enregistrées en temps réel dans Firestore.
* **Reprise de lecture (resumeAt) :** Lors du chargement d'un contenu entamé, l'application récupère la progression depuis Firestore et l'injecte sous forme de paramètre `?resumeAt={secondes}` dans l'iframe. Le lecteur démarre automatiquement à la seconde précise où l'utilisateur s'était arrêté.
* **Passage à l'épisode suivant automatique (Compte à rebours) :** Si le statut de lecture renvoyé est `completed` pour une série, l'application affiche un compte à rebours circulaire premium de 10 secondes (style Netflix) proposant de lancer immédiatement le prochain épisode ou d'annuler. Si le décompte arrive à terme, l'épisode suivant démarre automatiquement.
* **Direct TV (HLS) :** Les flux en direct sont lus localement à l'aide de `video.js`.

### 2. Contrôles et mode plein écran du lecteur
Le lecteur s'affiche directement par-dessus l'application.
* **Fullscreen automatique :** Dès que le lecteur se charge, l'application active le plein écran du conteneur. Vous pouvez aussi appuyer sur la touche `F` ou cliquer sur le bouton d'agrandissement en haut à droite.
* **Overlay d'aide aux commandes :** Au démarrage de la vidéo, un panneau d'aide (raccourcis clavier `Espace` pour pause, `F` pour plein écran, `Flèches` pour avancer/reculer) s'affiche doucement et s'estompe au bout de 3 secondes.
* **Gestionnaire d'erreurs réseau :** Si un flux Live HLS (.m3u8) rencontre une erreur de chargement, un écran de secours soigné s'affiche pour offrir une option de reconnexion manuelle ou de retour.

### 3. Notifications Flottantes (Toasts)
Chaque ajout ou retrait d'un contenu dans la liste des favoris affiche une notification flottante élégante et animée dans le coin inférieur droit de l'écran, confirmant l'action avec des indicateurs visuels verts (succès) ou rouges (information).

---

## Instructions pour lancer l'application

### Lancement en mode développement (Recommandé)
Pour lancer l'application sur votre PC en mode développement (avec HMR React et Electron DevTools activés) :
```powershell
npm start
```
*Le script `start.js` lancera le serveur Vite sur le port `5173` et ouvrira la fenêtre Electron au bout de 2,5 secondes.*

### Lancement de la version de production
Le projet a été compilé avec succès. Pour retester le build statique à tout moment :
```powershell
npm run build
```

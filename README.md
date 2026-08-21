# C Web Compiler — local

Mini IDE web locale pour écrire, compiler et exécuter du C dans un navigateur.

## Architecture

- **Frontend** : Vite + React + Monaco Editor
- **API** : Node.js + Express
- **Compilation/exécution** : GCC dans un conteneur Docker isolé
- **Interface** : éditeur, entrée standard, sortie, erreurs, statut et temps d'exécution
- **Persistance** : le code est conservé côté navigateur via `localStorage`

GCC réalise normalement prétraitement, compilation, assemblage et édition de liens ; le backend de ce projet utilise donc une commande GCC classique avec `-std=c17 -Wall -Wextra -O2`. Voir la documentation officielle GCC.

## Prérequis

- Node.js 20+
- npm
- Docker Engine / Docker Desktop
- Le daemon Docker doit être démarré.

## Installation

### 1. Construire l'image du compilateur

```bash
docker build -t c-web-compiler-runner ./runner
```

### 2. Installer les dépendances

```bash
cd server
npm install

cd ../client
npm install
```

### 3. Lancer l'application

Terminal 1 :

```bash
cd server
npm run dev
```

Terminal 2 :

```bash
cd client
npm run dev
```

Puis ouvrir :

http://localhost:5173

L'API écoute par défaut sur :

http://localhost:3001

## Production locale

Construire le frontend :

```bash
cd client
npm run build
```

Puis :

```bash
cd ../server
npm start
```

Le serveur Express sert alors également `client/dist`.

Ouvrir :

http://localhost:3001

## Sécurité

Le code C soumis par l'utilisateur est arbitraire. Il ne faut donc **jamais** l'exécuter directement avec `child_process.exec()` sur la machine hôte.

Le runner Docker applique notamment :

- réseau désactivé ;
- système de fichiers en lecture seule ;
- `/tmp` temporaire ;
- limite mémoire ;
- limite CPU ;
- limite de processus ;
- suppression des capabilities Linux ;
- `no-new-privileges` ;
- utilisateur non privilégié ;
- timeout côté serveur ;
- taille maximale du code et de stdin.

Ce projet vise une utilisation **locale**. Pour une exposition sur Internet, il faut renforcer l'isolation avec une VM/microVM, un worker dédié et une politique réseau/ressources beaucoup plus stricte.

## API

### POST `/api/run`

```json
{
  "code": "#include <stdio.h>\nint main(void) { puts(\"Hello\"); }",
  "stdin": ""
}
```

Réponse :

```json
{
  "success": true,
  "stdout": "Hello\n",
  "stderr": "",
  "exitCode": 0,
  "signal": null,
  "durationMs": 42
}
```

### GET `/api/health`

Retourne l'état de l'API et la présence de l'image Docker.

## Fonctionnalités incluses

- éditeur Monaco avec coloration C ;
- thème sombre ;
- `Ctrl+Enter` pour compiler/exécuter ;
- bouton Exécuter ;
- bouton Réinitialiser ;
- zone stdin ;
- sortie stdout/stderr ;
- statut de compilation/exécution ;
- temps d'exécution ;
- erreurs réseau/API affichées dans l'interface ;
- exemple C préchargé ;
- sauvegarde automatique du code dans le navigateur ;
- responsive desktop/tablette ;
- build de production servi par Express.

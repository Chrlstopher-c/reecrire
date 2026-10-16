# ARBORESCENCE — reecrire

- `.claude-plugin/marketplace.json` — déclare la marketplace `reecrire` et son plugin
- `.github/workflows/ci.yml` — CI : installe Claude Code, lance scripts/ci/local-ci.sh
- `.gitignore` — types générés par Claude Code, tsconfig local
- `ARBORESCENCE.md` — ce fichier
- `INSTALL.md` — installation pas à pas destinée à un agent
- `LICENSE` — MIT
- `README.md` — présentation, prérequis, installation rapide
- `STATE.md` — état courant du projet
- `TODO.md` — tâches
- `docs/FONCTIONNEMENT.md` — déroulé d'un clic, rôle des fichiers, comment adapter
- `plugins/reecrire/.claude-plugin/plugin.json` — manifeste du plugin (nom, version)
- `plugins/reecrire/hooks/hooks.json` — point d'entrée du module de hooks
- `plugins/reecrire/hooks/register.tsx` — bouton, Annuler, indicateurs, commande, appel Haiku, remplissage du champ
- `plugins/reecrire/hooks/request.ts` — sélection de l'historique, construction de la requête, extraction
- `plugins/reecrire/hooks/families.ts` — détection de l'éditeur du modèle, bibliothèque de styles
- `plugins/reecrire/hooks/progress.ts` — barre de chargement et compteur de secondes
- `plugins/reecrire/hooks/reecrire.test.tsx` — tests du mod
- `scripts/ci/local-ci.sh` — validation des manifestes et tests, rejoué en local et en CI

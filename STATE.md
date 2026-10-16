# STATE — reecrire
*Dernière mise à jour : 16/10/2026*

## Résumé de l'état actuel
Mod Claude Code v1.1.0 : bouton « ✦ Reprompting » (dégradé corail → violet) dans la bande au-dessus du prompt
(terminal et onglet Code de Claude Desktop). Haiku 5.5 (effort high, `claude -p` isolé en flux) réécrit le
brouillon au style de l'éditeur du modèle actif ; le texte se tape en direct dans le champ pendant que la bande
anime titre arc-en-ciel + onde. Arrêter / Annuler restaurent le brouillon ; `/reecrire <texte>`. 8 tests verts.
Validé par Chris en CLI et dans Claude Desktop (16/10).

## Ce qui a été fait — session du 16/10/2026
- Mod écrit, testé (tests unitaires + session réelle dans un terminal), utilisé avec succès en CLI et Desktop.
- Contexte envoyé à Haiku : 50 échanges texte, sans résultats d'outils ni contexte injecté par des hooks (vérifié).
- Bibliothèque de styles par éditeur ; styles Anthropic alignés sur le guide officiel Claude 5 et sur la manière
  dont Anthropic écrit ses prompts système.
- Repo public structuré en marketplace (`claude plugin marketplace add Chrlstopher-c/reecrire`), INSTALL.md
  destiné à un agent, CI.

## Ce qui a été fait — v1.1.0 (16/10/2026, après-midi)
- Refonte visuelle : bouton sans raccourci affiché (« r: » supprimé), libellé « ✦ Reprompting » demandé par Chris.
- Génération en flux : `claude -p --setting-sources '' --strict-mcp-config --tools '' --no-session-persistence
  --output-format stream-json --include-partial-messages`, repli sur `$.model.complete` si le lancement échoue.
- Streaming dans le champ (`$.prompt.fill` à chaque tic de 50 ms) ; la bande n'affiche que l'animation.
- Survol qui clignotait sur Desktop : bande redessinée en boucle (mascotte toutes les 400 ms, reecrire pendant la
  frappe). Corrigé : panneau `Client` qui interroge le mod par `ui.message`, `onPress` fixe + hook `ui.press`,
  visage de la mascotte déplacé dans un module `Client` (mod mascotte, hors repo).

## Décisions prises
| Décision | Raison | Date |
|----------|--------|------|
| Haiku 5.5 effort high comme réécrivain | Demande explicite ; rapide (~6 s) et suffisant | 16/10 |
| Le prompt réécrit remplace le brouillon sans l'envoyer | L'utilisateur relit avant d'envoyer ; Annuler possible | 16/10 |
| Bibliothèque de styles entière dans un bloc fixe marqué cache | Même préfixe à chaque clic, quel que soit le modèle cible | 16/10 |
| Pas de XML pour une demande d'une ligne | Le style doit suivre la taille de la demande | 16/10 |
| Repo = marketplace avec le plugin sous `plugins/reecrire` | Installation en deux commandes par n'importe quel agent | 16/10 |
| Flux par `claude -p` isolé plutôt que `$.model.complete` | Seul moyen d'avoir le texte au fil de l'eau ; ~1,5 s de démarrage | 16/10 |
| Texte en direct dans le champ, bande = animation seule | Demande de Chris : pas de doublon | 16/10 |
| Aucun redessin de la bande pendant la frappe | Desktop recrée les boutons natifs à chaque dessin (survol, clic perdu) | 16/10 |

## Contexte non-évident
- Requiert Claude Code ≥ 2.1.296 (version testée de la 1.1.0 : `Client`, `ui.message`, `process.spawn`) ; `prompt`
  en tableau de blocs exige au minimum 2.1.292.
- `$.clock.every` renvoie un objet `{ cancel() }` alors que les types déclarent une fonction : le mod gère les deux.
- Le cache de prompt ne s'active sans doute pas (bloc fixe sous le seuil minimal de Haiku) ; impact négligeable.
- L'extension VS Code n'affiche pas la bande au-dessus du prompt.
- Claude Desktop recrée les boutons de la bande à chaque redessin ; le terminal ne repeint que les cellules. Tout
  mod qui anime la bande doit le faire dans un module `Client`, jamais par `$.ui.invalidate` en boucle.
- Un module de hooks ne peut pas garder `$` dans une variable (refus de `claude plugin validate`).
- Kit de test : un hook `on(...)` d'un test s'enregistre avant le premier appel à `$`, jamais dans une boucle.

## Prochaines étapes
1. Recueillir le retour de la première installation par un tiers (lien envoyé le 16/10) : Mathéo n'avait pas
   encore installé, son agent installe directement la 1.1.0 via INSTALL.md.
2. Ajouter un éditeur ou ajuster un style si un modèle cible réécrit mal.

## Points en suspens
- Aucun prompt système publié pour Sonnet 5.5 / Haiku 5.5 : leurs styles reposent sur la doc officielle seule.

## Historique
- 16/10/2026 : création, v1.0.0, publication.
- 16/10/2026 : v1.1.0 — Reprompting, flux en direct dans le champ, animations, correctif survol Desktop.

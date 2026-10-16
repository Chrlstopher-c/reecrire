# STATE — reecrire
*Dernière mise à jour : 16/10/2026*

## Résumé de l'état actuel
Mod Claude Code v1.0.0 publié et fonctionnel : bouton « Réécrire » dans la bande au-dessus du prompt (terminal et
onglet Code de Claude Desktop), Annuler, commande `/reecrire`, barre de progression animée + indication sous le
champ. Haiku 5.5 (effort high) réécrit le brouillon au style de l'éditeur du modèle actif. 6 tests verts, CI GitHub
verte, installation depuis GitHub vérifiée dans une configuration vierge.

## Ce qui a été fait — session du 16/10/2026
- Mod écrit, testé (tests unitaires + session réelle dans un terminal), utilisé avec succès en CLI et Desktop.
- Contexte envoyé à Haiku : 50 échanges texte, sans résultats d'outils ni contexte injecté par des hooks (vérifié).
- Bibliothèque de styles par éditeur ; styles Anthropic alignés sur le guide officiel Claude 5 et sur la manière
  dont Anthropic écrit ses prompts système.
- Repo public structuré en marketplace (`claude plugin marketplace add Chrlstopher-c/reecrire`), INSTALL.md
  destiné à un agent, CI.

## Décisions prises
| Décision | Raison | Date |
|----------|--------|------|
| Haiku 5.5 effort high comme réécrivain | Demande explicite ; rapide (~6 s) et suffisant | 16/10 |
| Le prompt réécrit remplace le brouillon sans l'envoyer | L'utilisateur relit avant d'envoyer ; Annuler possible | 16/10 |
| Bibliothèque de styles entière dans un bloc fixe marqué cache | Même préfixe à chaque clic, quel que soit le modèle cible | 16/10 |
| Pas de XML pour une demande d'une ligne | Le style doit suivre la taille de la demande | 16/10 |
| Repo = marketplace avec le plugin sous `plugins/reecrire` | Installation en deux commandes par n'importe quel agent | 16/10 |

## Contexte non-évident
- Requiert Claude Code ≥ 2.1.292 : `prompt` en tableau de blocs n'est accepté qu'à partir de cette version.
- `$.clock.every` renvoie un objet `{ cancel() }` alors que les types déclarent une fonction : le mod gère les deux.
- Le cache de prompt ne s'active sans doute pas (bloc fixe sous le seuil minimal de Haiku) ; impact négligeable.
- L'extension VS Code n'affiche pas la bande au-dessus du prompt.

## Prochaines étapes
1. Recueillir le retour de la première installation par un tiers (lien envoyé le 16/10).
2. Ajouter un éditeur ou ajuster un style si un modèle cible réécrit mal.

## Points en suspens
- Aucun prompt système publié pour Sonnet 5.5 / Haiku 5.5 : leurs styles reposent sur la doc officielle seule.

## Historique
- 16/10/2026 : création, v1.0.0, publication.

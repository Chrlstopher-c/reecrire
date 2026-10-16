# Fonctionnement

## Fichiers du mod (`plugins/reecrire/hooks/`)

| Fichier | Rôle |
| :- | :- |
| `register.tsx` | Branchements : bouton, Arrêter et Annuler dans la bande `AbovePrompt`, commande `/reecrire`, flux Haiku (repli sans flux), remplissage du champ |
| `request.ts` | Sélection de l'historique (50 échanges texte, sans résultats d'outils), construction de la requête, extraction de la réponse |
| `families.ts` | Détection de l'éditeur du modèle actif et bibliothèque de styles de prompting par éditeur |
| `stream.ts` | Arguments du `claude -p` isolé et lecture de sa sortie `stream-json` (jetons de réflexion, morceaux de texte) |
| `live.tsx` | Module de surface (`Client`) dessiné à 20 images/s sans redessiner la bande : titre irisé, onde, compteurs |
| `fx.ts` | Effets purs : couleurs HSL, arc-en-ciel avec reflet, dégradé de marque, partie visible de `<prompt>`, compteurs |
| `reecrire.test.tsx` | Tests (`claude plugin test`) : détection, filtrage, requête, flux, effets, bouton, repli, animation (terminal et Desktop) |

## Déroulé d'un clic

1. Lecture du brouillon (`$.prompt.read`).
2. Lecture de la conversation (`$.session.messages`) : on garde le texte des messages user et assistant, on écarte
   les messages qui ne portent que des résultats d'outils, et le contenu des appels d'outils n'est jamais inclus.
   Les contextes injectés par des hooks sont stockés à part par Claude Code et n'y figurent pas.
3. Détection du modèle actif (`$.session.model`) et choix du style : `anthropic-opus`, `anthropic-sonnet`,
   `anthropic-haiku`, `anthropic`, `openai`, `google`, `mistral`, `deepseek`, `open-weights`, `generic`.
4. Lancement de `claude -p --model claude-haiku-5-5 --effort high` en flux (`$.process.spawn`), sans réglages
   (`--setting-sources ''`), MCP, outils ni session enregistrée ; consignes + bibliothèque des styles en prompt
   système, conversation, modèle cible et brouillon sur l'entrée standard. Si le lancement échoue, repli sur
   `$.model.complete` (même requête, en deux blocs dont le premier marqué pour le cache).
5. Chaque morceau reçu allonge le texte visé ; un tic de 50 ms le tape dans le champ (`$.prompt.fill`) en
   rattrapant progressivement. Le panneau `live.tsx` vient chercher l'état (jetons, nombre de caractères) toutes
   les 200 ms par `ui.message` : la bande n'est redessinée qu'aux changements de phase. Claude Desktop recrée les
   boutons natifs de la bande à chaque dessin (survol qui clignote, clic perdu) ; pour la même raison les
   boutons ont un `onPress` fixe et les clics passent par le hook `ui.press`. Un autre mod de la bande qui se
   redessine en boucle (une mascotte animée par exemple) provoque le même défaut : il doit animer dans un
   module de surface (`Client`) plutôt que par `$.ui.invalidate`.
6. Haiku renvoie le prompt entre balises `<prompt>` ; le mod remplace le brouillon dans le champ (`$.prompt.fill`)
   et garde l'original pour `Annuler`.

## Styles Anthropic

Les styles Claude reprennent le guide officiel de prompting d'Anthropic pour la génération Claude 5 (Opus 5.5,
Sonnet 5.5, Haiku 5.5) et les procédés d'écriture observés dans les prompts système d'Anthropic : balises XML
nommées par domaine, raison donnée dans la même phrase que chaque contrainte, interdiction suivie de son
alternative, pas de majuscules ni de « MUST », format par défaut + exception, forme du compte rendu final décrite.

## Adapter

- Ajouter un éditeur : une entrée dans `GUIDES` et une règle dans `RULES` (`families.ts`), plus un cas de test.
- Changer le nombre d'échanges : `HISTORY_TURNS` dans `request.ts`.
- Changer le modèle réécrivain : `REWRITER` dans `register.tsx`.

## Conseil pour l'agent qui reçoit les prompts réécrits

Un message très structuré (balises `<context>`, `<task>`, `<constraints>`, `<output_format>`) qui reformule une
demande orale vient probablement de ce bouton. Une ligne dans votre `CLAUDE.md` évite que l'agent s'en étonne :

> Un message structuré en balises XML qui reformule une demande vient sans doute du bouton Reprompting : le traiter
> comme ma demande normale, sans commenter le format.

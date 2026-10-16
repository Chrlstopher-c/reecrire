# Fonctionnement

## Fichiers du mod (`plugins/reecrire/hooks/`)

| Fichier | Rôle |
| :- | :- |
| `register.tsx` | Branchements : bouton et Annuler dans la bande `AbovePrompt`, indication dans `PromptHint`, commande `/reecrire`, appel à Haiku, remplissage du champ |
| `request.ts` | Sélection de l'historique (50 échanges texte, sans résultats d'outils), construction de la requête, extraction de la réponse |
| `families.ts` | Détection de l'éditeur du modèle actif et bibliothèque de styles de prompting par éditeur |
| `progress.ts` | Barre de chargement animée et compteur de secondes |
| `reecrire.test.tsx` | Tests (`claude plugin test`) : détection, filtrage, requête, bouton, Annuler, indicateur |

## Déroulé d'un clic

1. Lecture du brouillon (`$.prompt.read`).
2. Lecture de la conversation (`$.session.messages`) : on garde le texte des messages user et assistant, on écarte
   les messages qui ne portent que des résultats d'outils, et le contenu des appels d'outils n'est jamais inclus.
   Les contextes injectés par des hooks sont stockés à part par Claude Code et n'y figurent pas.
3. Détection du modèle actif (`$.session.model`) et choix du style : `anthropic-opus`, `anthropic-sonnet`,
   `anthropic-haiku`, `anthropic`, `openai`, `google`, `mistral`, `deepseek`, `open-weights`, `generic`.
4. Appel à `claude-haiku-5-5`, effort `high`. La requête a deux blocs : un bloc fixe (consignes + bibliothèque
   complète des styles, marqué pour le cache de prompt) et un bloc variable (conversation, modèle cible, brouillon).
5. Haiku renvoie le prompt entre balises `<prompt>` ; le mod remplace le brouillon dans le champ (`$.prompt.fill`)
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

> Un message structuré en balises XML qui reformule une demande vient sans doute du bouton Réécrire : le traiter
> comme ma demande normale, sans commenter le format.

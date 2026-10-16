# reecrire — bouton « Réécrire » pour Claude Code et Claude Desktop

Un mod Claude Code qui ajoute un bouton **Réécrire** juste au-dessus du champ de saisie. Vous tapez (ou dictez)
votre demande comme elle vient, vous cliquez, et Haiku 5.5 la réécrit au format de prompting du modèle que vous
utilisez : balises XML et contraintes justifiées pour Claude, sections markdown pour OpenAI, etc. Le texte réécrit
remplace votre brouillon dans le champ : vous relisez, puis vous envoyez. Rien ne part sans vous.

> **Agent chargé de l'installation : suivez [INSTALL.md](INSTALL.md).**

## Ce que ça fait

- **Bouton `Réécrire`** dans la bande au-dessus du prompt, dans le terminal et dans l'onglet Code de Claude Desktop.
- **`Annuler`** remet votre brouillon d'origine.
- **Indicateur de progression** pendant la génération : barre animée et compteur de secondes au-dessus du champ,
  et la ligne sous le champ indique « Haiku 5.5 réécrit ton prompt ».
- **Commande `/reecrire <texte>`** : même chose, en partant du texte tapé après la commande.
- **Au clavier dans le terminal** : `Ctrl+X Tab` pour aller dans la bande, puis `r` (réécrire) ou `u` (annuler).

## Comment la réécriture est faite

- Modèle : Haiku 5.5, effort `high`.
- Contexte : les **50 derniers échanges texte** entre vous et le modèle, **sans aucun résultat d'outil**
  (lectures de fichiers, recherches, sorties de commandes) ni contexte injecté par des hooks. Chaque message est
  limité à 3000 caractères. Le contexte sert seulement à comprendre à quoi le brouillon fait référence ;
  il n'est pas recopié dans le prompt.
- Format : choisi d'après le modèle actif de la session, parmi une bibliothèque de styles par éditeur
  (voir [docs/FONCTIONNEMENT.md](docs/FONCTIONNEMENT.md)) :
  Anthropic (Opus, Sonnet, Haiku), OpenAI, Google, Mistral, DeepSeek, modèles open-weights (Qwen, Llama…),
  et un style générique en secours.
- Le brouillon garde sa langue, son intention et toutes ses contraintes.

## Prérequis

- Claude Code **2.1.292 ou plus récent** (`claude --version`). Les mods sont actifs par défaut.
- Accès au modèle Haiku 5.5 (`claude-haiku-5-5`) avec votre abonnement ou votre clé API. Chaque clic consomme un
  appel Haiku sur votre quota.
- Pour Desktop : la version de Claude Desktop avec l'onglet Code (les mods y fonctionnent comme dans le terminal).

## Installation rapide

```bash
claude plugin marketplace add Chrlstopher-c/reecrire
claude plugin install reecrire@reecrire
```

Ensuite, ouvrez une **nouvelle** session Claude Code. Pour Desktop, **redémarrez l'application** et ouvrez une
nouvelle discussion dans l'onglet Code. Détails, vérification et dépannage : [INSTALL.md](INSTALL.md).

## Mise à jour / désinstallation

```bash
claude plugin marketplace update reecrire && claude plugin update reecrire@reecrire
claude plugin uninstall reecrire@reecrire
```

## Développement

```bash
cd plugins/reecrire
claude plugin validate .
claude plugin test
```

`scripts/ci/local-ci.sh` lance les mêmes vérifications que la CI GitHub.

## Licence

MIT

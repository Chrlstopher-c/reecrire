# Installation — instructions pour un agent (Claude Code)

Ce fichier s'adresse à l'agent qui installe le mod pour son utilisateur. Suivez les étapes dans l'ordre, lancez
chaque commande vous-même, et vérifiez chaque résultat avant de passer à la suivante. Le but : le bouton
« ✦ Reprompting » visible au-dessus du prompt dans le terminal **et** dans l'onglet Code de Claude Desktop.

Il s'agit d'une installation neuve de la version 1.1.0 : aucune version précédente n'est à mettre à jour ni à
désinstaller.

## 1. Vérifier la version

```bash
claude --version
```

Il faut **2.1.296 ou plus** : c'est la version sur laquelle reecrire 1.1.0 est testé (il utilise des éléments
récents de l'API des mods). Version trop ancienne : mettez à jour Claude Code lui-même avec `claude update`, puis
revérifiez.

Vérifiez aussi que la commande `claude` est trouvable dans le PATH :

```bash
command -v claude
```

Le mod lance `claude -p` pour recevoir la réécriture au fil de l'eau. Si la commande est introuvable, il marche
quand même, mais le texte n'apparaît qu'une fois la réponse complète (il se tape alors rapidement dans le champ).

## 2. Ajouter la marketplace et installer

```bash
claude plugin marketplace add Chrlstopher-c/reecrire
claude plugin install reecrire@reecrire
```

Résultat attendu : `✔ Successfully installed plugin: reecrire@reecrire (scope: user)`.
L'installation au niveau `user` vaut pour toutes les sessions de cet utilisateur, terminal et Desktop compris.

## 3. Vérifier que le plugin est actif

```bash
claude plugin list
```

La ligne `reecrire@reecrire` doit afficher `Version: 1.1.0` et `Status: ✔ enabled`. Si elle est désactivée :
`claude plugin enable reecrire@reecrire`.

## 4. Cas où l'utilisateur a plusieurs configurations Claude Code

Si l'utilisateur lance Claude Code avec une variable `CLAUDE_CONFIG_DIR` (plusieurs comptes, lanceur maison),
le plugin doit être installé dans **chaque** dossier de configuration utilisé. Pour vérifier :

```bash
echo "$CLAUDE_CONFIG_DIR"
```

Pour chaque dossier concerné, répétez l'étape 2 avec la variable positionnée, par exemple :

```bash
CLAUDE_CONFIG_DIR=/chemin/vers/config claude plugin marketplace add Chrlstopher-c/reecrire
CLAUDE_CONFIG_DIR=/chemin/vers/config claude plugin install reecrire@reecrire
```

Claude Desktop utilise la configuration par défaut (`~/.claude`) sauf réglage contraire.

## 5. Ce que l'utilisateur doit faire ensuite (à lui dire clairement)

- **Terminal** : quitter la session en cours et en ouvrir une nouvelle. Une session déjà ouverte ne charge pas le mod.
- **Claude Desktop** : quitter complètement l'application (pas seulement fermer la fenêtre), la relancer, puis
  ouvrir une **nouvelle** discussion dans l'onglet Code.
- Le bouton `✦ Reprompting` apparaît au-dessus du champ de saisie. Il suffit de taper un brouillon et de cliquer :
  après quelques secondes de réflexion, le prompt réécrit s'écrit en direct dans le champ, à relire avant
  d'envoyer. `Arrêter` (pendant) et `Annuler` (après) remettent le brouillon d'origine.

## 6. Vérification par l'agent (facultatif mais recommandé)

Sans session interactive, vérifiez que la copie installée est bien formée :

```bash
claude plugin validate ~/.claude/plugins/marketplaces/reecrire/plugins/reecrire
```

(Avec un `CLAUDE_CONFIG_DIR`, remplacez `~/.claude` par ce dossier. La copie effectivement chargée se trouve sous
`~/.claude/plugins/cache/reecrire/reecrire/<version>/`.)

## Dépannage

| Symptôme | Cause probable | Solution |
| :- | :- | :- |
| Pas de bouton | Session ouverte avant l'installation | Nouvelle session ; pour Desktop, redémarrage complet |
| Pas de bouton dans Desktop seulement | Desktop utilise un autre `CLAUDE_CONFIG_DIR` | Étape 4 |
| `✕ Échec de la réécriture · Haiku sans réponse (api-error)` | Pas d'accès à `claude-haiku-5-5`, quota atteint ou modèle bloqué par l'organisation | Vérifier l'accès au modèle |
| `✕ Échec de la réécriture · champ indisponible` | Une boîte de dialogue était ouverte | Fermer la boîte de dialogue et recliquer |
| Le texte n'apparaît qu'à la fin au lieu de s'écrire au fil de la génération | `claude` introuvable dans le PATH de l'application (Desktop surtout) | Facultatif : rendre `claude` accessible dans le PATH ; sinon rien à faire, la réécriture marche |
| Rien dans l'extension VS Code | L'extension n'affiche pas la bande au-dessus du prompt | Utiliser le terminal ou Desktop |
| Mods désactivés | Mode sans échec ou politique d'administration | Voir les réglages gérés de l'organisation |

## Désinstaller

```bash
claude plugin uninstall reecrire@reecrire
claude plugin marketplace remove reecrire
```

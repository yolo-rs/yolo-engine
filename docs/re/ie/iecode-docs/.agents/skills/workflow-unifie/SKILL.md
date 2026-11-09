---
name: workflow-unifie
description: Router les travaux Rose Griffon qui croisent Aphrody, WinClean, niers, Ghidra ou Computer Use avec un run borné et des preuves graduées.
argument-hint: "[demande ou symptôme]"
allowed-tools: mcp__plugin_rose-griffon_rose-griffon, mcp__rose-griffon, Bash, Read, Write, Grep
---

# Workflow unifié Rose Griffon

Exécution : suivre `~/.codex/YOLO-NHITL.md`. Si ce fichier est absent,
terminer le travail autorisé avec les gates du dépôt, préserver les changements
concurrents et signaler les dépendances ; aucune confirmation intermédiaire
pour les choix réversibles. Une publication ou mutation de production exige
le périmètre propriétaire correspondant.

Le produit RG réside dans Aphrody (`apps/rg`, `packages/rg`, `config/rg`).
Lire ses instructions et les sources épinglées ; ne pas inventer de données
Victory Road ni modifier les exports générés à la place du pipeline propriétaire.

Pour tout travail non trivial, créer un run unique sous
`var/runs/<run-id>/` :

```text
pending/     # entrées déclarées
results/     # sorties validées
logs/        # commandes, appels, stderr, timestamps
evidence/    # captures, réponses live, hashes
manifest.json
```

Le manifest contient au minimum `run_id`, `requested_scope`, `tool_versions`,
`inputs`, `actions`, `outputs`, `status` et `evidence`. Les secrets, dumps
privés et gros assets ne sont jamais copiés dans le run : les référencer par
hash et chemin local.

## Routage

1. Données, VFS, formats Level-5, batch, rendu ou rapport : commencer par
   `niers` (`vfs`, `decode`, `lua`, `wiki`, `render`, `report`).
2. RE d'un binaire : vérifier l'empreinte avec `niers`/`aphrody-re`, puis
   utiliser Ghidra/GhidrAssistMCP sur le binaire actuellement ouvert. Un index
   historique désaligné n'est pas la vérité terrain.
3. Jeu ou application Windows : observer avec WinClean ou Computer Use, noter
   PID et fenêtre, agir dans le périmètre demandé, observer à nouveau et
   conserver les deux états. Une relance est bornée ; aucun `pkill -f`.
4. Asset ou interface : lancer le consommateur réel et inspecter la sortie ;
   une capture hors écran ne prouve pas la fidélité au jeu.
5. Publication ou production Rose Griffon : valider l'artefact localement,
   sonder l'URL/service réel et conserver la réponse dans `evidence/`.

## Preuve et garde-fous

| Niveau | Ce qui est établi                               |
| ------ | ----------------------------------------------- |
| P0     | outil ou configuration déclaré                  |
| P1     | commande locale terminée avec code 0            |
| P2     | artefact inspecté                               |
| P3     | UI, jeu, endpoint ou service réel observé       |
| P4     | run borné, manifest, hashes et test indépendant |

Un plugin installé ou une entrée MCP établit seulement une déclaration de
capacité. Un build terminé établit P1 ; une fenêtre ouverte ne valide pas le
comportement demandé. Les claims de code visent P2 ; les claims runtime et
déploiement visent P3/P4. Marquer les hypothèses et surfaces non validées.

Utiliser le propriétaire RG pour les données et l’exploitation du monorepo ;
vérifier la disponibilité réelle de son connecteur. Ne pas ajouter de chemin stdio vers un autre dépôt dans le `.mcp.json`
du plugin : `niers`, WinClean, Ghidra et Computer Use sont des surfaces
optionnelles à vérifier dans leur connecteur actif. Ne jamais copier de jeton
dans un fichier de config ni exposer de lecture arbitraire du dépôt par HTTP.
Les diagnostics d'un MCP stdio vont sur stderr ; stdout reste réservé au
JSON-RPC.

## Restitution

Conclure avec le chemin du run, les commandes et codes de sortie, les artefacts
et hashes, les sondes live, le niveau de preuve par affirmation, puis séparer
faits vérifiés, hypothèses et limites. Le `results/manifest.json` d'un run peut
devenir une entrée `pending/` du run suivant avec son hash conservé.

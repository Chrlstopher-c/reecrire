#!/usr/bin/env bash
# Rejoue localement les vérifications de .github/workflows/ci.yml : validation des manifestes et tests du mod.
set -euo pipefail
cd "$(dirname "$0")/../.."
claude plugin validate .
claude plugin validate plugins/reecrire
(cd plugins/reecrire && claude plugin test)
echo "CI locale : vert"

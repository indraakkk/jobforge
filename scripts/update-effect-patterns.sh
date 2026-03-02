#!/usr/bin/env bash
set -euo pipefail

SUBMODULE_PATH="docs/effect-patterns"
PATTERNS_DIR="$SUBMODULE_PATH/content/published/patterns"

cd "$(git rev-parse --show-toplevel)"

# Initialize submodule if needed (fresh clone)
if [ ! -f "$SUBMODULE_PATH/.git" ] && [ ! -d "$SUBMODULE_PATH/.git" ]; then
  echo "Initializing submodule..."
  git submodule update --init "$SUBMODULE_PATH"
fi

# Fetch latest from remote main
echo "Updating Effect Patterns..."
cd "$SUBMODULE_PATH"
git fetch origin main
git checkout origin/main

echo ""
echo "Current commit:"
git log -1 --format="  %h %s (%cr)"

echo ""
echo "Categories:"
ls -1 "$( git rev-parse --show-toplevel )/content/published/patterns" | sed 's/^/  /'

echo ""
PATTERN_COUNT=$(find "$( git rev-parse --show-toplevel )/content/published/patterns" -name "*.mdx" | wc -l | tr -d ' ')
echo "Total patterns: $PATTERN_COUNT"

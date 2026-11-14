#!/usr/bin/env bash
# Rebuilds atlas/index.html from its sources.
#
# The atlas ("Human Metabolic Pathways") is authored as Python in
#   ~/Documents/2 School/.build/pathways_src/
# and built into one self-contained HTML file. atlas/index.html here is a
# COPY of that build output -- never edit it, it will be overwritten.
#
# Sources, for when something needs changing:
#   data.py    molecule cards, enzyme cards, topics, pathways, states, maps
#   master.py  the whole-chart layout
#   quiz.py    the question bank (also the source of the imported questions)
#   app.css / app.js / index.html   the site itself
set -euo pipefail

SRC_DIR="${ATLAS_SRC_DIR:-$HOME/Documents/2 School}"
BUILD="$SRC_DIR/.build/build_pathways.py"
BUILT="$SRC_DIR/Metabolism map/index.html"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$HERE/atlas/index.html"

if [[ ! -f "$BUILD" ]]; then
  echo "Atlas sources not found at: $BUILD" >&2
  echo "They live outside this repo. Set ATLAS_SRC_DIR if yours are elsewhere." >&2
  echo "atlas/index.html is committed, so the game still works without them." >&2
  exit 1
fi

echo "Building the atlas..."
python3 "$BUILD"
echo "Checking map layouts..."
python3 "$BUILD" --layout

cp "$BUILT" "$DEST"
echo "Copied to $DEST ($(du -h "$DEST" | cut -f1))"
echo
echo "Remember: if quiz.py changed, re-import its questions too --"
echo "  cd web && npm run db:import-atlas"

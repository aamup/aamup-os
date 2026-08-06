#!/usr/bin/env bash
set -euo pipefail

if [[ -d .git ]]; then
  echo "A Git repository already exists here. No changes made."
  exit 1
fi

if ! git config --global user.name >/dev/null || ! git config --global user.email >/dev/null; then
  echo "Git identity is not configured. Set it first:"
  echo '  git config --global user.name "Your Name"'
  echo '  git config --global user.email "you@example.com"'
  exit 1
fi

git init

git add .gitignore .env.example package.json tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts index.html scripts/bootstrap-git.sh
git commit -m "chore: initialize AAMUP OS workspace"

git add src
git commit -m "feat(shell): establish AAMUP OS command center"

git add README.md docs scripts/first-commits.txt
git commit -m "docs: define architecture and Gource strategy"

echo
echo "AAMUP OS repository initialized with three coherent commits."
git --no-pager log --oneline --decorate -3

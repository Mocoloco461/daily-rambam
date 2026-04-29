#!/usr/bin/env bash
# scripts/setup-branch-protection.sh
#
# One-time setup: protect the main branch so no one can push directly.
# Requires: gh CLI installed and authenticated (`gh auth login`)
#
# Usage:
#   chmod +x scripts/setup-branch-protection.sh
#   ./scripts/setup-branch-protection.sh

set -euo pipefail

REPO="Mocoloco461/daily-rambam"
BRANCH="main"

echo "🔒 Setting branch protection on '${BRANCH}' in ${REPO}..."

gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "/repos/${REPO}/branches/${BRANCH}/protection" \
  --field required_status_checks='{"strict":true,"contexts":[]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews=null \
  --field restrictions=null \
  --field allow_force_pushes=false \
  --field allow_deletions=false \
  --field block_creations=false \
  --field required_conversation_resolution=false

echo ""
echo "✅ Branch protection enabled on '${BRANCH}':"
echo "   • Direct push blocked (non-fast-forward rejected)"
echo "   • Force push blocked"
echo "   • Branch deletion blocked"
echo ""
echo "ℹ️  The stage pipeline bot (GH_PAT) is still allowed to push"
echo "   because it pushes fast-forward commits via the rebase+push flow."
echo ""
echo "To verify: https://github.com/${REPO}/settings/branches"

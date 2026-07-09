#!/usr/bin/env bash
set -euo pipefail

cd /app

npm ci
npx playwright install chromium

# Postgres de testes na rede interna do Dev Container.
if [ -f .env.test ]; then
  sed -i 's|^TEST_DATABASE_URL=.*|TEST_DATABASE_URL=postgresql://postgres:postgres@postgres-test:5432/meccafit_test|' .env.test
else
  cat > .env.test <<'EOF'
NODE_ENV=test
TEST_DATABASE_URL=postgresql://postgres:postgres@postgres-test:5432/meccafit_test
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable-key
NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key
SUPABASE_SERVICE_ROLE_KEY=test-service-role-key
EOF
fi

echo ""
echo "Dev Container pronto."
echo "  npm run dev              — app em :3000"
echo "  npm run test:global:fast — lint + unit + backend"
echo "  npm run test:global      — bateria completa (requer .env.local)"
echo "  npm run test:global:stress — inclui load/stress ARGOS"

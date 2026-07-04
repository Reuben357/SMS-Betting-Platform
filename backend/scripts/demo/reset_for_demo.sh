#!/bin/bash
# ============================================================
# JENGATIPS — DEMO RESET SCRIPT
# Run this BEFORE the demo to start from a completely clean state
# Usage: bash scripts/demo/reset_for_demo.sh
# ============================================================

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║     JENGATIPS DEMO RESET — PRE-FLIGHT      ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── Config — edit these to match your local setup ──────────
DB_NAME="${DB_NAME:-sms_betting_tips}"
DB_USER="${DB_USER:-betting_user}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
BACKEND_PORT="${BACKEND_PORT:-5000}"
PGPASSWORD="${***REMOVED***:-}"   # set in env or will prompt

export PGPASSWORD

echo -e "${YELLOW}Database: ${DB_NAME} on ${DB_HOST}:${DB_PORT} (user: ${DB_USER})${NC}"
echo ""

# ── Step 1: Clear all data ──────────────────────────────────
echo -e "${BOLD}[1/4] Clearing all data...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'SQL'
-- Order matters: dependents first
TRUNCATE TABLE
  messages,
  purchases,
  payments,
  tips,
  tips_session_items,
  tips_sessions,
  customers,
  contacts,
  csv_uploads,
  outflow,
  users,
  packages,
  tiers_active_sub,
  tiers_active,
  tiers_potential
RESTART IDENTITY CASCADE;
SQL
echo -e "${GREEN}  ✓ All tables cleared${NC}"

# ── Step 2: Seed demo tiers ─────────────────────────────────
echo -e "${BOLD}[2/4] Seeding demo tier configuration...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'SQL'
INSERT INTO tiers_potential (tier_number, min_frequency, max_frequency) VALUES
  (1, 1,   50),
  (2, 51,  100),
  (3, 101, 150);

INSERT INTO tiers_active (tier_letter, min_purchases, max_purchases) VALUES
  ('A', 1,  10),
  ('B', 11, 30),
  ('C', 31, 100);

INSERT INTO tiers_active_sub (sub_number, min_spend, max_spend) VALUES
  (1, 15, 30),
  (2, 31, 100);
SQL
echo -e "${GREEN}  ✓ Tiers seeded${NC}"

# ── Step 3: Clear Redis ─────────────────────────────────────
echo -e "${BOLD}[3/4] Flushing Redis...${NC}"
if command -v redis-cli &>/dev/null; then
  redis-cli flushall > /dev/null 2>&1 && echo -e "${GREEN}  ✓ Redis flushed${NC}"
else
  echo -e "${YELLOW}  ⚠ redis-cli not found — flush Redis manually if needed${NC}"
fi

# ── Step 4: Verify backend is up ───────────────────────────
echo -e "${BOLD}[4/4] Checking backend health...${NC}"
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$BACKEND_PORT/health 2>/dev/null || echo "000")
if [ "$HEALTH" = "200" ]; then
  echo -e "${GREEN}  ✓ Backend is running on port $BACKEND_PORT${NC}"
else
  echo -e "${YELLOW}  ⚠ Backend not responding (HTTP $HEALTH). Start it with: npm run dev${NC}"
fi

echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║   RESET COMPLETE — READY FOR DEMO        ║${NC}"
echo -e "${BOLD}${GREEN}║                                          ║${NC}"
echo -e "${BOLD}${GREEN}║   Next step: open /setup in the browser  ║${NC}"
echo -e "${BOLD}${GREEN}║   and create the admin account.          ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
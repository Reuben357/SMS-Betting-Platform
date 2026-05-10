#!/bin/bash
# ============================================================
# JENGAATIPS — DEMO TRANSACTION SCRIPT
# Runs mock M-Pesa payments to demonstrate all system scenarios
# Usage: bash scripts/demo/run_demo_transactions.sh
#
# Run AFTER you have:
#   1. Reset the DB (reset_for_demo.sh)
#   2. Created admin account (/setup)
#   3. Created packages via Admin UI
#   4. Added tips to each package
#   5. Created and activated a session with templates
# ============================================================

BASE="http://localhost:${BACKEND_PORT:-5000}/api/payments/mpesa-callback"
DELAY=2

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'
CYAN='\033[0;36m'; BOLD='\033[1m'; BLUE='\033[0;34m'; NC='\033[0m'

banner() {
  echo ""
  echo -e "${BOLD}${CYAN}──────────────────────────────────────────${NC}"
  echo -e "${BOLD}${CYAN}  $1${NC}"
  echo -e "${BOLD}${CYAN}──────────────────────────────────────────${NC}"
}

show() {
  local label=$1 expect=$2 phone=$3 amount=$4
  echo ""
  echo -e "  ${BOLD}$label${NC}"
  echo -e "  Expected → ${YELLOW}$expect${NC}"
  echo -e "  Phone    → $phone   Amount → KES $amount"
}

pay() {
  local id=$1 amount=$2 phone=$3 first=$4 last=$5
  local resp
  resp=$(curl -s -X POST "$BASE" \
    -H "Content-Type: application/json" \
    -d "{
      \"TransactionType\":\"Buy Goods\",
      \"TransID\":\"$id\",
      \"TransTime\":\"$(date +%Y%m%d%H%M%S)\",
      \"TransAmount\":\"$amount\",
      \"BusinessShortCode\":\"225522\",
      \"BillRefNumber\":\"Buy Goods\",
      \"MSISDN\":\"$phone\",
      \"FirstName\":\"$first\",
      \"MiddleName\":\"\",
      \"LastName\":\"$last\"
    }")
  echo -e "  Response → ${GREEN}$resp${NC}"
  sleep $DELAY
}

# ============================================================
echo ""
echo -e "${BOLD}${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${BLUE}║       JENGATIPS DEMO TRANSACTIONS          ║${NC}"
echo -e "${BOLD}${BLUE}║  Packages expected: KES 15 / 30 / 50    ║${NC}"
echo -e "${BOLD}${BLUE}╚══════════════════════════════════════════╝${NC}"

# ── SCENE 1: Perfect payments ───────────────────────────────
banner "SCENE 1 — Exact Match (Happy Path)"
echo "  Three customers pay the exact right amount."
echo "  Each should get tips + confirmation SMS instantly."

show "Customer 1 — KES 15 exact (4 Odds package)" \
  "status=matched · tips delivered" "254712100001" "15.00"
pay "DEMO001" "15.00" "254712100001" "Alice" "Demo"

show "Customer 2 — KES 30 exact (8 Odds package)" \
  "status=matched · tips delivered" "254712100002" "30.00"
pay "DEMO002" "30.00" "254712100002" "Brian" "Demo"

show "Customer 3 — KES 50 exact (10 Odds package)" \
  "status=matched · tips delivered" "254712100003" "50.00"
pay "DEMO003" "50.00" "254712100003" "Carol" "Demo"

# ── SCENE 2: Overpayment ────────────────────────────────────
banner "SCENE 2 — Overpayment (Flagged, Tips Still Sent)"
echo "  Customer pays KES 40 — between the KES 30 and KES 50 packages."
echo "  System delivers KES 30 package tips, flags KES 10 excess."

show "Customer 4 — KES 40 (between packages)" \
  "status=flagged_overpayment · KES 30 pkg delivered · excess=10 flagged" \
  "254712100004" "40.00"
pay "DEMO004" "40.00" "254712100004" "David" "Demo"

# ── SCENE 3: Underpayment ───────────────────────────────────
banner "SCENE 3 — Underpayment (Below Minimum, No Delivery)"
echo "  Customer pays KES 10 — below the KES 15 floor."
echo "  No tips sent. Payment logged and flagged for admin review."

show "Customer 5 — KES 10 (below minimum)" \
  "status=flagged_underpayment · no tips sent · admin review needed" \
  "254712100005" "10.00"
pay "DEMO005" "10.00" "254712100005" "Eve" "Demo"

# ── SCENE 4: No match (above all packages) ──────────────────
banner "SCENE 4 — No Match (Above All Packages)"
echo "  Customer pays KES 200 — above every active package."
echo "  No tips sent. Flagged as no_match."

show "Customer 6 — KES 200 (no package at this price)" \
  "status=flagged_no_match · no tips sent" \
  "254712100006" "200.00"
pay "DEMO006" "200.00" "254712100006" "Frank" "Demo"

# ── SCENE 5: Repeat customer ────────────────────────────────
banner "SCENE 5 — Repeat Customer (Tier Progression)"
echo "  Same phone number buys three times."
echo "  Show customer tier updating in Settings after each purchase."

show "Customer 7 — First purchase" \
  "status=matched · customer created · Tier A1" \
  "254712100007" "30.00"
pay "DEMO007A" "30.00" "254712100007" "Grace" "Repeat"

show "Customer 7 — Second purchase (same phone)" \
  "status=matched · total_purchases=2" \
  "254712100007" "50.00"
pay "DEMO007B" "50.00" "254712100007" "Grace" "Repeat"

show "Customer 7 — Third purchase" \
  "status=matched · total_purchases=3" \
  "254712100007" "15.00"
pay "DEMO007C" "15.00" "254712100007" "Grace" "Repeat"

# ── SCENE 6: Idempotency (duplicate transaction) ────────────
banner "SCENE 6 — Duplicate Transaction (Idempotency Guard)"
echo "  Safaricom sometimes retries. The same TransID sent twice"
echo "  must only be processed once."

show "First call (processes normally)" \
  "status=matched" "254712100008" "15.00"
pay "DEMO_IDEM" "15.00" "254712100008" "Henry" "Idem"

show "SAME TransID again (must be silently ignored)" \
  "HTTP 200, no duplicate record created" "254712100008" "15.00"
pay "DEMO_IDEM" "15.00" "254712100008" "Henry" "Idem"

# ── Summary ─────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║        ALL DEMO TRANSACTIONS SENT        ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}What to show the client now:${NC}"
echo ""
echo -e "  ${CYAN}1. /admin/payments${NC}"
echo    "     → Filter by 'Matched' — show 6 successful deliveries"
echo    "     → Filter by 'Unresolved' — show the 3 flagged payments"
echo    "     → Click Resolve on the overpayment row"
echo ""
echo -e "  ${CYAN}2. /admin/sms (Message Logs)${NC}"
echo    "     → Each matched payment has 2 messages: confirmation + tips"
echo    "     → Click any message row to read the full SMS content"
echo ""
echo -e "  ${CYAN}3. /admin/settings${NC}"
echo    "     → Active Customers tab — Customer 7 (Grace) with tier badge"
echo    "     → Shows TIER A1 or A2 depending on spend distribution"
echo ""
echo -e "  ${CYAN}4. /admin/accounting${NC}"
echo    "     → Inflow tab — matched payments listed as revenue"
echo    "     → Flagged tab — overpayment + underpayment + no_match"
echo    "     → Add a test expense in the Outflow tab live"
echo ""
echo -e "  ${CYAN}5. /admin/dashboard${NC}"
echo    "     → Payments Today count and Revenue Today updated"
echo    "     → Flagged Unresolved count = 3"
echo    "     → Contact Tier chart populated"
echo ""
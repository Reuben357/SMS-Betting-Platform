"use client";
import { useState, useEffect } from "react";
import TopBar from "@/components/TopBar";
import { Lock } from "lucide-react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// New color palette: Midnight Gold
const BG_DARK = "#1A1A1A"; // main background
const CARD_BG = "#262626"; // card background (slightly lighter)
const TEXT_PRIMARY = "#FFFFFF"; // main text
const TEXT_SECONDARY = "#A3A3A3"; // secondary text
const GOLD = "#B3945B"; // accent color for highlights, borders, etc.
const GOLD_LIGHT = "#D4AF6A"; // lighter gold for hover/gradients
const DANGER = "#EF4444"; // keep red for flagged
const SUCCESS = "#10B981"; // green for positive metrics

// Generate a distinct color for any tier number (1‑200+)
// Uses HSL: different hue per tier, decent saturation, readable lightness
function getTierColor(tierNumber) {
  // Use a golden‑ratio‑based hue spread to keep colors well distributed
  const hue = (tierNumber * 137.5) % 360; // 137.5 ≈ golden angle
  const saturation = 55; // moderate saturation, not too flashy
  const bgLightness = 22; // dark background, similar to card bg
  const textLightness = 78; // bright text for contrast
  const borderLightness = 45;
  return {
    bg: `hsl(${hue}, ${saturation}%, ${bgLightness}%)`,
    text: `hsl(${hue}, ${saturation}%, ${textLightness}%)`,
    border: `hsl(${hue}, ${saturation}%, ${borderLightness}%)`,
  };
}

function SectionLabel({ children }) {
  return (
    <h2
      style={{
        fontSize: "12px",
        fontWeight: 700,
        color: GOLD,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        marginBottom: "16px",
      }}
    >
      {children}
    </h2>
  );
}

function MetricCard({
  label,
  value,
  sub,
  color = GOLD,
  loading,
  redacted = false,
}) {
  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${GOLD}33`,
        borderRadius: "12px",
        padding: "24px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          color: TEXT_SECONDARY,
          fontWeight: 600,
          marginBottom: "8px",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      {redacted ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: TEXT_SECONDARY,
          }}
        >
          <Lock size={16} />
          <span style={{ fontSize: "14px", fontWeight: 600 }}>Admin only</span>
        </div>
      ) : (
        <div
          style={{
            fontSize: "28px",
            fontWeight: 800,
            color: TEXT_PRIMARY,
            lineHeight: 1,
          }}
        >
          {loading ? "…" : value || "0"}
        </div>
      )}
      {sub && !redacted && (
        <div
          style={{ fontSize: "12px", color, fontWeight: 500, marginTop: "8px" }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// Component: Scrollable tier list (replaces vertical bar chart)
function TierList({ tiers, loading }) {
  if (loading) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: TEXT_SECONDARY,
        }}
      >
        Loading tiers…
      </div>
    );
  }
  if (!tiers.length) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: TEXT_SECONDARY,
        }}
      >
        No tiers identified yet.
      </div>
    );
  }
  // Sort tiers by tier number (ascending)
  const sorted = [...tiers].sort((a, b) => a.tier - b.tier);
  const total = sorted.reduce((sum, t) => sum + t.value, 0);
  return (
    <div style={{ height: "100%", overflowY: "auto", paddingRight: "8px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead
          style={{ position: "sticky", top: 0, background: CARD_BG, zIndex: 1 }}
        >
          <tr>
            <th
              style={{
                textAlign: "left",
                padding: "8px 0",
                color: TEXT_SECONDARY,
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              Tier
            </th>
            <th
              style={{
                textAlign: "right",
                padding: "8px 0",
                color: TEXT_SECONDARY,
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              Contacts
            </th>
            <th
              style={{
                textAlign: "right",
                padding: "8px 0",
                color: TEXT_SECONDARY,
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              Share
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => {
            const tierNum = t.tier;
            const colors = getTierColor(tierNum);
            const percent = total ? ((t.value / total) * 100).toFixed(1) : 0;
            return (
              <tr key={tierNum} style={{ borderBottom: `1px solid ${GOLD}20` }}>
                <td style={{ padding: "8px 0" }}>
                  <span
                    style={{
                      display: "inline-block",
                      background: colors.bg,
                      color: colors.text,
                      border: `1px solid ${colors.border}`,
                      borderRadius: "16px",
                      padding: "2px 12px",
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    Tier {tierNum}
                  </span>
                </td>
                <td
                  style={{
                    textAlign: "right",
                    fontWeight: 600,
                    color: TEXT_PRIMARY,
                  }}
                >
                  {t.value.toLocaleString()}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    color: TEXT_SECONDARY,
                    fontSize: "12px",
                  }}
                >
                  {percent}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/proxy/dashboard")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const isAdmin = data?.role === "admin";
  const financialTrend = data?.trends || [];

  // Prepare contact tiers for the scrollable list
  const tierData = (data?.contacts?.by_tier || []).map((t) => ({
    tier: parseInt(t.tier),
    value: parseInt(t.count) || 0,
  }));

  const fmt = (val) => {
    if (val === undefined || val === null) return "0";
    return Number(val).toLocaleString();
  };

  const stats = {
    totalContacts: fmt(data?.contacts?.total),
    activeCustomers: fmt(data?.customers?.total),
    netProfit: fmt(data?.financials?.net_profit),
    todayRevenue: fmt(data?.payments?.today_revenue),
    totalOutflow: fmt(data?.financials?.total_outflow),
    winRate: data?.tips?.win_rate ?? 0,
    paymentsToday: data?.payments?.today_count ?? 0,
    flagged: data?.payments?.flagged_unresolved ?? 0,
  };

  if (error) {
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          color: DANGER,
          background: BG_DARK,
          minHeight: "100vh",
        }}
      >
        <h3>Failed to load dashboard</h3>
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: "10px",
            padding: "8px 16px",
            background: GOLD,
            color: BG_DARK,
            border: "none",
            borderRadius: "6px",
            fontWeight: 600,
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <TopBar title="Dashboard Overview" />
      <div
        style={{
          padding: "32px",
          background: BG_DARK,
          minHeight: "100vh",
          opacity: loading ? 0.6 : 1,
          transition: "opacity 0.3s ease",
          color: TEXT_PRIMARY,
        }}
      >
        <SectionLabel>Lead Management</SectionLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "20px",
            marginBottom: "32px",
          }}
        >
          <MetricCard
            label="Total Contacts"
            value={stats.totalContacts}
            sub="Global database size"
            loading={loading}
          />
          <MetricCard
            label="Active Customers"
            value={stats.activeCustomers}
            sub="Purchasing users"
            color={GOLD_LIGHT}
            loading={loading}
          />
          <MetricCard
            label="Win Rate"
            value={`${stats.winRate}%`}
            sub="Historical accuracy"
            color={SUCCESS}
            loading={loading}
          />
          <MetricCard
            label="Net Profit"
            value={isAdmin ? `KES ${stats.netProfit}` : null}
            sub="Revenue after expenses"
            color={SUCCESS}
            loading={loading}
            redacted={!isAdmin && !loading}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: "24px",
            marginBottom: "32px",
          }}
        >
          {/* 7-day trend chart (admin only) */}
          <div
            style={{
              background: CARD_BG,
              padding: "24px",
              borderRadius: "12px",
              border: `1px solid ${GOLD}33`,
            }}
          >
            <SectionLabel>7-Day Financial Trend</SectionLabel>
            <div style={{ height: "300px" }}>
              {!isAdmin && !loading ? (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    color: TEXT_SECONDARY,
                  }}
                >
                  <Lock size={28} />
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>
                    Financial trends are visible to admins only.
                  </span>
                </div>
              ) : financialTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={financialTrend} barGap={4}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#3A3A3A"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: TEXT_SECONDARY, fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: TEXT_SECONDARY, fontSize: 12 }}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
                      }
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        `KES ${Number(value).toLocaleString()}`,
                        name,
                      ]}
                      contentStyle={{
                        borderRadius: "8px",
                        background: BG_DARK,
                        border: `1px solid ${GOLD}`,
                        color: TEXT_PRIMARY,
                      }}
                    />
                    <Legend wrapperStyle={{ color: TEXT_PRIMARY }} />
                    <Bar
                      name="Inflow"
                      dataKey="inflow"
                      fill={GOLD}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={36}
                    />
                    <Bar
                      name="Outflow"
                      dataKey="outflow"
                      fill="#6B4C2C"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={36}
                    />
                    <Line
                      name="Net"
                      dataKey={(d) => d.inflow - d.outflow}
                      stroke={SUCCESS}
                      strokeWidth={2}
                      dot={false}
                      strokeDasharray="4 2"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div
                  style={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: TEXT_SECONDARY,
                  }}
                >
                  {loading
                    ? "Gathering financial data…"
                    : "No trend data for the last 7 days."}
                </div>
              )}
            </div>
          </div>

          {/* Contact Tiers – scalable scrollable table */}
          <div
            style={{
              background: CARD_BG,
              padding: "24px",
              borderRadius: "12px",
              border: `1px solid ${GOLD}33`,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <SectionLabel>Contact Tiers</SectionLabel>
            <div style={{ height: "300px" }}>
              <TierList tiers={tierData} loading={loading} />
            </div>
          </div>
        </div>

        <SectionLabel>SMS Commerce & Operations</SectionLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "20px",
          }}
        >
          <MetricCard
            label="Payments Today"
            value={stats.paymentsToday}
            sub="Matched transactions"
            loading={loading}
          />
          <MetricCard
            label="Revenue Today"
            value={isAdmin ? `KES ${stats.todayRevenue}` : null}
            loading={loading}
            redacted={!isAdmin && !loading}
          />
          <MetricCard
            label="Outflow"
            value={isAdmin ? `KES ${stats.totalOutflow}` : null}
            sub="Operational costs"
            color={DANGER}
            loading={loading}
            redacted={!isAdmin && !loading}
          />
          <MetricCard
            label="Flagged"
            value={stats.flagged}
            sub="Pending review"
            color={DANGER}
            loading={loading}
          />
        </div>
      </div>
    </>
  );
}

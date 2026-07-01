"use client";

import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/TopBar";
import SendSmsModal from "@/components/SendSmsModal";
import ScrollableSelect from "@/components/ui/ScrollableSelect";
import { ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { BG_DARK, CARD_BG, TEXT_PRIMARY, TEXT_SECONDARY, GOLD, DANGER, SUCCESS } from "@/lib/theme";

const IconCheck = () => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
);
const IconAlert = () => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);
const IconClock = () => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
);
const IconSms = () => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
);

const STATUS_CONFIG = {
  matched: {
    label: "Matched",
    color: "#10B981", // green
    bg: "#1A3A2A",
    border: "#10B98140",
    icon: <IconCheck />,
  },
  flagged_overpayment: {
    label: "Overpayment",
    color: "#F9A8D4", // pink
    bg: "#3A1E2A",
    border: "#F9A8D440",
    icon: <IconAlert />,
  },
  flagged_underpayment: {
    label: "Underpayment",
    color: "#EF4444", // red
    bg: "#3A1A1A",
    border: "#EF444440",
    icon: <IconAlert />,
  },
  flagged_no_match: {
    label: "No Match",
    color: "#60A5FA", // blue
    bg: "#1A2A3A",
    border: "#60A5FA40",
    icon: <IconAlert />,
  },
  flagged_incomplete_package: {
    label: "Incomplete Pkg",
    color: "#C47A3A",
    bg: "#271E14",
    border: "#3A2C1A",
    icon: <IconAlert />,
  },
  processing: {
    label: "Processing",
    color: "#6EB3D4",
    bg: "#182028",
    border: "#243040",
    icon: <IconClock />,
  },
  failed: {
    label: "Failed",
    color: "#E07070",
    bg: "#2A1C1C",
    border: "#3D2020",
    icon: <IconAlert />,
  },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    color: "#888",
    bg: "#242424",
    border: "#333",
    icon: <IconClock />,
  };
  return (
      <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 10px",
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: "700",
            color: cfg.color,
            backgroundColor: cfg.bg,
            border: `1px solid ${cfg.border}`,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
      >
      {cfg.icon} {cfg.label}
    </span>
  );
}

function StatCard({ label, value, color, sub }) {
  return (
      <div style={styles.statCard}>
        <div
            style={{
              fontSize: "11px",
              color: "#7A6A50",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
        >
          {label}
        </div>
        <div
            style={{
              fontSize: "28px",
              fontWeight: "800",
              color: color || "#B3945B",
              marginTop: "6px",
              fontVariantNumeric: "tabular-nums",
            }}
        >
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
        {sub && (
            <div style={{ fontSize: "12px", color: "#5A4A34", marginTop: "4px" }}>
              {sub}
            </div>
        )}
      </div>
  );
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagesState, setPagesState] = useState(1);
  const [page, setPage] = useState(1);

  const [statusFilter, setStatusFilter] = useState("");
  const [resolvedFilter, setResolvedFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(null);
  const [smsPhone, setSmsPhone] = useState(null);
  const [limit, setLimit] = useState(15);
  const [gotoPage, setGotoPage] = useState("");
  const [phoneSearch, setPhoneSearch] = useState("");

  // Scroll-to-top state
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Toast state
  const [toast, setToast] = useState({ visible: false, message: "", type: "" });

  const showToast = (message, type = "success") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: "", type: "" }), 4000);
  };

  // Helper to generate page numbers (e.g. 1 ... 11 12 13 ... 1143)
  const getPageNumbers = () => {
    const total = pagesState;
    const current = page;
    const delta = 2;
    let range = [];
    for (
        let i = Math.max(2, current - delta);
        i <= Math.min(total - 1, current + delta);
        i++
    ) {
      range.push(i);
    }
    if (current - delta > 2) range.unshift("...");
    if (current + delta < total - 1) range.push("...");
    range.unshift(1);
    if (total !== 1) range.push(total);
    return [...new Set(range)];
  };

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit,
      });
      if (statusFilter) params.set("status", statusFilter);
      if (resolvedFilter !== "") params.set("resolved", resolvedFilter);
      if (phoneSearch.trim()) params.set("phone", phoneSearch.trim());
      const res = await fetch(`/api/proxy/payments?${params}`);
      const data = await res.json();
      setPayments(data.payments ?? []);
      setTotal(data.total ?? 0);
      setPagesState(data.pages ?? 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, resolvedFilter, phoneSearch]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, resolvedFilter, limit, phoneSearch]);

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleResolve = async (id) => {
    setResolving(id);
    try {
      const res = await fetch(`/api/proxy/payments/${id}/resolve`, {
        method: "PUT",
      });
      if (res.ok)
        setPayments((prev) =>
            prev.map((p) =>
                p.id === id ? { ...p, resolved: true, status: "matched" } : p,
            ),
        );
    } finally {
      setResolving(null);
    }
  };

  const handleGoToPage = () => {
    const pageNum = parseInt(gotoPage);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= pagesState) {
      setPage(pageNum);
      setGotoPage("");
    }
  };

  const matchedCount = payments.filter((p) => p.status === "matched").length;
  const flaggedCount = payments.filter((p) =>
      p.status.startsWith("flagged"),
  ).length;
  const unresolvedCount = payments.filter(
      (p) => !p.resolved && p.status !== "matched",
  ).length;

  return (
      <div style={{ background: "#111111", minHeight: "100vh" }}>
        <TopBar title="System Payments" />

        {/* Toast Notification */}
        {toast.visible && (
            <div
                style={{
                  position: "fixed",
                  top: "20px",
                  right: "20px",
                  background: toast.type === "error" ? `${DANGER}20` : `${SUCCESS}20`,
                  border: `1px solid ${toast.type === "error" ? DANGER : SUCCESS}`,
                  borderRadius: "12px",
                  padding: "14px 20px",
                  color: TEXT_PRIMARY,
                  fontSize: "14px",
                  fontWeight: 600,
                  boxShadow: "0 8px 16px rgba(0,0,0,0.4)",
                  zIndex: 3000,
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  maxWidth: "400px",
                  backdropFilter: "blur(4px)",
                }}
            >
            <span style={{ color: toast.type === "error" ? DANGER : SUCCESS }}>
              {toast.type === "error" ? "❌" : "✅"}
            </span>
              {toast.message}
            </div>
        )}

        <div style={styles.container}>
          {/* Stats Row */}
          <div style={styles.statsRow}>
            <StatCard label="Total Transactions" value={total} color="#B3945B" />
            <StatCard label="Matched" value={matchedCount} color="#8FB87A" />
            <StatCard
                label="Flagged Issues"
                value={flaggedCount}
                color="#E07070"
            />
            <StatCard
                label="Unresolved"
                value={unresolvedCount}
                color="#D4A853"
            />
          </div>

          {/* Action Bar */}
          <div style={styles.actionBar}>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ width: "200px" }}>
                <ScrollableSelect
                    value={statusFilter}
                    onChange={setStatusFilter}
                    placeholder="All Statuses"
                    options={[
                      { value: "", label: "All Statuses" },
                      { value: "matched", label: "Matched" },
                      { value: "flagged_overpayment", label: "Overpayment" },
                      { value: "flagged_underpayment", label: "Underpayment" },
                      { value: "flagged_no_match", label: "No Match" },
                      { value: "flagged_incomplete_package", label: "Incomplete Package" },
                      { value: "failed", label: "Failed" },
                    ]}
                />
              </div>
              <div style={{ width: "160px" }}>
                <ScrollableSelect
                    value={resolvedFilter}
                    onChange={setResolvedFilter}
                    placeholder="All Resolution"
                    options={[
                      { value: "", label: "All Resolution" },
                      { value: "false", label: "Unresolved" },
                      { value: "true", label: "Resolved" },
                    ]}
                />
              </div>
              {/* Phone search input */}
              <input
                  type="text"
                  placeholder="Search by phone..."
                  value={phoneSearch}
                  onChange={(e) => {
                    setPhoneSearch(e.target.value);
                    setPage(1);
                  }}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "7px",
                    border: "1px solid #3A3020",
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "#C8A870",
                    background: "#242018",
                    outline: "none",
                    width: "180px",
                  }}
              />
            </div>
            <button
                onClick={() => {
                  setStatusFilter("");
                  setResolvedFilter("");
                  setPhoneSearch("");
                  setPage(1);
                }}
                style={styles.clearBtn}
            >
              Clear Filters
            </button>
          </div>

          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
              <tr>
                <th style={styles.th}>Phone Number</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>M-Pesa Ref</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Resolution</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Actions</th>
              </tr>
              </thead>
              <tbody
                  style={{
                    opacity: loading ? 0.5 : 1,
                    transition: "opacity 0.15s",
                  }}
              >
              {payments.map((p) => (
                  <tr key={p.id} style={styles.tr}>
                    <td style={styles.td}>
                    <span style={{ fontWeight: "700", color: "#E8DCC8" }}>
                      {p.phone_number}
                    </span>
                    </td>
                    <td style={styles.td}>
                      <div
                          style={{
                            fontWeight: "800",
                            color: "#B3945B",
                            fontVariantNumeric: "tabular-nums",
                          }}
                      >
                        KES {Number(p.amount).toLocaleString()}
                        {p.excess_amount > 0 && (
                            <span
                                style={{
                                  marginLeft: "8px",
                                  fontSize: "10px",
                                  background: "#1A3A2A",
                                  color: "#10B981",
                                  padding: "2px 7px",
                                  borderRadius: "4px",
                                  border: "1px solid #10B98140",
                                }}
                            >
                          +{Number(p.excess_amount).toLocaleString()}
                        </span>
                        )}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <code style={styles.code}>{p.mpesa_ref}</code>
                    </td>
                    <td style={styles.td}>
                      <StatusBadge status={p.status} />
                    </td>
                    <td style={styles.td}>
                      {p.resolved ? (
                          <span
                              style={{
                                color: "#8FB87A",
                                fontSize: "11px",
                                fontWeight: "700",
                                letterSpacing: "0.04em",
                              }}
                          >
                        RESOLVED
                      </span>
                      ) : (
                          <span
                              style={{
                                color: "#4A3C28",
                                fontSize: "11px",
                                fontWeight: "700",
                                letterSpacing: "0.04em",
                              }}
                          >
                        PENDING
                      </span>
                      )}
                    </td>
                    <td style={{ ...styles.td, textAlign: "right" }}>
                      <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            justifyContent: "flex-end",
                          }}
                      >
                        {!p.resolved && p.status !== "matched" && (
                            <button
                                style={styles.resolveBtn}
                                onClick={() => handleResolve(p.id)}
                                disabled={resolving === p.id}
                            >
                              {resolving === p.id ? "..." : "Resolve"}
                            </button>
                        )}
                        <button
                            style={styles.smsBtn}
                            onClick={() => setSmsPhone(p.phone_number)}
                        >
                          <IconSms />
                        </button>
                      </div>
                    </td>
                  </tr>
              ))}
              {!loading && payments.length === 0 && (
                  <tr>
                    <td
                        colSpan={6}
                        style={{
                          ...styles.td,
                          textAlign: "center",
                          color: "#4A3C28",
                          padding: "40px",
                        }}
                    >
                      No payments found.
                    </td>
                  </tr>
              )}
              </tbody>
            </table>

            {/* Pagination */}
            <div style={paginationContainer}>
              <div style={paginationControls}>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={paginationButton}>
                  <ChevronLeft size={16} /> Prev
                </button>
                {getPageNumbers().map((item, idx) =>
                    item === "..." ? (
                        <span key={`ellipsis-${idx}`} style={paginationEllipsis}>…</span>
                    ) : (
                        <button
                            key={item}
                            onClick={() => setPage(item)}
                            style={{
                              ...paginationButton,
                              background: page === item ? GOLD : "transparent",
                              color: page === item ? BG_DARK : GOLD,
                              borderColor: GOLD,
                            }}
                        >
                          {item}
                        </button>
                    )
                )}
                <button onClick={() => setPage((p) => Math.min(pagesState, p + 1))} disabled={page === pagesState} style={paginationButton}>
                  Next <ChevronRight size={16} />
                </button>
              </div>

              <div style={paginationSide}>
                <div style={{ width: "120px" }}>
                  <ScrollableSelect
                      value={String(limit)}
                      onChange={(val) => setLimit(Number(val))}
                      placeholder={`${limit} / page`}
                      options={[10, 15, 20, 50, 100, 250, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000].map((num) => ({ value: String(num), label: `${num} / page` }))}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "12px", color: TEXT_SECONDARY }}>Go to</span>
                  <input
                      type="number"
                      min="1"
                      max={pagesState}
                      value={gotoPage}
                      onChange={(e) => setGotoPage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleGoToPage()}
                      style={gotoInput}
                  />
                  <button onClick={handleGoToPage} style={gotoButton}>Page</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {smsPhone && (
            <SendSmsModal
                defaultPhone={smsPhone}
                onClose={() => setSmsPhone(null)}
                onSend={() => setSmsPhone(null)}
                onSuccess={(msg) => showToast(msg, "success")}
            />
        )}

        {/* Scroll to Top Button */}
        {showScrollTop && (
            <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                style={{
                  position: "fixed",
                  bottom: "30px",
                  right: "30px",
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  background: GOLD,
                  color: BG_DARK,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 1000,
                  transition: "opacity 0.2s",
                }}
                title="Scroll to top"
            >
              <ChevronUp size={24} />
            </button>
        )}
      </div>
  );
}

const styles = {
  container: {
    padding: "24px 40px",
    maxWidth: "1400px",
    margin: "0 auto",
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
    marginBottom: "20px",
  },
  statCard: {
    background: "#1A1A1A",
    padding: "20px 24px",
    borderRadius: "10px",
    border: "1px solid #2A2218",
    borderTop: "2px solid #2E2510",
  },
  actionBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    background: "#1A1A1A",
    padding: "12px 20px",
    borderRadius: "10px",
    border: "1px solid #2A2218",
  },
  select: {
    padding: "8px 12px",
    borderRadius: "7px",
    border: "1px solid #3A3020",
    fontSize: "13px",
    fontWeight: "600",
    color: "#C8A870",
    background: "#242018",
    outline: "none",
    cursor: "pointer",
  },
  clearBtn: {
    background: "none",
    border: "none",
    color: "#5A4A34",
    fontSize: "13px",
    cursor: "pointer",
    fontWeight: "600",
  },
  tableWrapper: {
    background: "#1A1A1A",
    borderRadius: "10px",
    border: "1px solid #2A2218",
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "13px 20px",
    background: "#141414",
    borderBottom: "1px solid #2A2218",
    fontSize: "10px",
    fontWeight: "700",
    color: "#7A6A50",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
  },
  tr: {
    borderBottom: "1px solid #202020",
    transition: "background 0.1s",
  },
  td: {
    padding: "15px 20px",
    fontSize: "13px",
    color: "#7A6A50",
  },
  code: {
    background: "#242018",
    padding: "3px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    color: "#8A7A5A",
    fontFamily: "monospace",
    border: "1px solid #3A3020",
  },
  resolveBtn: {
    background: "#B3945B",
    color: "#0E0C08",
    border: "none",
    padding: "6px 14px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "800",
    cursor: "pointer",
    letterSpacing: "0.02em",
  },
  smsBtn: {
    background: "#242018",
    color: "#7A6A50",
    border: "1px solid #3A3020",
    padding: "8px",
    borderRadius: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  pagination: {
    padding: "14px 20px",
    borderTop: "1px solid #202020",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#141414",
  },
  pageBtn: {
    padding: "6px 16px",
    border: "1px solid #3A3020",
    background: "#242018",
    color: "#B3945B",
    borderRadius: "7px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
};

const paginationContainer = {
  padding: "16px 20px",
  borderTop: "1px solid #2A2218",
  background: "#141414",
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
};

const paginationControls = {
  display: "flex",
  gap: "8px",
  alignItems: "center",
  flexWrap: "wrap",
};

const paginationButton = {
  padding: "6px 12px",
  border: "1px solid #B3945B",
  borderRadius: "6px",
  background: "transparent",
  color: "#B3945B",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  transition: "all 0.2s",
};

const paginationEllipsis = {
  padding: "6px 8px",
  color: "#A3A3A3",
  fontSize: "14px",
};

const paginationSide = {
  display: "flex",
  gap: "16px",
  alignItems: "center",
  flexWrap: "wrap",
};

const limitSelect = {
  padding: "6px 10px",
  borderRadius: "6px",
  border: "1px solid #B3945B",
  background: "#1A1A1A",
  color: "#FFFFFF",
  fontSize: "12px",
  cursor: "pointer",
  outline: "none",
};

const gotoInput = {
  width: "60px",
  padding: "6px 8px",
  borderRadius: "6px",
  border: "1px solid #B3945B",
  background: "#1A1A1A",
  color: "#FFFFFF",
  fontSize: "12px",
  textAlign: "center",
  outline: "none",
};

const gotoButton = {
  padding: "6px 12px",
  borderRadius: "6px",
  border: "1px solid #B3945B",
  background: "transparent",
  color: "#B3945B",
  fontSize: "12px",
  fontWeight: 600,
  cursor: "pointer",
};

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import TopBar from "@/components/TopBar";
import { exportToPDF } from "@/lib/pdfExport";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Midnight Gold color palette
const BG_DARK = "#1A1A1A";
const CARD_BG = "#262626";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "#A3A3A3";
const GOLD = "#B3945B";
const GOLD_LIGHT = "#D4AF6A";
const DANGER = "#EF4444";
const SUCCESS = "#10B981";

// Icons for StatCards (unchanged, but will use currentColor)
const IconInflow = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="m7 7 10 10M17 7v10H7" />
  </svg>
);
const IconOutflow = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M17 17 7 7M7 17V7h10" />
  </svg>
);
const IconNet = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="12" y1="2" x2="12" y2="22" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);
const IconFlag = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export default function AccountingPage() {
  const [tab, setTab] = useState("inflow"); // inflow, outflow, flagged
  const [obfuscate, setObfuscate] = useState(false);
  const [summary, setSummary] = useState({
    inflow: 0,
    outflow: 0,
    net_profit: 0,
    flagged: { unresolved_count: 0 },
  });
  const [rawListData, setRawListData] = useState([]);
  const [filteredListData, setFilteredListData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [outflowForm, setOutflowForm] = useState({
    description: "",
    category: "VPS",
    amount: "",
  });

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15); // items per page
  const [totalItems, setTotalItems] = useState(0);
  const [pages, setPages] = useState(1);
  const [gotoPage, setGotoPage] = useState("");

  // Search/filter state
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchPhone, setSearchPhone] = useState("");

  // Helper to generate page numbers (1 ... 1143 ...)
  const getPageNumbers = () => {
    const total = pages;
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

  // Fetch accounting summary and list data
  const fetchAccountingData = useCallback(
    async (newPage = page, newLimit = limit) => {
      setLoading(true);
      try {
        // Summary (always fresh)
        const sumRes = await fetch("/api/proxy/accounting/summary");
        const sumData = await sumRes.json();
        setSummary(sumData);

        // List endpoint based on tab
        let endpoint = `/api/proxy/accounting/purchases?page=${newPage}&limit=${newLimit}`;
        if (tab === "outflow")
          endpoint = `/api/proxy/outflows?page=${newPage}&limit=${newLimit}`;
        if (tab === "flagged")
          endpoint = `/api/proxy/accounting/flagged?page=${newPage}&limit=${newLimit}`;

        const listRes = await fetch(endpoint);
        const data = await listRes.json();

        let items = [];
        if (tab === "outflow") items = data.outflow || [];
        else if (tab === "flagged") items = data.payments || [];
        else items = data.purchases || [];

        setRawListData(items);
        setFilteredListData(items); // initial no filter
        setTotalItems(data.total || 0);
        setPages(data.pages || 1);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    },
    [tab, page, limit],
  );

  // Re‑fetch when tab changes
  useEffect(() => {
    fetchAccountingData();
  }, [fetchAccountingData, page, limit]);

  // Apply filters whenever raw data or filter criteria change
  useEffect(() => {
    let filtered = [...rawListData];

    if (tab !== "outflow") {
      // Filter by phone number (if present in item)
      if (searchPhone.trim()) {
        const phone = searchPhone.trim().toLowerCase();
        filtered = filtered.filter((item) =>
          item.phone_number?.toLowerCase().includes(phone),
        );
      }
    }

    // Date range filter (use created_at)
    if (dateFrom) {
      const from = new Date(dateFrom);
      filtered = filtered.filter((item) => new Date(item.created_at) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter((item) => new Date(item.created_at) <= to);
    }

    setFilteredListData(filtered);
  }, [rawListData, searchPhone, dateFrom, dateTo, tab]);

  // Reset page when tab or limit changes
  useEffect(() => {
    setPage(1);
  }, [tab, limit]);

  // Add new outflow expense
  const handleAddOutflow = async () => {
    if (!outflowForm.amount || !outflowForm.description) {
      alert("Please fill all fields");
      return;
    }
    // Prevent negative amount
    const amountNum = parseFloat(outflowForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Amount must be a positive number");
      return;
    }
    try {
      const res = await fetch("/api/proxy/outflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...outflowForm, amount: amountNum }),
      });
      if (res.ok) {
        setOutflowForm({ description: "", category: "VPS", amount: "" });
        fetchAccountingData(); // refresh list and summary
      } else {
        alert("Failed to record expense");
      }
    } catch (err) {
      alert("Error recording expense");
    }
  };

  // Go to Page Handler
  const handleGoToPage = () => {
    const pageNum = parseInt(gotoPage);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= pages) {
      setPage(pageNum);
      setGotoPage("");
    }
  };

  // Masking functions for obfuscation
  const maskPhone = (val) => {
    if (!val || !obfuscate) return val;
    const str = String(val);
    if (str.length < 4) return "*".repeat(str.length);
    const first = str.slice(0, 2);
    const last = str.slice(-2);
    return `${first}******${last}`;
  };

  const maskRef = (val) =>
    val && obfuscate ? `${val.slice(0, 3)}***${val.slice(-1)}` : val;

  // Export to PDF using the filtered (visible) data
  const handleExport = () => {
    const columns =
      tab === "outflow"
        ? ["Description", "Category", "Amount", "By", "Date"]
        : ["Phone", "Package", "Amount", "Reference", "Date"];

    const rows = filteredListData.map((item) =>
      tab === "outflow"
        ? [
            item.description,
            item.category,
            item.amount,
            item.entered_by_email,
            new Date(item.created_at).toLocaleDateString(),
          ]
        : [
            maskPhone(item.phone_number),
            item.package_name,
            item.amount || item.amount_paid,
            maskRef(item.mpesa_ref),
            new Date(item.created_at).toLocaleString(),
          ],
    );

    exportToPDF(
      `${tab.toUpperCase()} Report`,
      columns,
      rows,
      `${tab}_report`,
      obfuscate,
    );
  };

  return (
    <div
      style={{ background: BG_DARK, minHeight: "100vh", color: TEXT_PRIMARY }}
    >
      <TopBar title="Accounting & Finance" />

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px" }}>
        {/* Metric Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "20px",
            marginBottom: "32px",
          }}
        >
          <StatCard
            label="Inflow"
            value={summary.inflow}
            color={GOLD}
            icon={<IconInflow />}
          />
          <StatCard
            label="Outflow"
            value={summary.outflow}
            color={DANGER}
            icon={<IconOutflow />}
          />
          <StatCard
            label="Net Profit"
            value={summary.net_profit}
            color={SUCCESS}
            icon={<IconNet />}
          />
          <StatCard
            label="Flagged (unresolved)"
            value={summary.flagged?.unresolved_count || 0}
            color={DANGER}
            icon={<IconFlag />}
            isCount
          />
        </div>

        {/* Tab Navigation & Controls */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              background: CARD_BG,
              borderRadius: "12px",
              padding: "4px",
              border: `1px solid ${GOLD}33`,
            }}
          >
            {["inflow", "outflow", "flagged"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "8px 24px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  transition: "all 0.2s",
                  background: tab === t ? GOLD : "transparent",
                  color: tab === t ? BG_DARK : TEXT_SECONDARY,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "bold",
                  color: TEXT_SECONDARY,
                }}
              >
                Obfuscate
              </span>
              <div
                onClick={() => setObfuscate(!obfuscate)}
                style={{
                  width: "40px",
                  height: "20px",
                  borderRadius: "10px",
                  background: obfuscate ? GOLD : "#444",
                  position: "relative",
                  transition: "0.2s",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "2px",
                    left: obfuscate ? "22px" : "2px",
                    width: "16px",
                    height: "16px",
                    background: "#FFF",
                    borderRadius: "50%",
                    transition: "0.2s",
                  }}
                />
              </div>
            </label>
            <button
              onClick={handleExport}
              style={{
                background: "transparent",
                border: `1px solid ${GOLD}`,
                color: GOLD,
                padding: "6px 16px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Export PDF
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div
          style={{
            background: CARD_BG,
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "24px",
            border: `1px solid ${GOLD}33`,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "16px",
            }}
          >
            {tab !== "outflow" && (
              <input
                type="text"
                placeholder="Search by phone number..."
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                style={{
                  background: BG_DARK,
                  border: `1px solid ${GOLD}33`,
                  borderRadius: "8px",
                  padding: "8px 12px",
                  color: TEXT_PRIMARY,
                  fontSize: "13px",
                }}
              />
            )}
            <input
              type="date"
              placeholder="From date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{
                background: BG_DARK,
                border: `1px solid ${GOLD}33`,
                borderRadius: "8px",
                padding: "8px 12px",
                color: TEXT_PRIMARY,
                fontSize: "13px",
              }}
            />
            <input
              type="date"
              placeholder="To date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{
                background: BG_DARK,
                border: `1px solid ${GOLD}33`,
                borderRadius: "8px",
                padding: "8px 12px",
                color: TEXT_PRIMARY,
                fontSize: "13px",
              }}
            />
            <button
              onClick={() => {
                setSearchPhone("");
                setDateFrom("");
                setDateTo("");
              }}
              style={{
                background: `${GOLD}20`,
                border: `1px solid ${GOLD}`,
                borderRadius: "8px",
                padding: "8px 12px",
                color: GOLD,
                fontSize: "12px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div
          style={{
            background: CARD_BG,
            borderRadius: "16px",
            border: `1px solid ${GOLD}33`,
            overflow: "hidden",
          }}
        >
          {/* Outflow form – only when tab is outflow */}
          {tab === "outflow" && (
            <div
              style={{
                padding: "20px",
                borderBottom: `1px solid ${GOLD}33`,
                background: `${GOLD}10`,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr auto",
                  gap: "12px",
                  alignItems: "end",
                }}
              >
                <Input
                  label="Description"
                  value={outflowForm.description}
                  onChange={(v) =>
                    setOutflowForm({ ...outflowForm, description: v })
                  }
                />
                <Select
                  label="Category"
                  value={outflowForm.category}
                  options={["Domain", "VPS", "SMS Gateway", "Other"]}
                  onChange={(v) =>
                    setOutflowForm({ ...outflowForm, category: v })
                  }
                />
                <Input
                  label="Amount (KES)"
                  type="number"
                  value={outflowForm.amount}
                  onChange={(v) =>
                    setOutflowForm({ ...outflowForm, amount: v })
                  }
                  min="0"
                  step="1"
                />
                <button
                  onClick={handleAddOutflow}
                  style={{
                    background: GOLD,
                    color: BG_DARK,
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: "8px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    height: "42px",
                  }}
                >
                  Add Expense
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead
                style={{
                  background: `${GOLD}10`,
                  borderBottom: `1px solid ${GOLD}33`,
                }}
              >
                <tr
                  style={{
                    fontSize: "10px",
                    fontWeight: "bold",
                    color: TEXT_SECONDARY,
                    textTransform: "uppercase",
                  }}
                >
                  <th style={{ padding: "16px", textAlign: "left" }}>Entity</th>
                  <th style={{ padding: "16px", textAlign: "left" }}>
                    {tab === "outflow" ? "Category" : "Package"}
                  </th>
                  <th style={{ padding: "16px", textAlign: "left" }}>Amount</th>
                  <th style={{ padding: "16px", textAlign: "left" }}>
                    Reference
                  </th>
                  <th style={{ padding: "16px", textAlign: "right" }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredListData.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${GOLD}20` }}>
                    <td style={{ padding: "16px", fontWeight: "bold" }}>
                      {tab === "outflow"
                        ? item.description
                        : maskPhone(item.phone_number)}
                    </td>
                    <td style={{ padding: "16px" }}>
                      <span
                        style={{
                          background: `${GOLD}20`,
                          padding: "4px 8px",
                          borderRadius: "20px",
                          fontSize: "10px",
                          fontWeight: "bold",
                        }}
                      >
                        {item.package_name || item.category}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "16px",
                        fontWeight: "bold",
                        color: GOLD,
                      }}
                    >
                      KES {(item.amount || item.amount_paid).toLocaleString()}
                    </td>
                    <td
                      style={{
                        padding: "16px",
                        fontSize: "12px",
                        color: TEXT_SECONDARY,
                      }}
                    >
                      {tab === "outflow"
                        ? item.entered_by_email
                        : maskRef(item.mpesa_ref)}
                    </td>
                    <td
                      style={{
                        padding: "16px",
                        textAlign: "right",
                        fontSize: "12px",
                        color: TEXT_SECONDARY,
                      }}
                    >
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {filteredListData.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan="5"
                      style={{
                        textAlign: "center",
                        padding: "48px",
                        color: TEXT_SECONDARY,
                      }}
                    >
                      No records match the filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div style={paginationContainer}>
            <div style={paginationControls}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={paginationButton}
              >
                <ChevronLeft size={16} /> Prev
              </button>
              {getPageNumbers().map((item, idx) =>
                item === "..." ? (
                  <span key={`ellipsis-${idx}`} style={paginationEllipsis}>
                    …
                  </span>
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
                ),
              )}
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                style={paginationButton}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>

            <div style={paginationSide}>
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  style={limitSelect}
                >
                  {[10, 15, 20, 50, 100].map((num) => (
                    <option key={num} value={num}>
                      {num} / page
                    </option>
                  ))}
                </select>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span style={{ fontSize: "12px", color: TEXT_SECONDARY }}>
                  Go to
                </span>
                <input
                  type="number"
                  min="1"
                  max={pages}
                  value={gotoPage}
                  onChange={(e) => setGotoPage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleGoToPage()}
                  style={gotoInput}
                />
                <button onClick={handleGoToPage} style={gotoButton}>
                  Page
                </button>
              </div>
            </div>
          </div>

          {loading && (
            <div
              style={{
                padding: "32px",
                textAlign: "center",
                color: GOLD,
                fontWeight: "bold",
              }}
            >
              Syncing Records...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Reusable StatCard component
function StatCard({ label, value, color, icon, isCount }) {
  return (
    <div
      style={{
        background: CARD_BG,
        padding: "20px",
        borderRadius: "16px",
        border: `1px solid ${GOLD}33`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}
    >
      <div>
        <div
          style={{
            fontSize: "10px",
            fontWeight: "bold",
            color: TEXT_SECONDARY,
            marginBottom: "4px",
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: "28px", fontWeight: "bold", color }}>
          {isCount ? value : `KES ${Number(value || 0).toLocaleString()}`}
        </div>
      </div>
      <div
        style={{
          color,
          background: `${GOLD}10`,
          padding: "8px",
          borderRadius: "10px",
        }}
      >
        {icon}
      </div>
    </div>
  );
}

// Input component with validation for positive numbers
function Input({
  label,
  type = "text",
  value,
  onChange,
  min = "0",
  step = "1",
  ...props
}) {
  const handleChange = (e) => {
    let val = e.target.value;
    if (type === "number") {
      if (val === "") val = "";
      else if (parseFloat(val) < 0) val = "0";
    }
    onChange(val);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label
        style={{ fontSize: "10px", fontWeight: "bold", color: TEXT_SECONDARY }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={handleChange}
        min={min}
        step={step}
        style={{
          background: BG_DARK,
          border: `1px solid ${GOLD}33`,
          borderRadius: "8px",
          padding: "10px 12px",
          color: TEXT_PRIMARY,
          fontSize: "13px",
          outline: "none",
        }}
        {...props}
      />
    </div>
  );
}

function Select({ label, options, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label
        style={{ fontSize: "10px", fontWeight: "bold", color: TEXT_SECONDARY }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: BG_DARK,
          border: `1px solid ${GOLD}33`,
          borderRadius: "8px",
          padding: "10px 12px",
          color: TEXT_PRIMARY,
          fontSize: "13px",
        }}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

// New pagination styles (place inside component or as global const)
const paginationContainer = {
  padding: "16px 24px",
  borderTop: `1px solid ${GOLD}33`,
  background: BG_DARK,
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
  border: `1px solid ${GOLD}`,
  borderRadius: "6px",
  background: "transparent",
  color: GOLD,
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
  color: TEXT_SECONDARY,
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
  border: `1px solid ${GOLD}`,
  background: BG_DARK,
  color: TEXT_PRIMARY,
  fontSize: "12px",
  cursor: "pointer",
  outline: "none",
};

const gotoInput = {
  width: "60px",
  padding: "6px 8px",
  borderRadius: "6px",
  border: `1px solid ${GOLD}`,
  background: BG_DARK,
  color: TEXT_PRIMARY,
  fontSize: "12px",
  textAlign: "center",
  outline: "none",
};

const gotoButton = {
  padding: "6px 12px",
  borderRadius: "6px",
  border: `1px solid ${GOLD}`,
  background: "transparent",
  color: GOLD,
  fontSize: "12px",
  fontWeight: 600,
  cursor: "pointer",
};

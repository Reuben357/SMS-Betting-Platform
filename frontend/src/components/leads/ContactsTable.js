"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  FileDown,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { exportToPDF } from "@/lib/pdfExport";
import { getTierColor } from "@/lib/tierColors";

// Midnight Gold palette
const BG_DARK = "#1A1A1A";
const CARD_BG = "#262626";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "#A3A3A3";
const GOLD = "#B3945B";
const GOLD_DARK = "#8B6B3D";
const GOLD_LIGHT = "#D4AF6A";
const DANGER = "#EF4444";
const SUCCESS = "#10B981";

function obfuscatePhone(phone) {
  if (!phone) return "—";
  const str = String(phone);
  if (str.length < 4) return "*".repeat(str.length);
  const first = str.slice(0, 2);
  const last = str.slice(-2);
  return `${first}******${last}`;
}

// Custom scrollable dropdown component
function ScrollableSelect({
  value,
  onChange,
  options,
  placeholder = "All Tiers",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: "relative", minWidth: "140px" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          padding: "10px 12px",
          background: BG_DARK,
          border: `1px solid ${GOLD}33`,
          borderRadius: "8px",
          color: value ? TEXT_PRIMARY : TEXT_SECONDARY,
          fontSize: "14px",
          width: "100%",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <span>{value ? `Tier ${value}` : placeholder}</span>
        <ChevronDown size={16} style={{ color: GOLD }} />
      </button>
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: CARD_BG,
            border: `1px solid ${GOLD}33`,
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            maxHeight: "240px",
            overflowY: "auto",
            zIndex: 100,
          }}
        >
          <div
            onClick={() => handleSelect(null)}
            style={{
              padding: "8px 12px",
              cursor: "pointer",
              color: value === null ? GOLD : TEXT_SECONDARY,
              background: value === null ? `${GOLD}20` : "transparent",
              borderBottom: `1px solid ${GOLD}20`,
            }}
          >
            All Tiers
          </div>
          {options.map((t) => (
            <div
              key={t}
              onClick={() => handleSelect(t)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                color: value === t ? GOLD : TEXT_PRIMARY,
                background: value === t ? `${GOLD}20` : "transparent",
                borderBottom: `1px solid ${GOLD}20`,
              }}
            >
              Tier {t}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ContactsTable({
  refreshTrigger,
  selectedTier,
  onTierChange,
  tierOptions = [],
}) {
  const [data, setData] = useState({ contacts: [], total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [obfuscate, setObfuscate] = useState(false);
  const [gotoPage, setGotoPage] = useState("");

  const getPageNumbers = () => {
    const total = data.pages;
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

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: limit,
        search,
        tier: selectedTier || "",
      });
      const res = await fetch(`/api/proxy/contacts?${params}`);
      const json = await res.json();
      setData({
        contacts: json.contacts || [],
        total: json.total || 0,
        pages: json.pages || 1,
      });
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, selectedTier, refreshTrigger]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    setPage(1);
  }, [limit]);

  const handleExport = () => {
    const columns = ["Phone Number", "Name", "Frequency", "Revenue", "Tier"];
    const rows = data.contacts.map((c) => [
      obfuscate ? obfuscatePhone(c.phone_number) : c.phone_number,
      c.name || "—",
      c.frequency_count,
      `KES ${Number(c.total_received_amount).toLocaleString()}`,
      c.potential_tier ? `Tier ${c.potential_tier}` : "—",
    ]);
    exportToPDF("Leads_Export", columns, rows, `leads_${Date.now()}`, false);
  };

  const handleGoToPage = () => {
    const pageNum = parseInt(gotoPage);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= data.pages) {
      setPage(pageNum);
      setGotoPage("");
    }
  };

  return (
    <div style={cardStyle}>
      {/* Filter bar */}
      <div style={filterHeaderStyle}>
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ position: "relative" }}>
            <Search size={16} style={searchIconStyle} />
            <input
              placeholder="Search leads..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={searchInputStyle}
            />
          </div>

          {/* Custom scrollable tier dropdown */}
          <ScrollableSelect
            value={selectedTier}
            onChange={(val) => {
              onTierChange(val);
              setPage(1);
            }}
            options={tierOptions}
          />

          <button
            onClick={() => setObfuscate(!obfuscate)}
            style={toggleButtonStyle(obfuscate)}
          >
            {obfuscate ? <EyeOff size={14} /> : <Eye size={14} />}
            {obfuscate ? "Hidden" : "Visible"}
          </button>
        </div>
        <button onClick={handleExport} style={exportButtonStyle}>
          <FileDown size={18} /> Export PDF
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: BG_DARK, textAlign: "left" }}>
              {[
                "Contact Details",
                "Frequency",
                "Amount Received",
                "Tier Status",
                "Date Added",
              ].map((h) => (
                <th key={h} style={thStyle}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={statusTdStyle}>
                  Loading contacts...
                </td>
              </tr>
            ) : data.contacts.length === 0 ? (
              <tr>
                <td colSpan="5" style={statusTdStyle}>
                  No leads found.
                </td>
              </tr>
            ) : (
              data.contacts.map((c) => {
                const tierNum = c.potential_tier;
                const colors = tierNum
                  ? getTierColor(tierNum)
                  : { bg: BG_DARK, text: TEXT_SECONDARY, border: `${GOLD}33` };
                const displayPhone = obfuscate
                  ? obfuscatePhone(c.phone_number)
                  : c.phone_number;
                return (
                  <tr key={c.phone_number} style={trStyle}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 700, color: TEXT_PRIMARY }}>
                        {displayPhone}
                      </div>
                      <div style={{ fontSize: "12px", color: TEXT_SECONDARY }}>
                        {c.name || "—"}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, color: TEXT_SECONDARY }}>
                      {c.frequency_count} times
                    </td>
                    <td style={{ ...tdStyle, color: SUCCESS, fontWeight: 700 }}>
                      KES {Number(c.total_received_amount).toLocaleString()}
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          padding: "4px 10px",
                          background: colors.bg,
                          color: colors.text,
                          border: `1px solid ${colors.border}`,
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 800,
                        }}
                      >
                        TIER {c.potential_tier || "N/A"}
                      </span>
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        color: TEXT_SECONDARY,
                        fontSize: "12px",
                      }}
                    >
                      {new Date(c.created_at).toLocaleDateString("en-GB")}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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
                  color: page === item ? BG_DARK : TEXT_PRIMARY,
                  borderColor: page === item ? GOLD : `${GOLD}33`,
                }}
              >
                {item}
              </button>
            ),
          )}
          <button
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
            disabled={page === data.pages}
            style={paginationButton}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>

        <div style={paginationSide}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: TEXT_SECONDARY }}>
              Go to
            </span>
            <input
              type="number"
              min="1"
              max={data.pages}
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
    </div>
  );
}

// Styles
const cardStyle = {
  background: CARD_BG,
  borderRadius: "16px",
  border: `1px solid ${GOLD}33`,
  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
};
const filterHeaderStyle = {
  padding: "20px 24px",
  borderBottom: `1px solid ${GOLD}33`,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "16px",
};
const searchInputStyle = {
  padding: "10px 12px 10px 36px",
  border: `1px solid ${GOLD}33`,
  borderRadius: "8px",
  fontSize: "14px",
  width: "240px",
  color: TEXT_PRIMARY,
  background: BG_DARK,
};
const searchIconStyle = {
  position: "absolute",
  left: "12px",
  top: "50%",
  transform: "translateY(-50%)",
  color: TEXT_SECONDARY,
};
const toggleButtonStyle = (active) => ({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 12px",
  borderRadius: "8px",
  border: `1px solid ${GOLD}33`,
  background: active ? GOLD : BG_DARK,
  color: active ? BG_DARK : TEXT_SECONDARY,
  fontSize: "12px",
  fontWeight: 600,
  cursor: "pointer",
});
const exportButtonStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  color: GOLD,
  fontWeight: 700,
  fontSize: "14px",
  background: BG_DARK,
  padding: "10px 16px",
  borderRadius: "8px",
  border: `1px solid ${GOLD}`,
  cursor: "pointer",
};
const thStyle = {
  padding: "16px 24px",
  color: TEXT_SECONDARY,
  fontSize: "11px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  borderBottom: `1px solid ${GOLD}33`,
};
const tdStyle = {
  padding: "16px 24px",
  borderBottom: `1px solid ${GOLD}20`,
  fontSize: "14px",
};
const trStyle = { transition: "background 0.2s" };
const statusTdStyle = {
  padding: "60px",
  textAlign: "center",
  color: TEXT_SECONDARY,
  fontSize: "14px",
};

const paginationContainer = {
  padding: "16px 24px",
  borderTop: `1px solid ${GOLD}33`,
  background: BG_DARK,
  borderBottomLeftRadius: "16px",
  borderBottomRightRadius: "16px",
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
  border: `1px solid ${GOLD}33`,
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
};
const gotoInput = {
  width: "80px",
  padding: "6px 8px",
  borderRadius: "6px",
  border: `1px solid ${GOLD}`,
  background: BG_DARK,
  color: TEXT_PRIMARY,
  fontSize: "12px",
  textAlign: "center",
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

"use client";
import { useState, useEffect } from "react";
import {
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  User,
  Clock,
  UploadCloud,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const BG_DARK = "#1A1A1A";
const CARD_BG = "#262626";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "#A3A3A3";
const GOLD = "#B3945B";
const GOLD_DARK = "#8B6B3D";
const GOLD_LIGHT = "#D4AF6A";
const DANGER = "#EF4444";
const SUCCESS = "#10B981";

function parseErrorLog(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return typeof raw === "string" ? [raw] : [];
  }
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ label, count, type }) {
  const colors = {
    new: { bg: `${SUCCESS}20`, color: SUCCESS, border: `${SUCCESS}40` },
    updated: { bg: `${GOLD}20`, color: GOLD, border: `${GOLD}40` },
    error: { bg: `${DANGER}20`, color: DANGER, border: `${DANGER}40` },
  };
  const c = colors[type] || colors.new;
  return (
    <span
      style={{
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        borderRadius: "20px",
        fontSize: "11px",
        fontWeight: 700,
        padding: "3px 10px",
        whiteSpace: "nowrap",
      }}
    >
      {count} {label}
    </span>
  );
}

function UploadRow({ upload }) {
  const [open, setOpen] = useState(false);
  const errors = parseErrorLog(upload.error_log);
  const hasErrors = upload.error_rows > 0 && errors.length > 0;
  const successRate =
    upload.total_rows > 0
      ? Math.round(
          ((upload.new_contacts + upload.updated_contacts) /
            upload.total_rows) *
            100,
        )
      : 0;
  const barColor =
    successRate === 100 ? SUCCESS : successRate > 70 ? GOLD : DANGER;

  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${GOLD}33`,
        borderRadius: "14px",
        overflow: "hidden",
        marginBottom: "12px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "44px 1fr auto auto",
          alignItems: "center",
          gap: "16px",
          padding: "16px 20px",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "10px",
            background: hasErrors ? `${DANGER}20` : `${SUCCESS}20`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <FileText size={20} color={hasErrors ? DANGER : SUCCESS} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: TEXT_PRIMARY,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              marginBottom: "5px",
            }}
          >
            {upload.filename}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                color: TEXT_SECONDARY,
              }}
            >
              <Clock size={11} /> {formatDate(upload.created_at)}
            </span>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                color: TEXT_SECONDARY,
              }}
            >
              <User size={11} /> {upload.uploaded_by}
            </span>
            <span style={{ fontSize: "11px", color: TEXT_SECONDARY }}>
              {upload.total_rows?.toLocaleString()} rows processed
            </span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: "6px",
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <StatusBadge label="new" count={upload.new_contacts} type="new" />
          <StatusBadge
            label="updated"
            count={upload.updated_contacts}
            type="updated"
          />
          {hasErrors && (
            <StatusBadge
              label="errors"
              count={upload.error_rows}
              type="error"
            />
          )}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "6px",
            minWidth: 90,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                width: 64,
                height: 5,
                borderRadius: 99,
                background: BG_DARK,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${successRate}%`,
                  height: "100%",
                  background: barColor,
                  borderRadius: 99,
                }}
              />
            </div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: TEXT_SECONDARY,
              }}
            >
              {successRate}%
            </span>
          </div>
          {hasErrors ? (
            <button
              onClick={() => setOpen((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                fontWeight: 700,
                color: DANGER,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {open ? "Hide errors" : "View errors"}{" "}
              {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          ) : (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                color: SUCCESS,
                fontWeight: 600,
              }}
            >
              <CheckCircle size={12} /> Clean
            </span>
          )}
        </div>
      </div>
      {hasErrors && open && (
        <div
          style={{
            borderTop: `1px solid ${DANGER}40`,
            background: `${DANGER}10`,
            padding: "16px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <AlertTriangle size={15} color={DANGER} />
            <span
              style={{
                fontSize: "12px",
                fontWeight: 800,
                color: DANGER,
                textTransform: "uppercase",
              }}
            >
              {errors.length} row{errors.length !== 1 ? "s" : ""} skipped
            </span>
            <span style={{ fontSize: "11px", color: TEXT_SECONDARY }}>
              — fix these in your CSV and re-upload
            </span>
          </div>
          <div
            style={{
              maxHeight: 220,
              overflowY: "auto",
              borderRadius: "8px",
              border: `1px solid ${DANGER}40`,
              background: BG_DARK,
            }}
          >
            {errors.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "10px",
                  padding: "9px 14px",
                  borderBottom:
                    i < errors.length - 1 ? `1px solid ${DANGER}20` : "none",
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: "10px",
                    fontWeight: 800,
                    color: DANGER,
                    background: `${DANGER}20`,
                    borderRadius: "4px",
                    padding: "2px 6px",
                    marginTop: "1px",
                    fontFamily: "monospace",
                  }}
                >
                  #{i + 1}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    color: TEXT_PRIMARY,
                    lineHeight: 1.6,
                  }}
                >
                  {msg}
                </span>
              </div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginTop: "10px",
            }}
          >
            <Info size={12} color={TEXT_SECONDARY} />
            <span style={{ fontSize: "11px", color: TEXT_SECONDARY }}>
              The rest of the file was imported successfully. Only the rows
              above were skipped.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to generate page numbers (same as ContactsTable)
function getPageNumbers(current, total) {
  const delta = 2;
  let range = [];
  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
    range.push(i);
  }
  if (current - delta > 2) range.unshift("...");
  if (current + delta < total - 1) range.push("...");
  range.unshift(1);
  if (total !== 1) range.push(total);
  return [...new Set(range)];
}

export default function UploadHistory({ refreshTrigger }) {
  const [allUploads, setAllUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [gotoPage, setGotoPage] = useState("");

  // NEW: totals from backend (not computed from array)
  const [totals, setTotals] = useState({
    files: 0,
    rows: 0,
    newContacts: 0,
    errors: 0,
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    async function load() {
      try {
        const res = await fetch("/api/proxy/contacts/uploads");
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setAllUploads(Array.isArray(data.uploads) ? data.uploads : []);
          // Use totals from backend response
          setTotals({
            files: data.totalFiles || 0,
            rows: data.totalRows || 0,
            newContacts: data.totalNewContacts || 0,
            errors: data.totalErrors || 0,
          });
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [refreshTrigger]);

  // Reset page when limit changes
  useEffect(() => {
    setPage(1);
  }, [limit]);

  const totalUploads = allUploads.length;
  const totalPages = Math.ceil(totalUploads / limit);
  const start = (page - 1) * limit;
  const end = start + limit;
  const currentUploads = allUploads.slice(start, end);

  const handleGoToPage = () => {
    const pageNum = parseInt(gotoPage);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setPage(pageNum);
      setGotoPage("");
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 0",
          gap: "12px",
        }}
      >
        <RefreshCw
          size={26}
          color={GOLD}
          style={{ animation: "spin 1s linear infinite" }}
        />
        <span
          style={{ fontSize: "13px", fontWeight: 600, color: TEXT_SECONDARY }}
        >
          Loading upload history…
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          background: `${DANGER}20`,
          border: `1px solid ${DANGER}40`,
          borderRadius: "14px",
          padding: "40px",
          textAlign: "center",
        }}
      >
        <AlertTriangle size={28} color={DANGER} style={{ marginBottom: 8 }} />
        <p style={{ margin: 0, fontWeight: 700, color: DANGER }}>
          Could not load upload history
        </p>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: "12px",
            color: DANGER,
            opacity: 0.7,
          }}
        >
          {error}
        </p>
      </div>
    );
  }

  if (allUploads.length === 0) {
    return (
      <div
        style={{
          background: CARD_BG,
          border: `1px dashed ${GOLD}`,
          borderRadius: "14px",
          padding: "80px",
          textAlign: "center",
        }}
      >
        <UploadCloud
          size={40}
          color={TEXT_SECONDARY}
          style={{ marginBottom: 12 }}
        />
        <p
          style={{
            margin: 0,
            fontWeight: 700,
            fontSize: "15px",
            color: TEXT_PRIMARY,
          }}
        >
          No uploads yet
        </p>
        <p
          style={{ margin: "6px 0 0", fontSize: "13px", color: TEXT_SECONDARY }}
        >
          Import your first CSV file to get started.
        </p>
      </div>
    );
  }

  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <div>
      {/* Summary cards  */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            background: CARD_BG,
            border: `1px solid ${GOLD}33`,
            borderRadius: "12px",
            padding: "14px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: TEXT_SECONDARY,
              textTransform: "uppercase",
            }}
          >
            Files Imported
          </span>
          <span style={{ fontSize: "24px", fontWeight: 800, color: GOLD }}>
            {totals.files.toLocaleString()}
          </span>
        </div>
        <div
          style={{
            background: CARD_BG,
            border: `1px solid ${GOLD}33`,
            borderRadius: "12px",
            padding: "14px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: TEXT_SECONDARY,
              textTransform: "uppercase",
            }}
          >
            Rows Processed
          </span>
          <span
            style={{ fontSize: "24px", fontWeight: 800, color: GOLD_LIGHT }}
          >
            {totals.rows.toLocaleString()}
          </span>
        </div>
        <div
          style={{
            background: CARD_BG,
            border: `1px solid ${GOLD}33`,
            borderRadius: "12px",
            padding: "14px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: TEXT_SECONDARY,
              textTransform: "uppercase",
            }}
          >
            Rows Skipped
          </span>
          <span
            style={{
              fontSize: "24px",
              fontWeight: 800,
              color: totals.errors > 0 ? DANGER : TEXT_SECONDARY,
            }}
          >
            {totals.errors.toLocaleString()}
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "14px",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: 800,
            color: TEXT_SECONDARY,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Upload History
        </span>
        <span style={{ fontSize: "11px", color: TEXT_SECONDARY }}>
          Click View errors on any row to inspect skipped lines
        </span>
      </div>

      {currentUploads.map((upload) => (
        <UploadRow key={upload.id} upload={upload} />
      ))}

      {/* Pagination (same as ContactsTable) */}
      <div
        style={{
          padding: "20px 0",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          borderTop: `1px solid ${GOLD}33`,
          marginTop: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: "6px 12px",
              border: `1px solid ${GOLD}33`,
              borderRadius: "6px",
              background: "transparent",
              color: GOLD,
              fontSize: "13px",
              fontWeight: 600,
              cursor: page === 1 ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <ChevronLeft size={16} /> Prev
          </button>
          {pageNumbers.map((item, idx) =>
            item === "..." ? (
              <span
                key={`ellipsis-${idx}`}
                style={{
                  padding: "6px 8px",
                  color: TEXT_SECONDARY,
                  fontSize: "14px",
                }}
              >
                …
              </span>
            ) : (
              <button
                key={item}
                onClick={() => setPage(item)}
                style={{
                  padding: "6px 12px",
                  border: `1px solid ${GOLD}33`,
                  borderRadius: "6px",
                  background: page === item ? GOLD : "transparent",
                  color: page === item ? BG_DARK : TEXT_PRIMARY,
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {item}
              </button>
            ),
          )}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: "6px 12px",
              border: `1px solid ${GOLD}33`,
              borderRadius: "6px",
              background: "transparent",
              color: GOLD,
              fontSize: "13px",
              fontWeight: 600,
              cursor: page === totalPages ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
        <div
          style={{
            display: "flex",
            gap: "16px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              border: `1px solid ${GOLD}33`,
              background: BG_DARK,
              color: TEXT_PRIMARY,
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            {[10, 20, 50, 100].map((num) => (
              <option key={num} value={num}>
                {num} / page
              </option>
            ))}
          </select>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: TEXT_SECONDARY }}>
              Go to
            </span>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={gotoPage}
              onChange={(e) => setGotoPage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleGoToPage()}
              style={{
                width: "60px",
                padding: "6px 8px",
                borderRadius: "6px",
                border: `1px solid ${GOLD}33`,
                background: BG_DARK,
                color: TEXT_PRIMARY,
                fontSize: "12px",
                textAlign: "center",
              }}
            />
            <button
              onClick={handleGoToPage}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: `1px solid ${GOLD}`,
                background: "transparent",
                color: GOLD,
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

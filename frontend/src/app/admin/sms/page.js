"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import TopBar from "@/components/TopBar";
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

const AUDIENCE_TYPES = [
  { value: "potential_tier", label: "Potential Tier" },
  { value: "active_sub", label: "Active Sub-Tier" },
  { value: "phone", label: "Single Number" },
];

const MESSAGE_TYPES = [
  { value: "", label: "All Types" },
  { value: "advertising", label: "Advertising" },
  { value: "tips_delivery", label: "Tips Delivery" },
  { value: "payment_confirmation", label: "Confirmation" },
];

const STATUS_COLORS = {
  sent: { bg: "#1A2A1A", text: SUCCESS, border: `${SUCCESS}40` },
  failed: { bg: "#2A1A1A", text: DANGER, border: `${DANGER}40` },
  queued: { bg: "#222222", text: TEXT_SECONDARY, border: `${GOLD}40` },
};

function StatusBadge({ status }) {
  const style = STATUS_COLORS[status] || STATUS_COLORS.queued;
  return (
    <span
      style={{
        padding: "2px 10px",
        borderRadius: "12px",
        fontSize: "11px",
        fontWeight: "600",
        textTransform: "capitalize",
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
      }}
    >
      {status}
    </span>
  );
}

// ---- Template Editor Panel with Insert Buttons & Preview ----
function TemplatePanel() {
  const [templates, setTemplates] = useState({
    payment_confirmation: "",
    tips_delivery: "",
  });
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });
  const [previewAmount, setPreviewAmount] = useState("1000");
  const [previewTips, setPreviewTips] = useState(
    "1. Real Madrid vs Bayern – Home Win\n2. Sporting CP vs Arsenal – Over 2.5",
  );

  // Refs to textareas for cursor insertion
  const paymentTextareaRef = useRef(null);
  const tipsTextareaRef = useRef(null);

  useEffect(() => {
    fetch("/api/proxy/settings/templates")
      .then((r) => r.json())
      .then((data) =>
        setTemplates({
          payment_confirmation: data.payment_confirmation || "",
          tips_delivery: data.tips_delivery || "",
        }),
      )
      .catch(() =>
        setStatusMsg({ type: "error", text: "Failed to load templates." }),
      );
  }, []);

  // Helper: insert placeholder at cursor
  const insertPlaceholder = (textareaRef, placeholder) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = textarea.value;
    const newValue =
      currentValue.substring(0, start) +
      placeholder +
      currentValue.substring(end);

    // Update state for the correct template
    if (textarea.id === "payment_confirmation") {
      setTemplates((prev) => ({ ...prev, payment_confirmation: newValue }));
    } else if (textarea.id === "tips_delivery") {
      setTemplates((prev) => ({ ...prev, tips_delivery: newValue }));
    }

    // Move cursor after the inserted placeholder
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + placeholder.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/proxy/settings/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payment_confirmation: templates.payment_confirmation,
          tips_delivery: templates.tips_delivery,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setStatusMsg({ type: "success", text: "Templates saved successfully." });
    } catch (err) {
      setStatusMsg({ type: "error", text: err.message });
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMsg({ type: "", text: "" }), 3000);
    }
  };

  // Live preview rendering
  const renderPreview = (template, type) => {
    if (!template) return "— No template yet —";
    let preview = template;
    if (type === "payment_confirmation") {
      preview = preview.replace(
        /{amount}/g,
        parseInt(previewAmount).toLocaleString(),
      );
    } else if (type === "tips_delivery") {
      preview = preview.replace(/{tips}/g, previewTips);
    }
    return preview;
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>Automated Message Templates</h2>
        <p style={styles.cardSubtitle}>
          These messages are sent automatically after a successful payment. Use
          the buttons below to insert placeholders.
        </p>
      </div>
      <div style={{ padding: "24px" }}>
        {statusMsg.text && (
          <div
            style={
              statusMsg.type === "error" ? styles.errorMsg : styles.successMsg
            }
          >
            {statusMsg.text}
          </div>
        )}

        {/* Payment Confirmation Template */}
        <div style={{ marginBottom: "24px" }}>
          <label style={styles.label}>Payment Confirmation SMS</label>
          <textarea
            id="payment_confirmation"
            ref={paymentTextareaRef}
            rows={2}
            value={templates.payment_confirmation}
            onChange={(e) =>
              setTemplates({
                ...templates,
                payment_confirmation: e.target.value,
              })
            }
            style={styles.textarea}
            placeholder="Thank you for your payment of KES {amount}. Your tips will arrive shortly."
          />
          <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
            <button
              onClick={() => insertPlaceholder(paymentTextareaRef, "{amount}")}
              style={styles.smallBtn}
            >
              + Insert Amount
            </button>
          </div>
          <div style={styles.previewBox}>
            <div style={styles.previewLabel}>
              Preview (amount = KES {parseInt(previewAmount).toLocaleString()}):
            </div>
            <div style={styles.previewText}>
              {renderPreview(
                templates.payment_confirmation,
                "payment_confirmation",
              )}
            </div>
          </div>
        </div>

        {/* Tips Delivery Template */}
        <div style={{ marginBottom: "24px" }}>
          <label style={styles.label}>Tips Delivery SMS</label>
          <textarea
            id="tips_delivery"
            ref={tipsTextareaRef}
            rows={4}
            value={templates.tips_delivery}
            onChange={(e) =>
              setTemplates({ ...templates, tips_delivery: e.target.value })
            }
            style={styles.textarea}
            placeholder="Your tips:\n{tips}"
          />
          <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
            <button
              onClick={() => insertPlaceholder(tipsTextareaRef, "{tips}")}
              style={styles.smallBtn}
            >
              + Insert Tips
            </button>
          </div>
          <div style={styles.previewBox}>
            <div style={styles.previewLabel}>Preview (example tips):</div>
            <div style={styles.previewText}>
              {renderPreview(templates.tips_delivery, "tips_delivery")}
            </div>
          </div>
          <div
            style={{
              marginTop: "8px",
              fontSize: "11px",
              color: TEXT_SECONDARY,
            }}
          >
            <em>You can customise the tips preview below:</em>
            <textarea
              rows={2}
              value={previewTips}
              onChange={(e) => setPreviewTips(e.target.value)}
              style={{ ...styles.textarea, marginTop: "4px", fontSize: "11px" }}
            />
          </div>
        </div>

        {/* Example amount preview control */}
        <div style={{ marginBottom: "20px" }}>
          <label style={styles.label}>Preview Amount (KES)</label>
          <input
            type="number"
            value={previewAmount}
            onChange={(e) => setPreviewAmount(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={styles.primaryBtn}
          >
            {saving ? "Saving..." : "Save Templates"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Send Bulk SMS Panel ( Midnight Gold theme) ----
function SendPanel() {
  const [potentialTiers, setPotentialTiers] = useState([]);
  const [activeTiers, setActiveTiers] = useState([]);
  const [activeSubTiers, setActiveSubTiers] = useState([]);
  const [audienceType, setAudienceType] = useState("potential_tier");
  const [selectedTier, setSelectedTier] = useState("");
  const [selectedLetter, setSelectedLetter] = useState("");
  const [selectedSub, setSelectedSub] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });

  useEffect(() => {
    fetch("/api/proxy/tiers")
      .then((r) => r.json())
      .then((d) => {
        setPotentialTiers(d.potential ?? []);
        setActiveTiers(d.active ?? []);
        setActiveSubTiers(d.active_sub ?? []);
      })
      .catch(() =>
        setStatusMsg({ type: "error", text: "Could not load tiers." }),
      );
  }, []);

  async function handleSend() {
    if (!message.trim())
      return setStatusMsg({ type: "error", text: "Message is required." });

    setSending(true);
    setStatusMsg({ type: "", text: "" });

    const payload = { message: message.trim() };
    if (audienceType === "potential_tier")
      payload.tier = parseInt(selectedTier);
    if (audienceType === "active_sub") {
      payload.active_tier_letter = selectedLetter;
      payload.active_sub_number = parseInt(selectedSub);
    }
    if (audienceType === "phone") payload.phone = phone.trim();

    try {
      const res = await fetch("/api/proxy/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed.");
      setStatusMsg({
        type: "success",
        text: data.message || "Batch started successfully.",
      });
      setMessage("");
    } catch (err) {
      setStatusMsg({ type: "error", text: err.message });
    } finally {
      setSending(false);
      setTimeout(() => setStatusMsg({ type: "", text: "" }), 3000);
    }
  }

  const charCount = message.length;
  const smsUnits = Math.ceil(charCount / 160) || 1;

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h2 style={styles.cardTitle}>SMS Composer</h2>
        <p style={styles.cardSubtitle}>
          Broadcast advertising messages to your leads or customers
        </p>
      </div>
      <div style={{ padding: "24px" }}>
        {statusMsg.text && (
          <div
            style={{
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "20px",
              fontSize: "13px",
              backgroundColor:
                statusMsg.type === "error" ? `${DANGER}20` : `${SUCCESS}20`,
              color: statusMsg.type === "error" ? DANGER : SUCCESS,
              border: `1px solid ${statusMsg.type === "error" ? DANGER : SUCCESS}40`,
            }}
          >
            {statusMsg.text}
          </div>
        )}
        <div style={{ marginBottom: "20px" }}>
          <label style={styles.label}>Target Audience</label>
          <div style={styles.toggleGroup}>
            {AUDIENCE_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setAudienceType(t.value)}
                style={
                  audienceType === t.value
                    ? styles.toggleActive
                    : styles.toggleInactive
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: "20px" }}>
          {audienceType === "potential_tier" && (
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              style={styles.select}
            >
              <option value="">— Select potential tier —</option>
              {potentialTiers.map((t) => (
                <option key={t.id} value={t.tier_number}>
                  Tier {t.tier_number} ({t.min_frequency}+ appearances)
                </option>
              ))}
            </select>
          )}
          {audienceType === "active_sub" && (
            <div style={{ display: "flex", gap: "12px" }}>
              <select
                value={selectedLetter}
                onChange={(e) => setSelectedLetter(e.target.value)}
                style={{ ...styles.select, flex: 1 }}
              >
                <option value="">Letter</option>
                {activeTiers.map((t) => (
                  <option key={t.id} value={t.tier_letter}>
                    Tier {t.tier_letter}
                  </option>
                ))}
              </select>
              <select
                value={selectedSub}
                onChange={(e) => setSelectedSub(e.target.value)}
                style={{ ...styles.select, flex: 2 }}
              >
                <option value="">Sub-Tier</option>
                {activeSubTiers.map((s) => (
                  <option key={s.id} value={s.sub_number}>
                    Sub {s.sub_number} (KES {s.min_spend}+)
                  </option>
                ))}
              </select>
            </div>
          )}
          {audienceType === "phone" && (
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 254700000000"
              style={styles.input}
            />
          )}
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label style={styles.label}>Message Content</label>
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your message..."
            style={styles.textarea}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "8px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                color: TEXT_SECONDARY,
                fontWeight: "600",
              }}
            >
              {charCount} characters
            </span>
            <span
              style={{
                fontSize: "11px",
                color: charCount > 160 ? WARNING : TEXT_SECONDARY,
                fontWeight: "700",
              }}
            >
              {smsUnits} SMS Unit{smsUnits > 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "20px",
          }}
        >
          <button
            onClick={handleSend}
            disabled={sending}
            style={styles.primaryBtn}
          >
            {sending ? "Sending..." : "Dispatch SMS"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- History Panel (unchanged but theme adjusted) ----
function HistoryPanel() {
  const [messages, setMessages] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [limit, setLimit] = useState(15);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ phone: "", type: "", status: "" });
  const [expandedMsg, setExpandedMsg] = useState(null);
  const [gotoPage, setGotoPage] = useState("");

  // Helper to generate page numbers (with ellipsis)
  const getPageNumbers = () => {
    const current = page;
    const total = pages;
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

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15, ...filters });
      const res = await fetch(`/api/proxy/messages?${params}`);
      const data = await res.json();
      setMessages(data.messages ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Reset page when filters or limit change
  useEffect(() => {
    setPage(1);
  }, [filters, limit]);

  const handleGoToPage = () => {
    const pageNum = parseInt(gotoPage);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= pages) {
      setPage(pageNum);
      setGotoPage("");
    }
  };

  return (
    <div style={styles.card}>
      <div
        style={{
          ...styles.cardHeader,
          borderBottom: `1px solid ${GOLD}33`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={styles.cardTitle}>Message Logs</h2>
          <p style={styles.cardSubtitle}>
            Tracking system and manual broadcasts
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            placeholder="Search phone..."
            style={styles.filterInput}
            onChange={(e) => setFilters({ ...filters, phone: e.target.value })}
          />
          <select
            style={styles.filterSelect}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Status</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Recipient</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Message</th>
              <th style={styles.th}>Date</th>
              <th style={styles.th}>Tier / Audience</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((m) => (
              <tr key={m.id} style={styles.tr}>
                <td
                  style={{
                    ...styles.td,
                    fontWeight: "600",
                    color: TEXT_PRIMARY,
                  }}
                >
                  {m.recipient_phone}
                </td>
                <td style={styles.td}>
                  <span style={styles.typeTag}>{m.message_type}</span>
                </td>
                <td style={styles.td}>
                  <StatusBadge status={m.status} />
                </td>
                <td
                  style={{
                    ...styles.td,
                    color: GOLD,
                    maxWidth: "250px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    textDecoration: "underline dotted",
                  }}
                  onClick={() => setExpandedMsg(m.content)}
                  title="Click to read full message"
                >
                  {m.content}
                </td>
                <td
                  style={{
                    ...styles.td,
                    color: TEXT_SECONDARY,
                    fontSize: "12px",
                  }}
                >
                  {new Date(m.created_at).toLocaleDateString()}
                </td>
                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.typeTag,
                      background:
                        m.message_type === "tips_delivery"
                          ? `${GOLD}20`
                          : `${GOLD}10`,
                      color:
                        m.message_type === "tips_delivery"
                          ? GOLD
                          : TEXT_SECONDARY,
                    }}
                  >
                    {m.message_type === "advertising"
                      ? "Bulk"
                      : m.message_type === "tips_delivery"
                        ? "Tips"
                        : m.message_type === "payment_confirmation"
                          ? "Payment"
                          : "Custom"}
                  </span>
                </td>
              </tr>
            ))}
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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

      {expandedMsg && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
          onClick={() => setExpandedMsg(null)}
        >
          <div
            style={{
              background: CARD_BG,
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "520px",
              width: "90%",
              boxShadow: "0 20px 25px rgba(0,0,0,0.5)",
              border: `1px solid ${GOLD}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <span style={{ fontWeight: 700, color: TEXT_PRIMARY }}>
                Full Message
              </span>
              <button
                onClick={() => setExpandedMsg(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: TEXT_SECONDARY,
                  fontSize: "18px",
                }}
              >
                ×
              </button>
            </div>
            <p
              style={{
                fontSize: "14px",
                lineHeight: 1.7,
                color: TEXT_PRIMARY,
                whiteSpace: "pre-wrap",
                margin: 0,
              }}
            >
              {expandedMsg}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Main Page ----
export default function SMSPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: BG_DARK }}>
      <TopBar title="SMS Management" />
      <div style={{ padding: "32px", maxWidth: "1100px", margin: "0 auto" }}>
        <TemplatePanel />
        <SendPanel />
        <HistoryPanel />
      </div>
    </div>
  );
}

// ---- Midnight Gold Styles (updated) ----
const styles = {
  card: {
    background: CARD_BG,
    borderRadius: "16px",
    border: `1px solid ${GOLD}33`,
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    marginBottom: "32px",
    overflow: "hidden",
  },
  cardHeader: { padding: "20px 24px", background: CARD_BG },
  cardTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "800",
    color: TEXT_PRIMARY,
  },
  cardSubtitle: { margin: "4px 0 0", fontSize: "12px", color: TEXT_SECONDARY },
  label: {
    display: "block",
    fontSize: "11px",
    fontWeight: "700",
    color: TEXT_SECONDARY,
    marginBottom: "8px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  toggleGroup: {
    display: "flex",
    background: BG_DARK,
    padding: "4px",
    borderRadius: "10px",
    gap: "4px",
  },
  toggleActive: {
    flex: 1,
    padding: "8px",
    border: "none",
    borderRadius: "7px",
    background: GOLD,
    color: BG_DARK,
    fontSize: "12px",
    fontWeight: "700",
    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
    cursor: "pointer",
  },
  toggleInactive: {
    flex: 1,
    padding: "8px",
    border: "none",
    background: "transparent",
    color: TEXT_SECONDARY,
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: `1px solid ${GOLD}33`,
    fontSize: "14px",
    color: TEXT_PRIMARY,
    background: BG_DARK,
    outline: "none",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: `1px solid ${GOLD}33`,
    fontSize: "14px",
    color: TEXT_PRIMARY,
    background: BG_DARK,
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: `1px solid ${GOLD}33`,
    fontSize: "14px",
    fontFamily: "inherit",
    resize: "none",
    color: TEXT_PRIMARY,
    background: BG_DARK,
    boxSizing: "border-box",
  },
  primaryBtn: {
    background: GOLD,
    color: BG_DARK,
    border: "none",
    padding: "10px 24px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "opacity 0.2s",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: "12px 24px",
    background: BG_DARK,
    color: TEXT_SECONDARY,
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    borderBottom: `1px solid ${GOLD}33`,
  },
  tr: { borderBottom: `1px solid ${GOLD}20` },
  td: { padding: "16px 24px", fontSize: "13px" },
  typeTag: {
    background: `${GOLD}10`,
    color: TEXT_SECONDARY,
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "10px",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  pagination: {
    padding: "16px 24px",
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    alignItems: "center",
    borderTop: `1px solid ${GOLD}33`,
  },
  pageBtn: {
    padding: "6px 12px",
    borderRadius: "6px",
    border: `1px solid ${GOLD}33`,
    background: BG_DARK,
    fontSize: "12px",
    cursor: "pointer",
    color: GOLD,
  },
  filterInput: {
    padding: "6px 12px",
    borderRadius: "6px",
    border: `1px solid ${GOLD}33`,
    fontSize: "12px",
    background: BG_DARK,
    color: TEXT_PRIMARY,
  },
  filterSelect: {
    padding: "6px 12px",
    borderRadius: "6px",
    border: `1px solid ${GOLD}33`,
    fontSize: "12px",
    background: BG_DARK,
    color: TEXT_PRIMARY,
  },

  smallBtn: {
    background: BG_DARK,
    border: `1px solid ${GOLD}`,
    borderRadius: "6px",
    padding: "4px 10px",
    fontSize: "11px",
    fontWeight: "600",
    color: GOLD,
    cursor: "pointer",
  },
  previewBox: {
    marginTop: "12px",
    padding: "12px",
    background: BG_DARK,
    borderRadius: "8px",
    border: `1px solid ${GOLD}33`,
  },
  previewLabel: {
    fontSize: "10px",
    fontWeight: "700",
    color: TEXT_SECONDARY,
    marginBottom: "6px",
    textTransform: "uppercase",
  },
  previewText: {
    fontSize: "13px",
    color: TEXT_PRIMARY,
    whiteSpace: "pre-wrap",
    fontFamily: "monospace",
  },
  errorMsg: {
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "13px",
    backgroundColor: `${DANGER}20`,
    color: DANGER,
    border: `1px solid ${DANGER}40`,
  },
  successMsg: {
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "13px",
    backgroundColor: `${SUCCESS}20`,
    color: SUCCESS,
    border: `1px solid ${SUCCESS}40`,
  },
};
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

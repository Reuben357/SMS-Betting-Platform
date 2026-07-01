"use client";

import { useState, useEffect } from "react";
import ScrollableSelect from "@/components/ui/ScrollableSelect";

// --- Midnight Gold color palette ---
import { BG_DARK, CARD_BG, TEXT_PRIMARY, TEXT_SECONDARY, GOLD, GOLD_LIGHT, DANGER, SUCCESS, WARNING } from "@/lib/theme";

// --- SVG Icons ---
const IconClose = () => (
    <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
);

const IconUsers = () => (
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
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

export default function SendSmsModal({ onClose, onSend, defaultPhone = "", onSuccess }) {
  const [potentialTiers, setPotentialTiers] = useState([]);
  const [activeTiers, setActiveTiers] = useState([]);
  const [activeSubTiers, setActiveSubTiers] = useState([]);
  const[jpTiers, setJpTiers] = useState([]);

  const [selectedPotentialTier, setSelectedPotentialTier] = useState("");
  const [selectedActiveTier, setSelectedActiveTier] = useState("");
  const [selectedActiveSub, setSelectedActiveSub] = useState("");
  const [selectedJpTier, setSelectedJpTier] = useState("");

  const [phone, setPhone] = useState(defaultPhone || "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [type, setType] = useState(defaultPhone ? "phone" : "tier");

  const CHAR_LIMIT = 307; // same as SMS page

  useEffect(() => {
    fetch("/api/proxy/tiers")
        .then((res) => res.json())
        .then((data) => {
          setPotentialTiers(data.potential || []);
          setActiveTiers(data.active || []);
          setActiveSubTiers(data.active_sub || []);
        })
        .catch(console.error);

    fetch("/api/proxy/tiers/jp")
        .then((res) => res.json())
        .then((data) => setJpTiers(data))
        .catch(console.error);
  }, []);

  const charCount = message.length;
  const smsUnits = Math.ceil(charCount / CHAR_LIMIT) || 1;
  const isOverLimit = charCount > CHAR_LIMIT;
  const isNearLimit = charCount > CHAR_LIMIT * 0.9 && charCount <= CHAR_LIMIT;

  const handleSend = async () => {
    if (type === "tier" && !selectedPotentialTier)
      return alert("Select a potential tier.");
    if (type === "active_sub" && (!selectedActiveTier || !selectedActiveSub))
      return alert("Select both Tier and Sub-Tier.");
    if (type === "phone" && !phone) return alert("Enter a phone number.");
    if (!message) return alert("Enter a message.");
    if (isOverLimit) {
      alert(`Message exceeds the ${CHAR_LIMIT}-character limit. Please shorten it.`);
      return;
    }

    setSending(true);
    let payload = { message };
    if (type === "tier") {
      payload.tier = parseInt(selectedPotentialTier);
    } else if (type === "phone") {
      payload.phone = phone;
    } else if (type === "active_sub") {
      payload.active_tier_letter = selectedActiveTier;
      payload.active_sub_number = parseInt(selectedActiveSub);
    } else if (type === "jackpot") {
      if (selectedJpTier) {
        payload.jackpot_tier = parseInt(selectedJpTier);
      } else {
        payload.jackpot = true;
      }
    }

    try {
      const res = await fetch("/api/proxy/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        // Use onSuccess callback if provided, otherwise fallback to alert
        if (onSuccess) {
          onSuccess(data.message || "SMS process started.");
        } else {
          alert(data.message || "SMS process started.");
        }
        onClose();
      } else {
        alert(data.error || "Failed to send SMS.");
      }
    } catch (err) {
      alert("Network error occurred.");
    } finally {
      setSending(false);
    }
  };

  return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          {/* Header */}
          <div style={styles.header}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={styles.iconCircle}>
                <IconUsers />
              </div>
              <div>
                <h3 style={styles.title}>Send SMS Broadcast</h3>
                <p style={styles.subtitle}>
                  Select your target audience and compose message
                </p>
              </div>
            </div>
            <button onClick={onClose} style={styles.closeBtn}>
              <IconClose />
            </button>
          </div>

          <div style={styles.body}>
            {/* Target Audience Toggle */}
            <div style={{ marginBottom: "20px" }}>
              <label style={styles.label}>Target Audience</label>
              <div style={styles.toggleGroup}>
                <button
                    onClick={() => setType("tier")}
                    style={type === "tier" ? styles.toggleActive : styles.toggleInactive}
                >
                  Potential Tier
                </button>
                <button
                    onClick={() => setType("active_sub")}
                    style={type === "active_sub" ? styles.toggleActive : styles.toggleInactive}
                >
                  Active Sub-Tier
                </button>
                <button
                    onClick={() => setType("phone")}
                    style={type === "phone" ? styles.toggleActive : styles.toggleInactive}
                >
                  Single Number
                </button>
                <button
                    onClick={() => setType("jackpot")}
                    style={type === "jackpot" ? styles.toggleActive : styles.toggleInactive}
                >
                  Jackpot Customers
                </button>
              </div>
            </div>

            {/* Contextual Inputs */}
            <div style={{ marginBottom: "20px" }}>
              {type === "tier" && (
                  <ScrollableSelect
                      value={selectedPotentialTier}
                      onChange={setSelectedPotentialTier}
                      placeholder="-- Select Potential Tier --"
                      options={potentialTiers.map((t) => ({
                        value: String(t.tier_number),
                        label: `Tier ${t.tier_number} (${t.min_frequency}+ frequency)`,
                      }))}
                  />
              )}

              {type === "active_sub" && (
                  <div style={{ display: "flex", gap: "10px" }}>
                    <div style={{ flex: 1 }}>
                      <ScrollableSelect
                          value={selectedActiveTier}
                          onChange={setSelectedActiveTier}
                          placeholder="Letter"
                          options={activeTiers.map((t) => ({
                            value: t.tier_letter,
                            label: `Tier ${t.tier_letter}`,
                          }))}
                      />
                    </div>
                    <div style={{ flex: 2 }}>
                      <ScrollableSelect
                          value={selectedActiveSub}
                          onChange={setSelectedActiveSub}
                          placeholder="Sub-Tier"
                          options={activeSubTiers.map((s) => ({
                            value: String(s.sub_number),
                            label: `Sub ${s.sub_number} (KES ${s.min_spend}+)`,
                          }))}
                      />
                    </div>
                  </div>
              )}

              {type === "phone" && (
                  <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="2547xxxxxxxx"
                      style={styles.input}
                  />
              )}

              {type === "jackpot" && (
                  <ScrollableSelect
                      value={selectedJpTier}
                      onChange={setSelectedJpTier}
                      options={[
                        { value: "", label: "All Jackpot Customers" },
                        ...jpTiers.map((t) => ({
                          value: String(t.tier_number),
                          label: `Tier ${t.tier_number} (${t.min_jp_frequency}-${t.max_jp_frequency} JP appearances)`,
                        })),
                      ]}
                      placeholder="Select JP Tier"
                  />
              )}
            </div>

            {/* Message Area with Character Warning */}
            <div>
              <label style={styles.label}>Message Content</label>
              <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  style={styles.textarea}
                  placeholder="Enter your SMS content here..."
              />
              <div style={styles.charCountRow}>
                <span style={styles.charCountText}>{charCount} characters</span>
                <span
                    style={{
                      ...styles.charCountText,
                      fontWeight: "700",
                      color: isOverLimit ? DANGER : isNearLimit ? WARNING : TEXT_SECONDARY,
                    }}
                >
                {smsUnits} SMS Unit{smsUnits > 1 ? "s" : ""}
              </span>
              </div>
              {charCount > 0 && (
                  <div
                      style={{
                        marginTop: "8px",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        background: isOverLimit
                            ? `${DANGER}20`
                            : isNearLimit
                                ? `${WARNING}20`
                                : `${SUCCESS}10`,
                        color: isOverLimit ? DANGER : isNearLimit ? WARNING : SUCCESS,
                        border: `1px solid ${
                            isOverLimit
                                ? DANGER
                                : isNearLimit
                                    ? WARNING
                                    : SUCCESS
                        }40`,
                      }}
                  >
                    {isOverLimit ? (
                        <>
                           Exceeds limit by {charCount - CHAR_LIMIT} characters.
                        </>
                    ) : isNearLimit ? (
                        <>
                          ⚠️ Approaching limit ({charCount}/{CHAR_LIMIT})
                        </>
                    ) : (
                        <>
                           {CHAR_LIMIT - charCount} characters remaining
                        </>
                    )}
                  </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <button onClick={onClose} style={styles.cancelBtn}>
              Discard
            </button>
            <button
                onClick={handleSend}
                disabled={sending || isOverLimit}
                style={{
                  ...styles.sendBtn,
                  opacity: sending || isOverLimit ? 0.5 : 1,
                  cursor: sending || isOverLimit ? "not-allowed" : "pointer",
                }}
            >
              {sending ? "Processing..." : isOverLimit ? "Too long" : "Dispatch Message"}
            </button>
          </div>
        </div>
      </div>
  );
}

// --- Midnight Gold Theme Styles ---
const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.75)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
  },
  modal: {
    background: CARD_BG,
    borderRadius: "16px",
    width: "500px",
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)",
    border: `1px solid ${GOLD}33`,
    overflow: "hidden",
  },
  header: {
    padding: "20px 24px",
    borderBottom: `1px solid ${GOLD}33`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: BG_DARK,
  },
  iconCircle: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    background: `${GOLD}20`,
    color: GOLD,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: "16px",
    fontWeight: "800",
    color: TEXT_PRIMARY,
    margin: 0,
  },
  subtitle: {
    fontSize: "12px",
    color: TEXT_SECONDARY,
    margin: 0,
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: TEXT_SECONDARY,
    cursor: "pointer",
    padding: "4px",
  },
  body: {
    padding: "24px",
  },
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
    border: `1px solid ${GOLD}33`,
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
    background: BG_DARK,
    fontSize: "14px",
    color: TEXT_PRIMARY,
    outline: "none",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: `1px solid ${GOLD}33`,
    background: BG_DARK,
    fontSize: "14px",
    color: TEXT_PRIMARY,
    outline: "none",
  },
  textarea: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: `1px solid ${GOLD}33`,
    background: BG_DARK,
    fontSize: "14px",
    color: TEXT_PRIMARY,
    fontFamily: "inherit",
    resize: "none",
    outline: "none",
  },
  charCountRow: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "8px",
    flexWrap: "wrap",
    gap: "4px",
  },
  charCountText: {
    fontSize: "11px",
    color: TEXT_SECONDARY,
    fontWeight: "600",
  },
  footer: {
    padding: "16px 24px",
    background: BG_DARK,
    borderTop: `1px solid ${GOLD}33`,
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
  },
  cancelBtn: {
    padding: "10px 20px",
    background: "transparent",
    border: `1px solid ${GOLD}33`,
    borderRadius: "8px",
    color: TEXT_SECONDARY,
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  sendBtn: {
    padding: "10px 24px",
    background: GOLD,
    color: BG_DARK,
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.2)",
  },
};
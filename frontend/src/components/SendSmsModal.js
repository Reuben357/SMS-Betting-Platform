"use client";

import { useState, useEffect } from "react";

// --- Minimalist SVG Icons ---
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

export default function SendSmsModal({ onClose, onSend, defaultPhone = "" }) {
  const [potentialTiers, setPotentialTiers] = useState([]);
  const [activeTiers, setActiveTiers] = useState([]);
  const [activeSubTiers, setActiveSubTiers] = useState([]);

  const [selectedPotentialTier, setSelectedPotentialTier] = useState("");
  const [selectedActiveTier, setSelectedActiveTier] = useState("");
  const [selectedActiveSub, setSelectedActiveSub] = useState("");

  const [phone, setPhone] = useState(defaultPhone || "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [type, setType] = useState(defaultPhone ? "phone" : "tier");

  useEffect(() => {
    fetch("/api/proxy/tiers")
      .then((res) => res.json())
      .then((data) => {
        setPotentialTiers(data.potential || []);
        setActiveTiers(data.active || []);
        setActiveSubTiers(data.active_sub || []);
      })
      .catch(console.error);
  }, []);

  const handleSend = async () => {
    if (type === "tier" && !selectedPotentialTier)
      return alert("Select a potential tier.");
    if (type === "active_sub" && (!selectedActiveTier || !selectedActiveSub))
      return alert("Select both Tier and Sub-Tier.");
    if (type === "phone" && !phone) return alert("Enter a phone number.");
    if (!message) return alert("Enter a message.");

    setSending(true);
    let payload = { message };
    if (type === "tier") payload.tier = parseInt(selectedPotentialTier);
    else if (type === "phone") payload.phone = phone;
    else if (type === "active_sub") {
      payload.active_tier_letter = selectedActiveTier;
      payload.active_sub_number = parseInt(selectedActiveSub);
    }

    try {
      const res = await fetch("/api/proxy/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "SMS process started.");
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
                style={
                  type === "tier" ? styles.toggleActive : styles.toggleInactive
                }
              >
                Potential Tier
              </button>
              <button
                onClick={() => setType("active_sub")}
                style={
                  type === "active_sub"
                    ? styles.toggleActive
                    : styles.toggleInactive
                }
              >
                Active Sub-Tier
              </button>
              <button
                onClick={() => setType("phone")}
                style={
                  type === "phone" ? styles.toggleActive : styles.toggleInactive
                }
              >
                Single Number
              </button>
            </div>
          </div>

          {/* Contextual Inputs */}
          <div style={{ marginBottom: "20px" }}>
            {type === "tier" && (
              <select
                value={selectedPotentialTier}
                onChange={(e) => setSelectedPotentialTier(e.target.value)}
                style={styles.select}
              >
                <option value="">-- Select Potential Tier --</option>
                {potentialTiers.map((t) => (
                  <option key={t.id} value={t.tier_number}>
                    Tier {t.tier_number} ({t.min_frequency}+ frequency)
                  </option>
                ))}
              </select>
            )}

            {type === "active_sub" && (
              <div style={{ display: "flex", gap: "10px" }}>
                <select
                  value={selectedActiveTier}
                  onChange={(e) => setSelectedActiveTier(e.target.value)}
                  style={{ ...styles.select, flex: 1 }}
                >
                  <option value="">Letter</option>
                  {activeTiers.map((t) => (
                    <option key={t.tier_letter} value={t.tier_letter}>
                      Tier {t.tier_letter}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedActiveSub}
                  onChange={(e) => setSelectedActiveSub(e.target.value)}
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

            {type === "phone" && (
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="2547xxxxxxxx"
                style={styles.input}
              />
            )}
          </div>

          {/* Message Area */}
          <div style={{ position: "relative" }}>
            <label style={styles.label}>Message Content</label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={styles.textarea}
              placeholder="Enter your SMS content here..."
            />
            <div style={styles.charCount}>
              {message.length} characters | {Math.ceil(message.length / 160)}{" "}
              SMS Unit(s)
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancelBtn}>
            Discard
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            style={styles.sendBtn}
          >
            {sending ? "Processing..." : "Dispatch Message"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(15, 23, 42, 0.6)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
  },
  modal: {
    background: "#FFFFFF",
    borderRadius: "16px",
    width: "500px",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
    border: "1px solid #E2E8F0",
    overflow: "hidden",
  },
  header: {
    padding: "20px 24px",
    borderBottom: "1px solid #F1F5F9",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconCircle: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    background: "#e6f4f1",
    color: "#006270",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: "16px", fontWeight: "800", color: "#0F172A", margin: 0 },
  subtitle: { fontSize: "12px", color: "#64748B", margin: 0 },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#94A3B8",
    cursor: "pointer",
    padding: "4px",
  },
  body: { padding: "24px" },
  label: {
    display: "block",
    fontSize: "12px",
    fontWeight: "700",
    color: "#475569",
    marginBottom: "8px",
    textTransform: "uppercase",
    letterSpacing: "0.025em",
  },
  toggleGroup: {
    display: "flex",
    background: "#F1F5F9",
    padding: "4px",
    borderRadius: "10px",
    gap: "4px",
  },
  toggleActive: {
    flex: 1,
    padding: "8px",
    border: "none",
    borderRadius: "7px",
    background: "#FFFFFF",
    color: "#006270",
    fontSize: "12px",
    fontWeight: "700",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    cursor: "pointer",
  },
  toggleInactive: {
    flex: 1,
    padding: "8px",
    border: "none",
    background: "transparent",
    color: "#64748B",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #CBD5E1",
    background: "#FFF",
    fontSize: "14px",
    color: "#1E293B",
    fontWeight: "500",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #CBD5E1",
    fontSize: "14px",
    color: "#1E293B",
  },
  textarea: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #CBD5E1",
    fontSize: "14px",
    color: "#1E293B",
    fontFamily: "inherit",
    resize: "none",
  },
  charCount: {
    textAlign: "right",
    fontSize: "11px",
    color: "#94A3B8",
    marginTop: "6px",
    fontWeight: "600",
  },
  footer: {
    padding: "16px 24px",
    background: "#F8FAFC",
    borderTop: "1px solid #F1F5F9",
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
  },
  cancelBtn: {
    padding: "10px 20px",
    background: "none",
    border: "none",
    color: "#64748B",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  sendBtn: {
    padding: "10px 24px",
    background: "#006270",
    color: "#FFF",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 4px 6px -1px rgba(0, 98, 112, 0.2)",
  },
};

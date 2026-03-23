"use client";

import { useState } from "react";
import TopBar from "@/components/TopBar";

const mockTips = [
  {
    id: 1,
    game: "Man Utd vs Arsenal",
    prediction: "Over 2.5 Goals",
    date: "Sat 22 Mar, 3:00 PM",
    status: "pending",
  },
  {
    id: 2,
    game: "Barcelona vs Real Madrid",
    prediction: "BTTS",
    date: "Sat 22 Mar, 8:00 PM",
    status: "won",
  },
  {
    id: 3,
    game: "Liverpool vs Chelsea",
    prediction: "Home Win",
    date: "Sun 23 Mar, 2:00 PM",
    status: "lost",
  },
  {
    id: 4,
    game: "PSG vs Bayern",
    prediction: "Over 3.5 Goals",
    date: "Sun 23 Mar, 8:00 PM",
    status: "pending",
  },
];

const statusColor = { pending: "#f59e0b", won: "#34d399", lost: "#f87171" };
const statusBg = { pending: "#451a0322", won: "#052e1622", lost: "#450a0a22" };

const sectionStyle = {
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "8px",
  marginBottom: "20px",
};

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #475569",
  borderRadius: "4px",
  fontSize: "13px",
  background: "#0f172a",
  color: "#f1f5f9",
  boxSizing: "border-box",
};

const btnPrimary = {
  padding: "8px 20px",
  background: "#3b82f6",
  color: "#fff",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 500,
};

export default function TipsPage() {
  const [activeTab, setActiveTab] = useState("display");
  const [tips] = useState(mockTips);
  const [form, setForm] = useState({ game: "", prediction: "", date: "" });
  const [adMsg, setAdMsg] = useState("");
  const [deliveryMsg, setDeliveryMsg] = useState("");
  const [confirmMsg, setConfirmMsg] = useState("");

  const won = tips.filter((t) => t.status === "won").length;
  const settled = tips.filter((t) => t.status !== "pending").length;
  const accuracy = settled > 0 ? Math.round((won / settled) * 100) : 0;

  const tabs = [
    { id: "display", label: "Tips Display" },
    { id: "input", label: "Tips Input" },
    { id: "outcome", label: "Win/Loss Outcome" },
    { id: "advert", label: "Advertising SMS" },
    { id: "delivery", label: "Tips Delivery Message" },
    { id: "confirm", label: "Payment Confirmation" },
  ];

  return (
    <>
      <TopBar title="Tips" />
      <div style={{ padding: "24px 32px", maxWidth: "1000px" }}>
        {/* Accuracy summary */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          {[
            { label: "Total Tips", value: tips.length, color: "#3b82f6" },
            { label: "Win Rate", value: `${accuracy}%`, color: "#34d399" },
            {
              label: "Active Tips",
              value: tips.filter((t) => t.status === "pending").length,
              color: "#f59e0b",
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "8px",
                padding: "20px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "28px", fontWeight: 700, color }}>
                {value}
              </div>
              <div
                style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Tab navigation */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            marginBottom: "20px",
            borderBottom: "1px solid #334155",
            paddingBottom: "0",
            overflowX: "auto",
          }}
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: "8px 16px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "13px",
                whiteSpace: "nowrap",
                color: activeTab === t.id ? "#3b82f6" : "#64748b",
                fontWeight: activeTab === t.id ? 600 : 400,
                borderBottom:
                  activeTab === t.id
                    ? "2px solid #3b82f6"
                    : "2px solid transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Display tab */}
        {activeTab === "display" && (
          <div style={sectionStyle}>
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #334155",
              }}
            >
              <h3
                style={{ fontSize: "14px", fontWeight: 600, color: "#f1f5f9" }}
              >
                Current Tips
              </h3>
            </div>
            {tips.map((tip) => (
              <div
                key={tip.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 100px",
                  gap: "16px",
                  padding: "12px 20px",
                  alignItems: "center",
                  borderBottom: "1px solid #1e293b",
                  fontSize: "13px",
                }}
              >
                <div>
                  <div style={{ color: "#f1f5f9", fontWeight: 500 }}>
                    {tip.game}
                  </div>
                  <div
                    style={{
                      color: "#64748b",
                      fontSize: "12px",
                      marginTop: "2px",
                    }}
                  >
                    {tip.prediction}
                  </div>
                </div>
                <div style={{ color: "#64748b", fontSize: "12px" }}>
                  {tip.date}
                </div>
                <div style={{ color: "#64748b", fontSize: "12px" }}>–</div>
                <div>
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: "20px",
                      fontSize: "11px",
                      fontWeight: 600,
                      background: statusBg[tip.status],
                      color: statusColor[tip.status],
                      border: `1px solid ${statusColor[tip.status]}44`,
                      textTransform: "capitalize",
                    }}
                  >
                    {tip.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tips Input tab */}
        {activeTab === "input" && (
          <div style={{ ...sectionStyle, padding: "24px" }}>
            <h3
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#f1f5f9",
                marginBottom: "16px",
              }}
            >
              Add Today's Tips
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                marginBottom: "12px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    color: "#94a3b8",
                    marginBottom: "4px",
                  }}
                >
                  Game
                </label>
                <input
                  style={inputStyle}
                  placeholder="e.g. Man Utd vs Arsenal"
                  value={form.game}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, game: e.target.value }))
                  }
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    color: "#94a3b8",
                    marginBottom: "4px",
                  }}
                >
                  Prediction
                </label>
                <input
                  style={inputStyle}
                  placeholder="e.g. Over 2.5 Goals"
                  value={form.prediction}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, prediction: e.target.value }))
                  }
                />
              </div>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: "#94a3b8",
                  marginBottom: "4px",
                }}
              >
                Match Date & Time
              </label>
              <input
                type="datetime-local"
                style={{ ...inputStyle, width: "240px" }}
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
              />
            </div>
            <button style={btnPrimary}>Save Tip</button>
          </div>
        )}

        {/* Win/Loss tab */}
        {activeTab === "outcome" && (
          <div style={sectionStyle}>
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #334155",
              }}
            >
              <h3
                style={{ fontSize: "14px", fontWeight: 600, color: "#f1f5f9" }}
              >
                Record Outcomes
              </h3>
            </div>
            {tips
              .filter((t) => t.status === "pending")
              .map((tip) => (
                <div
                  key={tip.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 20px",
                    borderBottom: "1px solid #1e293b",
                    fontSize: "13px",
                  }}
                >
                  <div>
                    <div style={{ color: "#f1f5f9" }}>{tip.game}</div>
                    <div style={{ color: "#64748b", fontSize: "12px" }}>
                      {tip.prediction}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button style={{ ...btnPrimary, background: "#16a34a" }}>
                      Won
                    </button>
                    <button style={{ ...btnPrimary, background: "#dc2626" }}>
                      Lost
                    </button>
                  </div>
                </div>
              ))}
            {tips.filter((t) => t.status === "pending").length === 0 && (
              <div
                style={{
                  padding: "32px",
                  textAlign: "center",
                  color: "#475569",
                }}
              >
                No pending tips to record outcomes for.
              </div>
            )}
          </div>
        )}

        {/* Advertising SMS tab */}
        {activeTab === "advert" && (
          <div style={{ ...sectionStyle, padding: "24px" }}>
            <h3
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#f1f5f9",
                marginBottom: "4px",
              }}
            >
              Advertising SMS
            </h3>
            <p
              style={{
                fontSize: "12px",
                color: "#64748b",
                marginBottom: "16px",
              }}
            >
              Tips and delivery message must be saved before this can be sent.
            </p>
            <div style={{ marginBottom: "12px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: "#94a3b8",
                  marginBottom: "4px",
                }}
              >
                Target Tier
              </label>
              <select style={{ ...inputStyle, width: "200px" }}>
                <option>All contacts</option>
                <option>Tier 1</option>
                <option>Tier 2</option>
                <option>Specific number</option>
              </select>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: "#94a3b8",
                  marginBottom: "4px",
                }}
              >
                Message{" "}
                <span style={{ color: "#475569" }}>({adMsg.length} chars)</span>
              </label>
              <textarea
                rows={8}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  fontFamily: "monospace",
                }}
                value={adMsg}
                onChange={(e) => setAdMsg(e.target.value)}
                placeholder="BETWISE TIPSTERS&#10;Saturday Banker - EPL&#10;&#10;PACKAGES&#10;A: 4 Tips - KES 50&#10;B: 8 Tips - KES 100&#10;&#10;Pay: M-Pesa Buy Goods&#10;Till: 441717"
              />
            </div>
            <button style={btnPrimary}>Send to Selected Tier</button>
          </div>
        )}

        {/* Tips Delivery tab */}
        {activeTab === "delivery" && (
          <div style={{ ...sectionStyle, padding: "24px" }}>
            <h3
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#f1f5f9",
                marginBottom: "16px",
              }}
            >
              Tips Delivery Message
            </h3>
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: "#94a3b8",
                  marginBottom: "4px",
                }}
              >
                Message sent to customer after payment{" "}
                <span style={{ color: "#475569" }}>
                  ({deliveryMsg.length} chars)
                </span>
              </label>
              <textarea
                rows={6}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  fontFamily: "monospace",
                }}
                value={deliveryMsg}
                onChange={(e) => setDeliveryMsg(e.target.value)}
                placeholder="Your tips for tonight:&#10;1. Man Utd vs Arsenal - Over 2.5 Goals&#10;2. Barcelona vs Madrid - BTTS&#10;Good luck!"
              />
            </div>
            <button style={btnPrimary}>Save Delivery Message</button>
          </div>
        )}

        {/* Payment Confirmation tab */}
        {activeTab === "confirm" && (
          <div style={{ ...sectionStyle, padding: "24px" }}>
            <h3
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#f1f5f9",
                marginBottom: "4px",
              }}
            >
              Payment Confirmation Message
            </h3>
            <p
              style={{
                fontSize: "12px",
                color: "#64748b",
                marginBottom: "16px",
              }}
            >
              Optional. Sent immediately after payment is confirmed, before tips
              are delivered.
            </p>
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  color: "#94a3b8",
                  marginBottom: "4px",
                }}
              >
                Message{" "}
                <span style={{ color: "#475569" }}>
                  ({confirmMsg.length} chars)
                </span>
              </label>
              <textarea
                rows={4}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  fontFamily: "monospace",
                }}
                value={confirmMsg}
                onChange={(e) => setConfirmMsg(e.target.value)}
                placeholder="Thank you! Your payment of KES {amount} has been received. Your tips are on the way."
              />
            </div>
            <button style={btnPrimary}>Save Confirmation Message</button>
          </div>
        )}
      </div>
    </>
  );
}

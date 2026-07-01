"use client";
import { useState, useEffect } from "react";
import { Save, AlertCircle, CheckCircle, ChevronLeft, ChevronRight, AlertTriangle, XCircle} from "lucide-react";

const BG_DARK = "#1A1A1A";
const CARD_BG = "#262626";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "#A3A3A3";
const GOLD = "#B3945B";
const DANGER = "#EF4444";
const SUCCESS = "#10B981";
const WARNING = "#F59E0B";

export default function SubscriptionSettings() {
    const [price, setPrice] = useState(15);
    const [tipsTemplate, setTipsTemplate] = useState("1,2,2,1,x");
    const [enabled, setEnabled] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });

    // Character limit
    const CHAR_LIMIT = 307;
    const charCount = tipsTemplate.length;
    const isOverLimit = charCount > CHAR_LIMIT;
    const isNearLimit = charCount > CHAR_LIMIT * 0.9 && charCount <= CHAR_LIMIT;

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/proxy/settings/subscription");
            const data = await res.json();
            setPrice(data.price || 15);
            setTipsTemplate(data.tipsTemplate || "1,2,2,1,x");
            setEnabled(data.enabled !== false); // default true
        } catch (err) {
            setMessage({ type: "error", text: "Failed to load settings." });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (price <= 0) {
            setMessage({ type: "error", text: "Price must be greater than 0." });
            return;
        }
        if (isOverLimit) {
            setMessage({ type: "error", text: `Template exceeds the ${CHAR_LIMIT}-character limit. Please shorten it.` });
            return;
        }
        setSaving(true);
        try {
            const res = await fetch("/api/proxy/settings/subscription", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    price,
                    tipsTemplate,
                    enabled,
                }),
            });
            if (!res.ok) throw new Error("Save failed");
            setMessage({ type: "success", text: "Settings saved successfully." });
            setTimeout(() => setMessage({ type: "", text: "" }), 3000);
        } catch (err) {
            setMessage({ type: "error", text: err.message });
        } finally {
            setSaving(false);
        }
    };

    const toggleEnabled = () => {
        setEnabled(!enabled);
    };

    if (loading) {
        return (
            <div style={{ textAlign: "center", color: TEXT_SECONDARY, padding: "40px" }}>
                Loading settings...
            </div>
        );
    }

    return (
        <div
            style={{
                background: CARD_BG,
                borderRadius: "16px",
                border: `1px solid ${GOLD}33`,
                padding: "24px",
            }}
        >
            <h2 style={{ color: GOLD, fontSize: "18px", marginBottom: "20px" }}>
                Jackpot Subscription Settings
            </h2>

            {message.text && (
                <div
                    style={{
                        padding: "12px",
                        borderRadius: "8px",
                        marginBottom: "20px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        background: message.type === "error" ? `${DANGER}20` : `${SUCCESS}20`,
                        color: message.type === "error" ? DANGER : SUCCESS,
                        border: `1px solid ${message.type === "error" ? DANGER : SUCCESS}40`,
                    }}
                >
                    {message.type === "error" ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
                    {message.text}
                </div>
            )}

            {/* Toggle Switch */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "20px",
                    padding: "12px",
                    background: BG_DARK,
                    borderRadius: "8px",
                    border: `1px solid ${GOLD}33`,
                }}
            >
                <label
                    style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        color: TEXT_SECONDARY,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                    }}
                >
                    Subscription Active
                </label>
                <div
                    onClick={toggleEnabled}
                    style={{
                        width: "40px",
                        height: "20px",
                        borderRadius: "10px",
                        background: enabled ? GOLD : "#444",
                        position: "relative",
                        cursor: "pointer",
                        transition: "0.2s",
                    }}
                >
                    <div
                        style={{
                            position: "absolute",
                            top: "2px",
                            left: enabled ? "22px" : "2px",
                            width: "16px",
                            height: "16px",
                            background: "#FFF",
                            borderRadius: "50%",
                            transition: "0.2s",
                        }}
                    />
                </div>
                <span style={{ fontSize: "12px", color: TEXT_SECONDARY }}>
          {enabled ? "On" : "Off"}
        </span>
                <span style={{ fontSize: "11px", color: TEXT_SECONDARY, marginLeft: "auto" }}>
          {enabled
              ? "Payments matching this price will be treated as jackpot subscriptions."
              : "Jackpot subscriptions disabled – price can be used for regular packages."}
        </span>
            </div>

            <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "12px", color: TEXT_SECONDARY, marginBottom: "6px" }}>
                    Subscription Price (KES)
                </label>
                <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                    style={{
                        width: "200px",
                        padding: "10px",
                        background: BG_DARK,
                        border: `1px solid ${GOLD}33`,
                        borderRadius: "8px",
                        color: TEXT_PRIMARY,
                        fontSize: "14px",
                    }}
                />
                <p style={{ fontSize: "11px", color: TEXT_SECONDARY, marginTop: "4px" }}>
                    Customers will be charged this exact amount for jackpot tips.
                </p>
            </div>

            <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "12px", color: TEXT_SECONDARY, marginBottom: "6px" }}>
                    Jackpot Tips Template
                </label>
                <textarea
                    rows={3}
                    value={tipsTemplate}
                    onChange={(e) => setTipsTemplate(e.target.value)}
                    style={{
                        width: "100%",
                        padding: "10px",
                        background: BG_DARK,
                        border: `1px solid ${GOLD}33`,
                        borderRadius: "8px",
                        color: TEXT_PRIMARY,
                        fontSize: "14px",
                        fontFamily: "monospace",
                    }}
                />

                {/* Character count & warning */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: "8px",
                        flexWrap: "wrap",
                        gap: "4px",
                    }}
                >
          <span style={{ fontSize: "11px", color: TEXT_SECONDARY, fontWeight: "600" }}>
            {charCount} characters
          </span>
                    <span
                        style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            color: isOverLimit ? DANGER : isNearLimit ? WARNING : TEXT_SECONDARY,
                        }}
                    >
            {Math.ceil(charCount / CHAR_LIMIT) || 1} SMS Unit(s)
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
                                <XCircle size={16} />
                                <span>Exceeds limit by {charCount - CHAR_LIMIT} characters.</span>
                            </>
                        ) : isNearLimit ? (
                            <>
                                <AlertCircle size={16} />
                                <span>Approaching limit ({charCount}/{CHAR_LIMIT})</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle size={16} />
                                <span>{CHAR_LIMIT - charCount} characters remaining</span>
                            </>
                        )}
                    </div>
                )}

                <p style={{ fontSize: "11px", color: TEXT_SECONDARY, marginTop: "4px" }}>
                    This message will be sent to customers after successful subscription payment.
                </p>
            </div>

            <button
                onClick={handleSave}
                disabled={saving || isOverLimit}
                style={{
                    background: GOLD,
                    color: BG_DARK,
                    border: "none",
                    padding: "10px 24px",
                    borderRadius: "8px",
                    fontWeight: "bold",
                    cursor: saving || isOverLimit ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    opacity: saving || isOverLimit ? 0.5 : 1,
                }}
            >
                <Save size={16} /> {saving ? "Saving..." : isOverLimit ? "Too long" : "Save Settings"}
            </button>
        </div>
    );
}
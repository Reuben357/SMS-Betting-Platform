"use client";

import {useState, useEffect, useCallback, useRef} from "react";
import TopBar from "@/components/TopBar";
import {ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, XCircle, AlertCircle, ChevronUp} from "lucide-react";
import ScrollableSelect from "@/components/ui/ScrollableSelect";

// Midnight Gold color palette
import {BG_DARK, CARD_BG, TEXT_PRIMARY, TEXT_SECONDARY, GOLD, GOLD_LIGHT, DANGER, SUCCESS, WARNING} from "@/lib/theme";

const AUDIENCE_TYPES = [
    {value: "potential_tier", label: "Potential Tier"},
    {value: "active_sub", label: "Active Sub-Tier"},
    {value: "phone", label: "Single Number"},
    {value: "jackpot", label: "Jackpot Customers"},
];

const MESSAGE_TYPES = [
    {value: "", label: "All Types"},
    {value: "advertising", label: "Advertising"},
    {value: "tips_delivery", label: "Tips Delivery"},
    {value: "payment_confirmation", label: "Confirmation"},
];

const STATUS_COLORS = {
    sent: {bg: "#1A2A1A", text: SUCCESS, border: `${SUCCESS}40`},
    failed: {bg: "#2A1A1A", text: DANGER, border: `${DANGER}40`},
    queued: {bg: "#222222", text: TEXT_SECONDARY, border: `${GOLD}40`},
    processing: {bg: "#2A2A1A", text: WARNING, border: `${WARNING}40`},
};

function StatusBadge({status}) {
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

// ---- Template Editor Panel ----
function TemplatePanel() {
    const PAYMENT_LIMIT = 147;


    const [templates, setTemplates] = useState({
        payment_confirmation: "",
        tips_delivery: "",
    });
    const [saving, setSaving] = useState(false);
    const [statusMsg, setStatusMsg] = useState({type: "", text: ""});
    const [previewAmount, setPreviewAmount] = useState("1000");
    const [previewTips, setPreviewTips] = useState(
        "1. Fc Copenhagen v Napoli (o1.5) \n" +
        "2. Bodoe/Glimt v Man City (2)  \n" +
        "3. Inter Milano v Arsenal (u2.5) \n" +
        "4. Olympiacos v Leverkusen (GG)\n " +
        "5. Tottenham v Dortmund (GG) ",
    );

    const [paymentConfirmationEnabled, setPaymentConfirmationEnabled] = useState(true);

    const paymentTextareaRef = useRef(null);
    const tipsTextareaRef = useRef(null);

    const paymentCharCount = templates.payment_confirmation.length;
    const paymentIsOverLimit = paymentCharCount > PAYMENT_LIMIT;
    const paymentIsNearLimit = paymentCharCount > PAYMENT_LIMIT * 0.9 && paymentCharCount <= PAYMENT_LIMIT;
    const paymentSmsUnits = Math.ceil(paymentCharCount / PAYMENT_LIMIT) || 1;

    useEffect(() => {
        fetch("/api/proxy/settings/templates")
            .then((r) => r.json())
            .then((data) => {
                setTemplates({
                    payment_confirmation: data.payment_confirmation || "",
                    tips_delivery: data.tips_delivery || "",
                });
                // Load preview tips from DB
                if (data.preview_tips) {
                    setPreviewTips(data.preview_tips);
                }
            })
            .catch(() =>
                setStatusMsg({type: "error", text: "Failed to load templates."})
            );

        fetch("/api/proxy/settings/payment-confirmation")
            .then((r) => r.json())
            .then((data) => setPaymentConfirmationEnabled(data.enabled))
            .catch(() => {});
    }, []);

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

        if (textarea.id === "payment_confirmation") {
            setTemplates((prev) => ({...prev, payment_confirmation: newValue}));
        } else if (textarea.id === "tips_delivery") {
            setTemplates((prev) => ({...prev, tips_delivery: newValue}));
        }

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
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    payment_confirmation: templates.payment_confirmation,
                    tips_delivery: templates.tips_delivery,
                    preview_tips: previewTips,
                }),
            });
            if (!res.ok) throw new Error("Save failed");
            setStatusMsg({type: "success", text: "Templates saved successfully."});
        } catch (err) {
            setStatusMsg({type: "error", text: err.message});
        } finally {
            setSaving(false);
            setTimeout(() => setStatusMsg({type: "", text: ""}), 3000);
        }
    };

    const renderPreview = (template, type) => {
        if (!template) return "— No template yet —";
        let preview = template;
        if (type === "payment_confirmation") {
            preview = preview.replace(
                /{amount}/g,
                parseInt(previewAmount).toLocaleString()
            );
        } else if (type === "tips_delivery") {
            preview = preview.replace(/{tips}/g, previewTips);
        }
        return preview;
    };

    const togglePaymentConfirmation = async () => {
        const newVal = !paymentConfirmationEnabled;
        try {
            const res = await fetch("/api/proxy/settings/payment-confirmation", {
                method: "PUT",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({enabled: newVal}),
            });
            if (res.ok) {
                setPaymentConfirmationEnabled(newVal);
                setStatusMsg({type: "success", text: "Payment confirmation toggled."});
            } else {
                throw new Error("Failed to update");
            }
        } catch {
            setStatusMsg({type: "error", text: "Failed to update setting."});
        }
        setTimeout(() => setStatusMsg({type: "", text: ""}), 3000);
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
            <div style={{padding: "24px"}}>
                {statusMsg.text && (
                    <div
                        style={
                            statusMsg.type === "error" ? styles.errorMsg : styles.successMsg
                        }
                    >
                        {statusMsg.text}
                    </div>
                )}

                {/* Toggle */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        marginBottom: "16px",
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
                        Send Payment Confirmation
                    </label>
                    <div
                        onClick={togglePaymentConfirmation}
                        style={{
                            width: "40px",
                            height: "20px",
                            borderRadius: "10px",
                            background: paymentConfirmationEnabled ? GOLD : "#444",
                            position: "relative",
                            cursor: "pointer",
                            transition: "0.2s",
                        }}
                    >
                        <div
                            style={{
                                position: "absolute",
                                top: "2px",
                                left: paymentConfirmationEnabled ? "22px" : "2px",
                                width: "16px",
                                height: "16px",
                                background: "#FFF",
                                borderRadius: "50%",
                                transition: "0.2s",
                            }}
                        />
                    </div>
                    <span style={{fontSize: "12px", color: TEXT_SECONDARY}}>
                        {paymentConfirmationEnabled ? "On" : "Off"}
                    </span>
                </div>

                {/* Payment Confirmation Template */}
                <div style={{marginBottom: "24px"}}>
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

                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: "8px",
                        flexWrap: "wrap",
                        gap: "4px"
                    }}>
  <span style={{fontSize: "11px", color: TEXT_SECONDARY, fontWeight: "600"}}>
    {paymentCharCount} characters
  </span>
                        <span style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            color: paymentIsOverLimit ? DANGER : paymentIsNearLimit ? WARNING : TEXT_SECONDARY
                        }}>
    {paymentSmsUnits} SMS Unit{paymentSmsUnits > 1 ? "s" : ""}
  </span>
                    </div>

                    {paymentCharCount > 0 && (
                        <div style={{
                            marginTop: "8px",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "600",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            background: paymentIsOverLimit ? `${DANGER}20` : paymentIsNearLimit ? `${WARNING}20` : `${SUCCESS}10`,
                            color: paymentIsOverLimit ? DANGER : paymentIsNearLimit ? WARNING : SUCCESS,
                            border: `1px solid ${paymentIsOverLimit ? DANGER : paymentIsNearLimit ? WARNING : SUCCESS}40`
                        }}>
                            {paymentIsOverLimit ? (
                                <>
                                    <XCircle size={16}/>
                                    <span>Exceeds limit by {paymentCharCount - PAYMENT_LIMIT} characters.</span>
                                </>
                            ) : paymentIsNearLimit ? (
                                <>
                                    <AlertCircle size={16}/>
                                    <span>Approaching limit ({paymentCharCount}/{PAYMENT_LIMIT})</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={16}/>
                                    <span>{PAYMENT_LIMIT - paymentCharCount} characters remaining</span>
                                </>
                            )}
                        </div>
                    )}

                    <div style={{display: "flex", gap: "12px", marginTop: "8px"}}>
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
                                "payment_confirmation"
                            )}
                        </div>
                    </div>
                </div>

                {/* Tips Delivery Template */}
                <div style={{marginBottom: "24px"}}>
                    <label style={styles.label}>Tips Delivery SMS</label>
                    <textarea
                        id="tips_delivery"
                        ref={tipsTextareaRef}
                        rows={4}
                        value={templates.tips_delivery}
                        onChange={(e) =>
                            setTemplates({...templates, tips_delivery: e.target.value})
                        }
                        style={styles.textarea}
                        placeholder="Your tips:\n{tips}"
                    />
                    <div style={{display: "flex", gap: "12px", marginTop: "8px"}}>
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
                            style={{...styles.textarea, marginTop: "4px", fontSize: "11px"}}
                        />
                    </div>
                </div>

                {/* Preview Amount */}
                <div style={{marginBottom: "20px"}}>
                    <label style={styles.label}>Preview Amount (KES)</label>
                    <input
                        type="number"
                        value={previewAmount}
                        onChange={(e) => setPreviewAmount(e.target.value)}
                        style={styles.input}
                    />
                </div>

                <div style={{display: "flex", justifyContent: "flex-end"}}>
                    <button
                        onClick={handleSave}
                        disabled={saving || paymentIsOverLimit}
                        style={{ ...styles.primaryBtn, opacity: saving || paymentIsOverLimit ? 0.5 : 1 }}
                    >
                        {saving ? "Saving..." : paymentIsOverLimit ? "Too long" : "Save Templates"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---- Send Bulk SMS Panel with character limit ----
function SendPanel() {
    const [potentialTiers, setPotentialTiers] = useState([]);
    const [activeTiers, setActiveTiers] = useState([]);
    const [activeSubTiers, setActiveSubTiers] = useState([]);
    const [jpTiers, setJpTiers] = useState([]);
    const [audienceType, setAudienceType] = useState("potential_tier");
    const [selectedTier, setSelectedTier] = useState("");
    const [selectedLetter, setSelectedLetter] = useState("");
    const [selectedSub, setSelectedSub] = useState("");
    const [selectedJpTier, setSelectedJpTier] = useState("");
    const [phone, setPhone] = useState("");
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [statusMsg, setStatusMsg] = useState({type: "", text: ""});

    // Character limit for SMS
    const CHAR_LIMIT = 307;

    useEffect(() => {
        fetch("/api/proxy/tiers")
            .then((r) => r.json())
            .then((d) => {
                setPotentialTiers(d.potential ?? []);
                setActiveTiers(d.active ?? []);
                setActiveSubTiers(d.active_sub ?? []);
            })
            .catch(() =>
                setStatusMsg({type: "error", text: "Could not load tiers."})
            );

        fetch("/api/proxy/tiers/jp")
            .then((r) => r.json())
            .then((data) => setJpTiers(data))
            .catch(() => console.error("Failed to load JP tiers"));
    }, []);

    const charCount = message.length;
    const smsUnits = Math.ceil(charCount / CHAR_LIMIT) || 1;
    const isOverLimit = charCount > CHAR_LIMIT;
    const isNearLimit = charCount > CHAR_LIMIT * 0.9 && charCount <= CHAR_LIMIT;

    async function handleSend() {
        if (!message.trim()) {
            setStatusMsg({type: "error", text: "Message is required."});
            return;
        }
        if (isOverLimit) {
            setStatusMsg({
                type: "error",
                text: `Message exceeds the ${CHAR_LIMIT}-character limit. Please shorten it.`,
            });
            return;
        }

        setSending(true);
        setStatusMsg({type: "", text: ""});

        const payload = {message: message.trim()};
        if (audienceType === "potential_tier") {
            payload.tier = parseInt(selectedTier);
        } else if (audienceType === "active_sub") {
            payload.active_tier_letter = selectedLetter;
            payload.active_sub_number = parseInt(selectedSub);
        } else if (audienceType === "phone") {
            payload.phone = phone.trim();
        } else if (audienceType === "jackpot") {
            if (selectedJpTier) {
                payload.jackpot_tier = parseInt(selectedJpTier);
            } else {
                payload.jackpot = true;
            }
        }

        try {
            const res = await fetch("/api/proxy/sms/send", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
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
            setStatusMsg({type: "error", text: err.message});
        } finally {
            setSending(false);
            setTimeout(() => setStatusMsg({type: "", text: ""}), 3000);
        }
    }

    return (
        <div style={styles.card}>
            <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>SMS Composer</h2>
                <p style={styles.cardSubtitle}>
                    Broadcast advertising messages to your leads or customers
                </p>
            </div>
            <div style={{padding: "24px"}}>
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
                <div style={{marginBottom: "20px"}}>
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

                <div style={{marginBottom: "20px"}}>
                    {audienceType === "potential_tier" && (
                        <ScrollableSelect
                            value={selectedTier}
                            onChange={(val) => setSelectedTier(val)}
                            options={potentialTiers.map((t) => ({
                                value: t.tier_number,
                                label: `Tier ${t.tier_number} (${t.min_frequency}+ appearances)`,
                            }))}
                            placeholder="— Select potential tier —"
                        />
                    )}
                    {audienceType === "active_sub" && (
                        <div style={{display: "flex", gap: "12px"}}>
                            <ScrollableSelect
                                value={selectedLetter}
                                onChange={(val) => setSelectedLetter(val)}
                                options={activeTiers.map((t) => ({
                                    value: t.tier_letter,
                                    label: `Tier ${t.tier_letter}`,
                                }))}
                                placeholder="Letter"
                            />
                            <ScrollableSelect
                                value={selectedSub}
                                onChange={(val) => setSelectedSub(val)}
                                options={activeSubTiers.map((s) => ({
                                    value: s.sub_number,
                                    label: `Sub ${s.sub_number} (KES ${s.min_spend}+)`,
                                }))}
                                placeholder="Sub-Tier"
                            />
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
                    {audienceType === "jackpot" && (
                        <ScrollableSelect
                            value={selectedJpTier}
                            onChange={(val) => setSelectedJpTier(val)}
                            options={[
                                {value: "", label: "All Jackpot Customers"},
                                ...jpTiers.map((t) => ({
                                    value: String(t.tier_number),
                                    label: `Tier ${t.tier_number} (${t.min_jp_frequency}-${t.max_jp_frequency} JP appearances)`,
                                })),
                            ]}
                            placeholder="Select JP Tier"
                        />
                    )}
                </div>

                <div style={{marginBottom: "10px"}}>
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
                            flexWrap: "wrap",
                            gap: "4px",
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
                                    <XCircle size={16}/>
                                    <span>Exceeds limit by {charCount - CHAR_LIMIT} characters.</span>
                                </>
                            ) : isNearLimit ? (
                                <>
                                    <AlertCircle size={16}/>
                                    <span>Approaching limit ({charCount}/{CHAR_LIMIT})</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={16}/>
                                    <span>{CHAR_LIMIT - charCount} characters remaining</span>
                                </>
                            )}
                        </div>
                    )}
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
                        disabled={sending || isOverLimit}
                        style={{
                            ...styles.primaryBtn,
                            opacity: sending || isOverLimit ? 0.5 : 1,
                            cursor: sending || isOverLimit ? "not-allowed" : "pointer",
                        }}
                    >
                        {sending ? "Sending..." : isOverLimit ? "Message too long" : "Dispatch SMS"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---- History Panel with soft-delete notification ----
function HistoryPanel() {
    const [messages, setMessages] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [limit, setLimit] = useState(15);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({phone: "", type: "", status: ""});
    const [expandedMsg, setExpandedMsg] = useState(null);
    const [gotoPage, setGotoPage] = useState("");

    const [softDeleteInfo, setSoftDeleteInfo] = useState({count: 0, timestamp: null});
    const [showDeleteToast, setShowDeleteToast] = useState(false);

    useEffect(() => {
        setPage(1);
    }, [filters.phone]);

    useEffect(() => {
        fetch("/api/proxy/settings/sms-soft-delete")
            .then((r) => r.json())
            .then((data) => {
                setSoftDeleteInfo(data);
                const lastSeen = localStorage.getItem("last_sms_soft_delete_time");
                if (data.count > 0 && data.timestamp && data.timestamp !== lastSeen) {
                    setShowDeleteToast(true);
                    localStorage.setItem("last_sms_soft_delete_time", data.timestamp);
                    setTimeout(() => setShowDeleteToast(false), 5000);
                }
            })
            .catch(console.error);
    }, []);

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
            const params = new URLSearchParams({page, limit, ...filters});
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
                <div style={{display: "flex", gap: "8px"}}>
                    <input
                        placeholder="Search phone..."
                        style={styles.filterInput}
                        onChange={(e) => setFilters({...filters, phone: e.target.value})}
                    />
                    <div style={{width: "160px"}}>
                        <ScrollableSelect
                            value={filters.status}
                            onChange={(val) => setFilters({...filters, status: val})}
                            placeholder="All Status"
                            forceDirection="down"
                            options={[
                                {value: "", label: "All Status"},
                                {value: "sent", label: "Sent"},
                                {value: "processing", label: "Processing"},
                                {value: "failed", label: "Failed"},
                            ]}
                        />
                    </div>
                </div>
            </div>

            {showDeleteToast && (
                <div
                    style={{
                        background: `${WARNING}20`,
                        border: `1px solid ${WARNING}40`,
                        color: WARNING,
                        padding: "12px",
                        borderRadius: "8px",
                        marginBottom: "16px",
                        fontSize: "13px",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginTop: "12px",
                    }}
                >
                    <AlertTriangle size={16}/>
                    {softDeleteInfo.count} old message{softDeleteInfo.count > 1 ? "s" : ""} were automatically
                    soft‑deleted.
                </div>
            )}

            <div style={{overflowX: "auto"}}>
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
                                <StatusBadge status={m.status}/>
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
                                            background: `${GOLD}20`,
                                        }}
                                    >
                                        {(() => {
                                            if (m.audience_type === "phone") return "Single Number";
                                            if (m.audience_type === 'jackpot') return 'Jackpot Customers';
                                            if (m.audience_type?.startsWith("potential_tier_"))
                                                return `Potential Tier ${m.audience_type.split("_")[2]}`;
                                            if (m.audience_type?.startsWith("active_sub_"))
                                                return `Active Sub-Tier ${m.audience_type.split("_")[2]}`;
                                            if (m.audience_type?.startsWith('jackpot_tier_')) {
                                                const tier = m.audience_type.split('_')[2];
                                                return `JP Potential Tier ${tier}`;
                                            }

                                            if (m.message_type === "tips_delivery") return "Tips Delivery";
                                            if (m.message_type === "payment_confirmation") return "Payment Confirmation";
                                            if (m.message_type === "subscription_tips") return "Subscription Tips";
                                            if (m.message_type === "advertising") return "Advertising";
                                            return "—";
                                        })()}
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
                        <ChevronLeft size={16}/> Prev
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
                        )
                    )}
                    <button
                        onClick={() => setPage((p) => Math.min(pages, p + 1))}
                        disabled={page === pages}
                        style={paginationButton}
                    >
                        Next <ChevronRight size={16}/>
                    </button>
                </div>
                <div style={paginationSide}>
                    <div style={{width: "120px"}}>
                        <ScrollableSelect
                            value={String(limit)}
                            onChange={(val) => setLimit(Number(val))}
                            placeholder={`${limit} / page`}
                            forceDirection="up"
                            options={[10, 15, 20, 50, 100, 250, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000].map((num) => ({
                                value: String(num),
                                label: `${num} / page`,
                            }))}
                        />
                    </div>
                    <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
                        <span style={{fontSize: "18px", color: SUCCESS}}>Go to</span>
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
                            <span style={{fontWeight: 700, color: TEXT_PRIMARY}}>
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
                                ✕
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
    // Scroll-to-top state and handler
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 300);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <div style={{minHeight: "100vh", backgroundColor: BG_DARK}}>
            <TopBar title="SMS Management"/>
            <div style={{padding: "32px", maxWidth: "1100px", margin: "0 auto"}}>
                <TemplatePanel/>
                <SendPanel/>
                <HistoryPanel/>
            </div>
            {/* Scroll-to-top button */}
            {showScrollTop && (
                <button
                    onClick={scrollToTop}
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
                    }}
                >
                    <ChevronUp size={24} />
                </button>
            )}
        </div>
    );
}

// ---- Styles ----
const styles = {
    card: {
        background: CARD_BG,
        borderRadius: "16px",
        border: `1px solid ${GOLD}33`,
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        marginBottom: "32px",
        overflow: "hidden",
    },
    cardHeader: {padding: "20px 24px", background: CARD_BG},
    cardTitle: {
        margin: 0,
        fontSize: "16px",
        fontWeight: "800",
        color: TEXT_PRIMARY,
    },
    cardSubtitle: {margin: "4px 0 0", fontSize: "12px", color: TEXT_SECONDARY},
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
    table: {width: "100%", borderCollapse: "collapse"},
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
    tr: {borderBottom: `1px solid ${GOLD}20`},
    td: {padding: "16px 24px", fontSize: "13px"},
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
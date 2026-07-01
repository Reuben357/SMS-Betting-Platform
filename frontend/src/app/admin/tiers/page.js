"use client";
import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/TopBar";
import { useUser } from "@auth0/nextjs-auth0";
import { Save, RefreshCw, AlertTriangle, Check, X, Plus } from "lucide-react";

// Midnight Gold colors
const BG_DARK = "#1A1A1A";
const CARD_BG = "#262626";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "#A3A3A3";
const GOLD = "#B3945B";
const DANGER = "#EF4444";
const SUCCESS = "#10B981";

function ConfirmDialog({
                           message,
                           detail,
                           onConfirm,
                           onCancel,
                           danger = false,
                       }) {
    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
            }}
        >
            <div
                style={{
                    background: CARD_BG,
                    borderRadius: "16px",
                    padding: "24px",
                    maxWidth: "400px",
                    border: `1px solid ${DANGER}`,
                }}
            >
                <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
                    <AlertTriangle size={20} color={DANGER} />
                    <div>
                        <p style={{ fontWeight: "bold", color: TEXT_PRIMARY }}>{message}</p>
                        {detail && (
                            <p style={{ fontSize: "12px", color: TEXT_SECONDARY }}>
                                {detail}
                            </p>
                        )}
                    </div>
                </div>
                <div
                    style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}
                >
                    <button
                        onClick={onCancel}
                        style={{
                            background: "transparent",
                            border: `1px solid ${GOLD}`,
                            padding: "8px 16px",
                            borderRadius: "8px",
                            color: GOLD,
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            background: danger ? DANGER : GOLD,
                            border: "none",
                            padding: "8px 16px",
                            borderRadius: "8px",
                            color: BG_DARK,
                            fontWeight: "bold",
                        }}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
}

function ThresholdCard({
                           title,
                           subtitle,
                           data,
                           labels,
                           fields,
                           onUpdate,
                           isAdding,
                           setIsAdding,
                           newData,
                           setNewData,
                           onSave,
                       }) {
    return (
        <div
            style={{
                background: CARD_BG,
                borderRadius: "16px",
                border: `1px solid ${GOLD}33`,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <div
                style={{
                    padding: "20px",
                    borderBottom: `1px solid ${GOLD}33`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <div>
                    <h3
                        style={{
                            color: GOLD,
                            fontSize: "14px",
                            fontWeight: "bold",
                            margin: 0,
                        }}
                    >
                        {title}
                    </h3>
                    <p
                        style={{
                            fontSize: "14px",
                            color: TEXT_PRIMARY,
                            marginTop: "4px",
                        }}
                    >
                        {subtitle}
                    </p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    style={{
                        background: isAdding ? DANGER : GOLD,
                        border: "none",
                        borderRadius: "8px",
                        padding: "6px",
                        cursor: "pointer",
                        color: BG_DARK,
                    }}
                >
                    {isAdding ? <X size={16} /> : <Plus size={16} />}
                </button>
            </div>
            <div style={{ padding: "20px" }}>
                {isAdding && (
                    <div
                        style={{
                            background: `${GOLD}10`,
                            padding: "16px",
                            borderRadius: "12px",
                            marginBottom: "16px",
                        }}
                    >
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(3, 1fr)",
                                gap: "12px",
                            }}
                        >
                            {fields.map((f, i) => (
                                <div key={f}>
                                    <label
                                        style={{
                                            fontSize: "10px",
                                            color: TEXT_SECONDARY,
                                            fontWeight: "bold",
                                        }}
                                    >
                                        {labels[i]}
                                    </label>
                                    <input
                                        type={f === "tier_letter" ? "text" : "number"}
                                        value={newData[f] || ""}
                                        onChange={(e) =>
                                            setNewData({ ...newData, [f]: e.target.value })
                                        }
                                        style={{
                                            width: "100%",
                                            background: BG_DARK,
                                            border: `1px solid ${GOLD}33`,
                                            borderRadius: "6px",
                                            padding: "8px",
                                            color: TEXT_PRIMARY,
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={onSave}
                            style={{
                                marginTop: "12px",
                                background: GOLD,
                                border: "none",
                                padding: "8px",
                                borderRadius: "8px",
                                color: BG_DARK,
                                fontWeight: "bold",
                                width: "100%",
                            }}
                        >
                            <Check size={14} /> Confirm
                        </button>
                    </div>
                )}
                {/* SCROLLABLE LIST OF THRESHOLDS */}
                <div
                    style={{
                        maxHeight: "320px",
                        overflowY: "auto",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                        paddingRight: "24px"
                    }}
                >
                    {data.map((item) => (
                        <div
                            key={item.id}
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(3, 1fr)",
                                gap: "12px",
                                background: BG_DARK,
                                padding: "12px",
                                borderRadius: "12px",
                            }}
                        >
                            {fields.map((f, i) => (
                                <div key={f}>
                                    <label style={{ fontSize: "9px", color: TEXT_SECONDARY }}>
                                        {labels[i]}
                                    </label>
                                    <input
                                        type={f === "tier_letter" ? "text" : "number"}
                                        value={item[f]}
                                        onChange={(e) =>
                                            onUpdate(
                                                item.id,
                                                f,
                                                f === "tier_letter"
                                                    ? e.target.value
                                                    : Number(e.target.value),
                                            )
                                        }
                                        style={{
                                            width: "100%",
                                            background: CARD_BG,
                                            border: `1px solid ${GOLD}33`,
                                            borderRadius: "6px",
                                            padding: "6px",
                                            color: TEXT_PRIMARY,
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    ))}
                    {data.length === 0 && (
                        <p style={{ textAlign: "center", color: TEXT_SECONDARY }}>
                            No thresholds configured.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function TiersPage() {
    const { user } = useUser({ route: "/api/auth/me" });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [edited, setEdited] = useState({
        potential: [],
        active: [],
        active_sub: [],
    });
    const [jpTiers, setJpTiers] = useState([]); // NEW for JP Potential Tiers
    const [showAdd, setShowAdd] = useState({
        potential: false,
        active: false,
        active_sub: false,
        jp: false, // NEW
    });
    const [newTierData, setNewTierData] = useState({
        potential: { tier_number: "", min_frequency: "", max_frequency: "" },
        active: { tier_letter: "", min_purchases: "", max_purchases: "" },
        active_sub: { sub_number: "", min_spend: "", max_spend: "" },
        jp: { tier_number: "", min_jp_frequency: "", max_jp_frequency: "" }, // NEW
    });
    const [confirm, setConfirm] = useState(null);

    useEffect(() => {
        if (success) setTimeout(() => setSuccess(null), 4000);
        if (error) setTimeout(() => setError(null), 6000);
    }, [success, error]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch all tier configurations
            const res = await fetch("/api/proxy/tiers");
            if (!res.ok) throw new Error("Failed to load tier configuration.");
            const tierData = await res.json();

            setEdited({
                potential: tierData.potential.map((t) => ({ ...t })),
                active: tierData.active.map((t) => ({ ...t })),
                active_sub: tierData.active_sub.map((t) => ({ ...t })),
            });

            // Fetch JP tiers (they are separate)
            const jpRes = await fetch("/api/proxy/tiers/jp");
            if (!jpRes.ok) throw new Error("Failed to load JP tier configuration.");
            const jpData = await jpRes.json();
            setJpTiers(jpData.map((t) => ({ ...t })));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading)
        return (
            <div
                style={{
                    background: BG_DARK,
                    minHeight: "100vh",
                    padding: "40px",
                    textAlign: "center",
                    color: GOLD,
                }}
            >
                Loading tier configuration...
            </div>
        );

    // --- Validation for standard tiers (unchanged) ---
    const validateThresholdUpdate = (section, items) => {
        for (const item of items) {
            if (section === "potential") {
                if (Number(item.min_frequency) >= Number(item.max_frequency))
                    return `Tier ${item.tier_number}: min must be less than max.`;
            }
            if (section === "active") {
                if (Number(item.min_purchases) >= Number(item.max_purchases))
                    return `Tier ${item.tier_letter}: min must be less than max.`;
            }
            if (section === "active_sub") {
                if (Number(item.min_spend) >= Number(item.max_spend))
                    return `Sub-tier ${item.sub_number}: min must be less than max.`;
            }
        }
        return null;
    };

    // --- Save all tiers (including JP) ---
    const handleSaveAll = () => {
        // Validate standard tiers
        const potentialErr = validateThresholdUpdate("potential", edited.potential);
        const activeErr = validateThresholdUpdate("active", edited.active);
        const subErr = validateThresholdUpdate("active_sub", edited.active_sub);
        if (potentialErr || activeErr || subErr) {
            setError(potentialErr || activeErr || subErr);
            return;
        }

        // Validate JP tiers
        for (const tier of jpTiers) {
            if (Number(tier.min_jp_frequency) >= Number(tier.max_jp_frequency)) {
                setError(`JP Tier ${tier.tier_number}: min must be less than max.`);
                return;
            }
        }

        setConfirm({
            message: "Apply all threshold changes?",
            detail:
                "This will recalculate all customer tiers. This may take a moment.",
            danger: false,
            onConfirm: async () => {
                setConfirm(null);
                setSaving(true);
                try {
                    // 1. Save standard tiers
                    const res = await fetch("/api/proxy/tiers", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(edited),
                    });
                    const json = await res.json();
                    if (!res.ok) throw new Error(json.error || "Failed to save changes.");

                    // 2. Save JP tiers
                    const jpRes = await fetch("/api/proxy/tiers/jp", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ tiers: jpTiers }),
                    });
                    const jpJson = await jpRes.json();
                    if (!jpRes.ok) throw new Error(jpJson.error || "Failed to save JP tiers.");

                    setSuccess("All tier thresholds updated. Tiers recalculated.");
                    fetchData(); // refresh everything
                } catch (err) {
                    setError(err.message);
                } finally {
                    setSaving(false);
                }
            },
        });
    };

    // --- Update handlers for each section ---
    const handleUpdateField = (section, id, field, value) => {
        if (section === "jp") {
            setJpTiers((prev) =>
                prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
            );
        } else {
            setEdited((prev) => ({
                ...prev,
                [section]: prev[section].map((t) =>
                    t.id === id ? { ...t, [field]: value } : t
                ),
            }));
        }
    };

    // --- Add new tier for standard sections ---
    const handleAddNewTier = async (section, endpoint) => {
        const data = newTierData[section];
        if (section === "potential") {
            // ... validation same as before
            if (!data.tier_number || !data.min_frequency || !data.max_frequency) {
                setError("All fields required.");
                return;
            }
            if (Number(data.min_frequency) >= Number(data.max_frequency)) {
                setError("Min frequency must be less than max frequency.");
                return;
            }
            if (
                edited.potential.some((t) => t.tier_number === Number(data.tier_number))
            ) {
                setError(`Tier ${data.tier_number} already exists.`);
                return;
            }
        } else if (section === "active") {
            if (!data.tier_letter || !data.min_purchases || !data.max_purchases) {
                setError("All fields required.");
                return;
            }
            if (data.tier_letter.length !== 1 || !/[A-Za-z]/.test(data.tier_letter)) {
                setError("Tier letter must be a single letter (A-Z).");
                return;
            }
            if (Number(data.min_purchases) >= Number(data.max_purchases)) {
                setError("Min purchases must be less than max purchases.");
                return;
            }
            if (
                edited.active.some(
                    (t) => t.tier_letter.toUpperCase() === data.tier_letter.toUpperCase()
                )
            ) {
                setError(
                    `Tier letter "${data.tier_letter.toUpperCase()}" already exists.`
                );
                return;
            }
        } else if (section === "active_sub") {
            if (!data.sub_number || !data.min_spend || !data.max_spend) {
                setError("All fields required.");
                return;
            }
            if (Number(data.min_spend) >= Number(data.max_spend)) {
                setError("Min spend must be less than max spend.");
                return;
            }
            if (
                edited.active_sub.some((t) => t.sub_number === Number(data.sub_number))
            ) {
                setError(`Sub-tier ${data.sub_number} already exists.`);
                return;
            }
        }

        try {
            const res = await fetch(`/api/proxy/tiers/${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to create.");
            setSuccess(`${section} tier added.`);
            setShowAdd({ ...showAdd, [section]: false });
            setNewTierData({
                ...newTierData,
                [section]:
                    section === "potential"
                        ? { tier_number: "", min_frequency: "", max_frequency: "" }
                        : section === "active"
                            ? { tier_letter: "", min_purchases: "", max_purchases: "" }
                            : { sub_number: "", min_spend: "", max_spend: "" },
            });
            fetchData();
        } catch (err) {
            setError(err.message);
        }
    };

    // --- Add new JP tier ---
    const handleAddNewJpTier = async () => {
        const data = newTierData.jp;
        if (!data.tier_number || !data.min_jp_frequency || !data.max_jp_frequency) {
            setError("All fields required.");
            return;
        }
        if (Number(data.min_jp_frequency) >= Number(data.max_jp_frequency)) {
            setError("Min frequency must be less than max frequency.");
            return;
        }
        if (jpTiers.some((t) => t.tier_number === Number(data.tier_number))) {
            setError(`JP Tier ${data.tier_number} already exists.`);
            return;
        }

        try {
            const res = await fetch("/api/proxy/tiers/jp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to create.");
            setSuccess("JP tier added.");
            setShowAdd({ ...showAdd, jp: false });
            setNewTierData({
                ...newTierData,
                jp: { tier_number: "", min_jp_frequency: "", max_jp_frequency: "" },
            });
            fetchData();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div style={{ background: BG_DARK, minHeight: "100vh" }}>
            {confirm && (
                <ConfirmDialog {...confirm} onCancel={() => setConfirm(null)} />
            )}
            <TopBar title="Tier Thresholds" />
            <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px" }}>
                {error && (
                    <div
                        style={{
                            background: `${DANGER}20`,
                            borderLeft: `4px solid ${DANGER}`,
                            padding: "12px",
                            marginBottom: "20px",
                            color: DANGER,
                        }}
                    >
                        {error}
                    </div>
                )}
                {success && (
                    <div
                        style={{
                            background: `${SUCCESS}20`,
                            borderLeft: `4px solid ${SUCCESS}`,
                            padding: "12px",
                            marginBottom: "20px",
                            color: SUCCESS,
                        }}
                    >
                        {success}
                    </div>
                )}

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                        gap: "24px",
                    }}
                >
                    {/* Potential Tiers (CSV frequency) */}
                    <ThresholdCard
                        title="Potential Tiers"
                        subtitle="Based on CSV frequency count"
                        data={edited.potential}
                        labels={["Tier #", "Min Freq", "Max Freq"]}
                        fields={["tier_number", "min_frequency", "max_frequency"]}
                        onUpdate={(id, f, v) => handleUpdateField("potential", id, f, v)}
                        isAdding={showAdd.potential}
                        setIsAdding={(v) => setShowAdd({ ...showAdd, potential: v })}
                        newData={newTierData.potential}
                        setNewData={(d) => setNewTierData({ ...newTierData, potential: d })}
                        onSave={() => handleAddNewTier("potential", "potential")}
                    />

                    {/* Letter Tiers (active customers) */}
                    <ThresholdCard
                        title="Letter Tiers"
                        subtitle="Based on active customer frequency count"
                        data={edited.active}
                        labels={["Letter", "Min Count", "Max Count"]}
                        fields={["tier_letter", "min_purchases", "max_purchases"]}
                        onUpdate={(id, f, v) => handleUpdateField("active", id, f, v)}
                        isAdding={showAdd.active}
                        setIsAdding={(v) => setShowAdd({ ...showAdd, active: v })}
                        newData={newTierData.active}
                        setNewData={(d) => setNewTierData({ ...newTierData, active: d })}
                        onSave={() => handleAddNewTier("active", "active")}
                    />

                    {/* Sub-Tiers (spend ranges) */}
                    <ThresholdCard
                        title="Sub-Tiers"
                        subtitle="Based on active customer spend range"
                        data={edited.active_sub}
                        labels={["Sub #", "Min Spend", "Max Spend"]}
                        fields={["sub_number", "min_spend", "max_spend"]}
                        onUpdate={(id, f, v) => handleUpdateField("active_sub", id, f, v)}
                        isAdding={showAdd.active_sub}
                        setIsAdding={(v) => setShowAdd({ ...showAdd, active_sub: v })}
                        newData={newTierData.active_sub}
                        setNewData={(d) =>
                            setNewTierData({ ...newTierData, active_sub: d })
                        }
                        onSave={() => handleAddNewTier("active_sub", "active-sub")}
                    />

                    {/* NEW: JP Potential Tiers */}
                    <ThresholdCard
                        title="JP Potential Tiers"
                        subtitle="Based on JP BET ID appearances"
                        data={jpTiers}
                        labels={["Tier #", "Min JP Freq", "Max JP Freq"]}
                        fields={["tier_number", "min_jp_frequency", "max_jp_frequency"]}
                        onUpdate={(id, f, v) => handleUpdateField("jp", id, f, v)}
                        isAdding={showAdd.jp}
                        setIsAdding={(v) => setShowAdd({ ...showAdd, jp: v })}
                        newData={newTierData.jp}
                        setNewData={(d) => setNewTierData({ ...newTierData, jp: d })}
                        onSave={handleAddNewJpTier}
                    />
                </div>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        marginTop: "32px",
                    }}
                >
                    <button
                        onClick={handleSaveAll}
                        disabled={saving}
                        style={{
                            background: GOLD,
                            color: BG_DARK,
                            border: "none",
                            padding: "12px 32px",
                            borderRadius: "12px",
                            fontWeight: "bold",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                        }}
                    >
                        {saving ? (
                            <RefreshCw size={16} className="animate-spin" />
                        ) : (
                            <Save size={16} />
                        )}
                        Apply Threshold Updates
                    </button>
                </div>
            </div>
        </div>
    );
}
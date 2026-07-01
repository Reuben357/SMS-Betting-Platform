"use client";
import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/TopBar";
import ContactsTable from "@/components/leads/ContactsTable";
import { Users } from "lucide-react";

const BG_DARK = "#1A1A1A";
const CARD_BG = "#262626";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "#A3A3A3";
const GOLD = "#B3945B";

export default function JackpotCustomersPage() {
    const [refresh, setRefresh] = useState(0);
    const [totalJackpot, setTotalJackpot] = useState(null);
    const [jpTierOptions, setJpTierOptions] = useState([]);
    const [selectedJpTier, setSelectedJpTier] = useState(null);

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch("/api/proxy/contacts/jackpot?limit=1&page=1");
            if (res.ok) {
                const data = await res.json();
                setTotalJackpot(data.total || 0);
            } else {
                setTotalJackpot(0);
            }
        } catch (err) {
            console.error("Failed to fetch jackpot stats:", err);
            setTotalJackpot(0);
        }
    }, []);

    const fetchJpTiers = useCallback(async () => {
        try {
            const res = await fetch("/api/proxy/tiers/jp");
            if (res.ok) {
                const data = await res.json();
                setJpTierOptions(data);
            }
        } catch (err) {
            console.error("Failed to fetch JP tiers:", err);
        }
    }, []);

    useEffect(() => {
        fetchStats();
        fetchJpTiers();
    }, [fetchStats, fetchJpTiers]);

    const statCards = [
        {
            label: "Jackpot Customers",
            sublabel: "With JP BET ID in any upload",
            value: totalJackpot,
            icon: <Users size={22} color={GOLD} />,
            color: GOLD,
        },
    ];

    return (
        <>
            <TopBar title="Jackpot Customers" />
            <div style={{ padding: "32px", background: BG_DARK, minHeight: "100vh" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "32px" }}>
                    {statCards.map((card, i) => (
                        <div key={i} style={{ background: CARD_BG, padding: "20px 24px", borderRadius: "14px", border: `1px solid ${GOLD}33`, display: "flex", flexDirection: "column", gap: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div>
                                    <span style={{ fontSize: "12px", fontWeight: 700, color: TEXT_SECONDARY, textTransform: "uppercase" }}>{card.label}</span>
                                    <p style={{ fontSize: "11px", color: TEXT_SECONDARY, margin: "4px 0 0" }}>{card.sublabel}</p>
                                </div>
                                <div style={{ background: BG_DARK, borderRadius: "10px", padding: "8px", border: `1px solid ${GOLD}33` }}>
                                    {card.icon}
                                </div>
                            </div>
                            <span style={{ fontSize: "30px", fontWeight: 800, color: card.color }}>
                {card.value === null ? "…" : card.value.toLocaleString()}
              </span>
                        </div>
                    ))}
                </div>

                <ContactsTable
                    refreshTrigger={refresh}
                    selectedTier={null}
                    onTierChange={() => {}}
                    tierOptions={[]}
                    isUntiered={false}
                    endpoint="/api/proxy/contacts/jackpot"
                    showTierFilters={false}
                    jackpotMode={true}
                    jpTierOptions={jpTierOptions}
                    selectedJpTier={selectedJpTier}
                    onJpTierChange={setSelectedJpTier}
                />
            </div>
        </>
    );
}
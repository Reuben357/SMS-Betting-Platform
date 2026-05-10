"use client";
import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/TopBar";
import ContactsTable from "@/components/leads/ContactsTable";
import UploadHistory from "@/components/leads/UploadHistory";
import UploadForm from "@/components/leads/UploadForm";
import {
  PlusCircle,
  X,
  Users,
  UserCheck,
  CalendarPlus,
  AlertCircle,
} from "lucide-react";

// Midnight Gold color palette
const BG_DARK = "#1A1A1A";
const CARD_BG = "#262626";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "#A3A3A3";
const GOLD = "#B3945B";
const GOLD_DARK = "#8B6B3D";
const GOLD_LIGHT = "#D4AF6A";
const DANGER = "#EF4444";
const SUCCESS = "#10B981";




export default function LeadsPage() {
  const [refresh, setRefresh] = useState(0);
  const [activeTab, setActiveTab] = useState("contacts");
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [stats, setStats] = useState({
    active_customers: null,
    total_contacts: null,
    new_this_month: null,
    untiered_contacts: null,
  });
  const [statsRefresh, setStatsRefresh] = useState(0);
  const [availableTiers, setAvailableTiers] = useState([]);

  // Fetch available potential tiers (like SMS page)
  useEffect(() => {
    fetch("/api/proxy/tiers")
      .then((r) => r.json())
      .then((d) => {
        // d.potential is array of { tier_number, min_frequency, max_frequency, id }
        const tiers = (d.potential || [])
          .map((t) => t.tier_number)
          .sort((a, b) => a - b);
        setAvailableTiers(tiers);
      })
      .catch((err) => console.error("Failed to load potential tiers", err));
  }, []);

  // Fetch statistics (active customers, total contacts, etc.)
  const fetchStats = useCallback(async () => {
    try {
      const url = selectedTier
        ? `/api/proxy/contacts/stats?tier=${selectedTier}`
        : `/api/proxy/contacts/stats`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Stats fetch error:", err);
    }
  }, [selectedTier]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, statsRefresh]);

  const handleUploadComplete = () => {
    setRefresh((prev) => prev + 1); // refresh contacts table
    setStatsRefresh((prev) => prev + 1); // refresh stats cards
    setShowImportModal(false);
  };

  const statCards = [
    {
      label: "Active Customers",
      sublabel: "Made at least one purchase",
      value: stats.active_customers,
      icon: <UserCheck size={22} color={GOLD} />,
      color: GOLD,
    },
    {
      label: selectedTier
        ? `Contacts in Tier ${selectedTier}`
        : "Total Contacts",
      sublabel: selectedTier
        ? `Filtered to tier ${selectedTier}`
        : "All tiers combined",
      value: stats.total_contacts,
      icon: <Users size={22} color={GOLD_LIGHT} />,
      color: GOLD_LIGHT,
    },
    {
      label: "Added This Month",
      sublabel: "New contacts since month start",
      value: stats.new_this_month,
      icon: <CalendarPlus size={22} color={GOLD} />,
      color: GOLD,
    },
    {
      label: "Untiered Contacts",
      sublabel: "No tier assigned yet",
      value: stats.untiered_contacts,
      icon: <AlertCircle size={22} color={DANGER} />,
      color: DANGER,   
    },
  ];

  return (
    <>
      <TopBar title="Potential Customer Management" />
      <div style={pageContainer}>
        {/* Stats Cards */}
        <div style={statsGrid}>
          {statCards.map((card, i) => (
            <div key={i} style={statCard}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <span style={statLabel}>{card.label}</span>
                  <p style={statSub}>{card.sublabel}</p>
                </div>
                <div style={iconBox}>{card.icon}</div>
              </div>
              <span style={{ ...statValue, color: card.color }}>
                {card.value === null ? "—" : card.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        {/* Action Bar */}
        <div style={headerActionRow}>
          <div style={tabsGroup}>
            <button
              onClick={() => setActiveTab("contacts")}
              style={activeTab === "contacts" ? activeTabBtn : inactiveTabBtn}
            >
              All Leads
            </button>
            <button
              onClick={() => setActiveTab("history")}
              style={activeTab === "history" ? activeTabBtn : inactiveTabBtn}
            >
              Upload History
            </button>
          </div>
          <button onClick={() => setShowImportModal(true)} style={primaryBtn}>
            <PlusCircle size={18} /> Upload New Lead File
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "contacts" ? (
          <ContactsTable
            refreshTrigger={refresh}
            selectedTier={selectedTier}
            onTierChange={(tier) => setSelectedTier(tier)}
            tierOptions={availableTiers}
          />
        ) : (
          <UploadHistory refreshTrigger={refresh} />
        )}

        {/* Import Modal */}
        {showImportModal && (
          <div style={modalOverlay}>
            <div style={modalContent}>
              <div style={modalHeader}>
                <h2
                  style={{ margin: 0, fontSize: "18px", color: TEXT_PRIMARY }}
                >
                  Import Lead Data
                </h2>
                <X
                  size={20}
                  color={TEXT_SECONDARY}
                  style={{ cursor: "pointer" }}
                  onClick={() => setShowImportModal(false)}
                />
              </div>
              <UploadForm onUploadComplete={handleUploadComplete} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// --- Midnight Gold Styles ---
const pageContainer = {
  padding: "32px",
  background: BG_DARK,
  minHeight: "100vh",
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "20px",
  marginBottom: "32px",
};

const statCard = {
  background: CARD_BG,
  padding: "20px 24px",
  borderRadius: "14px",
  border: `1px solid ${GOLD}33`,
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
};

const iconBox = {
  background: BG_DARK,
  borderRadius: "10px",
  padding: "8px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: `1px solid ${GOLD}33`,
};

const statLabel = {
  fontSize: "12px",
  fontWeight: 700,
  color: TEXT_SECONDARY,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const statSub = { fontSize: "11px", color: TEXT_SECONDARY, margin: "4px 0 0" };
const statValue = {
  fontSize: "30px",
  fontWeight: 800,
};

const headerActionRow = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "24px",
  alignItems: "center",
};

const tabsGroup = {
  display: "flex",
  gap: "8px",
  background: BG_DARK,
  padding: "4px",
  borderRadius: "8px",
  border: `1px solid ${GOLD}33`,
};

const activeTabBtn = {
  padding: "8px 16px",
  background: GOLD,
  border: "none",
  borderRadius: "6px",
  fontWeight: 700,
  color: BG_DARK,
  cursor: "pointer",
  fontSize: "13px",
};

const inactiveTabBtn = {
  padding: "8px 16px",
  background: "transparent",
  border: "none",
  borderRadius: "6px",
  fontWeight: 600,
  color: TEXT_SECONDARY,
  cursor: "pointer",
  fontSize: "13px",
};

const primaryBtn = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 20px",
  background: GOLD,
  border: "none",
  borderRadius: "8px",
  color: BG_DARK,
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
};

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.7)",
  backdropFilter: "blur(4px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modalContent = {
  background: CARD_BG,
  width: "550px",
  maxWidth: "90vw",
  borderRadius: "16px",
  border: `1px solid ${GOLD}`,
  boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)",
};

const modalHeader = {
  padding: "20px 24px",
  borderBottom: `1px solid ${GOLD}33`,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

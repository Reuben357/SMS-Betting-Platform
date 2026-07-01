"use client";
import { useState, useEffect } from "react";
import TopBar from "@/components/TopBar";
import SubscriptionSettings from "@/components/admin/SubscriptionSettings";
import SubscriptionCustomersTable from "@/components/admin/SubscriptionCustomersTable";
import { Settings, Users } from "lucide-react";
import { useUser } from "@auth0/nextjs-auth0";
import { isAdmin } from "@/lib/auth";

// Midnight Gold palette
const BG_DARK = "#1A1A1A";
const CARD_BG = "#262626";
const GOLD = "#B3945B";
const TEXT_SECONDARY = "#A3A3A3";

function TabButton({ active, onClick, children, icon }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 20px",
        borderRadius: "8px",
        fontSize: "13px",
        fontWeight: 600,
        background: active ? GOLD : "transparent",
        color: active ? BG_DARK : TEXT_SECONDARY,
        border: "none",
        cursor: "pointer",
        transition: "0.2s",
      }}
    >
      {icon}
      {children}
    </button>
  );
}

export default function SubscriptionsPage() {
    const { user } = useUser({ route: "/api/auth/me" });
  const admin = isAdmin(user);
  const [activeTab, setActiveTab] = useState("settings");

    // If user is not admin, ensure they can only see Settings
    useEffect(() => {
        if (!admin && activeTab === "customers") {
            setActiveTab("settings");
        }
    }, [admin, activeTab]);

  return (
    <div style={{ background: BG_DARK, minHeight: "100vh" }}>
      <TopBar title="Jackpot Subscriptions" />
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px" }}>
        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            background: CARD_BG,
            padding: "6px",
            borderRadius: "12px",
            width: "fit-content",
            marginBottom: "24px",
            border: `1px solid ${GOLD}33`,
          }}
        >
          <TabButton
            active={activeTab === "settings"}
            onClick={() => setActiveTab("settings")}
            icon={<Settings size={16} />}
          >
            Settings
          </TabButton>

            {/* Only show Subscription Customers tab if admin */}
            {admin && (
                <TabButton
                    active={activeTab === "customers"}
                    onClick={() => setActiveTab("customers")}
                    icon={<Users size={16} />}
                >
                    Subscription Customers
                </TabButton>
            )}
        </div>

        {/* Tab Content */}
        {activeTab === "settings" && <SubscriptionSettings />}
        {admin && activeTab === "customers" && <SubscriptionCustomersTable />}
      </div>
    </div>
  );
}

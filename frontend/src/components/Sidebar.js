"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@auth0/nextjs-auth0";
import { isAdmin } from "@/lib/auth";
import {
  LayoutDashboard,
  Users,
  Zap,
  Package,
  CreditCard,
  PieChart,
  MessageSquare,
  Settings,
  LogOut,
  UsersRound,
  Ticket
} from "lucide-react";

// Midnight Gold color palette
const BG_DARK = "#1A1A1A";
const GOLD = "#B3945B";
const GOLD_DARK = "#8B6B3D";
const TEXT_LIGHT = "#FFFFFF";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, adminOnly: false },
  { label: "Potential Customers", href: "/admin/leads", icon: Users, adminOnly: false },
  { label: "Tips", href: "/admin/tips", icon: Zap, adminOnly: false },
  { label: "Active Customers", href: "/admin/active-customers", icon: UsersRound, adminOnly: false },
  { label: "Packages", href: "/admin/packages", icon: Package, adminOnly: false },
  { label: "Subscriptions", href: "/admin/subscriptions", icon: Ticket, adminOnly: false },
  { label: "Jackpot Customers", href: "/admin/jackpot-customers", icon: Users, adminOnly: false },
  { label: "Payments", href: "/admin/payments", icon: CreditCard, adminOnly: true },
  { label: "Accounting", href: "/admin/accounting", icon: PieChart, adminOnly: true },
  { label: "SMS", href: "/admin/sms", icon: MessageSquare, adminOnly: false },
  { label: "Tier Thresholds", href: "/admin/tiers", icon: Settings, adminOnly: false },
];

export default function Sidebar() {
    const { user } = useUser({ route: "/api/auth/me" });
    const pathname = usePathname();
  const admin = isAdmin(user);

  return (
    <aside
      style={{
        width: "260px",
        minHeight: "100vh",
        background: BG_DARK,
        color: TEXT_LIGHT,
        display: "flex",
        flexDirection: "column",
        borderRight: `1px solid ${GOLD}33`,
      }}
    >
      <div style={{ padding: "32px 24px" }}>
        <h1
          style={{
            fontSize: "20px",
            fontWeight: 800,
            color: TEXT_LIGHT,
            margin: 0,
            letterSpacing: "-0.5px",
          }}
        >
          JENGATIPS
        </h1>
        <p
          style={{
            fontSize: "11px",
            color: TEXT_LIGHT,
            marginTop: "4px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {admin ? "System Admin" : "Staff Member"}
        </p>
      </div>

      <nav style={{ flex: 1, padding: "0 12px" }}>
        {navItems
          .filter((item) => !item.adminOnly || admin)
          .map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 16px",
                  color: active ? GOLD : TEXT_LIGHT,
                  background: active ? `${GOLD}10` : "transparent",
                  textDecoration: "none",
                  fontSize: "14px",
                  borderRadius: "8px",
                  marginBottom: "4px",
                  transition: "0.2s",
                }}
              >
                <Icon size={18} style={{ marginRight: "12px" }} />
                {item.label}
              </Link>
            );
          })}
      </nav>

      <div style={{ padding: "20px" }}>
        <Link
          href="/api/auth/logout"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px",
            background: `${GOLD}20`,
            color: GOLD,
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "13px",
            border: `1px solid ${GOLD}40`,
          }}
        >
          <LogOut size={16} style={{ marginRight: "8px" }} /> Sign out
        </Link>
      </div>
    </aside>
  );
}
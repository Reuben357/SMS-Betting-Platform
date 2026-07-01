"use client";
import { useUser } from "@auth0/nextjs-auth0";

const BG_DARK = "#1A1A1A";
const GOLD = "#B3945B";
const TEXT_PRIMARY = "#FFFFFF"; // main text


export default function TopBar({ title }) {
    const { user } = useUser({ route: "/api/auth/me" });

  return (
    <header
      style={{
        height: "64px",
        background: BG_DARK,
        borderBottom: `1px solid ${GOLD}33`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
      }}
    >
      <span
        style={{
          fontWeight: 700,
          fontSize: "18px",
          color: TEXT_PRIMARY,
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontSize: "13px", color: "#A3A3A3" }}>
          {user?.email}
        </span>
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "#22C55E",
          }}
        ></div>
      </div>
    </header>
  );
}

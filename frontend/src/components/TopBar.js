"use client";

import { useUser } from "@auth0/nextjs-auth0/client";

export default function TopBar({ title }) {
  const { user } = useUser();

  return (
    <header
      style={{
        height: "56px",
        background: "#0f172a",
        borderBottom: "1px solid #1e293b",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
      }}
    >
      <span style={{ fontWeight: 600, fontSize: "15px", color: "#f1f5f9" }}>
        {title}
      </span>
      <span style={{ fontSize: "13px", color: "#64748b" }}>{user?.email}</span>
    </header>
  );
}

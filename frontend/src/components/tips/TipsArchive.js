import React, { useState } from "react";

const TipsArchive = ({ tips, onDelete, onStatusChange }) => {
  const [expanded, setExpanded] = useState({});

  const toggle = (pkg) =>
    setExpanded((prev) => ({ ...prev, [pkg]: !prev[pkg] }));

  // Group tips by package (Tier segregation)
  const groupedTips = tips.reduce((acc, tip) => {
    if (!acc[tip.package]) acc[tip.package] = [];
    acc[tip.package].push(tip);
    return acc;
  }, {});

  const styles = {
    bundle: {
      background: "#161B22",
      borderRadius: "10px",
      marginBottom: "16px",
      border: "1px solid #30363D",
      overflow: "hidden",
    },
    header: {
      padding: "18px 24px",
      display: "flex",
      justifyContent: "space-between",
      cursor: "pointer",
      background: "#1C2128",
    },
    row: {
      display: "grid",
      gridTemplateColumns: "2.5fr 2fr 1fr 1fr 1.5fr",
      padding: "16px 24px",
      borderTop: "1px solid #30363D",
      alignItems: "center",
    },
    btn: {
      border: "none",
      borderRadius: "4px",
      padding: "6px 10px",
      cursor: "pointer",
      fontWeight: "bold",
      fontSize: "11px",
    },
    win: { background: "#238636", color: "#fff" },
    loss: { background: "#DA3633", color: "#fff" },
  };

  return (
    <div>
      <h3 style={{ marginBottom: "15px" }}>Historical Archive</h3>
      {Object.keys(groupedTips).map((pkg) => (
        <div key={pkg} style={styles.bundle}>
          <div style={styles.header} onClick={() => toggle(pkg)}>
            <span style={{ fontWeight: "bold" }}>
              {pkg}{" "}
              <span
                style={{
                  color: "#8B949E",
                  fontSize: "12px",
                  marginLeft: "10px",
                }}
              >
                {groupedTips[pkg].length} Tips
              </span>
            </span>
            <span style={{ color: "#C5A059" }}>
              {expanded[pkg] ? "▲" : "▼"}
            </span>
          </div>

          {expanded[pkg] &&
            groupedTips[pkg].map((tip) => (
              <div key={tip.id} style={styles.row}>
                <div>
                  <div style={{ fontWeight: "600" }}>{tip.match}</div>
                  <div style={{ fontSize: "11px", color: "#8B949E" }}>
                    {tip.date}
                  </div>
                </div>
                <div style={{ color: "#C5A059", fontSize: "13px" }}>
                  {tip.market}
                </div>
                <div style={{ fontWeight: "bold" }}>{tip.odds}</div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: "bold",
                    color:
                      tip.status === "WIN"
                        ? "#4ADE80"
                        : tip.status === "LOSS"
                          ? "#F87171"
                          : "#8B949E",
                  }}
                >
                  {tip.status}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    style={{ ...styles.btn, ...styles.win }}
                    onClick={() => onStatusChange(tip.id, "WIN")}
                  >
                    W
                  </button>
                  <button
                    style={{ ...styles.btn, ...styles.loss }}
                    onClick={() => onStatusChange(tip.id, "LOSS")}
                  >
                    L
                  </button>
                  <button
                    style={{
                      ...styles.btn,
                      background: "#30363D",
                      color: "#F87171",
                    }}
                    onClick={() => onDelete(tip.id)}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
};

export default TipsArchive;

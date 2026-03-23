"use client";

import { useState, useEffect } from "react";
import { subscribe, enqueueFiles, clearResults } from "@/lib/uploadService";

export default function UploadForm({ onUploadComplete }) {
  const [files, setFiles] = useState([]);
  const [uploadState, setUploadState] = useState({
    active: false,
    currentFile: null,
    currentIndex: 0,
    totalFiles: 0,
    results: [],
  });

  // Subscribe to the upload service on mount.
  // The service lives outside this component so uploads continue even when the user navigates away.
  useEffect(() => {
    const unsubscribe = subscribe(setUploadState);
    return unsubscribe; // Unsubscribe on unmount — upload keeps running
  }, []);

  function handleFileChange(e) {
    const selected = Array.from(e.target.files ?? []);
    setFiles(selected);
    clearResults();
  }

  function handleUpload() {
    if (files.length === 0 || uploadState.active) return;
    enqueueFiles(files, onUploadComplete);
    setFiles([]);
    const input = document.getElementById("csv-file-input");
    if (input) input.value = "";
  }

  function handleClear() {
    setFiles([]);
    clearResults();
    const input = document.getElementById("csv-file-input");
    if (input) input.value = "";
  }

  const { active, currentFile, currentIndex, totalFiles, results } =
    uploadState;
  const hasResults = results.length > 0;
  const totalNew = results.reduce((s, r) => s + (r.new_contacts ?? 0), 0);
  const totalUpdated = results.reduce(
    (s, r) => s + (r.updated_contacts ?? 0),
    0,
  );
  const totalRows = results.reduce((s, r) => s + (r.total_rows ?? 0), 0);
  const totalSkipped = results.reduce((s, r) => s + (r.skipped_rows ?? 0), 0);

  return (
    <div
      style={{
        background: "#1e293b",
        padding: "24px",
        borderRadius: "8px",
        border: "1px solid #334155",
        marginBottom: "24px",
      }}
    >
      <h2
        style={{
          fontSize: "15px",
          fontWeight: 600,
          marginBottom: "4px",
          color: "#f1f5f9",
        }}
      >
        Upload Contacts CSV
      </h2>
      <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "16px" }}>
        Select one or more CSV files. Uploads continue even if you navigate
        away.
      </p>

      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          id="csv-file-input"
          type="file"
          accept=".csv"
          multiple
          style={{ display: "none" }}
          onChange={handleFileChange}
          disabled={active}
        />
        <label
          htmlFor="csv-file-input"
          style={{
            padding: "8px 16px",
            border: "1px solid #475569",
            borderRadius: "4px",
            cursor: active ? "not-allowed" : "pointer",
            fontSize: "13px",
            background: "#0f172a",
            color: active ? "#475569" : "#94a3b8",
            whiteSpace: "nowrap",
          }}
        >
          {files.length === 0
            ? "Choose CSV file(s)"
            : `${files.length} file${files.length > 1 ? "s" : ""} selected`}
        </label>

        <button
          onClick={handleUpload}
          disabled={files.length === 0 || active}
          style={{
            padding: "8px 20px",
            background: files.length > 0 && !active ? "#3b82f6" : "#334155",
            color: files.length > 0 && !active ? "#fff" : "#64748b",
            border: "none",
            borderRadius: "4px",
            cursor: files.length > 0 && !active ? "pointer" : "not-allowed",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          {active
            ? `Uploading ${currentIndex + 1} of ${totalFiles}...`
            : `Upload${files.length > 1 ? ` (${files.length} files)` : ""}`}
        </button>

        {(files.length > 0 || hasResults) && !active && (
          <button
            onClick={handleClear}
            style={{
              padding: "8px 12px",
              background: "none",
              border: "1px solid #475569",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "13px",
              color: "#94a3b8",
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Progress bar */}
      {active && totalFiles > 0 && (
        <div style={{ marginTop: "14px" }}>
          <div
            style={{
              height: "4px",
              background: "#334155",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                background: "#3b82f6",
                borderRadius: "2px",
                width: `${(currentIndex / totalFiles) * 100}%`,
                transition: "width 0.4s ease",
              }}
            />
          </div>
          <p style={{ fontSize: "12px", color: "#64748b", marginTop: "6px" }}>
            Processing: {currentFile}
            {totalFiles > 1 && ` — ${currentIndex + 1} of ${totalFiles} files`}
          </p>
        </div>
      )}

      {/* Batch summary */}
      {hasResults && !active && results.length > 1 && (
        <div
          style={{
            marginTop: "16px",
            padding: "12px",
            background: "#052e16",
            border: "1px solid #166534",
            borderRadius: "6px",
            fontSize: "13px",
            color: "#86efac",
          }}
        >
          <strong>
            Batch complete — {results.filter((r) => r.success).length} of{" "}
            {results.length} files uploaded
          </strong>
          <div
            style={{
              marginTop: "8px",
              display: "flex",
              gap: "24px",
              flexWrap: "wrap",
            }}
          >
            {[
              ["Rows processed", totalRows],
              ["New contacts", totalNew],
              ["Updated", totalUpdated],
              ["Skipped", totalSkipped],
            ].map(([label, val]) => (
              <div key={label}>
                <span style={{ color: "#4ade80" }}>{label}: </span>
                <strong>{val}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-file results */}
      {hasResults && (
        <div style={{ marginTop: results.length > 1 ? "8px" : "16px" }}>
          {results.map((r, i) => (
            <div
              key={i}
              style={{
                padding: "10px 12px",
                marginBottom: "6px",
                borderRadius: "6px",
                fontSize: "13px",
                background: r.success ? "#052e16" : "#450a0a",
                border: `1px solid ${r.success ? "#166534" : "#991b1b"}`,
                color: r.success ? "#86efac" : "#fca5a5",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontFamily: "monospace", fontSize: "12px" }}>
                {r.file}
              </span>
              {r.success ? (
                <span style={{ fontSize: "12px", color: "#4ade80" }}>
                  {r.new_contacts} new · {r.updated_contacts} updated ·{" "}
                  {r.skipped_rows} skipped
                </span>
              ) : (
                <span style={{ fontSize: "12px", color: "#f87171" }}>
                  {r.error}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
import { subscribe, enqueueFiles } from "@/lib/uploadService";
import {
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";

// Midnight Gold palette
const BG_DARK = "#1A1A1A";
const CARD_BG = "#262626";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "#A3A3A3";
const GOLD = "#B3945B";
const DANGER = "#EF4444";
const SUCCESS = "#10B981";

export default function UploadForm({ onUploadComplete }) {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState({
    active: false,
    currentFile: null,
    currentIndex: 0,
    totalFiles: 0,
    results: [],
  });

  useEffect(() => subscribe(setUploadState), []);

  const handleDrag = (e) => {
    e.preventDefault();
    setIsDragging(e.type === "dragover");
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      f.name.endsWith(".csv"),
    );
    setFiles((prev) => [...prev, ...dropped]);
  };

  const startUpload = () => {
    enqueueFiles(files, onUploadComplete);
    setFiles([]);
  };

  const { active, currentFile, currentIndex, totalFiles, results } =
    uploadState;

  return (
    <div style={{ padding: "24px" }}>
      {/* Drop zone */}
      <div
        onDragOver={handleDrag}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        style={dropZoneStyle(isDragging, active)}
      >
        <Upload size={32} color={isDragging ? GOLD : TEXT_SECONDARY} />
        <p
          style={{
            margin: "8px 0 0",
            fontSize: "14px",
            color: TEXT_SECONDARY,
            fontWeight: 600,
          }}
        >
          {active ? "Processing..." : "Drag CSV files here"}
        </p>
        <input
          id="csv-up"
          type="file"
          accept=".csv"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files))}
          style={{ display: "none" }}
        />
        <label
          htmlFor="csv-up"
          style={{
            color: GOLD,
            fontSize: "12px",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          or browse files
        </label>
      </div>

      {/* Pending file list (scrollable) */}
      {files.length > 0 && !active && (
        <div style={pendingFilesCard}>
          <div
            style={{
              maxHeight: "200px",
              overflowY: "auto",
              marginBottom: "12px",
              paddingRight: "12px",
            }}
          >
            {files.map((f, i) => (
              <div key={i} style={pendingFileRow}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <FileSpreadsheet size={14} color={GOLD} /> {f.name}
                </div>
                <X
                  size={14}
                  cursor="pointer"
                  color={DANGER}
                  onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                />
              </div>
            ))}
          </div>
          <button onClick={startUpload} style={submitBtnStyle}>
            Start Ingestion ({files.length} file{files.length !== 1 ? "s" : ""})
          </button>
        </div>
      )}

      {/* Progress bar during upload */}
      {active && (
        <div style={progressCard}>
          <div style={progressHeader}>
            <Loader2
              size={16}
              style={{ animation: "spin 1s linear infinite" }}
            />{" "}
            {currentFile}
          </div>
          <div style={barBg}>
            <div style={barFill((currentIndex / totalFiles) * 100)} />
          </div>
        </div>
      )}

      {/* Upload results */}
      {results.length > 0 && (
        <div
          style={{ marginTop: "16px", maxHeight: "160px", overflowY: "auto" }}
        >
          {results.map((r, i) => (
            <div key={i} style={resultRow(r.success)}>
              {r.success ? (
                <CheckCircle2 size={14} color={SUCCESS} />
              ) : (
                <AlertCircle size={14} color={DANGER} />
              )}
              <span style={{ flex: 1, color: r.success ? SUCCESS : DANGER }}>
                {r.file}
              </span>
              <span
                style={{ fontWeight: 700, color: r.success ? SUCCESS : DANGER }}
              >
                {r.success ? `+${r.new_contacts}` : "Failed"}
              </span>
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// --- Styles ---
const dropZoneStyle = (isDrag, active) => ({
  border: `2px dashed ${isDrag ? GOLD : `${GOLD}33`}`,
  borderRadius: "12px",
  padding: "32px",
  textAlign: "center",
  background: isDrag ? `${GOLD}10` : BG_DARK,
  opacity: active ? 0.5 : 1,
});

const pendingFilesCard = {
  marginTop: "16px",
  padding: "12px",
  background: CARD_BG,
  borderRadius: "8px",
  border: `1px solid ${GOLD}33`,
};

const pendingFileRow = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: "12px",
  color: TEXT_PRIMARY,
  padding: "8px 0",
  borderBottom: `1px solid ${GOLD}20`,
};

const submitBtnStyle = {
  width: "100%",
  marginTop: "10px",
  padding: "10px",
  background: GOLD,
  color: BG_DARK,
  border: "none",
  borderRadius: "8px",
  fontWeight: 700,
  cursor: "pointer",
};

const progressCard = {
  marginTop: "16px",
  padding: "12px",
  background: `${GOLD}10`,
  border: `1px solid ${GOLD}33`,
  borderRadius: "8px",
};

const progressHeader = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "12px",
  color: TEXT_PRIMARY,
  fontWeight: 600,
  marginBottom: "8px",
};

const barBg = { height: "6px", background: BG_DARK, borderRadius: "3px" };
const barFill = (w) => ({
  height: "100%",
  width: `${w}%`,
  background: GOLD,
  borderRadius: "3px",
  transition: "width 0.3s",
});

const resultRow = (s) => ({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 12px",
  borderRadius: "6px",
  marginBottom: "4px",
  background: s ? `${SUCCESS}10` : `${DANGER}10`,
  border: `1px solid ${s ? SUCCESS : DANGER}40`,
  fontSize: "11px",
});

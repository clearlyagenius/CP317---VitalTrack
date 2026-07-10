"use client";

import { useState, useEffect, useRef, type DragEvent } from "react";

interface Report {
  id: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
}

export default function ReportUpload() {
  const [reports, setReports] = useState<Report[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing reports on mount
  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    try {
      const res = await fetch("/api/reports");
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports);
      }
    } catch {
      // silently fail on load
    }
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: `"${file.name}" uploaded successfully!` });
        fetchReports(); // Refresh the list
      } else {
        setMessage({ type: "error", text: result.error || "Upload failed." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setUploading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = ""; // Reset so same file can be re-selected
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div>
      {/* Status message */}
      {message && (
        <div className={`alert ${message.type === "success" ? "alert-success" : "alert-error"}`} style={{ marginBottom: 20 }}>
          {message.text}
        </div>
      )}

      {/* Upload area */}
      <div
        className={`upload-zone ${dragOver ? "drag-over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.txt,text/plain,application/pdf,image/*"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />
        <div className="upload-icon">↑</div>
        <p className="upload-text">
          {uploading ? "Uploading..." : "Drag and drop your report here"}
        </p>
        <button type="button" className="upload-btn" disabled={uploading}>
          Choose File
        </button>
      </div>

      {/* Report list */}
      {reports.length > 0 && (
        <div className="report-list">
          <h2 style={{ marginBottom: 16 }}>Uploaded Reports</h2>
          {reports.map((report) => (
            <div key={report.id} className="report-item">
              <div className="report-info">
                <span className="report-name">{report.fileName}</span>
                <span className="report-meta">
                  {formatFileSize(report.fileSize)} · {formatDate(report.createdAt)}
                </span>
              </div>
              <span className="report-badge">Uploaded</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, type DragEvent } from "react";
import AnalysisPanel, { type AnalysisResult } from "./AnalysisPanel";

interface Report {
  id: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
  analysisStatus: "pending" | "analyzed" | "failed";
  analysisSummary: string | null;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function ReportUpload() {
  const [reports, setReports] = useState<Report[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  // REP-3 state: which reports are being analyzed / expanded, cached results
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<Record<string, AnalysisResult>>({});
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

  // REP-3: run Gemini analysis on a report and cache the result
  async function analyzeReport(reportId: string) {
    setAnalyzingIds((prev) => new Set(prev).add(reportId));
    setMessage(null);

    try {
      const res = await fetch(`/api/reports/${reportId}/analyze`, { method: "POST" });
      const result = await res.json();

      if (res.ok) {
        setAnalyses((prev) => ({
          ...prev,
          [reportId]: { status: "analyzed", summary: result.summary, markers: result.markers },
        }));
        setExpandedId(reportId);
        const flagged = result.flaggedCount;
        setMessage({
          type: "success",
          text:
            flagged > 0
              ? `Analysis complete — ${flagged} marker${flagged === 1 ? "" : "s"} outside the normal range.`
              : "Analysis complete — all markers within normal range.",
        });
      } else {
        setMessage({ type: "error", text: result.error || "Analysis failed." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error during analysis. Please try again." });
    } finally {
      setAnalyzingIds((prev) => {
        const next = new Set(prev);
        next.delete(reportId);
        return next;
      });
      fetchReports(); // refresh status badges
    }
  }

  // Load stored analysis results when a report row is expanded
  async function toggleExpand(report: Report) {
    if (expandedId === report.id) {
      setExpandedId(null);
      return;
    }
    if (report.analysisStatus !== "analyzed") return;

    if (!analyses[report.id]) {
      try {
        const res = await fetch(`/api/reports/${report.id}/analyze`);
        if (res.ok) {
          const data = await res.json();
          setAnalyses((prev) => ({ ...prev, [report.id]: data }));
        }
      } catch {
        return;
      }
    }
    setExpandedId(report.id);
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setMessage(null);

    // Client-side file size check
    if (file.size > MAX_FILE_SIZE) {
      setMessage({ type: "error", text: "File size exceeds the 5MB limit. Please upload a smaller file." });
      setUploading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: `"${file.name}" uploaded — analyzing...` });
        await fetchReports();
        analyzeReport(result.reportId); // REP-3: auto-analyze right after upload
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

  function statusBadge(report: Report) {
    if (analyzingIds.has(report.id)) return <span className="report-badge badge-analyzing">Analyzing...</span>;
    if (report.analysisStatus === "analyzed") return <span className="report-badge">Analyzed</span>;
    if (report.analysisStatus === "failed") return <span className="report-badge badge-failed">Analysis failed</span>;
    return <span className="report-badge badge-pending">Uploaded</span>;
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
        <p style={{ fontSize: "0.8rem", color: "var(--gray-400)", marginTop: 12 }}>Max file size: 5MB</p>
      </div>

      {/* Report list */}
      {reports.length > 0 && (
        <div className="report-list">
          <h2 style={{ marginBottom: 16 }}>Uploaded Reports</h2>
          {reports.map((report) => {
            const analysis = analyses[report.id];
            const isExpanded = expandedId === report.id && analysis;

            return (
              <div key={report.id} className="report-card">
                <div
                  className="report-item"
                  onClick={() => toggleExpand(report)}
                  style={{ cursor: report.analysisStatus === "analyzed" ? "pointer" : "default" }}
                >
                  <div className="report-info">
                    <span className="report-name">{report.fileName}</span>
                    <span className="report-meta">
                      {formatFileSize(report.fileSize)} · {formatDate(report.createdAt)}
                    </span>
                  </div>
                  <div className="report-actions">
                    {statusBadge(report)}
                    <button
                      type="button"
                      className="analyze-btn"
                      disabled={analyzingIds.has(report.id)}
                      onClick={(e) => {
                        e.stopPropagation(); // don't toggle the expand panel
                        analyzeReport(report.id);
                      }}
                    >
                      {report.analysisStatus === "analyzed" ? "Re-analyze" : "Analyze"}
                    </button>
                  </div>
                </div>

                {/* REP-3: analysis results panel */}
                {isExpanded && <AnalysisPanel analysis={analysis} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

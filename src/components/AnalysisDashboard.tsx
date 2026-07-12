"use client";

// REP-3: AI Analysis page — overview of every uploaded report and its
// analysis results, plus a summary of currently flagged markers.

import { useState, useEffect } from "react";
import Link from "next/link";
import AnalysisPanel, { type AnalysisResult, formatRange, type Marker } from "./AnalysisPanel";

interface Report {
  id: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
  analysisStatus: "pending" | "analyzed" | "failed";
  analysisSummary: string | null;
}

interface FlaggedMarker extends Marker {
  reportId: string;
  fileName: string;
  reportDate: string;
}

export default function AnalysisDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [flagged, setFlagged] = useState<FlaggedMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<Record<string, AnalysisResult>>({});

  async function refresh() {
    try {
      const [reportsRes, flaggedRes] = await Promise.all([
        fetch("/api/reports"),
        fetch("/api/markers?flagged=true"),
      ]);
      if (reportsRes.ok) {
        const data = await reportsRes.json();
        setReports(data.reports);
      }
      if (flaggedRes.ok) {
        const data = await flaggedRes.json();
        setFlagged(data.markers);
      }
    } catch {
      // silently fail on load
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Fetch-on-mount: all setState calls in refresh() happen after awaits
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []);

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
        setMessage({ type: "success", text: "Analysis complete." });
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
      refresh();
    }
  }

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
    return <span className="report-badge badge-pending">Not analyzed</span>;
  }

  if (loading) {
    return <p style={{ color: "var(--gray-500)" }}>Loading your analyses...</p>;
  }

  if (reports.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <p style={{ marginBottom: 12 }}>You haven&apos;t uploaded any reports yet.</p>
        <Link href="/dashboard/reports" className="upload-btn" style={{ textDecoration: "none" }}>
          Upload your first report
        </Link>
      </div>
    );
  }

  return (
    <div>
      {message && (
        <div className={`alert ${message.type === "success" ? "alert-success" : "alert-error"}`} style={{ marginBottom: 20 }}>
          {message.text}
        </div>
      )}

      {/* Flagged markers overview across all analyzed reports */}
      <div className="flagged-overview">
        <h2 style={{ marginBottom: 4 }}>Flagged Markers</h2>
        <p className="flagged-overview-sub">
          Markers outside their normal range across your analyzed reports.
        </p>
        {flagged.length === 0 ? (
          <div className="alert alert-success">
            No flagged markers — everything analyzed so far is within normal range.
          </div>
        ) : (
          <div className="flagged-grid">
            {flagged.map((m, i) => (
              <div key={`${m.reportId}-${m.name}-${i}`} className="flagged-card">
                <div className="flagged-card-top">
                  <span className="flagged-card-name">{m.name}</span>
                  <span className={`marker-flag flag-${m.flag}`}>
                    {m.flag === "high" ? "High" : "Low"}
                  </span>
                </div>
                <div className="flagged-card-value">
                  {m.value} <span className="flagged-card-unit">{m.unit}</span>
                </div>
                <div className="flagged-card-meta">
                  Normal: {formatRange(m)} · {formatDate(m.reportDate)}
                </div>
                {m.explanation && <p className="flagged-card-explanation">{m.explanation}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All reports with their analyses */}
      <div className="report-list">
        <h2 style={{ marginBottom: 16 }}>Report Analyses</h2>
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
                    {formatDate(report.createdAt)}
                    {report.analysisStatus === "analyzed" && " · click to view results"}
                  </span>
                </div>
                <div className="report-actions">
                  {statusBadge(report)}
                  <button
                    type="button"
                    className="analyze-btn"
                    disabled={analyzingIds.has(report.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      analyzeReport(report.id);
                    }}
                  >
                    {report.analysisStatus === "analyzed" ? "Re-analyze" : "Analyze"}
                  </button>
                </div>
              </div>

              {isExpanded && <AnalysisPanel analysis={analysis} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

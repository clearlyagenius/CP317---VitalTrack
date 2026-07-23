"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Report {
  id: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
}

interface Metric {
  metricName: string;
  value: number;
  unit: string;
  status: "Normal" | "High" | "Low" | "Borderline";
}

interface TrendPoint {
  date: string;
  value: number;
  fileName: string;
}

interface DashboardProps {
  reports: Report[];
  firstName: string;
}

const STATUS_COLORS: Record<string, string> = {
  Normal: "var(--green-600)",
  High: "#ef4444",
  Low: "#3b82f6",
  Borderline: "#f59e0b",
};

const STATUS_BG: Record<string, string> = {
  Normal: "var(--green-50)",
  High: "#fef2f2",
  Low: "#eff6ff",
  Borderline: "#fffbeb",
};

const CHART_COLORS: Record<string, string> = {
  Glucose: "#22c55e",
  Haemoglobin: "#6366f1",
  "LDL Cholesterol": "#ef4444",
  "Vitamin D": "#f59e0b",
};

export default function Dashboard({ reports, firstName }: DashboardProps) {
  const [selectedReportId, setSelectedReportId] = useState<string>(reports[0]?.id || "");
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [trends, setTrends] = useState<Record<string, TrendPoint[]>>({});
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [noDataMsg, setNoDataMsg] = useState<string | null>(null);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Fetch metrics for the selected report
  const fetchMetrics = useCallback(async (reportId: string) => {
    if (!reportId) return;
    setLoadingMetrics(true);
    setNoDataMsg(null);
    try {
      const res = await fetch(`/api/reports/${reportId}/metrics`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        if (data.metrics.length === 0 && data.message) {
          setNoDataMsg(data.message);
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  // Fetch trends across all reports
  const fetchTrends = useCallback(async () => {
    setLoadingTrends(true);
    try {
      const res = await fetch("/api/reports/metrics/trends");
      if (res.ok) {
        const data = await res.json();
        setTrends(data.trends);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingTrends(false);
    }
  }, []);

  useEffect(() => {
    if (selectedReportId) {
      fetchMetrics(selectedReportId);
    }
  }, [selectedReportId, fetchMetrics]);

  // Fetch trends once on mount, and also after metrics are loaded (to capture newly seeded data)
  useEffect(() => {
    fetchTrends();
  }, [metrics, fetchTrends]);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="dashboard-page animate-in">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-greeting">Hello {firstName},</h1>
          <p className="dashboard-date">{today}</p>
        </div>

        {/* Report Picker */}
        <div className="report-picker">
          <label htmlFor="reportSelect" className="report-picker-label">
            Viewing Report
          </label>
          <select
            id="reportSelect"
            value={selectedReportId}
            onChange={(e) => setSelectedReportId(e.target.value)}
            className="report-picker-select"
          >
            {reports.map((r) => (
              <option key={r.id} value={r.id}>
                {r.fileName} — {formatDate(r.createdAt)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Metric Cards */}
      {noDataMsg && !loadingMetrics && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          {noDataMsg}
        </div>
      )}
      <div className="metric-cards-grid">
        {loadingMetrics ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="metric-card metric-card-skeleton">
              <div className="skeleton-line skeleton-title" />
              <div className="skeleton-line skeleton-value" />
              <div className="skeleton-line skeleton-badge" />
            </div>
          ))
        ) : (
          metrics.map((m) => (
            <div key={m.metricName} className="metric-card">
              <span className="metric-label">{m.metricName}</span>
              <span className="metric-value">
                {m.value} <span className="metric-unit">{m.unit}</span>
              </span>
              <span
                className="metric-status"
                style={{
                  color: STATUS_COLORS[m.status],
                  background: STATUS_BG[m.status],
                }}
              >
                {m.status}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Trend Charts */}
      <div className="chart-grid">
        {(["Glucose", "LDL Cholesterol"] as const).map((metricName) => (
          <div key={metricName} className="chart-panel">
            <h3 className="chart-title">{metricName} Over Time</h3>
            {loadingTrends ? (
              <div className="chart-skeleton" />
            ) : trends[metricName] && trends[metricName].length >= 1 ? (
              <TrendChart
                data={trends[metricName]}
                color={CHART_COLORS[metricName]}
                metricName={metricName}
              />
            ) : (
              <div className="chart-empty">
                <p>Upload more reports to see trends</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* =================== Canvas Line Chart =================== */

interface TrendChartProps {
  data: TrendPoint[];
  color: string;
  metricName: string;
}

function TrendChart({ data, color, metricName }: TrendChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 1) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // High-DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const PAD_TOP = 20;
    const PAD_BOTTOM = 40;
    const PAD_LEFT = 50;
    const PAD_RIGHT = 20;
    const chartW = W - PAD_LEFT - PAD_RIGHT;
    const chartH = H - PAD_TOP - PAD_BOTTOM;

    // Clear
    ctx.clearRect(0, 0, W, H);

    const values = data.map((d) => d.value);
    const minVal = Math.min(...values) * 0.9;
    const maxVal = Math.max(...values) * 1.1;
    const range = maxVal - minVal || 1;

    // Map data to pixel coords
    const points = data.map((d, i) => ({
      x: data.length === 1 ? PAD_LEFT + chartW / 2 : PAD_LEFT + (i / (data.length - 1)) * chartW,
      y: PAD_TOP + chartH - ((d.value - minVal) / range) * chartH,
      value: d.value,
      date: d.date,
    }));

    // Grid lines
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = PAD_TOP + (i / gridLines) * chartH;
      ctx.beginPath();
      ctx.moveTo(PAD_LEFT, y);
      ctx.lineTo(W - PAD_RIGHT, y);
      ctx.stroke();

      // Y-axis labels
      const val = maxVal - (i / gridLines) * range;
      ctx.fillStyle = "#9ca3af";
      ctx.font = "11px Inter, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(val.toFixed(1), PAD_LEFT - 8, y + 4);
    }

    // Gradient fill under the line
    const gradient = ctx.createLinearGradient(0, PAD_TOP, 0, PAD_TOP + chartH);
    gradient.addColorStop(0, color + "30");
    gradient.addColorStop(1, color + "05");

    ctx.beginPath();
    ctx.moveTo(points[0].x, PAD_TOP + chartH);
    // Smooth curve through points using quadratic bezier
    ctx.lineTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const cpX = (points[i - 1].x + points[i].x) / 2;
      ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, cpX, (points[i - 1].y + points[i].y) / 2);
      if (i === points.length - 1) {
        ctx.quadraticCurveTo(cpX, (points[i - 1].y + points[i].y) / 2, points[i].x, points[i].y);
      }
    }
    ctx.lineTo(points[points.length - 1].x, PAD_TOP + chartH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const cpX = (points[i - 1].x + points[i].x) / 2;
      ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, cpX, (points[i - 1].y + points[i].y) / 2);
      if (i === points.length - 1) {
        ctx.quadraticCurveTo(cpX, (points[i - 1].y + points[i].y) / 2, points[i].x, points[i].y);
      }
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Data points
    for (const pt of points) {
      // Outer circle
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Inner dot
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }

    // X-axis labels
    ctx.fillStyle = "#9ca3af";
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "center";
    for (const pt of points) {
      const label = new Date(pt.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      ctx.fillText(label, pt.x, H - PAD_BOTTOM + 20);
    }

    // Suppress unused variable warning
    void metricName;
  }, [data, color, metricName]);

  return (
    <canvas
      ref={canvasRef}
      className="trend-canvas"
      style={{ width: "100%", height: 200 }}
    />
  );
}

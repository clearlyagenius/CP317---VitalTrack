"use client";

import React from "react";

// REP-3: shared analysis results panel — the plain-language summary plus the
// marker table with flags. Used by ReportUpload (Reports page) and
// AnalysisDashboard (AI Analysis page).

export interface Marker {
  name: string;
  value: number;
  unit: string;
  refLow: number | null;
  refHigh: number | null;
  flag: "low" | "normal" | "high";
  explanation?: string | null;
}

export interface AnalysisResult {
  status: string;
  summary: string | null;
  markers: Marker[];
}

export function formatRange(m: Marker) {
  if (m.refLow !== null && m.refHigh !== null) return `${m.refLow} – ${m.refHigh} ${m.unit}`;
  if (m.refHigh !== null) return `< ${m.refHigh} ${m.unit}`;
  if (m.refLow !== null) return `> ${m.refLow} ${m.unit}`;
  return "—";
}

export default function AnalysisPanel({ analysis }: { analysis: AnalysisResult }) {
  return (
    <div className="analysis-panel">
      {analysis.summary && <p className="analysis-summary">{analysis.summary}</p>}
      <table className="marker-table">
        <thead>
          <tr>
            <th>Marker</th>
            <th>Result</th>
            <th>Reference Range</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {analysis.markers.map((m) => (
            // Flagged markers get a second row with the plain-language
            // explanation of what the result means (REP-3 acceptance criteria)
            <React.Fragment key={m.name}>
              <tr className={m.flag !== "normal" && m.explanation ? "marker-row-flagged" : undefined}>
                <td>{m.name}</td>
                <td>
                  {m.value} {m.unit}
                </td>
                <td>{formatRange(m)}</td>
                <td>
                  <span className={`marker-flag flag-${m.flag}`}>
                    {m.flag === "normal" ? "Normal" : m.flag === "high" ? "High" : "Low"}
                  </span>
                </td>
              </tr>
              {m.flag !== "normal" && m.explanation && (
                <tr className="marker-explanation-row">
                  <td colSpan={4}>{m.explanation}</td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      <p className="analysis-disclaimer">
        This analysis is for informational purposes only and is not medical advice.
        Please consult a healthcare professional about your results.
      </p>
    </div>
  );
}

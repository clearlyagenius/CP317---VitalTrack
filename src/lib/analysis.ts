// REP-3: Analyze Health Reports — marker reference ranges + flagging logic.
//
// Gemini extracts the raw marker values from the uploaded report (see
// gemini.ts). Flagging is done here, deterministically, so a marker is
// never labelled "high"/"low" by the AI alone: we prefer the reference
// range printed on the report itself and fall back to the standard adult
// ranges below.

export type MarkerFlag = "low" | "normal" | "high";

export interface ExtractedMarker {
  name: string;
  value: number;
  unit: string;
  refLow: number | null;
  refHigh: number | null;
  explanation: string;
}

export interface AnalyzedMarker extends ExtractedMarker {
  flag: MarkerFlag;
}

interface ReferenceRange {
  unit: string;
  low: number | null; // null = no lower bound (e.g. LDL)
  high: number | null;
  aliases: string[];
}

// Standard adult reference ranges for common blood test markers.
// Used only when the uploaded report doesn't print its own range.
const REFERENCE_RANGES: Record<string, ReferenceRange> = {
  "Glucose (Fasting)": { unit: "mg/dL", low: 70, high: 100, aliases: ["glucose", "fasting glucose", "blood glucose", "fbs", "blood sugar"] },
  "HbA1c":             { unit: "%",     low: 4,  high: 5.7, aliases: ["a1c", "hba1c", "hemoglobin a1c", "glycated hemoglobin"] },
  "Total Cholesterol": { unit: "mg/dL", low: null, high: 200, aliases: ["cholesterol", "total cholesterol", "chol"] },
  "LDL Cholesterol":   { unit: "mg/dL", low: null, high: 100, aliases: ["ldl", "ldl cholesterol", "ldl-c"] },
  "HDL Cholesterol":   { unit: "mg/dL", low: 40, high: null, aliases: ["hdl", "hdl cholesterol", "hdl-c"] },
  "Triglycerides":     { unit: "mg/dL", low: null, high: 150, aliases: ["triglycerides", "trig", "tg"] },
  "Hemoglobin":        { unit: "g/dL",  low: 12, high: 17.5, aliases: ["hemoglobin", "haemoglobin", "hgb", "hb"] },
  "Hematocrit":        { unit: "%",     low: 36, high: 51, aliases: ["hematocrit", "hct"] },
  "White Blood Cells": { unit: "10^3/uL", low: 4, high: 11, aliases: ["wbc", "white blood cells", "white blood cell count", "leukocytes"] },
  "Red Blood Cells":   { unit: "10^6/uL", low: 4.2, high: 6.1, aliases: ["rbc", "red blood cells", "red blood cell count", "erythrocytes"] },
  "Platelets":         { unit: "10^3/uL", low: 150, high: 450, aliases: ["platelets", "platelet count", "plt"] },
  "Creatinine":        { unit: "mg/dL", low: 0.6, high: 1.3, aliases: ["creatinine", "creat"] },
  "eGFR":              { unit: "mL/min/1.73m2", low: 60, high: null, aliases: ["egfr", "gfr", "estimated gfr"] },
  "ALT":               { unit: "U/L",   low: 7,  high: 56, aliases: ["alt", "sgpt", "alanine aminotransferase"] },
  "AST":               { unit: "U/L",   low: 10, high: 40, aliases: ["ast", "sgot", "aspartate aminotransferase"] },
  "TSH":               { unit: "mIU/L", low: 0.4, high: 4.0, aliases: ["tsh", "thyroid stimulating hormone"] },
  "Vitamin D":         { unit: "ng/mL", low: 30, high: 100, aliases: ["vitamin d", "25-oh vitamin d", "vitamin d3", "25-hydroxyvitamin d"] },
  "Vitamin B12":       { unit: "pg/mL", low: 200, high: 900, aliases: ["vitamin b12", "b12", "cobalamin"] },
  "Iron":              { unit: "ug/dL", low: 60, high: 170, aliases: ["iron", "serum iron", "fe"] },
  "Ferritin":          { unit: "ng/mL", low: 12, high: 300, aliases: ["ferritin"] },
  "Sodium":            { unit: "mmol/L", low: 135, high: 145, aliases: ["sodium", "na"] },
  "Potassium":         { unit: "mmol/L", low: 3.5, high: 5.2, aliases: ["potassium", "k"] },
  "Calcium":           { unit: "mg/dL", low: 8.5, high: 10.5, aliases: ["calcium", "ca"] },
};

// Map whatever name Gemini extracted ("LDL-C", "ldl cholesterol", ...) to
// our canonical marker name, so the same marker lines up across reports
// and UI-2 can chart it over time. Unknown markers keep their own name.
export function normalizeMarkerName(rawName: string): string {
  const needle = rawName.trim().toLowerCase();
  for (const [canonical, range] of Object.entries(REFERENCE_RANGES)) {
    if (canonical.toLowerCase() === needle || range.aliases.includes(needle)) {
      return canonical;
    }
  }
  return rawName.trim();
}

// Flag a marker as low / normal / high. The range printed on the report
// wins; otherwise fall back to our standard range for that marker.
export function analyzeMarker(marker: ExtractedMarker): AnalyzedMarker {
  const name = normalizeMarkerName(marker.name);
  const fallback = REFERENCE_RANGES[name];

  const refLow = marker.refLow ?? fallback?.low ?? null;
  const refHigh = marker.refHigh ?? fallback?.high ?? null;

  let flag: MarkerFlag = "normal";
  if (refLow !== null && marker.value < refLow) flag = "low";
  else if (refHigh !== null && marker.value > refHigh) flag = "high";

  return { ...marker, name, refLow, refHigh, flag };
}

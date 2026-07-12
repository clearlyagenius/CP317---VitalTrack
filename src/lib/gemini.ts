// REP-3: Gemini integration — sends the uploaded blood report (PDF, image,
// or plain text) to the Gemini API and gets back structured marker data.
//
// The API key is read from the GEMINI_API_KEY environment variable
// (put it in .env.local at the project root — see .env.example).
//
// AI-1 (health coach) reuses this same GEMINI_API_KEY for its prompts.

import type { ExtractedMarker } from "./analysis";

// "-latest" alias always points at the current flash model, so this keeps
// working when Google retires a specific version.
const GEMINI_MODEL = "gemini-flash-latest";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface ExtractionResult {
  isBloodReport: boolean;
  summary: string;
  markers: ExtractedMarker[];
}

const EXTRACTION_PROMPT = `You are a medical lab report parser. Extract every blood test marker from the attached lab report.

Rules:
- Extract the marker name exactly as printed, its numeric value, its unit, and the reference range printed on the report (refLow/refHigh). If no range is printed for a marker, set refLow and refHigh to null.
- Only include markers with a numeric result. Skip qualitative results like "Negative".
- If the reference range is one-sided (e.g. "< 200"), set the missing side to null.
- For every marker, write a 1-2 sentence plain-language "explanation": what the marker measures and what this specific result means for the patient compared to its reference range (e.g. "above the typical range, which can be an early sign of..."). No medical jargon, no diagnosis.
- Write a short 1-2 sentence plain-language summary of the report for the patient. Do not diagnose; just describe what was tested.
- If the document is NOT a medical lab report, set isBloodReport to false and return an empty markers list.`;

// JSON schema Gemini must follow, so the response parses reliably.
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    isBloodReport: { type: "BOOLEAN" },
    summary: { type: "STRING" },
    markers: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          value: { type: "NUMBER" },
          unit: { type: "STRING" },
          refLow: { type: "NUMBER", nullable: true },
          refHigh: { type: "NUMBER", nullable: true },
          explanation: { type: "STRING" },
        },
        required: ["name", "value", "unit", "explanation"],
      },
    },
  },
  required: ["isBloodReport", "summary", "markers"],
};

interface GeminiPart {
  text?: string;
  thought?: boolean;
}

async function callGemini(
  apiKey: string,
  filePart: object,
  temperature: number
): Promise<ExtractionResult> {
  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: EXTRACTION_PROMPT }, filePart] }],
      generationConfig: {
        temperature,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("Gemini API error:", res.status, detail);
    throw new Error(`Gemini API request failed (HTTP ${res.status}).`);
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];

  // Truncated output (e.g. the model got stuck repeating itself and hit the
  // token limit) can never be valid JSON — fail fast so the caller retries.
  if (candidate?.finishReason && candidate.finishReason !== "STOP") {
    throw new Error(`Gemini stopped early (${candidate.finishReason}).`);
  }

  // Thinking models can prepend "thought" parts — the JSON answer is the
  // last non-thought text part.
  const parts: GeminiPart[] = candidate?.content?.parts ?? [];
  const jsonText = parts.filter((p) => p.text && !p.thought).at(-1)?.text;
  if (!jsonText) {
    throw new Error("Gemini returned an empty response.");
  }

  return JSON.parse(jsonText) as ExtractionResult;
}

export async function extractMarkersFromReport(
  fileBuffer: Buffer,
  mimeType: string
): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your-gemini-api-key-here") {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local in the project root (see .env.example)."
    );
  }

  // Plain-text reports go in as text; PDFs and images as base64 inline data.
  const filePart = mimeType.startsWith("text/")
    ? { text: `Lab report contents:\n\n${fileBuffer.toString("utf-8")}` }
    : { inline_data: { mime_type: mimeType, data: fileBuffer.toString("base64") } };

  // One retry: a malformed/looping generation at temperature 0 is
  // deterministic, so the retry uses a slightly higher temperature.
  let parsed: ExtractionResult;
  try {
    parsed = await callGemini(apiKey, filePart, 0);
  } catch (err) {
    console.error("Gemini extraction failed, retrying once:", err);
    parsed = await callGemini(apiKey, filePart, 0.4);
  }

  return {
    isBloodReport: Boolean(parsed.isBloodReport),
    summary: parsed.summary ?? "",
    markers: Array.isArray(parsed.markers)
      ? parsed.markers.map((m) => ({
          name: String(m.name),
          value: Number(m.value),
          unit: String(m.unit ?? ""),
          refLow: m.refLow ?? null,
          refHigh: m.refHigh ?? null,
          explanation: String(m.explanation ?? ""),
        }))
      : [],
  };
}

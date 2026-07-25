interface ChatMessage { role: "user" | "assistant"; content: string; }

export async function callGeminiChat(systemPrompt: string, history: ChatMessage[]) {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set — chat cannot reach the Gemini API.");
    return "AI Chat isn't available right now — the Gemini API key isn't configured on this server. Add GEMINI_API_KEY to your .env.local and restart the app.";
  }

  const contents = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
      }),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Gemini API error:", errorText);
    return res.status === 401 || res.status === 403
      ? "AI Chat can't authenticate with the Gemini API — the API key may be invalid or expired."
      : "Sorry, the AI service is temporarily unavailable. Please try again in a moment.";
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Sorry, I couldn't generate a response.";
}
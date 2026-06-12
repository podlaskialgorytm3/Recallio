// Test Gemini API
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const envContent = fs.readFileSync(".env", "utf8");
envContent.split("\n").forEach(line => {
  const match = line.match(/^([^#=]+)=["']?(.+?)["']?\s*$/);
  if (match) process.env[match[1].trim()] = match[2];
});

async function testGemini() {
  console.log("🔑 Klucz API:", process.env.GEMINI_API_KEY ? "znaleziony (" + process.env.GEMINI_API_KEY.slice(0, 8) + "...)" : "❌ BRAK!");
  
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

  const question = "Co to jest model OSI?";
  const correctAnswer = "Model OSI to 7-warstwowy referencyjny model komunikacji sieciowej.";
  const userAnswer = "Model OSI to model warstwowy do komunikacji w sieciach. Ma 7 warstw.";

  const prompt = `Jesteś nauczycielem oceniającym odpowiedź studenta.

PYTANIE: ${question}
WZORCOWA ODPOWIEDŹ: ${correctAnswer}
ODPOWIEDŹ STUDENTA: ${userAnswer}

Oceń odpowiedź w skali 0-100. Zwróć WYŁĄCZNIE JSON (bez markdown):
{"score": <0-100>, "feedback": "<2-3 zdania po polsku>"}`;

  console.log("\n📤 Wysyłam zapytanie do Gemini...\n");

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    console.log("📥 Surowa odpowiedź:", text);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log("\n✅ Gemini działa!");
      console.log("   Ocena:", parsed.score + "/100");
      console.log("   Feedback:", parsed.feedback);
    } else {
      console.log("⚠️  Odpowiedź nie zawiera JSON");
    }
  } catch (err) {
    console.error("❌ Błąd:", err.message);
  }
}

testGemini();

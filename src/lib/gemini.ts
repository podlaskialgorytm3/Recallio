import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface GradeResult {
  score: number;
  feedback: string;
}

export async function gradeAnswer(
  question: string,
  correctAnswer: string,
  userAnswer: string
): Promise<GradeResult> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `Jesteś nauczycielem oceniającym odpowiedź studenta. Porównaj odpowiedź studenta z wzorcową odpowiedzią.

PYTANIE:
${question}

WZORCOWA ODPOWIEDŹ:
${correctAnswer}

ODPOWIEDŹ STUDENTA:
${userAnswer}

Oceń odpowiedź studenta w skali 0-100, gdzie:
- 0 = całkowicie błędna lub brak odpowiedzi
- 50 = częściowo poprawna, brakuje kluczowych elementów
- 100 = w pełni poprawna, zawiera wszystkie kluczowe informacje

Zwróć WYŁĄCZNIE odpowiedź w formacie JSON (bez markdown, bez backticks):
{"score": <liczba 0-100>, "feedback": "<2-3 zdania po polsku opisujące co student pominął lub podał błędnie, lub pochwała jeśli odpowiedź jest dobra>"}`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        score: Math.min(100, Math.max(0, Math.round(parsed.score))),
        feedback: parsed.feedback || "Brak komentarza.",
      };
    }

    return {
      score: 0,
      feedback: "Nie udało się przetworzyć odpowiedzi AI. Spróbuj ponownie.",
    };
  } catch (error) {
    console.error("Gemini API error:", error);
    return {
      score: 0,
      feedback: "Błąd połączenia z AI. Sprawdź klucz API i spróbuj ponownie.",
    };
  }
}

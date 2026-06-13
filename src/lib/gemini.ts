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
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "object" as const,
        properties: {
          score: { type: "number" as const },
          feedback: { type: "string" as const },
        },
        required: ["score", "feedback"],
      },
    },
  });

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

Odpowiedz w JSON z polami "score" (liczba 0-100) i "feedback" (2-3 zdania po polsku opisujące co student pominął lub podał błędnie, lub pochwała jeśli odpowiedź jest dobra).`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();

    // Attempt 1: direct JSON.parse (should work with responseMimeType)
    try {
      const parsed = JSON.parse(text);
      return {
        score: Math.min(100, Math.max(0, Math.round(parsed.score))),
        feedback: parsed.feedback || "Brak komentarza.",
      };
    } catch {
      // Attempt 2: extract JSON object from text and sanitize
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        // Sanitize: replace unescaped control characters inside string values
        const sanitized = jsonMatch[0].replace(
          /("(?:[^"\\]|\\.)*")|[\n\r\t]/g,
          (match, quoted) => (quoted ? quoted : " ")
        );
        try {
          const parsed = JSON.parse(sanitized);
          return {
            score: Math.min(100, Math.max(0, Math.round(parsed.score))),
            feedback: parsed.feedback || "Brak komentarza.",
          };
        } catch {
          // Attempt 3: regex extraction as last resort
          const scoreMatch = text.match(/"score"\s*:\s*(\d+)/);
          const feedbackMatch = text.match(/"feedback"\s*:\s*"((?:[^"\\]|\\.)*)"/);
          if (scoreMatch) {
            return {
              score: Math.min(100, Math.max(0, Math.round(Number(scoreMatch[1])))),
              feedback: feedbackMatch
                ? feedbackMatch[1].replace(/\\"/g, '"').replace(/\\n/g, " ")
                : "Brak komentarza.",
            };
          }
        }
      }
    }

    console.error("Could not parse Gemini response:", text);
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

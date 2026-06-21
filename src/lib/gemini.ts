import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

interface GradeResult {
  score: number;
  feedback: string;
  usage?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
  };
}

export async function gradeAnswer(
  question: string,
  correctAnswer: string,
  userAnswer: string,
  apiKey?: string,
  modelName?: string
): Promise<GradeResult> {
  if (!apiKey) {
    return {
      score: 0,
      feedback: "Brak klucza API Gemini. Ustaw swój klucz API w Ustawieniach (⚙️), aby korzystać z oceniania AI.",
    };
  }

  const effectiveModel = modelName || "gemini-2.5-flash";

  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: effectiveModel,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          score: { type: SchemaType.NUMBER },
          feedback: { type: SchemaType.STRING },
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
    const usage = response.usageMetadata ? {
      promptTokenCount: response.usageMetadata.promptTokenCount,
      candidatesTokenCount: response.usageMetadata.candidatesTokenCount,
    } : undefined;

    // Attempt 1: direct JSON.parse (should work with responseMimeType)
    try {
      const parsed = JSON.parse(text);
      return {
        score: Math.min(100, Math.max(0, Math.round(parsed.score))),
        feedback: parsed.feedback || "Brak komentarza.",
        usage,
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
            usage,
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
              usage,
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

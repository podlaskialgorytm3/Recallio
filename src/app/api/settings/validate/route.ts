import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { geminiApiKey: true, geminiModel: true },
    });

    // Get user sub for fallback
    const userSub = await prisma.userSubscription.findUnique({
      where: { userId: session.user.id }
    });

    let apiKeyToUse = user?.geminiApiKey;
    let usingGlobal = false;

    if (!apiKeyToUse && userSub && userSub.checkedRemaining > 0) {
      apiKeyToUse = process.env.GEMINI_API_KEY;
      usingGlobal = true;
    }

    // Check 1: Does user have an API key or limit?
    if (!apiKeyToUse) {
      return NextResponse.json({
        valid: false,
        error: "no_key",
        message: "Wyczerpano limity. Dokup pakiet w Cenniku lub ustaw darmowy własny klucz API Gemini w Ustawieniach (⚙️).",
      });
    }

    // Check 2: Does the API key actually work?
    try {
      const genAI = new GoogleGenerativeAI(apiKeyToUse);
      const model = genAI.getGenerativeModel({
        model: user?.geminiModel || "gemini-2.5-flash",
      });
      const result = await model.generateContent("Odpowiedz jednym słowem: OK");
      const text = result.response.text();

      if (text) {
        return NextResponse.json({
          valid: true,
          model: user?.geminiModel || "gemini-2.5-flash",
          usingGlobal,
        });
      }

      return NextResponse.json({
        valid: false,
        error: "empty_response",
        message: "Klucz API nie zwrócił odpowiedzi. Sprawdź status limitów lub klucza.",
      });
    } catch (apiError: unknown) {
      const message = apiError instanceof Error ? apiError.message : "Nieznany błąd";
      let userMessage = "Klucz API Gemini nie działa. Sprawdź go w Ustawieniach (⚙️).";

      if (message.includes("API_KEY") || message.includes("401") || message.includes("403")) {
        userMessage = "Klucz API Gemini jest nieprawidłowy. Zmień go w Ustawieniach (⚙️).";
      } else if (message.includes("quota") || message.includes("429")) {
        userMessage = "Przekroczono limit zapytań API. Spróbuj ponownie później lub zmień klucz.";
      } else if (message.includes("model")) {
        userMessage = "Wybrany model Gemini jest niedostępny. Zmień model w Ustawieniach (⚙️).";
      }

      return NextResponse.json({
        valid: false,
        error: "api_error",
        message: userMessage,
      });
    }
  } catch (error) {
    console.error("Validate API error:", error);
    return NextResponse.json(
      { valid: false, error: "server_error", message: "Błąd serwera podczas walidacji." },
      { status: 500 }
    );
  }
}

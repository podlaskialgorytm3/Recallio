import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const questionCount = formData.get("questionCount")?.toString() || "10";
    const answerLength = formData.get("answerLength")?.toString() || "50";
    const difficulty = formData.get("difficulty")?.toString() || "Mieszany";
    const language = formData.get("language")?.toString() || "Polski";
    const topic = formData.get("topic")?.toString() || "";
    const files = formData.getAll("files") as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Brak plików do przetworzenia." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { geminiApiKey: true, geminiModel: true },
    });

    if (!user?.geminiApiKey) {
      return NextResponse.json(
        { error: "Brak klucza API Gemini. Skonfiguruj swój klucz API w Ustawieniach (⚙️)." },
        { status: 400 }
      );
    }

    const effectiveModel = user.geminiModel || "gemini-2.5-flash";
    const genAI = new GoogleGenerativeAI(user.geminiApiKey);

    const parts: any[] = [];
    
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      if (file.name.toLowerCase().endsWith('.pdf')) {
        parts.push({
          inlineData: {
            data: buffer.toString("base64"),
            mimeType: "application/pdf"
          }
        });
      } else {
        parts.push({
          text: `Zawartość pliku ${file.name}:\n${buffer.toString("utf-8")}`
        });
      }
    }

    let prompt = `Wygeneruj zestaw ${questionCount} pytań i odpowiedzi na podstawie załączonego dokumentu.\n`;
    prompt += `Długość odpowiedzi: około ${answerLength} słów.\n`;
    prompt += `Poziom trudności: ${difficulty}.\n`;
    
    if (language !== "Auto") {
      prompt += `Język generowanych pytań i odpowiedzi: ${language}.\n`;
    }

    if (topic) {
      prompt += `Zakres tematyczny: Skup się tylko na: ${topic}.\n`;
    }
    
    prompt += `WAŻNE: Postaraj się generować unikalne, różnorodne pytania.\n`;
    prompt += `FORMAT: Pytania mają mieć WYŁĄCZNIE formę pytania otwartego (pytanie-odpowiedź). Brak pytań wielokrotnego wyboru, prawda/fałsz itp. To jedyny akceptowalny format.\n`;
    prompt += `Zwróć odpowiedź WYŁĄCZNIE w formacie JSON jako tablicę obiektów, bez żadnych znaczników markdown:\n`;
    prompt += `[ { "id": 1, "question": "pytanie", "answer": "odpowiedź" } ]\n`;

    parts.push({ text: prompt });

    const model = genAI.getGenerativeModel({
      model: effectiveModel,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              id: { type: SchemaType.INTEGER },
              question: { type: SchemaType.STRING },
              answer: { type: SchemaType.STRING },
            },
            required: ["id", "question", "answer"],
          }
        },
      },
    });

    const result = await model.generateContent(parts);
    const text = result.response.text().trim();
    
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // fallback sanitization
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
         parsed = JSON.parse(jsonMatch[0].replace(/("(?:[^"\\]|\\.)*")|[\n\r\t]/g, (m, q) => (q ? q : " ")));
      } else {
         throw new Error("Nie udało się odczytać odpowiedzi JSON z modelu AI.");
      }
    }

    return NextResponse.json({ questions: parsed });

  } catch (error: any) {
    console.error("API Generate error:", error);
    return NextResponse.json(
      { error: error.message || "Wystąpił błąd podczas generowania pytań" },
      { status: 500 }
    );
  }
}

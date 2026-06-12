import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, questions } = await req.json();

    if (!name || !questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: "Nazwa i pytania są wymagane" },
        { status: 400 }
      );
    }

    if (questions.length > 200) {
      return NextResponse.json(
        { error: "Maksymalna liczba pytań to 200" },
        { status: 400 }
      );
    }

    // Validate each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question || !q.answer) {
        return NextResponse.json(
          { error: `Pytanie ${i + 1}: brak pola "question" lub "answer"` },
          { status: 400 }
        );
      }
    }

    const questionSet = await prisma.questionSet.create({
      data: {
        name,
        userId: session.user.id,
        questions: {
          create: questions.map(
            (q: { id?: number; question: string; answer: string }, index: number) => ({
              externalId: q.id ?? index + 1,
              question: q.question,
              answer: q.answer,
            })
          ),
        },
      },
      include: {
        _count: { select: { questions: true } },
      },
    });

    return NextResponse.json(questionSet, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd serwera" },
      { status: 500 }
    );
  }
}

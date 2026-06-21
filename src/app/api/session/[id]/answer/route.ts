import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gradeAnswer } from "@/lib/gemini";
import { addTokensCost } from "@/lib/billing";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sessionId } = await params;

  try {
    const { questionId, userAnswer, roundId } = await req.json();

    if (!questionId || !userAnswer || !roundId) {
      return NextResponse.json(
        { error: "questionId, userAnswer i roundId są wymagane" },
        { status: 400 }
      );
    }

    // Verify session belongs to user
    const studySession = await prisma.session.findFirst({
      where: { id: sessionId, userId: session.user.id },
    });

    if (!studySession) {
      return NextResponse.json(
        { error: "Nie znaleziono sesji" },
        { status: 404 }
      );
    }

    // Get the question with correct answer
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return NextResponse.json(
        { error: "Nie znaleziono pytania" },
        { status: 404 }
      );
    }

    // Get user's Gemini settings
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { geminiApiKey: true, geminiModel: true },
    });

    // Grade with AI (requires user's own API key from settings)
    const gradeResult = await gradeAnswer(
      question.question,
      question.answer,
      userAnswer,
      user?.geminiApiKey || undefined,
      user?.geminiModel || undefined
    );

    // Track AI cost
    if (gradeResult.usage) {
      await addTokensCost(
        session.user.id,
        gradeResult.usage.promptTokenCount,
        gradeResult.usage.candidatesTokenCount,
        !!user?.geminiApiKey
      );
    }

    // Save the answer
    const roundAnswer = await prisma.roundAnswer.create({
      data: {
        roundId,
        questionId,
        userAnswer,
        score: gradeResult.score,
        feedback: gradeResult.feedback,
      },
    });

    return NextResponse.json({
      ...roundAnswer,
      correctAnswer: question.answer,
    });
  } catch (error) {
    console.error("Answer grading error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas oceniania odpowiedzi" },
      { status: 500 }
    );
  }
}

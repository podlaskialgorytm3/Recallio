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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { geminiApiKey: true, geminiModel: true },
    });

    const userSub = await prisma.userSubscription.findUnique({
      where: { userId: session.user.id }
    });

    const isOwnKey = !!user?.geminiApiKey;

    if (!isOwnKey && (!userSub || userSub.checkedRemaining <= 0)) {
      return NextResponse.json(
        { error: "Wyczerpałeś limit sprawdzonych pytań. Zgłoś się do administratora, dokup pakiet lub podepnij własny klucz API w Ustawieniach." },
        { status: 403 }
      );
    }

    const apiKeyToUse = user?.geminiApiKey || process.env.GEMINI_API_KEY;

    if (!apiKeyToUse) {
      return NextResponse.json(
        { error: "Brak globalnego oraz prywatnego klucza API Gemini." },
        { status: 400 }
      );
    }

    // Grade with AI
    const gradeResult = await gradeAnswer(
      question.question,
      question.answer,
      userAnswer,
      apiKeyToUse,
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

    // Decrement check limit only if using global key
    if (!isOwnKey) {
      await prisma.userSubscription.update({
        where: { userId: session.user.id },
        data: { checkedRemaining: { decrement: 1 } }
      });
    }

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

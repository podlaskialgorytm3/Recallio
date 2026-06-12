import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const studySession = await prisma.session.findFirst({
      where: { id: sessionId, userId: session.user.id, status: "active" },
      include: {
        questionSet: {
          include: {
            questions: { orderBy: { externalId: "asc" } },
          },
        },
        rounds: {
          include: {
            answers: {
              include: { question: true },
            },
          },
          orderBy: { roundNumber: "desc" },
        },
      },
    });

    if (!studySession) {
      return NextResponse.json(
        { error: "Nie znaleziono aktywnej sesji" },
        { status: 404 }
      );
    }

    const lastRound = studySession.rounds[0]; // most recent round (desc order)

    if (!lastRound) {
      // No rounds yet - create the first round
      const round = await prisma.round.create({
        data: { sessionId, roundNumber: 1 },
      });

      let questions = studySession.questionSet.questions;
      if (studySession.mode === "random") {
        questions = questions.sort(() => Math.random() - 0.5);
      }

      return NextResponse.json({
        round,
        questions,
        resumeIndex: 0,
        existingAnswers: [],
      });
    }

    // Determine which questions were in this round
    const answeredQuestionIds = new Set(
      lastRound.answers.map((a) => a.questionId)
    );

    // Get questions for this round - figure out which questions the round was for
    let roundQuestions;
    if (lastRound.roundNumber === 1) {
      // First round uses all questions
      roundQuestions = studySession.questionSet.questions;
    } else {
      // Later rounds: find questions that were supposed to be repeated
      // Check the previous round's answers that were below threshold
      const prevRound = studySession.rounds[1]; // previous round (array is desc)
      if (prevRound) {
        const failedIds = prevRound.answers
          .filter((a) => (a.score ?? 0) < studySession.threshold)
          .map((a) => a.questionId);
        roundQuestions = studySession.questionSet.questions.filter((q) =>
          failedIds.includes(q.id)
        );
      } else {
        roundQuestions = studySession.questionSet.questions;
      }
    }

    if (studySession.mode === "random") {
      roundQuestions = [...roundQuestions].sort(() => Math.random() - 0.5);
    }

    // Check if all questions in the round have been answered
    const allAnswered = roundQuestions.every((q) =>
      answeredQuestionIds.has(q.id)
    );

    if (allAnswered) {
      // All questions answered but round not completed - 
      // Build existing answers for round-summary
      const existingAnswers = lastRound.answers.map((a) => ({
        questionId: a.questionId,
        question: a.question.question,
        correctAnswer: a.question.answer,
        userAnswer: a.userAnswer,
        score: a.score ?? 0,
        feedback: a.feedback ?? "",
        externalId: a.question.externalId,
      }));

      return NextResponse.json({
        round: {
          id: lastRound.id,
          roundNumber: lastRound.roundNumber,
        },
        questions: roundQuestions,
        resumeIndex: roundQuestions.length, // signals "go to round-summary"
        existingAnswers,
        allAnswered: true,
      });
    }

    // Find resume index - first unanswered question
    const resumeIndex = roundQuestions.findIndex(
      (q) => !answeredQuestionIds.has(q.id)
    );

    // Build existing answers for context
    const existingAnswers = lastRound.answers.map((a) => ({
      questionId: a.questionId,
      question: a.question.question,
      correctAnswer: a.question.answer,
      userAnswer: a.userAnswer,
      score: a.score ?? 0,
      feedback: a.feedback ?? "",
      externalId: a.question.externalId,
    }));

    return NextResponse.json({
      round: {
        id: lastRound.id,
        roundNumber: lastRound.roundNumber,
      },
      questions: roundQuestions,
      resumeIndex: resumeIndex >= 0 ? resumeIndex : 0,
      existingAnswers,
    });
  } catch (error) {
    console.error("Resume error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd serwera" },
      { status: 500 }
    );
  }
}

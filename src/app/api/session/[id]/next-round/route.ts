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
    const { questionIds } = await req.json();

    // Verify session belongs to user
    const studySession = await prisma.session.findFirst({
      where: { id: sessionId, userId: session.user.id },
      include: {
        rounds: {
          orderBy: { roundNumber: "desc" },
          take: 1,
        },
      },
    });

    if (!studySession) {
      return NextResponse.json(
        { error: "Nie znaleziono sesji" },
        { status: 404 }
      );
    }

    const nextRoundNumber =
      studySession.rounds.length > 0
        ? studySession.rounds[0].roundNumber + 1
        : 1;

    const round = await prisma.round.create({
      data: {
        sessionId,
        roundNumber: nextRoundNumber,
      },
    });

    // Get questions for this round
    let questions;
    if (questionIds && questionIds.length > 0) {
      questions = await prisma.question.findMany({
        where: { id: { in: questionIds } },
        orderBy:
          studySession.mode === "random"
            ? undefined
            : { externalId: "asc" },
      });

      // Shuffle if random mode
      if (studySession.mode === "random") {
        questions = questions.sort(() => Math.random() - 0.5);
      }
    } else {
      questions = await prisma.question.findMany({
        where: { questionSetId: studySession.questionSetId },
        orderBy:
          studySession.mode === "random"
            ? undefined
            : { externalId: "asc" },
      });

      if (studySession.mode === "random") {
        questions = questions.sort(() => Math.random() - 0.5);
      }
    }

    return NextResponse.json({
      round,
      questions,
    });
  } catch (error) {
    console.error("Next round error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd serwera" },
      { status: 500 }
    );
  }
}

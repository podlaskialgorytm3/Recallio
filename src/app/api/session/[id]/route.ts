import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const studySession = await prisma.session.findFirst({
    where: { id, userId: session.user.id },
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
        orderBy: { roundNumber: "asc" },
      },
    },
  });

  if (!studySession) {
    return NextResponse.json(
      { error: "Nie znaleziono sesji" },
      { status: 404 }
    );
  }

  return NextResponse.json(studySession);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const studySession = await prisma.session.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!studySession) {
    return NextResponse.json(
      { error: "Nie znaleziono sesji" },
      { status: 404 }
    );
  }

  const updated = await prisma.session.update({
    where: { id },
    data: {
      mode: body.mode ?? studySession.mode,
      threshold: body.threshold ?? studySession.threshold,
      status: body.status ?? studySession.status,
      completedAt: body.status === "finished" ? new Date() : undefined,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const studySession = await prisma.session.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!studySession) {
    return NextResponse.json(
      { error: "Nie znaleziono sesji" },
      { status: 404 }
    );
  }

  await prisma.session.delete({ where: { id } });

  return NextResponse.json({ message: "Sesja usunięta" });
}

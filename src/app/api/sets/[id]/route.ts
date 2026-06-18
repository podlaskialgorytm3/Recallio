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

  // Allow fetching own sets OR public sets
  const set = await prisma.questionSet.findFirst({
    where: {
      id,
      OR: [
        { userId: session.user.id },
        { isPublic: true },
      ],
    },
    include: {
      questions: { orderBy: { externalId: "asc" } },
      _count: { select: { questions: true } },
      user: {
        select: {
          name: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  if (!set) {
    return NextResponse.json({ error: "Nie znaleziono zestawu" }, { status: 404 });
  }

  return NextResponse.json({
    ...set,
    isOwner: set.userId === session.user.id,
  });
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

  const set = await prisma.questionSet.findFirst({
    where: { id, userId: session.user.id },
    include: { questions: true },
  });

  if (!set) {
    return NextResponse.json({ error: "Nie znaleziono zestawu" }, { status: 404 });
  }

  try {
    const body = await req.json();

    // Simple visibility toggle (backwards compatible)
    if (body.isPublic !== undefined && !body.questions) {
      const updated = await prisma.questionSet.update({
        where: { id },
        data: { isPublic: !!body.isPublic },
        select: { id: true, isPublic: true },
      });
      return NextResponse.json(updated);
    }

    // Full set edit: name + questions
    const { name, questions } = body;

    if (questions && !Array.isArray(questions)) {
      return NextResponse.json(
        { error: "Pytania muszą być tablicą" },
        { status: 400 }
      );
    }

    if (questions && questions.length > 200) {
      return NextResponse.json(
        { error: "Maksymalna liczba pytań to 200" },
        { status: 400 }
      );
    }

    // Validate questions
    if (questions) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.question || !q.answer) {
          return NextResponse.json(
            { error: `Pytanie ${i + 1}: brak pola "question" lub "answer"` },
            { status: 400 }
          );
        }
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) {
      updateData.name = name;
    }

    if (questions) {
      const existingIds = set.questions.map((q) => q.id);
      const incomingIds = questions
        .filter((q: { id?: string }) => q.id)
        .map((q: { id: string }) => q.id);

      // IDs to delete: existing IDs not present in incoming
      const idsToDelete = existingIds.filter((eid) => !incomingIds.includes(eid));

      // Questions to update vs create
      const toUpdate = questions.filter((q: { id?: string }) => q.id && existingIds.includes(q.id));
      const toCreate = questions.filter((q: { id?: string }) => !q.id);

      // Perform all operations in a transaction
      await prisma.$transaction([
        // Delete removed questions
        ...(idsToDelete.length > 0
          ? [prisma.question.deleteMany({ where: { id: { in: idsToDelete } } })]
          : []),
        // Update existing questions
        ...toUpdate.map((q: { id: string; question: string; answer: string; externalId?: number }, index: number) =>
          prisma.question.update({
            where: { id: q.id },
            data: {
              question: q.question,
              answer: q.answer,
              externalId: q.externalId ?? index + 1,
            },
          })
        ),
        // Create new questions
        ...(toCreate.length > 0
          ? [
              prisma.question.createMany({
                data: toCreate.map(
                  (q: { question: string; answer: string; externalId?: number }, index: number) => ({
                    questionSetId: id,
                    question: q.question,
                    answer: q.answer,
                    externalId: q.externalId ?? toUpdate.length + index + 1,
                  })
                ),
              }),
            ]
          : []),
        // Update set name if provided
        ...(name !== undefined
          ? [prisma.questionSet.update({ where: { id }, data: { name } })]
          : []),
      ]);
    } else if (name !== undefined) {
      await prisma.questionSet.update({
        where: { id },
        data: { name },
      });
    }

    // Return updated set
    const updated = await prisma.questionSet.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { externalId: "asc" } },
        _count: { select: { questions: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Set update error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas aktualizacji zestawu" },
      { status: 500 }
    );
  }
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

  const set = await prisma.questionSet.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!set) {
    return NextResponse.json({ error: "Nie znaleziono zestawu" }, { status: 404 });
  }

  await prisma.questionSet.delete({ where: { id } });

  return NextResponse.json({ message: "Zestaw usunięty" });
}

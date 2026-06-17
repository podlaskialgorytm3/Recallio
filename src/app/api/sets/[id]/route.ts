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

  // Only owner can change visibility
  const set = await prisma.questionSet.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!set) {
    return NextResponse.json({ error: "Nie znaleziono zestawu" }, { status: 404 });
  }

  try {
    const { isPublic } = await req.json();

    const updated = await prisma.questionSet.update({
      where: { id },
      data: { isPublic: !!isPublic },
      select: { id: true, isPublic: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Visibility update error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas zmiany widoczności" },
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

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
    const { questionSetId } = await req.json();

    const questionSet = await prisma.questionSet.findFirst({
      where: {
        id: questionSetId,
        OR: [
          { userId: session.user.id },
          { isPublic: true },
        ],
      },
    });

    if (!questionSet) {
      return NextResponse.json(
        { error: "Nie znaleziono zestawu" },
        { status: 404 }
      );
    }

    const newSession = await prisma.session.create({
      data: {
        userId: session.user.id,
        questionSetId,
      },
    });

    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd serwera" },
      { status: 500 }
    );
  }
}

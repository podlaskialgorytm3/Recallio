import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sets = await prisma.questionSet.findMany({
      where: { isPublic: true },
      include: {
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(sets);
  } catch (error) {
    console.error("Public sets error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd serwera" },
      { status: 500 }
    );
  }
}

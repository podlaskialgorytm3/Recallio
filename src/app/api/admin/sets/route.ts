import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
    }

    const sets = await prisma.questionSet.findMany({
      include: {
        user: {
          select: {
            email: true,
            name: true,
          }
        },
        _count: {
          select: { questions: true, sessions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(sets);
  } catch (error) {
    console.error("Error fetching sets:", error);
    return NextResponse.json(
      { error: "Błąd podczas pobierania zestawów" },
      { status: 500 }
    );
  }
}

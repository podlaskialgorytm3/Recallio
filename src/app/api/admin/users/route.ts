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

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        globalKeyCost: true,
        ownKeyCost: true,
        geminiApiKey: true,
        userSubscription: {
          select: {
            planId: true,
            checkedRemaining: true,
            generatedRemaining: true,
            plan: { select: { name: true } }
          }
        },
        _count: {
          select: { questionSets: true, sessions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const mappedUsers = users.map(u => {
      const { geminiApiKey, ...rest } = u;
      return {
        ...rest,
        hasOwnKey: !!geminiApiKey
      };
    });

    return NextResponse.json(mappedUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Błąd podczas pobierania użytkowników" },
      { status: 500 }
    );
  }
}

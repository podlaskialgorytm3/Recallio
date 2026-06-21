import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  try {
    const history = await prisma.purchaseHistory.findMany({
      where: { userId: session.user.id },
      orderBy: { purchasedAt: 'desc' },
      include: {
        plan: {
          select: { name: true }
        }
      }
    });

    const userSub = await prisma.userSubscription.findUnique({
      where: { userId: session.user.id },
      include: {
        plan: {
          select: { name: true, checkLimit: true, generateLimit: true }
        }
      }
    });

    return NextResponse.json({
      activePlan: userSub?.plan || null,
      history
    });
  } catch (error) {
    console.error("Error fetching billing history:", error);
    return NextResponse.json({ error: "Wystąpił błąd" }, { status: 500 });
  }
}

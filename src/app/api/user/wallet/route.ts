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
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { geminiApiKey: true }
    });

    const sub = await prisma.userSubscription.findUnique({
      where: { userId: session.user.id }
    });

    return NextResponse.json({
      hasOwnKey: !!user?.geminiApiKey,
      checkedRemaining: sub?.checkedRemaining || 0,
      generatedRemaining: sub?.generatedRemaining || 0,
    });
  } catch (error) {
    console.error("Error fetching wallet data:", error);
    return NextResponse.json({ error: "Wystąpił błąd" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const { id: userId } = await params;

  try {
    const { addChecked, addGenerated, planId, action } = await req.json();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { userSubscription: true }
    });

    if (!user) {
      return NextResponse.json({ error: "Nie znaleziono użytkownika" }, { status: 404 });
    }

    // Action: "EDIT_LIMITS" or "ASSIGN_PLAN"
    if (action === "EDIT_LIMITS" || action === "ADD_LIMITS") {
      const newChecked = Number(addChecked) || 0;
      const newGenerated = Number(addGenerated) || 0;

      await prisma.userSubscription.upsert({
        where: { userId },
        create: {
          userId,
          checkedRemaining: newChecked,
          generatedRemaining: newGenerated,
        },
        update: {
          checkedRemaining: newChecked,
          generatedRemaining: newGenerated,
        }
      });

      return NextResponse.json({ success: true, message: "Limity zaktualizowane" });
    } 
    
    if (action === "ASSIGN_PLAN" && planId) {
      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      if (!plan) return NextResponse.json({ error: "Nie znaleziono planu" }, { status: 404 });

      await prisma.userSubscription.upsert({
        where: { userId },
        create: {
          userId,
          planId,
          checkedRemaining: plan.checkLimit,
          generatedRemaining: plan.generateLimit,
        },
        update: {
          planId,
          checkedRemaining: { increment: plan.checkLimit },
          generatedRemaining: { increment: plan.generateLimit },
        }
      });

      // Log purchase history as a free manual assign
      await prisma.purchaseHistory.create({
        data: {
          userId,
          planId,
          price: 0 // manual assign
        }
      });

      return NextResponse.json({ success: true, message: "Plan przypisany" });
    }

    return NextResponse.json({ error: "Nieprawidłowa akcja" }, { status: 400 });
  } catch (error) {
    console.error("Error updating user limits:", error);
    return NextResponse.json({ error: "Błąd serwera przy aktualizacji limitów" }, { status: 500 });
  }
}

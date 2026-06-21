import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const sessionUser = await getServerSession(authOptions);

  if (!sessionUser?.user?.id) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Brak sessionId" }, { status: 400 });
    }

    // Check if this session was already fulfilled
    const existingPurchase = await prisma.purchaseHistory.findUnique({
      where: { stripeSessionId: sessionId }
    });

    if (existingPurchase) {
      return NextResponse.json({ success: true, message: "Już zrealizowano." });
    }

    // Retrieve session from Stripe
    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);

    if (stripeSession.payment_status !== "paid") {
      return NextResponse.json({ error: "Płatność nie została jeszcze opłacona." }, { status: 400 });
    }

    const planId = stripeSession.metadata?.planId;
    const userId = stripeSession.client_reference_id;

    if (!planId || !userId) {
      return NextResponse.json({ error: "Brak metadanych w sesji Stripe" }, { status: 400 });
    }

    // Ensure the user fulfilling is the one who bought it (or admin)
    if (userId !== sessionUser.user.id) {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
    }

    // Fulfill the order
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan nie istnieje" }, { status: 404 });
    }

    // 1. Record purchase FIRST to prevent race condition multiple increments
    try {
      await prisma.purchaseHistory.create({
        data: {
          userId,
          planId,
          price: plan.price,
          stripeSessionId: stripeSession.id,
        }
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        // Race condition: another request already fulfilled this session concurrently
        console.log("Session already fulfilled concurrently", stripeSession.id);
        return NextResponse.json({ success: true, message: "Już zrealizowano." });
      }
      throw e;
    }

    // 2. Update user subscription limits ONLY if purchase record was successful
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

    // Save Stripe Customer ID to User
    if (stripeSession.customer && typeof stripeSession.customer === "string") {
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: stripeSession.customer }
      });
    }

    return NextResponse.json({ success: true, message: "Pomyślnie zrealizowano zakup." });
  } catch (error: any) {
    console.error("Error fulfilling order from client:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas realizacji" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") as string;

  let event: Stripe.Event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("Missing STRIPE_WEBHOOK_SECRET");
    }

    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed. ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId = session.client_reference_id;
    const planId = session.metadata?.planId;

    if (!userId || !planId) {
      console.error("Missing userId or planId in webhook metadata", session.id);
      return NextResponse.json({ error: "Webhook Error: Missing metadata" }, { status: 400 });
    }

    try {
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: planId }
      });

      if (!plan) {
        throw new Error("Plan not found");
      }

      // Update user subscription limits
      await prisma.userSubscription.upsert({
        where: { userId },
        create: {
          userId,
          planId,
          checkedRemaining: plan.checkLimit,
          generatedRemaining: plan.generateLimit,
        },
        update: {
          planId, // optionally, you could keep a history of plans or just record the last one
          checkedRemaining: { increment: plan.checkLimit },
          generatedRemaining: { increment: plan.generateLimit },
        }
      });

      // Record purchase
      await prisma.purchaseHistory.create({
        data: {
          userId,
          planId,
          price: plan.price,
          stripeSessionId: session.id,
        }
      });

      // Optional: Save Stripe Customer ID to User
      if (session.customer && typeof session.customer === "string") {
        await prisma.user.update({
          where: { id: userId },
          data: { stripeCustomerId: session.customer }
        });
      }

    } catch (error) {
      console.error("Error fulfilling order:", error);
      return NextResponse.json({ error: "Webhook Error: Fulfillment failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}

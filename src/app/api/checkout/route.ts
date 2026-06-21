import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  try {
    const { planId } = await req.json();

    if (!planId) {
      return NextResponse.json({ error: "Brak ID planu" }, { status: 400 });
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.isActive) {
      return NextResponse.json({ error: "Plan nie istnieje lub jest nieaktywny" }, { status: 404 });
    }

    // Prepare absolute URLs for success and cancel redirect
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      client_reference_id: session.user.id,
      metadata: {
        planId: plan.id,
      },
      line_items: [
        {
          price_data: {
            currency: "pln",
            product_data: {
              name: plan.name,
              description: `Paczka zawierająca ${plan.checkLimit} pytań do sprawdzenia oraz ${plan.generateLimit} do wygenerowania. ${plan.description || ''}`,
            },
            unit_amount: Math.round(plan.price * 100), // Stripe expects amounts in the smallest currency unit (grosze)
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?canceled=true`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas generowania płatności" },
      { status: 500 }
    );
  }
}

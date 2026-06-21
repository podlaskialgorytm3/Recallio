import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/plans
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  try {
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { users: true, purchases: true }
        }
      }
    });
    return NextResponse.json(plans);
  } catch (error) {
    console.error("Error fetching plans:", error);
    return NextResponse.json({ error: "Błąd podczas pobierania planów" }, { status: 500 });
  }
}

// POST /api/admin/plans
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { 
      name, description, checkLimit, generateLimit, price, 
      resetType, resetPeriodDays, validDays, isActive 
    } = body;

    if (!name || checkLimit === undefined || generateLimit === undefined || price === undefined) {
      return NextResponse.json({ error: "Wymagane pola to: nazwa, limit sprawdzeń, limit generacji, cena" }, { status: 400 });
    }

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name,
        description,
        checkLimit: Number(checkLimit),
        generateLimit: Number(generateLimit),
        price: Number(price),
        resetType: resetType || "ONETIME",
        resetPeriodDays: resetPeriodDays ? Number(resetPeriodDays) : null,
        validDays: validDays ? Number(validDays) : null,
        isActive: isActive !== undefined ? isActive : true,
      }
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error: any) {
    console.error("Error creating plan:", error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Plan o takiej nazwie już istnieje" }, { status: 400 });
    }
    return NextResponse.json({ error: "Błąd podczas tworzenia planu" }, { status: 500 });
  }
}

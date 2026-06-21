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

  const { id } = await params;

  try {
    const body = await req.json();
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.checkLimit !== undefined) updateData.checkLimit = Number(body.checkLimit);
    if (body.generateLimit !== undefined) updateData.generateLimit = Number(body.generateLimit);
    if (body.price !== undefined) updateData.price = Number(body.price);
    if (body.resetType !== undefined) updateData.resetType = body.resetType;
    if (body.resetPeriodDays !== undefined) updateData.resetPeriodDays = body.resetPeriodDays ? Number(body.resetPeriodDays) : null;
    if (body.validDays !== undefined) updateData.validDays = body.validDays ? Number(body.validDays) : null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const plan = await prisma.subscriptionPlan.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Error updating plan:", error);
    return NextResponse.json({ error: "Błąd podczas aktualizacji planu" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const { id } = await params;

  try {
    // Check if any user is currently using this plan
    const usersCount = await prisma.userSubscription.count({
      where: { planId: id }
    });

    if (usersCount > 0) {
      return NextResponse.json({ 
        error: "Nie można usunąć planu, do którego przypisani są użytkownicy. Wyłącz go (zmień status na ukryty)." 
      }, { status: 400 });
    }

    await prisma.subscriptionPlan.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting plan:", error);
    return NextResponse.json({ error: "Błąd podczas usuwania planu" }, { status: 500 });
  }
}

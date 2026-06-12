import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const set = await prisma.questionSet.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!set) {
    return NextResponse.json({ error: "Nie znaleziono zestawu" }, { status: 404 });
  }

  await prisma.questionSet.delete({ where: { id } });

  return NextResponse.json({ message: "Zestaw usunięty" });
}

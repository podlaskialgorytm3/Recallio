import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas pobierania profilu" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { firstName, lastName, name } = body;

    // Validate lengths
    if (firstName && firstName.length > 50) {
      return NextResponse.json(
        { error: "Imię może mieć maksymalnie 50 znaków" },
        { status: 400 }
      );
    }
    if (lastName && lastName.length > 50) {
      return NextResponse.json(
        { error: "Nazwisko może mieć maksymalnie 50 znaków" },
        { status: 400 }
      );
    }
    if (name && name.length > 30) {
      return NextResponse.json(
        { error: "Nickname może mieć maksymalnie 30 znaków" },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        firstName: firstName ?? undefined,
        lastName: lastName ?? undefined,
        name: name ?? undefined,
      },
      select: {
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Profile PUT error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas zapisywania profilu" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Mask API key for safe display (show first 6 and last 4 chars)
function maskApiKey(key: string): string {
  if (key.length <= 10) return "••••••••";
  return key.slice(0, 6) + "••••••••" + key.slice(-4);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { geminiApiKey: true, geminiModel: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      hasApiKey: !!user.geminiApiKey,
      maskedApiKey: user.geminiApiKey ? maskApiKey(user.geminiApiKey) : null,
      geminiModel: user.geminiModel,
    });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas pobierania ustawień" },
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
    const { geminiApiKey, geminiModel } = body;

    const allowedModels = [
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
    ];

    if (geminiModel && !allowedModels.includes(geminiModel)) {
      return NextResponse.json(
        { error: "Nieprawidłowy model Gemini" },
        { status: 400 }
      );
    }

    // Build update data – only include fields that were provided
    const updateData: { geminiApiKey?: string | null; geminiModel?: string } = {};

    if (geminiApiKey !== undefined) {
      // Allow setting to empty string or null to clear the key
      updateData.geminiApiKey = geminiApiKey || null;
    }

    if (geminiModel) {
      updateData.geminiModel = geminiModel;
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: { geminiApiKey: true, geminiModel: true },
    });

    return NextResponse.json({
      hasApiKey: !!updatedUser.geminiApiKey,
      maskedApiKey: updatedUser.geminiApiKey
        ? maskApiKey(updatedUser.geminiApiKey)
        : null,
      geminiModel: updatedUser.geminiModel,
    });
  } catch (error) {
    console.error("Settings PUT error:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas zapisywania ustawień" },
      { status: 500 }
    );
  }
}

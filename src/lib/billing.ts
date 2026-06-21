import { prisma } from "@/lib/prisma";

// Estimated cost for gemini-2.5-flash (hypothetical realistic pricing)
// $0.075 per 1M input tokens
// $0.30 per 1M output tokens
const COST_PER_1M_INPUT = 0.075;
const COST_PER_1M_OUTPUT = 0.30;

export async function addTokensCost(
  userId: string,
  inputTokens: number,
  outputTokens: number,
  isOwnKey: boolean
) {
  const inputCost = (inputTokens / 1_000_000) * COST_PER_1M_INPUT;
  const outputCost = (outputTokens / 1_000_000) * COST_PER_1M_OUTPUT;
  const totalCost = inputCost + outputCost;

  if (totalCost === 0) return;

  if (isOwnKey) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        ownKeyCost: { increment: totalCost }
      }
    });
  } else {
    await prisma.user.update({
      where: { id: userId },
      data: {
        globalKeyCost: { increment: totalCost }
      }
    });
  }
}

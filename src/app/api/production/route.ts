import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return new Response("Unauthorized", { status: 401 })

  const body = await request.json()
  const { weekId, production } = body as {
    weekId: number
    production: {
      acucarVhp?: number | null
      acucarCristal?: number | null
      etanolAnidro?: number | null
      etanolHidratado?: number | null
      canaEtanol?: number | null
      canaAcucar?: number | null
    }
  }

  const result = await prisma.productionRecord.upsert({
    where: { weekId },
    update: {
      ...production,
      userId: session.user.id,
    },
    create: {
      weekId,
      ...production,
      userId: session.user.id,
    },
  })

  return Response.json(result)
}

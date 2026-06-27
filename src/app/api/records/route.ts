import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return new Response("Unauthorized", { status: 401 })

  const body = await request.json()
  const { weekId, records } = body as {
    weekId: number
    records: { productId: number; weeklyConsumption: number | null; weeklyCost: number | null }[]
  }

  const upserted = await Promise.all(
    records.map((r) =>
      prisma.weeklyRecord.upsert({
        where: { weekId_productId: { weekId, productId: r.productId } },
        update: {
          weeklyConsumption: r.weeklyConsumption,
          weeklyCost: r.weeklyCost,
          userId: session.user.id,
        },
        create: {
          weekId,
          productId: r.productId,
          weeklyConsumption: r.weeklyConsumption,
          weeklyCost: r.weeklyCost,
          userId: session.user.id,
        },
      })
    )
  )

  return Response.json(upserted)
}

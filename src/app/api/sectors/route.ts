import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session) return new Response("Unauthorized", { status: 401 })

  const sectors = await prisma.sector.findMany({
    orderBy: { order: "asc" },
    include: { products: { orderBy: { order: "asc" } } },
  })

  return Response.json(sectors)
}

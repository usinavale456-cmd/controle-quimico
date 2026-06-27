import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return new Response("Unauthorized", { status: 401 })

  const { id } = await params
  const weeks = await prisma.week.findMany({
    where: { safraId: Number(id) },
    orderBy: { weekNumber: "asc" },
    include: {
      records: {
        include: { product: { include: { sector: true } } },
      },
      production: true,
    },
  })

  return Response.json(weeks)
}

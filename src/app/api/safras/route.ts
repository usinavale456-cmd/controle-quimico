import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session) return new Response("Unauthorized", { status: 401 })

  const safras = await prisma.safra.findMany({ orderBy: { startDate: "desc" } })
  return Response.json(safras)
}

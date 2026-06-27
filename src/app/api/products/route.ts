import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session) return new Response("Unauthorized", { status: 401 })

  const body = await request.json()
  const { products } = body as {
    products: { id: number; unitPrice: number | null; target: number | null }[]
  }

  const updated = await Promise.all(
    products.map((p) =>
      prisma.product.update({
        where: { id: p.id },
        data: { unitPrice: p.unitPrice, target: p.target },
      })
    )
  )

  return Response.json(updated)
}

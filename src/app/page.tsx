import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import DashboardHome from "./(dashboard)/dashboard-home"

export default async function Home() {
  const session = await auth()
  if (!session) redirect("/login")

  const currentSafra = await prisma.safra.findFirst({ orderBy: { startDate: "desc" } })
  const totalWeeks = currentSafra ? await prisma.week.count({ where: { safraId: currentSafra.id } }) : 0

  const sectors = await prisma.sector.findMany({
    orderBy: { order: "asc" },
    include: { products: { orderBy: { order: "asc" } } },
  })

  const lastWeek = currentSafra
    ? await prisma.week.findFirst({
        where: { safraId: currentSafra.id },
        orderBy: { weekNumber: "desc" },
        include: { records: { include: { product: true } }, production: true },
      })
    : null

  const safraTotals = currentSafra
    ? await prisma.productionRecord.aggregate({
        where: { week: { safraId: currentSafra.id } },
        _sum: { canaEtanol: true, canaAcucar: true, etanolHidratado: true, acucarVhp: true },
      })
    : null

  const canaMoidaSafra = (safraTotals?._sum.canaEtanol ?? 0) + (safraTotals?._sum.canaAcucar ?? 0)
  const etanolSafra = safraTotals?._sum.etanolHidratado ?? 0
  const acucarSafra = safraTotals?._sum.acucarVhp ?? 0

  return (
    <DashboardHome
      currentSafra={currentSafra}
      totalWeeks={totalWeeks}
      sectors={sectors}
      lastWeek={lastWeek}
      safraTotals={{ canaMoida: canaMoidaSafra, etanol: etanolSafra, acucar: acucarSafra }}
    />
  )
}

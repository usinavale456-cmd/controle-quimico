"use client"

import Link from "next/link"
import { Building2, FileBarChart, Droplets, TrendingUp, FlaskConical, DollarSign, CalendarDays, Factory, ChevronRight, Hexagon, Tractor, Package } from "lucide-react"

interface Product {
  id: number; name: string; unit: string; unitPrice: number | null; target: number | null; order: number
}

interface Sector {
  id: number; name: string; slug: string; products: Product[]
}

interface WeekData {
  id: number; weekNumber: number
  records: { id: number; weeklyConsumption: number | null; weeklyCost: number | null; product: { id: number; name: string; unit: string } }[]
  production: { acucarVhp: number | null; etanolHidratado: number | null; canaEtanol: number | null; canaAcucar: number | null } | null
}

interface Props {
  currentSafra: { id: number; name: string } | null; totalWeeks: number; sectors: Sector[]; lastWeek: WeekData | null
  safraTotals: { canaMoida: number; etanol: number; acucar: number }
}

const sectorIcons: Record<string, React.ReactNode> = {
  Destilaria: <Droplets className="h-5 w-5 text-emerald-400" />,
  Fábrica: <Factory className="h-5 w-5 text-emerald-400" />,
  Moenda: <TrendingUp className="h-5 w-5 text-emerald-400" />,
}

export default function DashboardHome({ currentSafra, totalWeeks, sectors, lastWeek, safraTotals }: Props) {
  const totalCost = lastWeek?.records.reduce((sum, r) => sum + (r.weeklyCost || 0), 0) || 0
  const totalConsumption = lastWeek?.records.reduce((sum, r) => sum + (r.weeklyConsumption || 0), 0) || 0

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Hexagon className="h-5 w-5 text-emerald-400" />
          <h1 className="text-xl font-bold text-gray-100 glow-text">Dashboard</h1>
        </div>
        <p className="mt-0.5 text-sm text-gray-500">
          {currentSafra?.name || "Nenhuma safra"} — {totalWeeks} semana(s) lançada(s)
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <StatCard title="Última Semana" value={lastWeek ? `Semana ${lastWeek.weekNumber}` : "—"} subtitle="registrada" icon={<CalendarDays className="h-5 w-5" />} />
        <StatCard title="Consumo Total" value={`${totalConsumption.toFixed(1)} kg`} subtitle="última semana" icon={<FlaskConical className="h-5 w-5" />} />
        <StatCard title="Custo Total" value={`R$ ${totalCost.toFixed(2)}`} subtitle="última semana" icon={<DollarSign className="h-5 w-5" />} />
        <StatCard title="Cana Moída" value={safraTotals.canaMoida ? safraTotals.canaMoida.toLocaleString("pt-BR") + " t" : "—"} subtitle="total safra" icon={<Tractor className="h-5 w-5" />} />
        <StatCard title="Etanol Produzido" value={safraTotals.etanol ? safraTotals.etanol.toLocaleString("pt-BR") + " L" : "—"} subtitle="total safra" icon={<Droplets className="h-5 w-5" />} />
        <StatCard title="Açúcar VHP" value={safraTotals.acucar ? safraTotals.acucar.toLocaleString("pt-BR") + " scs" : "—"} subtitle="total safra" icon={<Package className="h-5 w-5" />} />
      </div>

      <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-gray-200">Setores</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {sectors.map((sector) => (
            <div key={sector.id} className="group rounded-lg border border-[#1e1e2e] bg-[#16161f] p-4 transition-all hover:border-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.06)]">
              <div className="mb-2 flex items-center gap-2">
                {sectorIcons[sector.name] || <Building2 className="h-4 w-4 text-emerald-400" />}
                <h3 className="text-sm font-medium text-gray-200">{sector.name}</h3>
              </div>
              <p className="text-xs text-gray-500">{sector.products.length} produtos cadastrados</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-5">
        <div className="mb-4 flex items-center gap-2">
          <FileBarChart className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-gray-200">Ações Rápidas</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/lancamento" className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_20px_rgba(16,185,129,0.12)] transition hover:bg-emerald-500">
            <FileBarChart className="h-4 w-4" /> Lançar Dados Semanais <ChevronRight className="h-3.5 w-3.5" />
          </Link>
          <Link href="/relatorios" className="inline-flex items-center gap-2 rounded-lg border border-[#1e1e2e] bg-[#16161f] px-5 py-2.5 text-sm font-medium text-gray-300 transition hover:border-emerald-500/30 hover:text-gray-100">
            <TrendingUp className="h-4 w-4" /> Ver Relatórios <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, subtitle, icon }: { title: string; value: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-5 shadow-sm transition-all hover:border-emerald-500/20 hover:shadow-[0_0_15px_rgba(16,185,129,0.06)] border-l-4 border-l-emerald-600/70">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="mt-1 text-xl font-bold text-gray-100">{value}</p>
          <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
        </div>
        <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">{icon}</div>
      </div>
    </div>
  )
}

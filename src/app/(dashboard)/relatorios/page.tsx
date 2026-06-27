"use client"

import { useState, useEffect, useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LineChart, Line, LabelList } from "recharts"
import { TrendingUp, BarChart3, PieChart, Table2, Package, ChevronDown, DollarSign, Weight } from "lucide-react"

interface Week {
  id: number; weekNumber: number; startDate: string; endDate: string
  records: { productId: number; weeklyConsumption: number | null; weeklyCost: number | null; product: { id: number; name: string; unit: string; sectorId: number } }[]
  production: { acucarVhp: number | null; etanolHidratado: number | null; canaEtanol: number | null; canaAcucar: number | null } | null
}

interface Product { id: number; name: string; unit: string; sectorName: string }
interface Sector { id: number; name: string; slug: string; products: { id: number; name: string; unit: string }[] }

const CHART_BG = "#111118"
const CHART_GRID = "#1e1e2e"
const CHART_TEXT = "#606078"
const AXIS_TICK = { fontSize: 10, fill: "#606078" }
const LABEL_STYLE = { fontSize: 9, fill: "#9090a5" }

const COLORS = ["#10b981", "#34d399", "#6ee7b7", "#059669", "#a7f3d0"]
const COLORS_FILL = ["#10b981", "#34d399", "#6ee7b7", "#059669", "#a7f3d0"]

function formatDate(dateStr: string) { return new Date(dateStr).toLocaleDateString("pt-BR") }
const br = (v: number, d = 2) => v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d })
const brR = (v: number) => br(v, 2)

function CustomTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-[#1e1e2e] bg-[#16161f]/95 px-4 py-3 shadow-lg backdrop-blur-sm">
      <p className="mb-1 text-sm font-semibold text-gray-200">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatter ? formatter(entry.value) : entry.value}
        </p>
      ))}
    </div>
  )
}

export default function RelatoriosPage() {
  const [weeks, setWeeks] = useState<Week[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      const safrasRes = await fetch("/api/safras")
      const safrasData = await safrasRes.json()
      const sectorsRes = await fetch("/api/sectors")
      setSectors(await sectorsRes.json())
      if (safrasData.length > 0) {
        const weeksRes = await fetch(`/api/safras/${safrasData[0].id}/weeks`)
        setWeeks(await weeksRes.json())
      }
    }
    load()
  }, [])

  const products = useMemo(() => {
    const map = new Map<number, Product>()
    for (const s of sectors)
      for (const p of s.products)
        map.set(p.id, { ...p, sectorName: s.name })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [sectors])

  const productsBySector = useMemo(() => {
    const grouped: Record<string, Product[]> = {}
    for (const p of products) {
      if (!grouped[p.sectorName]) grouped[p.sectorName] = []
      grouped[p.sectorName].push(p)
    }
    return grouped
  }, [products])

  const selectedProduct = products.find((p) => p.id === selectedProductId)

  const productWeekData = useMemo(() => {
    if (!selectedProductId) return []
    return weeks.map((w) => {
      const record = w.records.find((r) => r.productId === selectedProductId)
      return {
        semana: `S${w.weekNumber}`,
        dataInicio: formatDate(w.startDate),
        dataFim: formatDate(w.endDate),
        consumo: record?.weeklyConsumption || 0,
        custo: record?.weeklyCost || 0,
      }
    }).filter((d) => d.consumo > 0 || d.custo > 0)
  }, [weeks, selectedProductId])

  const totalConsumo = productWeekData.reduce((s, d) => s + d.consumo, 0)
  const totalCusto = productWeekData.reduce((s, d) => s + d.custo, 0)
  const mediaConsumo = productWeekData.length ? totalConsumo / productWeekData.length : 0
  const mediaCusto = productWeekData.length ? totalCusto / productWeekData.length : 0

  const chartData = weeks.map((w) => {
    const totalCost = w.records.reduce((sum, r) => sum + (r.weeklyCost || 0), 0)
    const totalConsumption = w.records.reduce((sum, r) => sum + (r.weeklyConsumption || 0), 0)
    const sectorCosts: Record<string, number> = {}
    for (const r of w.records) {
      const sector = sectors.find((s) => s.id === r.product.sectorId)
      const key = sector?.name || "Outros"
      sectorCosts[key] = (sectorCosts[key] || 0) + (r.weeklyCost || 0)
    }
    return {
      semana: `S${w.weekNumber}`,
      custoTotal: totalCost,
      consumoTotal: totalConsumption,
      etanol: w.production?.etanolHidratado ? w.production.etanolHidratado / 1000 : 0,
      acucar: w.production?.acucarVhp || 0,
      ...Object.fromEntries(sectors.map((s) => [`${s.name} (R$)`, sectorCosts[s.name] || 0])),
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
          <h1 className="text-xl font-bold text-gray-100 glow-text">Relatórios</h1>
        </div>
        <div className="relative">
          <Package className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
          <select value={selectedProductId ?? ""} onChange={(e) => setSelectedProductId(e.target.value ? Number(e.target.value) : null)}
            className="input-premium w-72 appearance-none rounded-lg py-2.5 pl-10 pr-10 text-sm">
            <option value="">Todos os produtos</option>
            {Object.entries(productsBySector).map(([sectorName, prods]) => (
              <optgroup key={sectorName} label={sectorName}>
                {prods.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
              </optgroup>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
        </div>
      </div>

      {selectedProduct && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Consumo Total" value={`${br(totalConsumo, 1)} ${selectedProduct.unit}`} subtitle={`${productWeekData.length} semanas`} icon={<Weight className="h-5 w-5" />} />
            <StatCard title="Custo Total" value={`R$ ${brR(totalCusto)}`} subtitle={`${productWeekData.length} semanas`} icon={<DollarSign className="h-5 w-5" />} />
            <StatCard title="Média Semanal" value={`${br(mediaConsumo, 1)} ${selectedProduct.unit}`} subtitle="consumo / semana" icon={<BarChart3 className="h-5 w-5" />} />
            <StatCard title="Custo Médio / Semana" value={`R$ ${brR(mediaCusto)}`} subtitle="média por semana" icon={<TrendingUp className="h-5 w-5" />} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard title={`${selectedProduct.name} — Consumo por Semana`} icon={<BarChart3 className="h-4 w-4" />}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productWeekData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                  <XAxis dataKey="semana" tick={AXIS_TICK} stroke={CHART_TEXT} />
                  <YAxis tick={AXIS_TICK} stroke={CHART_TEXT} />
                  <Tooltip content={<CustomTooltip formatter={(v: number) => `${br(v, 1)} ${selectedProduct.unit}`} />} />
                  <Bar dataKey="consumo" fill={COLORS_FILL[0]} stroke={COLORS[0]} strokeWidth={1} radius={[4, 4, 0, 0]} name={`Consumo (${selectedProduct.unit})`}>
                    <LabelList dataKey="consumo" position="top" formatter={(v: any) => br(Number(v), 1)} style={LABEL_STYLE} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={`${selectedProduct.name} — Custo por Semana`} icon={<DollarSign className="h-4 w-4" />}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productWeekData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                  <XAxis dataKey="semana" tick={AXIS_TICK} stroke={CHART_TEXT} />
                  <YAxis tick={AXIS_TICK} stroke={CHART_TEXT} />
                  <Tooltip content={<CustomTooltip formatter={(v: number) => `R$ ${brR(v)}`} />} />
                  <Bar dataKey="custo" fill={COLORS_FILL[1]} stroke={COLORS[1]} strokeWidth={1} radius={[4, 4, 0, 0]} name="Custo (R$)">
                    <LabelList dataKey="custo" position="top" formatter={(v: any) => `R$${br(Number(v), 0)}`} style={LABEL_STYLE} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] shadow-sm">
            <div className="border-b border-[#1e1e2e] bg-[#16161f] px-6 py-3">
              <div className="flex items-center gap-2">
                <Table2 className="h-4 w-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-gray-200">{selectedProduct.name} — Detalhamento Semanal</h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="table-premium w-full text-left text-sm">
                <thead>
                  <tr className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <th className="px-6 py-3">Semana</th>
                    <th className="px-6 py-3">Período</th>
                    <th className="px-6 py-3">Consumo ({selectedProduct.unit})</th>
                    <th className="px-6 py-3">Custo (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {productWeekData.map((row, i) => (
                    <tr key={row.semana} className="border-b border-[#1e1e2e] transition hover:bg-emerald-500/5">
                      <td className="px-6 py-3 font-semibold text-gray-200">{row.semana}</td>
                      <td className="px-6 py-3 text-xs text-gray-500">{row.dataInicio} — {row.dataFim}</td>
                      <td className="px-6 py-3 text-gray-400">{br(row.consumo, 1)}</td>
                      <td className="px-6 py-3 text-gray-400">
                        <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-400">R$ {brR(row.custo)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#1e1e2e] bg-[#16161f] font-semibold">
                    <td className="px-6 py-3 text-emerald-400">Total</td>
                    <td className="px-6 py-3" />
                    <td className="px-6 py-3 text-emerald-400">{br(totalConsumo, 1)} {selectedProduct.unit}</td>
                    <td className="px-6 py-3"><span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-400">R$ {brR(totalCusto)}</span></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Custo Total por Semana" icon={<BarChart3 className="h-4 w-4" />}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="semana" tick={AXIS_TICK} stroke={CHART_TEXT} />
              <YAxis tick={AXIS_TICK} stroke={CHART_TEXT} />
              <Tooltip content={<CustomTooltip formatter={(v: number) => `R$ ${brR(v)}`} />} />
              <Bar dataKey="custoTotal" fill={COLORS_FILL[0]} stroke={COLORS[0]} strokeWidth={1} radius={[4, 4, 0, 0]} name="Custo Total (R$)">
                <LabelList dataKey="custoTotal" position="top" formatter={(v: any) => `R$${br(Number(v), 0)}`} style={LABEL_STYLE} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Consumo Total por Semana" icon={<BarChart3 className="h-4 w-4" />}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="semana" tick={AXIS_TICK} stroke={CHART_TEXT} />
              <YAxis tick={AXIS_TICK} stroke={CHART_TEXT} />
              <Tooltip content={<CustomTooltip formatter={(v: number) => `${br(v, 1)} kg`} />} />
              <Bar dataKey="consumoTotal" fill={COLORS_FILL[1]} stroke={COLORS[1]} strokeWidth={1} radius={[4, 4, 0, 0]} name="Consumo (kg)">
                <LabelList dataKey="consumoTotal" position="top" formatter={(v: any) => br(Number(v), 0)} style={LABEL_STYLE} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Custos por Setor" icon={<PieChart className="h-4 w-4" />}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} barCategoryGap="16%">
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="semana" tick={AXIS_TICK} stroke={CHART_TEXT} />
              <YAxis tick={AXIS_TICK} stroke={CHART_TEXT} />
              <Tooltip content={<CustomTooltip formatter={(v: number) => `R$ ${brR(v)}`} />} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#9090a5", paddingTop: 8 }} iconType="circle" iconSize={8} />
              {sectors.map((s, i) => (
                <Bar key={s.id} dataKey={`${s.name} (R$)`} fill={COLORS[i % COLORS.length]} stroke={COLORS[i % COLORS.length]} strokeWidth={1} radius={[2, 2, 0, 0]} name={s.name} stackId="a" />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Produção Semanal" icon={<TrendingUp className="h-4 w-4" />}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="semana" tick={AXIS_TICK} stroke={CHART_TEXT} />
              <YAxis tick={AXIS_TICK} stroke={CHART_TEXT} />
              <Tooltip content={<CustomTooltip formatter={(v: number) => v.toLocaleString("pt-BR")} />} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#9090a5", paddingTop: 8 }} iconType="circle" iconSize={8} />
              <Line type="monotone" dataKey="etanol" stroke={COLORS[0]} strokeWidth={2} dot={{ fill: COLORS[0], r: 3 }} activeDot={{ r: 5, fill: COLORS[0] }} name="Etanol Hidratado (kL)" />
              <Line type="monotone" dataKey="acucar" stroke={COLORS[2]} strokeWidth={2} dot={{ fill: COLORS[2], r: 3 }} activeDot={{ r: 5, fill: COLORS[2] }} name="Açúcar VHP (scs)" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] shadow-sm">
        <div className="border-b border-[#1e1e2e] bg-[#16161f] px-6 py-3">
          <div className="flex items-center gap-2">
            <Table2 className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-gray-200">Dados Semanais</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="table-premium w-full text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                <th className="px-6 py-3">Semana</th>
                <th className="px-6 py-3">Consumo (kg)</th>
                <th className="px-6 py-3">Custo Total (R$)</th>
                <th className="px-6 py-3">Etanol (kL)</th>
                <th className="px-6 py-3">Açúcar (scs)</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row, i) => (
                <tr key={row.semana} className="border-b border-[#1e1e2e] transition hover:bg-emerald-500/5">
                  <td className="px-6 py-3 font-semibold text-gray-200">{row.semana}</td>
                  <td className="px-6 py-3 text-gray-400">{br(row.consumoTotal, 1)}</td>
                  <td className="px-6 py-3 text-gray-400"><span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-400">R$ {brR(row.custoTotal)}</span></td>
                  <td className="px-6 py-3 text-gray-400">{row.etanol.toLocaleString("pt-BR")}</td>
                  <td className="px-6 py-3 text-gray-400">{row.acucar.toLocaleString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ChartCard({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-5 shadow-sm transition-all hover:border-emerald-500/20 hover:shadow-[0_0_15px_rgba(16,185,129,0.06)]">
      <div className="mb-4 flex items-center gap-2">
        {icon && <span className="text-emerald-400">{icon}</span>}
        <h2 className="text-sm font-semibold text-gray-200">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function StatCard({ title, value, subtitle, icon }: { title: string; value: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-5 shadow-sm transition-all hover:border-emerald-500/20 hover:shadow-[0_0_15px_rgba(16,185,129,0.06)] border-l-4 border-l-emerald-600/70">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="mt-1 text-lg font-bold text-gray-100">{value}</p>
          <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
        </div>
        <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">{icon}</div>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LineChart, Line, ComposedChart, Cell, LabelList } from "recharts"
import { TrendingUp, Target, AlertTriangle, Download, BarChart3, ChevronDown, ChevronUp, Eye, DollarSign, Weight, Scale, FlaskConical, Factory, Droplets } from "lucide-react"

interface WeekData {
  id: number; weekNumber: number
  records: { productId: number; weeklyConsumption: number | null; weeklyCost: number | null; product: { id: number; name: string; unit: string; sectorId: number } }[]
  production: { acucarVhp: number | null; etanolHidratado: number | null; canaEtanol: number | null; canaAcucar: number | null } | null
}

interface ProductInfo { id: number; name: string; unit: string; sectorName: string; target: number | null }
interface SectorInfo { id: number; name: string; slug: string; products: { id: number; name: string; unit: string; target: number | null }[] }

const CHART_GRID = "#1e1e2e"
const CHART_TEXT = "#606078"
const AXIS_TICK = { fontSize: 10, fill: "#606078" }
const LABEL_STYLE = { fontSize: 9, fill: "#9090a5" }
const COLORS = ["#10b981", "#34d399", "#6ee7b7", "#059669", "#d97706", "#dc2626", "#8b5cf6", "#f59e0b"]

function valor(v: number | null | undefined) { return v ?? 0 }
const br = (v: number, d = 2) => v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d })
const brR = (v: number) => br(v, 2)

function formatDate(dateStr: string) { return new Date(dateStr).toLocaleDateString("pt-BR") }

function exportCSV(data: string[][], filename: string) {
  const csv = data.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")
  const bom = "\uFEFF"
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

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

export default function AnalisesPage() {
  const [weeks, setWeeks] = useState<WeekData[]>([])
  const [sectors, setSectors] = useState<SectorInfo[]>([])
  const [drillWeek, setDrillWeek] = useState<number | null>(null)
  const [showTargets, setShowTargets] = useState(true)
  const [selectedSector, setSelectedSector] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const safrasRes = await fetch("/api/safras")
      const safrasData = await safrasRes.json()
      const sectorsRes = await fetch("/api/sectors")
      const sectorsData: SectorInfo[] = await sectorsRes.json()
      setSectors(sectorsData)
      if (safrasData.length > 0) {
        const weeksRes = await fetch(`/api/safras/${safrasData[0].id}/weeks`)
        setWeeks(await weeksRes.json())
      }
    }
    load()
  }, [])

  const products = useMemo(() => {
    const map = new Map<number, ProductInfo>()
    for (const s of sectors)
      for (const p of s.products)
        map.set(p.id, { ...p, sectorName: s.name })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [sectors])

  const totalCanaPorSemana = useMemo(() => {
    const map: Record<number, number> = {}
    for (const w of weeks) map[w.weekNumber] = valor(w.production?.canaEtanol) + valor(w.production?.canaAcucar)
    return map
  }, [weeks])

  const etanolPorSemana = useMemo(() => {
    const map: Record<number, number> = {}
    for (const w of weeks) map[w.weekNumber] = valor(w.production?.etanolHidratado) / 1000
    return map
  }, [weeks])

  const totalCanaSafra = Object.values(totalCanaPorSemana).reduce((s, v) => s + v, 0)

  const consumoAcumulado = useMemo(() => {
    const map = new Map<number, { consumo: number; custo: number; semanas: number }>()
    for (const w of weeks) {
      for (const r of w.records) {
        const c = map.get(r.productId) || { consumo: 0, custo: 0, semanas: 0 }
        c.consumo += valor(r.weeklyConsumption)
        c.custo += valor(r.weeklyCost)
        c.semanas++
        map.set(r.productId, c)
      }
    }
    return map
  }, [weeks])

  const kpis = useMemo(() => {
    const custoTotal = weeks.reduce((s, w) => s + w.records.reduce((s2, r) => s2 + valor(r.weeklyCost), 0), 0)
    const consumoTotal = weeks.reduce((s, w) => s + w.records.reduce((s2, r) => s2 + valor(r.weeklyConsumption), 0), 0)
    const custoTonelada = totalCanaSafra > 0 ? custoTotal / totalCanaSafra : 0
    const ultimaSemana = weeks[weeks.length - 1]
    const custoUltima = ultimaSemana?.records.reduce((s, r) => s + valor(r.weeklyCost), 0) || 0
    const canaUltima = totalCanaPorSemana[ultimaSemana?.weekNumber ?? 0] || 0
    return { custoTotal, consumoTotal, custoTonelada, totalSemanas: weeks.length, custoUltima, canaUltima }
  }, [weeks, totalCanaSafra, totalCanaPorSemana])

  const forecast = useMemo(() => {
    if (weeks.length === 0) return { estimado: 0, mediaSemanal: 0, restante: 0 }
    const mediaSemanal = kpis.custoTotal / weeks.length
    const semanasRestantes = 40 - weeks.length
    const estimado = kpis.custoTotal + mediaSemanal * semanasRestantes
    return { estimado, mediaSemanal, restante: mediaSemanal * semanasRestantes }
  }, [weeks, kpis])

  const paretoCusto = useMemo(() => {
    const arr = Array.from(consumoAcumulado.entries())
      .map(([id, data]) => ({ id, name: products.find((p) => p.id === id)?.name || "?", custo: data.custo }))
      .sort((a, b) => b.custo - a.custo)
    const total = arr.reduce((s, i) => s + i.custo, 0)
    let acum = 0
    return arr.map((i) => { acum += i.custo; return { ...i, pct: total > 0 ? (i.custo / total) * 100 : 0, acum: total > 0 ? (acum / total) * 100 : 0 } })
  }, [consumoAcumulado, products])

  const paretoConsumo = useMemo(() => {
    const arr = Array.from(consumoAcumulado.entries())
      .map(([id, data]) => ({ id, name: products.find((p) => p.id === id)?.name || "?", consumo: data.consumo }))
      .sort((a, b) => b.consumo - a.consumo)
    const total = arr.reduce((s, i) => s + i.consumo, 0)
    let acum = 0
    return arr.map((i) => { acum += i.consumo; return { ...i, pct: total > 0 ? (i.consumo / total) * 100 : 0, acum: total > 0 ? (acum / total) * 100 : 0 } })
  }, [consumoAcumulado, products])

  const eficienciaProdutos = useMemo(() => {
    return products.map((p) => {
      const data = consumoAcumulado.get(p.id)
      const consumo = data?.consumo || 0
      const gPorTonelada = totalCanaSafra > 0 ? (consumo * 1000) / totalCanaSafra : 0
      const target = p.target ?? 0
      const variacao = target > 0 ? ((gPorTonelada - target) / target) * 100 : 0
      return { ...p, consumo, gPorTonelada, target, variacao }
    }).filter((p) => p.consumo > 0).sort((a, b) => b.variacao - a.variacao)
  }, [products, consumoAcumulado, totalCanaSafra])

  const trendData = useMemo(() => {
    let acum = 0
    return weeks.map((w) => {
      const custo = w.records.reduce((s, r) => s + valor(r.weeklyCost), 0)
      acum += custo
      return { semana: `S${w.weekNumber}`, semanal: custo, acumulado: acum, cana: totalCanaPorSemana[w.weekNumber] || 0 }
    })
  }, [weeks, totalCanaPorSemana])

  const variacaoSemanal = useMemo(() => {
    return weeks.slice(1).map((w, i) => {
      const anterior = weeks[i]
      const custoAtual = w.records.reduce((s, r) => s + valor(r.weeklyCost), 0)
      const custoAnterior = anterior.records.reduce((s, r) => s + valor(r.weeklyCost), 0)
      const variacao = custoAnterior > 0 ? ((custoAtual - custoAnterior) / custoAnterior) * 100 : 0
      return { semana: `S${w.weekNumber}`, custoAtual, custoAnterior, variacao, alerta: Math.abs(variacao) > 20 }
    })
  }, [weeks])

  const eficienciaSetor = useMemo(() => {
    const totalEtanol = Object.values(etanolPorSemana).reduce((s, v) => s + v, 0)
    return sectors.map((s) => {
      const ids = s.products.map((p) => p.id)
      let custo = 0, consumo = 0
      for (const w of weeks) {
        for (const r of w.records) {
          if (ids.includes(r.productId)) { custo += valor(r.weeklyCost); consumo += valor(r.weeklyConsumption) }
        }
      }
      const isDestilaria = s.name === "Destilaria"
      const denominador = isDestilaria ? totalEtanol : totalCanaSafra
      const custoUnit = denominador > 0 ? custo / denominador : 0
      return { name: s.name, custo, consumo, custoUnit, unidade: isDestilaria ? "m³ etanol" : "t cana", denominadorLabel: isDestilaria ? `Etanol: ${br(totalEtanol, 1)} m³` : `Cana: ${br(totalCanaSafra, 1)} t` }
    })
  }, [sectors, weeks, totalCanaSafra, etanolPorSemana])

  const setorSelecionado = eficienciaSetor.find((s) => s.name === selectedSector)

  const setorData = useMemo(() => {
    if (!selectedSector) return []
    const sector = sectors.find((s) => s.name === selectedSector)
    if (!sector) return []
    const ids = sector.products.map((p) => p.id)
    const isDestilaria = selectedSector === "Destilaria"
    return weeks.map((w) => {
      let custo = 0
      for (const r of w.records) { if (ids.includes(r.productId)) custo += valor(r.weeklyCost) }
      const denom = isDestilaria ? etanolPorSemana[w.weekNumber] || 0 : totalCanaPorSemana[w.weekNumber] || 0
      return { semana: `S${w.weekNumber}`, custo, custoUnit: denom > 0 ? custo / denom : 0, denominador: denom }
    }).filter((d) => d.custo > 0)
  }, [selectedSector, sectors, weeks, etanolPorSemana, totalCanaPorSemana])

  const drillWeekData = useMemo(() => {
    if (drillWeek === null) return null
    const week = weeks.find((w) => w.weekNumber === drillWeek)
    if (!week) return null
    return {
      week,
      records: week.records.filter((r) => valor(r.weeklyConsumption) > 0 || valor(r.weeklyCost) > 0)
        .map((r) => ({ ...r, productName: products.find((p) => p.id === r.productId)?.name || "?", sectorName: products.find((p) => p.id === r.productId)?.sectorName || "?" }))
        .sort((a, b) => (b.weeklyCost || 0) - (a.weeklyCost || 0)),
    }
  }, [drillWeek, weeks, products])

  const handleExport = useCallback(() => {
    const header = ["Semana", "Produto", "Setor", "Unidade", "Consumo", "Custo"]
    const rows: string[][] = [header]
    for (const w of weeks) {
      for (const r of w.records) {
        const p = products.find((p2) => p2.id === r.productId)
        rows.push([`S${w.weekNumber}`, p?.name || "?", p?.sectorName || "?", p?.unit || "", String(valor(r.weeklyConsumption)), String(valor(r.weeklyCost))])
      }
    }
    exportCSV(rows, "analise-completa-safra.csv")
  }, [weeks, products])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
          <h1 className="text-xl font-bold text-gray-100 glow-text">Análises</h1>
        </div>
        <button onClick={handleExport} className="inline-flex items-center gap-2 rounded-lg border border-[#1e1e2e] bg-[#16161f] px-4 py-2 text-sm font-medium text-gray-300 transition hover:border-emerald-500/30 hover:text-gray-100">
          <Download className="h-4 w-4" /> Exportar CSV
        </button>
      </div>

      <Section title="KPIs da Safra" icon={<Target className="h-5 w-5" />}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Custo por Tonelada" value={`R$ ${brR(kpis.custoTonelada)}`} subtitle="/t cana processada" icon={<DollarSign className="h-5 w-5" />} />
          <StatCard title="Custo Acumulado" value={`R$ ${br(kpis.custoTotal / 1000, 1)}k`} subtitle={`${kpis.totalSemanas} semanas`} icon={<BarChart3 className="h-5 w-5" />} />
          <StatCard title="Consumo Total" value={`${br(kpis.consumoTotal / 1000, 1)}t`} subtitle="produtos químicos" icon={<Weight className="h-5 w-5" />} />
          <StatCard title="Projeção Final" value={`R$ ${br(forecast.estimado / 1000, 0)}k`} subtitle={`estimativa 40 sem (${br(forecast.mediaSemanal, 0)}/sem)`} icon={<TrendingUp className="h-5 w-5" />} />
        </div>
      </Section>

      {showTargets && eficienciaProdutos.length > 0 && (
        <Section title="Performance vs Meta (g/t)" icon={<Scale className="h-5 w-5" />}>
          <div className="overflow-x-auto">
            <table className="table-premium w-full text-left text-sm">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Setor</th>
                  <th className="px-4 py-3">Consumo (kg)</th>
                  <th className="px-4 py-3">Real (g/t)</th>
                  <th className="px-4 py-3">Meta (g/t)</th>
                  <th className="px-4 py-3">Variação</th>
                </tr>
              </thead>
              <tbody>
                {eficienciaProdutos.map((p, i) => (
                  <tr key={p.id} className="border-b border-[#1e1e2e] transition hover:bg-emerald-500/5">
                    <td className="px-4 py-3 font-medium text-gray-200">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500">{p.sectorName}</td>
                    <td className="px-4 py-3 text-gray-400">{br(p.consumo, 1)}</td>
                    <td className="px-4 py-3 text-gray-400">{brR(p.gPorTonelada)}</td>
                    <td className="px-4 py-3 text-gray-400">{p.target != null ? brR(p.target) : "—"}</td>
                    <td className="px-4 py-3">
                      {p.target != null ? (
                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                          p.variacao > 10 ? "bg-red-500/10 text-red-400" :
                          p.variacao > 0 ? "bg-amber-500/10 text-amber-400" :
                          "bg-emerald-500/10 text-emerald-400"
                        }`}>
                          {p.variacao > 0 ? "+" : ""}{br(p.variacao, 1)}%
                        </span>
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="Top Produtos — Custo (R$)" icon={<BarChart3 className="h-5 w-5" />}>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={paretoCusto.slice(0, 10)} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#606078" }} angle={-30} textAnchor="end" height={80} interval={0} />
                <YAxis yAxisId="left" tick={AXIS_TICK} stroke={CHART_TEXT} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: "#606078" }} domain={[0, 100]} unit="%" stroke="#059669" />
                <Tooltip content={<CustomTooltip formatter={(v: number) => `R$ ${brR(v)}`} />} />
                <Bar yAxisId="left" dataKey="custo" fill="#059669" radius={[4, 4, 0, 0]} name="Custo (R$)">
                  {paretoCusto.slice(0, 10).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
                <Line yAxisId="right" type="monotone" dataKey="acum" stroke="#d97706" strokeWidth={2} dot={{ r: 3, fill: "#d97706" }} name="% Acum." />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Top Produtos — Consumo" icon={<Weight className="h-5 w-5" />}>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={paretoConsumo.slice(0, 10)} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#606078" }} angle={-30} textAnchor="end" height={80} interval={0} />
                <YAxis yAxisId="left" tick={AXIS_TICK} stroke={CHART_TEXT} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: "#606078" }} domain={[0, 100]} unit="%" stroke="#059669" />
                <Tooltip content={<CustomTooltip formatter={(v: number) => `${br(v, 1)} kg`} />} />
                <Bar yAxisId="left" dataKey="consumo" fill="#10b981" radius={[4, 4, 0, 0]} name="Consumo (kg)">
                  {paretoConsumo.slice(0, 10).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
                <Line yAxisId="right" type="monotone" dataKey="acum" stroke="#d97706" strokeWidth={2} dot={{ r: 3, fill: "#d97706" }} name="% Acum." />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      <Section title="Tendência de Custo" icon={<TrendingUp className="h-5 w-5" />}>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="semana" tick={AXIS_TICK} stroke={CHART_TEXT} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#606078" }} stroke={CHART_TEXT} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#606078" }} stroke="#059669" />
              <Tooltip content={<CustomTooltip formatter={(v: number) => `R$ ${brR(v)}`} />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "#9090a5" }} />
              <Bar yAxisId="left" dataKey="semanal" fill="#10b981/20" stroke="#10b981" strokeWidth={1} radius={[2, 2, 0, 0]} name="Custo Semanal" fillOpacity={0.2} />
              <Line yAxisId="right" type="monotone" dataKey="acumulado" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: "#10b981" }} name="Custo Acumulado" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <Section title="Variação Semanal — Custo" icon={<AlertTriangle className="h-5 w-5" />}>
        <div className="overflow-x-auto">
          <table className="table-premium w-full text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                <th className="px-4 py-3">Comparação</th>
                <th className="px-4 py-3">Semana Anterior</th>
                <th className="px-4 py-3">Semana Atual</th>
                <th className="px-4 py-3">Variação</th>
              </tr>
            </thead>
            <tbody>
              {variacaoSemanal.map((v, i) => (
                <tr key={v.semana} className={`border-b border-[#1e1e2e] transition hover:bg-emerald-500/5 ${v.alerta ? "bg-red-500/5" : ""}`}>
                  <td className="px-4 py-3 font-medium text-gray-200">{v.semana} vs S{i + 1}</td>
                  <td className="px-4 py-3 text-gray-400">R$ {brR(v.custoAnterior)}</td>
                  <td className="px-4 py-3 text-gray-400">R$ {brR(v.custoAtual)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                      v.alerta ? "bg-red-500/10 text-red-400" :
                      v.variacao > 0 ? "bg-amber-500/10 text-amber-400" :
                      "bg-emerald-500/10 text-emerald-400"
                    }`}>
                      {v.variacao > 0 ? "+" : ""}{br(v.variacao, 1)}%
                    </span>
                    {v.alerta && <span className="ml-1.5 text-xs text-red-400">⚠ Acima de 20%</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Custo por Setor" icon={<Factory className="h-5 w-5" />}>
        <div className="mb-4 flex items-center gap-3">
          <span className="text-sm text-gray-500">Selecione o setor:</span>
          <div className="relative">
            <select value={selectedSector ?? ""} onChange={(e) => setSelectedSector(e.target.value || null)}
              className="input-premium appearance-none rounded-lg py-2 pl-4 pr-10 text-sm">
              <option value="">—</option>
              {eficienciaSetor.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {eficienciaSetor.map((s) => (
            <div key={s.name}
              className={`rounded-xl border p-5 shadow-sm transition-all cursor-pointer ${
                selectedSector === s.name ? "border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.08)]" : "border-[#1e1e2e] bg-[#111118] hover:border-emerald-500/20 hover:shadow-[0_0_15px_rgba(16,185,129,0.06)]"
              }`}
              onClick={() => setSelectedSector(selectedSector === s.name ? null : s.name)}>
              <div className="flex items-center gap-2 mb-2">
                {s.name === "Destilaria" ? <Droplets className="h-4 w-4 text-emerald-400" /> :
                 s.name === "Fábrica" ? <Factory className="h-4 w-4 text-emerald-400" /> :
                 s.name === "Moenda" ? <TrendingUp className="h-4 w-4 text-emerald-400" /> :
                 <FlaskConical className="h-4 w-4 text-emerald-400" />}
                <h3 className="text-sm font-semibold text-gray-200">{s.name}</h3>
              </div>
              <p className="text-xl font-bold text-gray-100">R$ {brR(s.custoUnit)}</p>
              <p className="text-xs text-gray-500">/{s.unidade} · Total: R$ {br(s.custo / 1000, 1)}k</p>
            </div>
          ))}
        </div>

        {setorSelecionado && setorData.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-gray-400">Evolução — {setorSelecionado.name} (R$/{setorSelecionado.unidade})</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={setorData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                  <XAxis dataKey="semana" tick={{ fontSize: 10, fill: "#606078" }} stroke={CHART_TEXT} />
                  <YAxis tick={{ fontSize: 10, fill: "#606078" }} stroke={CHART_TEXT} />
                  <Tooltip content={<CustomTooltip formatter={(v: number) => `R$ ${brR(v)}`} />} />
                  <Bar dataKey="custoUnit" fill="#10b981" radius={[4, 4, 0, 0]} name={`R$/${setorSelecionado.unidade}`}>
                    <LabelList dataKey="custoUnit" position="top" formatter={(v: any) => brR(Number(v))} style={LABEL_STYLE} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </Section>

      <Section title="Detalhamento por Semana" icon={<Eye className="h-5 w-5" />}>
        <p className="mb-4 text-sm text-gray-500">Clique em uma semana para ver o detalhamento completo.</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {weeks.map((w) => (
            <button key={w.id} onClick={() => setDrillWeek(drillWeek === w.weekNumber ? null : w.weekNumber)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                drillWeek === w.weekNumber ? "bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.15)]" : "bg-[#16161f] text-gray-400 hover:bg-[#1c1c2a] hover:text-gray-200"
              }`}>
              S{w.weekNumber}
              {drillWeek === w.weekNumber && <ChevronUp className="ml-1 inline h-3 w-3" />}
            </button>
          ))}
        </div>
        {drillWeekData && (
          <div className="overflow-x-auto rounded-lg border border-[#1e1e2e]">
            <table className="table-premium w-full text-left text-sm">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Setor</th>
                  <th className="px-4 py-3">Consumo</th>
                  <th className="px-4 py-3">Custo</th>
                </tr>
              </thead>
              <tbody>
                {drillWeekData.records.map((r, i) => (
                  <tr key={r.productId} className="border-b border-[#1e1e2e]">
                    <td className="px-4 py-2.5 font-medium text-gray-200">{r.productName}</td>
                    <td className="px-4 py-2.5 text-gray-500">{r.sectorName}</td>
                    <td className="px-4 py-2.5 text-gray-400">{br(valor(r.weeklyConsumption), 1)}</td>
                    <td className="px-4 py-2.5"><span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">R$ {brR(valor(r.weeklyCost))}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-5 shadow-sm">
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
          <p className="mt-1 text-xl font-bold text-gray-100">{value}</p>
          <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
        </div>
        <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">{icon}</div>
      </div>
    </div>
  )
}

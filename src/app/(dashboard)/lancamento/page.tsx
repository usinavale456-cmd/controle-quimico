"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Save, ChevronDown, Factory, Droplets, TrendingUp, Building2, FlaskConical, Pencil } from "lucide-react"

interface Product {
  id: number; name: string; unit: string; unitPrice: number | null; target: number | null; order: number
}

interface Sector {
  id: number; name: string; slug: string; products: Product[]
}

interface Week {
  id: number; weekNumber: number; startDate: string; endDate: string
  records: { productId: number; weeklyConsumption: number | null; weeklyCost: number | null }[]
  production: { acucarVhp: number | null; etanolHidratado: number | null; canaEtanol: number | null; canaAcucar: number | null } | null
}

const sectorIcons: Record<string, React.ReactNode> = {
  Destilaria: <Droplets className="h-5 w-5 text-emerald-400" />,
  Fábrica: <Factory className="h-5 w-5 text-emerald-400" />,
  Moenda: <TrendingUp className="h-5 w-5 text-emerald-400" />,
}

export default function LancamentoPage() {
  const { data: session } = useSession()
  const [sectors, setSectors] = useState<Sector[]>([])
  const [weeks, setWeeks] = useState<Week[]>([])
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null)
  const [formData, setFormData] = useState<Record<number, number | null>>({})
  const [productionData, setProductionData] = useState({
    acucarVhp: null as number | null,
    etanolHidratado: null as number | null,
    canaEtanol: null as number | null,
    canaAcucar: null as number | null,
  })
  const [productUpdates, setProductUpdates] = useState<Record<number, { unitPrice: number | null; target: number | null }>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    async function load() {
      const [sectorsRes, safrasRes] = await Promise.all([
        fetch("/api/sectors"),
        fetch("/api/safras"),
      ])
      const sectorsData = await sectorsRes.json()
      const safrasData = await safrasRes.json()
      setSectors(sectorsData)

      if (safrasData.length > 0) {
        const weeksRes = await fetch(`/api/safras/${safrasData[0].id}/weeks`)
        const weeksData = await weeksRes.json()
        setWeeks(weeksData)
        if (weeksData.length > 0) {
          setSelectedWeekId(weeksData[weeksData.length - 1].id)
        }
      }
    }
    load()
  }, [])

  const selectedWeek = weeks.find((w) => w.id === selectedWeekId)

  useEffect(() => {
    if (!selectedWeek) return
    const fd: Record<number, number | null> = {}
    for (const r of selectedWeek.records) fd[r.productId] = r.weeklyConsumption
    setFormData(fd)
    setProductionData({
      acucarVhp: selectedWeek.production?.acucarVhp ?? null,
      etanolHidratado: selectedWeek.production?.etanolHidratado ?? null,
      canaEtanol: selectedWeek.production?.canaEtanol ?? null,
      canaAcucar: selectedWeek.production?.canaAcucar ?? null,
    })
  }, [selectedWeek])

  function handleChange(productId: number, value: string) {
    setFormData((prev) => ({ ...prev, [productId]: value === "" ? null : Number(value) }))
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("pt-BR")
  }

  async function handleSave() {
    if (!selectedWeekId) return
    setSaving(true)
    setMessage("")

    const records = Object.entries(formData).map(([productId, weeklyConsumption]) => ({
      productId: Number(productId), weeklyConsumption, weeklyCost: null,
    }))

    try {
      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekId: selectedWeekId, records }),
      })
      if (!res.ok) throw new Error("Erro ao salvar")

      await fetch("/api/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekId: selectedWeekId, production: productionData }),
      })

      const pending = Object.entries(productUpdates).filter(
        ([, v]) => v.unitPrice !== null || v.target !== null
      )
      if (pending.length > 0) {
        await fetch("/api/products", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            products: pending.map(([id, v]) => ({ id: Number(id), unitPrice: v.unitPrice, target: v.target })),
          }),
        })
        setProductUpdates({})
      }

      setMessage("Dados salvos com sucesso!")
    } catch {
      setMessage("Erro ao salvar dados")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-emerald-400" />
          <h1 className="text-xl font-bold text-gray-100 glow-text">Lançamento Semanal</h1>
        </div>
        <div className="relative">
          <select
            value={selectedWeekId ?? ""}
            onChange={(e) => setSelectedWeekId(Number(e.target.value))}
            className="input-premium appearance-none rounded-lg px-10 py-2.5 pr-8 text-sm"
          >
            {weeks.map((w) => (
              <option key={w.id} value={w.id}>
                Semana {w.weekNumber} — {formatDate(w.startDate)} a {formatDate(w.endDate)}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
        </div>
      </div>

      {selectedWeek && (
        <div className="space-y-6">
          <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-5">
            <div className="mb-4 flex items-center gap-2">
              <Factory className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-gray-200">Produção</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <InputField label="Açúcar VHP (scs)" value={productionData.acucarVhp} onChange={(v) => setProductionData((p) => ({ ...p, acucarVhp: v }))} />
              <InputField label="Etanol Hidratado (L)" value={productionData.etanolHidratado} onChange={(v) => setProductionData((p) => ({ ...p, etanolHidratado: v }))} />
              <InputField label="Cana p/ Etanol (t)" value={productionData.canaEtanol} onChange={(v) => setProductionData((p) => ({ ...p, canaEtanol: v }))} />
              <InputField label="Cana p/ Açúcar (t)" value={productionData.canaAcucar} onChange={(v) => setProductionData((p) => ({ ...p, canaAcucar: v }))} />
            </div>
          </div>

          {sectors.map((sector) => (
            <div key={sector.id} className="overflow-hidden rounded-xl border border-[#1e1e2e] bg-[#111118] shadow-sm">
              <div className="border-b border-[#1e1e2e] bg-[#16161f] px-6 py-3">
                <div className="flex items-center gap-2">
                  {sectorIcons[sector.name] || <Building2 className="h-4 w-4 text-emerald-400" />}
                  <h2 className="text-sm font-semibold text-gray-200">{sector.name}</h2>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="table-premium w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      <th className="px-6 py-3">Produto</th>
                      <th className="px-6 py-3">Unidade</th>
                      <th className="px-6 py-3">Consumo Semanal</th>
                      <th className="px-6 py-3">Preço Unit.</th>
                      <th className="px-6 py-3">Meta (g/t)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sector.products.map((product, i) => (
                      <tr key={product.id} className="border-b border-[#1e1e2e] transition hover:bg-emerald-500/5">
                        <td className="px-6 py-3 font-medium text-gray-200">{product.name}</td>
                        <td className="px-6 py-3 text-gray-500">{product.unit}</td>
                        <td className="px-6 py-3">
                          <input
                            type="number" step="0.01"
                            value={formData[product.id] ?? ""}
                            onChange={(e) => handleChange(product.id, e.target.value)}
                            className="input-premium w-28 rounded-md px-3 py-1.5 text-sm"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-6 py-3">
                          <div className="relative">
                            <input
                              type="number" step="0.01"
                              value={productUpdates[product.id]?.unitPrice ?? product.unitPrice ?? ""}
                              onChange={(e) => setProductUpdates((prev) => ({
                                ...prev,
                                [product.id]: { ...prev[product.id], unitPrice: e.target.value === "" ? null : Number(e.target.value), target: prev[product.id]?.target ?? product.target },
                              }))}
                              className="input-premium w-24 rounded-md px-3 py-1.5 text-sm"
                              placeholder="0"
                            />
                            {productUpdates[product.id]?.unitPrice !== undefined && productUpdates[product.id]?.unitPrice !== product.unitPrice && (
                              <Pencil className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-amber-400" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <div className="relative">
                            <input
                              type="number" step="0.01"
                              value={productUpdates[product.id]?.target ?? product.target ?? ""}
                              onChange={(e) => setProductUpdates((prev) => ({
                                ...prev,
                                [product.id]: { ...prev[product.id], target: e.target.value === "" ? null : Number(e.target.value), unitPrice: prev[product.id]?.unitPrice ?? product.unitPrice },
                              }))}
                              className="input-premium w-24 rounded-md px-3 py-1.5 text-sm"
                              placeholder="0"
                            />
                            {productUpdates[product.id]?.target !== undefined && productUpdates[product.id]?.target !== product.target && (
                              <Pencil className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-amber-400" />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(16,185,129,0.15)] transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? (
                <><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Salvando...</>
              ) : (
                <><Save className="h-4 w-4" /> Salvar Dados</>
              )}
            </button>
            {message && (
              <span className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium ${
                message.includes("sucesso") ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
              }`}>
                {message}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function InputField({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-400">{label}</label>
      <input type="number" step="0.01" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="input-premium block w-full rounded-lg px-4 py-2.5 text-sm" placeholder="0" />
    </div>
  )
}

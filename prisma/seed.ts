import "dotenv/config"
import { PrismaClient } from "../src/generated/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import path from "path"
import * as XLSX from "xlsx"
import bcrypt from "bcryptjs"

const connectionString = process.env.DATABASE_URL!
const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

interface RowData {
  productName: string
  unit?: string
  weeklyConsumption?: number
  unitPrice?: number
  target?: number
  sectorName: string
}

function parseExcel(filePath: string) {
  const wb = XLSX.readFile(filePath, { cellDates: true })
  const sheetNames = wb.SheetNames.filter((s) => s !== "TABELA BASE")

  const allWeeks: {
    sheetName: string
    weekNumber: number
    startDate: Date
    endDate: Date
    rows: RowData[]
    production: {
      acucarVhp?: number
      acucarCristal?: number
      etanolAnidro?: number
      etanolHidratado?: number
      canaEtanol?: number
      canaAcucar?: number
    }
  }[] = []

  for (const sheetName of sheetNames) {
    const ws = wb.Sheets[sheetName]
    const data: (string | number | undefined)[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })

    const weekMatch = data[2]?.[1]
    if (weekMatch === undefined || weekMatch === null) continue
    const weekNumber = Number(weekMatch)

    const dateString = data[2]?.[2]?.toString() || ""
    const dateMatch = dateString.match(/(\d{2})\/(\d{2})\/(\d{4})/)
    if (!dateMatch) continue
    const startDate = new Date(`${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`)

    const endMatch = dateString.match(/A\s+(\d{2})\/(\d{2})\/(\d{4})/)
    const endDate = endMatch
      ? new Date(`${endMatch[3]}-${endMatch[2]}-${endMatch[1]}`)
      : new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000)

    const rows: RowData[] = []
    let currentSector = ""

    let production = {
      acucarVhp: undefined as number | undefined,
      acucarCristal: undefined as number | undefined,
      etanolAnidro: undefined as number | undefined,
      etanolHidratado: undefined as number | undefined,
      canaEtanol: undefined as number | undefined,
      canaAcucar: undefined as number | undefined,
    }

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      if (!row) continue

      const col1 = (row[0]?.toString() || "").trim()
      const col2 = (row[1]?.toString() || "").trim()
      const col12 = (row[12]?.toString() || "").trim()
      const col3 = (row[2]?.toString() || "").trim()

      const col1Empty = col1 === ""
      if (col2 === "Destilaria" && col1Empty) currentSector = "Destilaria"
      else if ((col2 === "Fábrica" || col2 === "Fabrica") && col1Empty) currentSector = "Fábrica"
      else if (col2 === "Moenda" && col1Empty) currentSector = "Moenda"
      else if (col2.includes("ETA") || col2.includes("CALD") || col2 === "CALDEIRA") currentSector = "ETA/CALD."

      const acucarMatch = col12.match(/AÇÚCAR VHP/i)
      if (acucarMatch) {
        production.acucarVhp = Number(row[13]) || undefined
      }
      const etanolMatch = col12.match(/ETANOL HIDRATADO/)
      if (etanolMatch) {
        production.etanolHidratado = Number(row[13]) || undefined
      }
      const canaEtanolMatch = col12.match(/PARA ETANOL/)
      if (canaEtanolMatch) {
        production.canaEtanol = Number(row[13]) || undefined
      }
      const canaAcucarMatch = col12.match(/PARA AÇÚCAR|PARA ACÚCAR/i)
      if (canaAcucarMatch) {
        production.canaAcucar = Number(row[13]) || undefined
      }

      const sectorNames = ["Destilaria", "Fábrica", "Fabrica", "Moenda"]
      const isSectorHeader = sectorNames.includes(col2) || col2.includes("ETA") || col2.includes("CALD")
      if (col2 && col3 && currentSector && !isSectorHeader && col2 !== "SEMANA") {
        const rowCheck = row[3]
        const consumption = rowCheck !== null && rowCheck !== undefined ? Number(rowCheck) : undefined
        const price = row[5] !== null && row[5] !== undefined ? Number(row[5]) : undefined
        const target = row[10] !== null && row[10] !== undefined ? Number(row[10]) : undefined

        rows.push({
          productName: col2.replace(/\s{2,}/g, " ").trim(),
          unit: col3 || "kg",
          weeklyConsumption: consumption !== undefined && !isNaN(consumption) ? consumption : undefined,
          unitPrice: price !== undefined && !isNaN(price) ? price : undefined,
          target: target !== undefined && !isNaN(target) ? target : undefined,
          sectorName: currentSector,
        })
      }
    }

    allWeeks.push({ sheetName, weekNumber, startDate, endDate, rows, production })
  }

  return allWeeks
}

async function main() {
  console.log("Limpando banco de dados...")
  await prisma.weeklyRecord.deleteMany()
  await prisma.productionRecord.deleteMany()
  await prisma.week.deleteMany()
  await prisma.product.deleteMany()
  await prisma.sector.deleteMany()
  await prisma.safra.deleteMany()
  await prisma.user.deleteMany()

  console.log("Criando usuário admin...")
  const hashedPassword = await bcrypt.hash("admin123", 10)
  await prisma.user.create({
    data: {
      name: "Administrador",
      email: "admin@usina.com",
      password: hashedPassword,
      role: "admin",
    },
  })

  console.log("Importando planilha...")
  const excelPath = path.join(__dirname, "..", "data", "Produtos quimico semanal - 2025 USO.xlsx")
  const weeksData = parseExcel(excelPath)

  if (weeksData.length === 0) {
    console.log("Nenhuma semana encontrada na planilha.")
    return
  }

  const safra = await prisma.safra.create({
    data: {
      name: "Safra 2026/2027",
      startDate: weeksData[0].startDate,
      endDate: weeksData[weeksData.length - 1].endDate,
    },
  })

  const sectorOrder = ["Destilaria", "Fábrica", "Moenda", "ETA/CALD."]
  const sectorMap: Record<string, number> = {}

  for (const name of sectorOrder) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-")
    const sector = await prisma.sector.create({
      data: { name, slug, order: sectorOrder.indexOf(name) },
    })
    sectorMap[name] = sector.id
  }

  const productCache: Record<string, number> = {}

  for (const weekData of weeksData) {
    for (const row of weekData.rows) {
      const cacheKey = `${row.sectorName}|${row.productName}`
      if (!productCache[cacheKey]) {
        const sectorId = sectorMap[row.sectorName]
        if (!sectorId) continue

        const product = await prisma.product.create({
          data: {
            name: row.productName,
            unit: row.unit || "kg",
            sectorId,
            unitPrice: row.unitPrice || null,
            target: row.target || null,
            order: Object.keys(productCache).filter((k) => k.startsWith(row.sectorName)).length,
          },
        })
        productCache[cacheKey] = product.id
      }
    }
  }

  for (const weekData of weeksData) {
    const week = await prisma.week.create({
      data: {
        safraId: safra.id,
        weekNumber: weekData.weekNumber,
        startDate: weekData.startDate,
        endDate: weekData.endDate,
      },
    })

    const uniqueRows = new Map<string, typeof weekData.rows[0]>()
    for (const row of weekData.rows) {
      const cacheKey = `${row.sectorName}|${row.productName}`
      if (!uniqueRows.has(cacheKey)) {
        uniqueRows.set(cacheKey, row)
      }
    }

    for (const [cacheKey, row] of uniqueRows) {
      const productId = productCache[cacheKey]
      if (!productId) continue

      await prisma.weeklyRecord.create({
        data: {
          weekId: week.id,
          productId,
          weeklyConsumption: row.weeklyConsumption ?? null,
          weeklyCost: row.unitPrice && row.weeklyConsumption
            ? row.unitPrice * row.weeklyConsumption
            : null,
        },
      })
    }

    await prisma.productionRecord.create({
      data: {
        weekId: week.id,
        acucarVhp: weekData.production.acucarVhp ?? null,
        acucarCristal: weekData.production.acucarCristal ?? null,
        etanolAnidro: weekData.production.etanolAnidro ?? null,
        etanolHidratado: weekData.production.etanolHidratado ?? null,
        canaEtanol: weekData.production.canaEtanol ?? null,
        canaAcucar: weekData.production.canaAcucar ?? null,
      },
    })

    console.log(`  Semana ${weekData.weekNumber} importada (${weekData.rows.length} produtos)`)
  }

  console.log(`\nImportação concluída!`)
  console.log(`  Safra: ${safra.name}`)
  console.log(`  Semanas: ${weeksData.length}`)
  console.log(`  Produtos: ${Object.keys(productCache).length}`)
  console.log(`\nUsuário admin: admin@usina.com / admin123`)
}

main()
  .catch((e) => {
    console.error("Erro:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

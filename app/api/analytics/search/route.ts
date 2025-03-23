import { PrismaClient } from '@prisma/client'
import { NextResponse } from "next/server"

// Map frontend table names to Prisma model names
const prisma = new PrismaClient()
const tableMap: Record<string, keyof typeof prisma> = {
  propiedades: 'propiedades_Existentes',
  cuencas: 'cuenca',
  municipios: 'municipio',
  eventos: 'eventos',
  incidentes: 'incidentes'
}

// Add type definitions
interface SearchParams {
  table: string
  filters: Array<{
    field: string
    operator: 'contains' | 'equals' | 'greater' | 'less'
    value: string
  }>
  sorts: Array<{
    field: string
    direction: 'asc' | 'desc'
  }>
  fields: string[]
}

export async function POST(request: Request) {
  try {
    const params = await request.json() as SearchParams
    const { table, filters, sorts, fields } = params
    
    // Validate required fields
    if (!table || !Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      )
    }
    
    // Get the correct Prisma model name
    const prismaModel = tableMap[table]
    if (!prismaModel || !prisma[prismaModel]) {
      return NextResponse.json(
        { error: `Invalid table: ${table}` },
        { status: 400 }
      )
    }

    // Build the Prisma query dynamically
    let query: any = {
      select: fields.reduce((acc: any, field: string) => {
        acc[field] = true
        return acc
      }, {}),
    }

    // Add filters
    if (filters.length > 0) {
      query.where = {
        AND: filters.map((filter: any) => {
          switch (filter.operator) {
            case 'contains':
              return {
                [filter.field]: {
                  contains: filter.value,
                  mode: 'insensitive',
                },
              }
            case 'equals':
              return {
                [filter.field]: filter.value,
              }
            case 'greater':
              return {
                [filter.field]: {
                  gt: Number(filter.value),
                },
              }
            case 'less':
              return {
                [filter.field]: {
                  lt: Number(filter.value),
                },
              }
            default:
              return {}
          }
        }),
      }
    }

    // Add sorts
    if (sorts.length > 0) {
      query.orderBy = sorts.map((sort: any) => ({
        [sort.field]: sort.direction,
      }))
    }

    // Execute the query on the selected table
    const results = await (prisma[prismaModel] as any).findMany(query)
    return NextResponse.json({ data: results, count: results.length })
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json(
      { error: "Error performing search" },
      { status: 500 }
    )
  }
} 
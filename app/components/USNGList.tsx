"use client"

import { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Loader2, ChevronRight, ChevronDown } from "lucide-react"
import { Input } from "./ui/input"

interface USNG {
  id: number
  usngCode: string
  geometria: {
    type: string
    coordinates: number[]
  }
  _count: {
    propiedades: number
    cuencas: number
  }
}

interface GridDetails {
  propiedades: {
    id: number
    tipo: string
    valor: number
  }[]
  cuencas: {
    id: number
    nombre: string
    codigo_cuenca: string
  }[]
}

export default function USNGList({ onUSNGSelect }: { onUSNGSelect: (coords: number[], zoom: number) => void }) {
  const [usngGrids, setUSNGGrids] = useState<USNG[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUSNG, setSelectedUSNG] = useState<string | null>(null)
  const [expandedUSNG, setExpandedUSNG] = useState<string | null>(null)
  const [gridDetails, setGridDetails] = useState<GridDetails | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [loadingDetails, setLoadingDetails] = useState(false)

  const filteredGrids = useMemo(() => {
    if (!searchTerm.trim()) return usngGrids
    return usngGrids.filter((grid) =>
      grid.usngCode.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [searchTerm, usngGrids])

  useEffect(() => {
    const fetchGrids = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/grid")
        if (!response.ok) throw new Error("Failed to fetch grids")
        const data = await response.json()
        setUSNGGrids(data)
      } catch (error) {
        console.error("Error fetching USNG grids:", error)
        setError("Failed to load USNG grids")
      } finally {
        setLoading(false)
      }
    }

    fetchGrids()
  }, [])

  const handleUSNGClick = async (grid: USNG) => {
    setSelectedUSNG(grid.usngCode)
    
    // Ensure coordinates are properly formatted
    const coordinates = [
      Number(grid.geometria.coordinates[0]),
      Number(grid.geometria.coordinates[1])
    ]
    
    console.log("Zooming to coordinates:", coordinates)
    onUSNGSelect(coordinates, 16)
    
    // Toggle expansion
    if (expandedUSNG === grid.usngCode) {
      setExpandedUSNG(null)
      setGridDetails(null)
    } else {
      setExpandedUSNG(grid.usngCode)
      setLoadingDetails(true)
      try {
        const response = await fetch(`/api/grid/${grid.usngCode}`)
        if (!response.ok) throw new Error("Failed to fetch details")
        const data = await response.json()
        console.log("Grid details:", data)
        setGridDetails(data)
      } catch (error) {
        console.error("Error fetching grid details:", error)
      } finally {
        setLoadingDetails(false)
      }
    }
  }

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
  if (error) return <div className="text-red-500 p-4">{error}</div>

  return (
    <div className="space-y-4 p-4">
      <div className="relative">
        <Search className="absolute left-2 top-3 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search USNG..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>

      <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
        {filteredGrids.map((grid) => (
          <motion.li
            key={grid.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className={`rounded-lg border ${
              selectedUSNG === grid.usngCode ? "bg-blue-50 border-blue-200" : "border-gray-200"
            }`}>
              <button
                onClick={() => handleUSNGClick(grid)}
                className="w-full text-left p-3 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center font-medium">
                    {expandedUSNG === grid.usngCode ? 
                      <ChevronDown className="h-4 w-4 mr-2" /> : 
                      <ChevronRight className="h-4 w-4 mr-2" />
                    }
                    {grid.usngCode}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Properties: {grid._count.propiedades} | Cuencas: {grid._count.cuencas}
                  </div>
                </div>
              </button>

              <AnimatePresence>
                {expandedUSNG === grid.usngCode && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 pb-3"
                  >
                    {loadingDetails ? (
                      <div className="py-2 flex justify-center">
                        <Loader2 className="animate-spin" />
                      </div>
                    ) : gridDetails && (
                      <>
                        <div className="mb-3">
                          <h4 className="font-semibold mb-2">Properties</h4>
                          <ul className="space-y-1">
                            {gridDetails.propiedades.map((prop) => (
                              <li key={prop.id} className="text-sm">
                                {prop.tipo} - ${prop.valor.toLocaleString()}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Cuencas</h4>
                          <ul className="space-y-1">
                            {gridDetails.cuencas.map((cuenca) => (
                              <li key={cuenca.id} className="text-sm">
                                {cuenca.nombre} ({cuenca.codigo_cuenca})
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  )
} 
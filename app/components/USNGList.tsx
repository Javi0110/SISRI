"use client"

import { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Loader2, ChevronRight, ChevronDown, Home, Droplets, Wrench } from "lucide-react"
import { Input } from "./ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { fromLonLat } from 'ol/proj'

interface USNGDetails {
  usng: string
  properties: {
    id: number
    tipo: string
    valor: number
  }[]
  cuencas: {
    id: number
    nombre: string
    codigo_cuenca: string
  }[]
  tools: {
    id: number
    tipo: string
    estado: string
  }[]
}

export default function USNGList({ onUSNGSelect }: { onUSNGSelect: (coords: number[], zoom: number) => void }) {
  const [usngList, setUSNGList] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUSNG, setSelectedUSNG] = useState<string | null>(null)
  const [details, setDetails] = useState<USNGDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  useEffect(() => {
    const fetchUSNGList = async () => {
      try {
        const response = await fetch("/api/usng/list")
        if (!response.ok) throw new Error("Failed to fetch USNG list")
        const data = await response.json()
        setUSNGList(data)
      } catch (error) {
        console.error("Error fetching USNG list:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUSNGList()
  }, [])

  const filteredList = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return usngList
    return usngList.filter(usng => 
      usng.toLowerCase().includes(term)
    )
  }, [usngList, searchTerm])

  const handleUSNGClick = async (usng: string) => {
    setSelectedUSNG(usng)
    setLoadingDetails(true)

    try {
      const response = await fetch(`/api/usng/${encodeURIComponent(usng)}`)
      if (!response.ok) throw new Error("Failed to fetch USNG details")
      const data = await response.json()
      
      setDetails(data)
      
      // Check if we have valid coordinates and zoom to them
      if (data.coordinates && 
          Array.isArray(data.coordinates) && 
          data.coordinates.length === 2 &&
          !isNaN(data.coordinates[0]) && 
          !isNaN(data.coordinates[1])) {
        // Convert to OpenLayers coordinates and zoom
        const coords = fromLonLat(data.coordinates)
        onUSNGSelect(coords, 16)
      } else {
        console.error("Invalid coordinates received:", data.coordinates)
      }
    } catch (error) {
      console.error("Error fetching USNG details:", error)
      setDetails(null)
    } finally {
      setLoadingDetails(false)
    }
  }

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2 top-3 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search USNG..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="pl-8"
          aria-label="Search USNG"
          autoComplete="off"
        />
      </div>

      <ScrollArea className="h-[500px]">
        <div className="space-y-2">
          {filteredList.map((usng) => (
            <div key={usng} className="space-y-2">
              <Button
                variant={selectedUSNG === usng ? "secondary" : "ghost"}
                className="w-full justify-between"
                onClick={() => handleUSNGClick(usng)}
              >
                <span>{usng}</span>
                {selectedUSNG === usng ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>

              <AnimatePresence>
                {selectedUSNG === usng && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="pl-4"
                  >
                    {loadingDetails ? (
                      <Card className="p-4 flex justify-center">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </Card>
                    ) : details ? (
                      <Card className="p-4 space-y-4">
                        <div>
                          <h4 className="font-semibold flex items-center gap-2">
                            <Home className="h-4 w-4" /> Properties ({details.properties.length})
                          </h4>
                          {details.properties.map(prop => (
                            <Badge key={prop.id} variant="outline" className="mr-2 mb-2">
                              {prop.tipo}
                            </Badge>
                          ))}
                        </div>

                        <div>
                          <h4 className="font-semibold flex items-center gap-2">
                            <Droplets className="h-4 w-4" /> Cuencas ({details.cuencas.length})
                          </h4>
                          {details.cuencas.map(cuenca => (
                            <Badge key={cuenca.id} variant="outline" className="mr-2 mb-2">
                              {cuenca.nombre}
                            </Badge>
                          ))}
                        </div>

                        <div>
                          <h4 className="font-semibold flex items-center gap-2">
                            <Wrench className="h-4 w-4" /> Tools ({details.tools.length})
                          </h4>
                          {details.tools.map(tool => (
                            <Badge key={tool.id} variant="outline" className="mr-2 mb-2">
                              {tool.tipo}
                            </Badge>
                          ))}
                        </div>
                      </Card>
                    ) : (
                      <Card className="p-4 text-center text-red-500">
                        Failed to load USNG details
                      </Card>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
} 
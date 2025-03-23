"use client"

import { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Loader2, ChevronRight, ChevronDown } from "lucide-react"
import { Input } from "components/ui/input"
import { ScrollArea } from "app/components/ui/scroll-area"
import { Button } from "components/ui/button"
import { Card } from "components/ui/card"
import { fromLonLat } from 'ol/proj'

interface Municipio {
  id_municipio: number
  nombre: string
  latitud: number
  longitud: number
  codigo_municipio: string
  barrios: Array<{
    id_barrio: number
    nombre: string
    sectores: Array<{
      id_sector: number
      nombre: string
    }>
  }>
}

interface MunicipiosListProps {
  onMunicipioSelect: (coords: [number, number], zoom: number) => void
}

export default function MunicipiosList({ onMunicipioSelect }: MunicipiosListProps) {
  const [municipios, setMunicipios] = useState<Municipio[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMunicipio, setSelectedMunicipio] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMunicipios = async () => {
      try {
        const response = await fetch('/api/municipios')
        if (!response.ok) throw new Error(`Error: ${response.status}`)
        const data = await response.json()
        console.log('Fetched municipios:', data) // Debug log
        setMunicipios(data)
      } catch (error) {
        console.error('Error fetching municipios:', error)
        setError('Failed to load municipios')
      } finally {
        setLoading(false)
      }
    }

    fetchMunicipios()
  }, [])

  const filteredMunicipios = useMemo(() => {
    const term = searchTerm.toLowerCase().trim()
    return municipios.filter(municipio => 
      municipio.nombre.toLowerCase().includes(term)
    )
  }, [municipios, searchTerm])

  const handleMunicipioClick = (municipio: Municipio) => {
    setSelectedMunicipio(municipio.nombre === selectedMunicipio ? null : municipio.nombre)
    
    // Convert coordinates and zoom to the municipio
    // Use center as fallback if latitud/longitud are not available
    const coords = municipio.latitud && municipio.longitud 
      ? fromLonLat([municipio.longitud, municipio.latitud])
      : fromLonLat(municipio.center)
    
    onMunicipioSelect(coords, 12) // Zoom level 12 is good for municipios
  }

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
  if (error) return <div className="p-4 text-red-500">{error}</div>

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2 top-3 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search municipios..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>

      <ScrollArea className="h-[500px]">
        <div className="space-y-2">
          {filteredMunicipios.map((municipio) => (
            <div key={municipio.id_municipio} className="space-y-2">
              <Button
                variant={selectedMunicipio === municipio.nombre ? "secondary" : "ghost"}
                className="w-full justify-between"
                onClick={() => handleMunicipioClick(municipio)}
              >
                <span>{municipio.nombre}</span>
                {selectedMunicipio === municipio.nombre ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>

              <AnimatePresence>
                {selectedMunicipio === municipio.nombre && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="pl-4"
                  >
                    <Card className="p-4">
                      <p className="text-sm">ID: {municipio.id_municipio}</p>
                      <Button 
                        size="sm" 
                        className="mt-2 w-full"
                        onClick={() => handleMunicipioClick(municipio)}
                      >
                        Zoom to Municipio
                      </Button>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
          {filteredMunicipios.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              No municipios found
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}


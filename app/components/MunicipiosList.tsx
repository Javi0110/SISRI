"use client"

import { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Loader2, ChevronRight, ChevronDown } from "lucide-react"
import { Input } from "components/ui/input"
import { ScrollArea } from "app/components/ui/scroll-area"
import { Button } from "components/ui/button"
import { Card } from "components/ui/card"
import { fromLonLat } from 'ol/proj'

interface Municipality {
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

interface MunicipalitiesListProps {
  onMunicipioSelect: (coords: [number, number], zoom: number, forceRefresh?: boolean) => void
}

export default function MunicipiosList({ onMunicipioSelect }: MunicipalitiesListProps) {
  const [municipalities, setMunicipalities] = useState<Municipality[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMunicipality, setSelectedMunicipality] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMunicipalities = async () => {
      try {
        const response = await fetch('/api/municipios')
        if (!response.ok) throw new Error(`Error: ${response.status}`)
        const data = await response.json()
        console.log('Fetched municipalities:', data) // Debug log
        setMunicipalities(data)
      } catch (error) {
        console.error('Error fetching municipalities:', error)
        setError('Failed to load municipalities')
      } finally {
        setLoading(false)
      }
    }

    fetchMunicipalities()
  }, [])

  const filteredMunicipalities = useMemo(() => {
    const term = searchTerm.toLowerCase().trim()
    return municipalities.filter(municipality => 
      municipality.nombre.toLowerCase().includes(term)
    )
  }, [municipalities, searchTerm])

  const handleMunicipalityClick = (municipality: Municipality) => {
    setSelectedMunicipality(municipality.nombre === selectedMunicipality ? null : municipality.nombre)
    
    let coordinates: [number, number] = [-66.4, 18.2]
    
    if (municipality.latitud && municipality.longitud) {
      coordinates = [municipality.longitud, municipality.latitud]
    }
    
    const transformedCoords = fromLonLat(coordinates)
    onMunicipioSelect(transformedCoords as [number, number], 12, true) // Pass true to force refresh
  }

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
  if (error) return <div className="p-4 text-red-500">{error}</div>

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2 top-3 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search municipalities..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>

      <ScrollArea className="h-[500px]">
        <div className="space-y-2">
          {filteredMunicipalities.map((municipality) => (
            <div key={municipality.id_municipio} className="space-y-2">
              <Button
                variant={selectedMunicipality === municipality.nombre ? "secondary" : "ghost"}
                className="w-full justify-between"
                onClick={() => handleMunicipalityClick(municipality)}
              >
                <span>{municipality.nombre}</span>
                {selectedMunicipality === municipality.nombre ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>

              <AnimatePresence>
                {selectedMunicipality === municipality.nombre && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="pl-4"
                  >
                    <Card className="p-4">
                      <p className="text-sm">ID: {municipality.id_municipio}</p>
                      <Button 
                        size="sm" 
                        className="mt-2 w-full"
                        onClick={() => handleMunicipalityClick(municipality)}
                      >
                        Zoom to Municipality
                      </Button>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
          {filteredMunicipalities.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              No municipalities found
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}


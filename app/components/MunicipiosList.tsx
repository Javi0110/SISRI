"use client"

import { useEffect, useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Loader2, ChevronRight, ChevronDown, Home, Users, Calendar, MapPin } from "lucide-react"
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

interface MunicipioSummary {
  municipio: { id_municipio: number; nombre: string }
  summary: { properties: number; residents: number; events: number; barrios: number }
  properties: Array<{ id: number; direccion: string | null; type: string | null }>
  residents: Array<{ id: number; nombre: string; categoria: string | null; rol: string | null }>
  events: Array<{ id: number; titulo: string | null; tipo: string | null; estado: string | null; fecha: Date }>
  barrios: Array<{ id: number; nombre: string | null }>
}

interface MunicipiosListProps {
  onMunicipioSelect: (coords: [number, number], zoom: number, forceRefresh?: boolean) => void
}

export default function MunicipiosList({ onMunicipioSelect }: MunicipiosListProps) {
  const [municipios, setMunicipios] = useState<Municipio[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMunicipio, setSelectedMunicipio] = useState<Municipio | null>(null)
  const [summary, setSummary] = useState<MunicipioSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMunicipios = async () => {
      try {
        const response = await fetch('/api/municipios')
        if (!response.ok) throw new Error(`Error: ${response.status}`)
        const data = await response.json()
        setMunicipios(data)
      } catch (error) {
        console.error('Error fetching municipios:', error)
        setError('Failed to load municipalities')
      } finally {
        setLoading(false)
      }
    }

    fetchMunicipios()
  }, [])

  useEffect(() => {
    if (!selectedMunicipio?.id_municipio) {
      setSummary(null)
      return
    }
    setSummaryLoading(true)
    fetch(`/api/municipios/${selectedMunicipio.id_municipio}/summary`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => setSummary(data))
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false))
  }, [selectedMunicipio?.id_municipio])

  const filteredMunicipios = useMemo(() => {
    const term = searchTerm.toLowerCase().trim()
    return municipios.filter(municipio => 
      municipio.nombre.toLowerCase().includes(term)
    )
  }, [municipios, searchTerm])

  const handleMunicipioClick = (municipio: Municipio) => {
    setSelectedMunicipio(selectedMunicipio?.id_municipio === municipio.id_municipio ? null : municipio)
    
    let coordinates: [number, number] = [-66.4, 18.2]
    
    if (municipio.latitud && municipio.longitud) {
      coordinates = [municipio.longitud, municipio.latitud]
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
          {filteredMunicipios.map((municipio) => (
            <div key={municipio.id_municipio} className="space-y-2">
              <Button
                variant={selectedMunicipio?.id_municipio === municipio.id_municipio ? "secondary" : "ghost"}
                className="w-full justify-between"
                onClick={() => handleMunicipioClick(municipio)}
              >
                <span>{municipio.nombre}</span>
                {selectedMunicipio?.id_municipio === municipio.id_municipio ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>

              <AnimatePresence>
                {selectedMunicipio?.id_municipio === municipio.id_municipio && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="pl-4"
                  >
                    <Card className="p-4 space-y-4">
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => handleMunicipioClick(municipio)}
                      >
                        Zoom to Municipality
                      </Button>
                      {summaryLoading ? (
                        <div className="flex justify-center py-4"><Loader2 className="animate-spin h-5 w-5" /></div>
                      ) : summary ? (
                        <>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Home className="h-4 w-4 text-muted-foreground" />
                              <span>Properties: {summary.summary.properties}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>Residents: {summary.summary.residents}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>Events: {summary.summary.events}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>Barrios: {summary.summary.barrios}</span>
                            </div>
                          </div>
                          {summary.events.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-1">Recent Events</p>
                              <ScrollArea className="h-24">
                                <div className="space-y-1 text-xs">
                                  {summary.events.slice(0, 5).map((e) => (
                                    <div key={e.id} className="py-1 border-b last:border-0">
                                      {e.titulo || 'Untitled'} · {e.tipo || '-'} ({e.estado || '-'})
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          )}
                          {summary.properties.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground mb-1">Properties</p>
                              <ScrollArea className="h-20">
                                <div className="space-y-1 text-xs">
                                  {summary.properties.slice(0, 5).map((p) => (
                                    <div key={p.id} className="py-1 border-b last:border-0">
                                      {p.direccion || 'No address'} · {p.type || '-'}
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          )}
                        </>
                      ) : null}
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
          {filteredMunicipios.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              No municipalities found
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}


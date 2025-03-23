"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Loader2, ChevronRight, ChevronDown, Home, Droplets, Wrench } from "lucide-react"
import { Input } from "./ui/input"
import { ScrollArea } from "./ui/scroll-area"
import { Button } from "./ui/button"
import { Card } from "./ui/card"
import { Badge } from "../../components/ui/badge"
import { fromLonLat } from 'ol/proj'

interface USNGDetails {
  usng: string
  coordinates: [number, number]
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
  const [cachedDetails, setCachedDetails] = useState<Record<string, USNGDetails>>({})
  const [visibleList, setVisibleList] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const itemsPerPage = 100

  // Load USNG list with pagination and caching
  useEffect(() => {
    const fetchUSNGList = async () => {
      try {
        // Check for cached list in sessionStorage
        const cachedList = sessionStorage.getItem('usngList')
        if (cachedList) {
          const parsedList = JSON.parse(cachedList)
          setUSNGList(parsedList)
          // Initialize with first page
          setVisibleList(parsedList.slice(0, itemsPerPage))
          setLoading(false)
          return
        }
        
        // Fetch from API if not cached
        const response = await fetch("/api/usng/list")
        if (!response.ok) throw new Error(`Failed to fetch USNG list: ${response.status}`)
        const data = await response.json()
        
        // Cache the result
        sessionStorage.setItem('usngList', JSON.stringify(data))
        setUSNGList(data)
        // Initialize with first page
        setVisibleList(data.slice(0, itemsPerPage))
      } catch (error) {
        console.error("Error fetching USNG list:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUSNGList()
  }, [])

  // Handle search with debounce
  useEffect(() => {
    const term = searchTerm.trim().toLowerCase()
    
    // Debounce search to avoid excessive filtering
    const debounceTimer = setTimeout(() => {
      if (!term) {
        // Reset to first page when clearing search
        setPage(1)
        setVisibleList(usngList.slice(0, itemsPerPage))
      } else {
        const filtered = usngList.filter(usng => 
          usng.toLowerCase().includes(term)
        ).slice(0, itemsPerPage)
        setVisibleList(filtered)
      }
    }, 300)
    
    return () => clearTimeout(debounceTimer)
  }, [searchTerm, usngList])

  // Handle pagination
  const loadMoreItems = useCallback(() => {
    const term = searchTerm.trim().toLowerCase()
    const nextPage = page + 1
    
    if (term) {
      // If searching, add more filtered items
      const filtered = usngList.filter(usng => 
        usng.toLowerCase().includes(term)
      ).slice(0, nextPage * itemsPerPage)
      setVisibleList(filtered)
    } else {
      // Otherwise, add next page of items
      const nextItems = usngList.slice(0, nextPage * itemsPerPage)
      setVisibleList(nextItems)
    }
    
    setPage(nextPage)
  }, [page, searchTerm, usngList])

  // Optimized USNG selection handler
  const handleUSNGClick = async (usng: string) => {
    setSelectedUSNG(usng)
    setLoadingDetails(true)

    try {
      // Check cache first
      if (cachedDetails[usng]) {
        setDetails(cachedDetails[usng])
        
        const coords = fromLonLat(cachedDetails[usng].coordinates)
        onUSNGSelect(coords, 16)
        setLoadingDetails(false)
        return
      }
      
      // Fetch from API if not cached
      const response = await fetch(`/api/usng/${encodeURIComponent(usng)}`)
      if (!response.ok) throw new Error(`Failed to fetch USNG details: ${response.status}`)
      const data = await response.json()
      
      // Cache the result
      setCachedDetails(prev => ({...prev, [usng]: data}))
      setDetails(data)
      
      // Zoom to coordinates if valid
      if (data.coordinates && 
          Array.isArray(data.coordinates) && 
          data.coordinates.length === 2 &&
          !isNaN(data.coordinates[0]) && 
          !isNaN(data.coordinates[1])) {
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

  // Handle scroll to implement infinite scrolling
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    const bottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 200
    
    if (bottom && visibleList.length < usngList.length && !loading) {
      loadMoreItems()
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

      <ScrollArea className="h-[500px]" onScrollCapture={handleScroll}>
        <div className="space-y-2">
          {visibleList.map((usng) => (
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
                          {details.properties.length > 0 ? (
                            details.properties.map(prop => (
                              <Badge key={prop.id} variant="outline" className="mr-2 mb-2">
                                {prop.tipo}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500">No properties found</span>
                          )}
                        </div>

                        <div>
                          <h4 className="font-semibold flex items-center gap-2">
                            <Droplets className="h-4 w-4" /> Cuencas ({details.cuencas.length})
                          </h4>
                          {details.cuencas.length > 0 ? (
                            details.cuencas.map(cuenca => (
                              <Badge key={cuenca.id} variant="outline" className="mr-2 mb-2">
                                {cuenca.nombre}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500">No cuencas found</span>
                          )}
                        </div>

                        <div>
                          <h4 className="font-semibold flex items-center gap-2">
                            <Wrench className="h-4 w-4" /> Tools ({details.tools.length})
                          </h4>
                          {details.tools.length > 0 ? (
                            details.tools.map(tool => (
                              <Badge key={tool.id} variant="outline" className="mr-2 mb-2">
                                {tool.tipo}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500">No tools found</span>
                          )}
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
          
          {visibleList.length < usngList.length && !searchTerm && (
            <div className="py-4 flex justify-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadMoreItems}
                className="text-xs"
              >
                Load More
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
} 
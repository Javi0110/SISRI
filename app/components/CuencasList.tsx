"use client"

import { useEffect, useState } from "react"
import { Loader2, Search } from "lucide-react"
import { Input } from "components/ui/input"
import { ScrollArea } from "app/components/ui/scroll-area"
import { Button } from "components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "components/ui/collapsible"

interface Watershed {
  id: number
  nombre: string
  descripcion: string | null
  codigo_cuenca: string | null
  center: number[]
  area?: number
  usngCoords: Array<[number, number]>
}

interface WatershedsListProps {
  onCuencaSelect: (watershed: Watershed) => void
}

export default function CuencasList({ onCuencaSelect }: WatershedsListProps) {
  const [loading, setLoading] = useState(true)
  const [filteredWatersheds, setFilteredWatersheds] = useState<Watershed[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [expandedWatershed, setExpandedWatershed] = useState<number | null>(null)

  useEffect(() => {
    const fetchWatersheds = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/cuencas")

        if (!response.ok) {
          throw new Error("Error fetching watersheds data")
        }

        const data = await response.json()
        setFilteredWatersheds(data)
      } catch (error) {
        console.error("Error fetching watersheds:", error)
        setError("Error loading watersheds. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchWatersheds()
  }, [])

  useEffect(() => {
    const searchWatersheds = async () => {
      try {
        setLoading(true)
        const url = searchTerm.trim() === "" ? 
          "/api/cuencas" : 
          `/api/cuencas?search=${encodeURIComponent(searchTerm)}`
        
        const response = await fetch(url)
        if (!response.ok) throw new Error("Error searching watersheds")
        const data = await response.json()
        setFilteredWatersheds(data)
      } catch (error) {
        console.error("Error searching watersheds:", error)
        setError("Error searching watersheds")
      } finally {
        setLoading(false)
      }
    }

    const debounceTimer = setTimeout(searchWatersheds, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchTerm])

  const handleWatershedSelect = (watershed: Watershed) => {
    onCuencaSelect(watershed)
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search watershed..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>

      {loading && (
        <div className="flex justify-center p-4">
          <Loader2 className="animate-spin" />
        </div>
      )}

      {error && (
        <div className="p-4 text-red-500">
          {error}
        </div>
      )}

      <ScrollArea className="h-[500px]">
        <div className="space-y-2">
          {filteredWatersheds.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No watersheds found</p>
          ) : (
            filteredWatersheds.map((watershed) => (
              <div key={watershed.id} className="flex items-center">
                <Collapsible className="w-full">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start hover:bg-gray-100"
                      onClick={() => handleWatershedSelect(watershed)}
                      onClickCapture={(e) => {
                        e.stopPropagation()
                        setExpandedWatershed(expandedWatershed === watershed.id ? null : watershed.id)
                      }}
                    >
                      <span>{watershed.nombre}</span>
                      <span className="ml-auto text-sm text-gray-500">
                        {watershed.usngCoords.length} USNG coordinates
                      </span>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-2 pl-6 space-y-2">
                    {watershed.codigo_cuenca && (
                      <p className="text-sm text-gray-600">
                        Code: {watershed.codigo_cuenca}
                      </p>
                    )}
                    {watershed.descripcion && (
                      <p>{watershed.descripcion}</p>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
} 
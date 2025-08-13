"use client"

import { useState, useEffect } from "react"
import { Input } from "../../components/ui/input"
import { Button } from "../../components/ui/button"
import { Search, Droplet, Info } from "lucide-react"
import { ScrollArea } from "../../components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip"

interface Cuenca {
  id: number
  nombre: string
  descripcion: string
  usngCoords: string[]
  geom: string
}

interface CuencasListProps {
  onCuencaSelect: (cuenca: Cuenca) => void
}

export default function CuencasList({ onCuencaSelect }: CuencasListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredCuencas, setFilteredCuencas] = useState<Cuenca[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCuencas = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch("/api/cuencas")
        
        if (!response.ok) {
          throw new Error("Error fetching cuencas data")
        }
        
        const data = await response.json()
        setFilteredCuencas(data)
      } catch (error) {
        console.error("Error fetching cuencas:", error)
        setError("Error cargando las cuencas. Inténtelo de nuevo.")
      } finally {
        setLoading(false)
      }
    }

    fetchCuencas()
  }, [])

  // Handle search input changes
  const handleSearch = async () => {
    setLoading(true)
    
    try {
      const url = searchTerm.trim() === "" ? 
        "/api/cuencas" : 
        `/api/cuencas?search=${encodeURIComponent(searchTerm)}`
      
      const response = await fetch(url)
      if (!response.ok) throw new Error("Error searching cuencas")
      const data = await response.json()
      setFilteredCuencas(data)
    } catch (error) {
      console.error("Error during search:", error)
      setError("Error during search. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Submit search on Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const handleCuencaSelect = (cuenca: Cuenca) => {
    onCuencaSelect(cuenca)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Search watershed..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button variant="outline" size="icon" onClick={handleSearch}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <div className="text-red-500 text-sm mt-2">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-4">
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="space-y-2">
            {filteredCuencas.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No watersheds found</p>
            ) : (
              filteredCuencas.map((cuenca) => (
                <div key={cuenca.id} className="flex items-center">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleCuencaSelect(cuenca)}
                  >
                    <div className="flex items-center">
                      <Droplet className="mr-2 h-4 w-4 text-blue-500" />
                      <div className="flex flex-col items-start">
                        <span>{cuenca.nombre}</span>
                        <span className="text-xs text-muted-foreground">
                          {cuenca.usngCoords.length} USNG coordinates
                        </span>
                      </div>
                    </div>
                  </Button>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{cuenca.descripcion}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  )
} 
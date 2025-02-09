"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Loader2 } from "lucide-react"
import { Input } from "./ui/input"
import { Button } from "./ui/button"

interface Property {
  id: number
  valor: number
  tipoConstruccion: string
  uso: string
  barrio: {
    nombre: string
    municipio: {
      nombre: string
    }
  }
}

export default function PropertySearch() {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<Property[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(`/api/properties/search?q=${encodeURIComponent(searchTerm)}`)
      const data = await response.json()
      setSearchResults(data)
    } catch (error) {
      console.error("Error searching properties:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-2 top-3 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search properties..."
          className="pl-8"
        />
        <Button type="submit" className="mt-2 w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching...
            </>
          ) : (
            "Search"
          )}
        </Button>
      </form>
      <AnimatePresence>
        {searchResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-2"
          >
            <h3 className="text-lg font-semibold">Results:</h3>
            <ul className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
              {searchResults.map((property) => (
                <motion.li
                  key={property.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white p-3 rounded-lg shadow-sm"
                >
                  <h4 className="font-semibold">{property.uso}</h4>
                  <p className="text-sm text-gray-600">Type: {property.tipoConstruccion}</p>
                  <p className="text-sm text-gray-600">Value: ${property.valor.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">
                    Location: {property.barrio.nombre}, {property.barrio.municipio.nombre}
                  </p>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


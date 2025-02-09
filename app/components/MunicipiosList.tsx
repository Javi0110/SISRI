"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Search } from "lucide-react"
import { Input } from "./ui/input"

interface Municipio {
  id_municipio: number
  nombre: string
  codigo_municipio: string
  latitud: number
  longitud: number
}

export default function MunicipiosList() {
  const [municipios, setMunicipios] = useState<Municipio[]>([])
  const [filteredMunicipios, setFilteredMunicipios] = useState<Municipio[]>([])
  const [selectedMunicipio, setSelectedMunicipio] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetch("/api/municipios")
      .then((res) => res.json())
      .then((data) => {
        setMunicipios(data)
        setFilteredMunicipios(data)
      })
      .catch((error) => console.error("Error fetching municipios:", error))
  }, [])

  useEffect(() => {
    const filtered = municipios.filter(
      (municipio) =>
        municipio.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        municipio.codigo_municipio.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    setFilteredMunicipios(filtered)
  }, [searchTerm, municipios])

  const handleMunicipioClick = (id: number) => {
    setSelectedMunicipio(id)
    // TODO: Update map to focus on selected municipio
  }

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
      <ul className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
        {filteredMunicipios.map((municipio) => (
          <motion.li
            key={municipio.id_municipio}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <button
              className={`w-full text-left p-2 rounded transition-colors ${
                selectedMunicipio === municipio.id_municipio ? "bg-blue-100 text-blue-800" : "hover:bg-gray-100"
              }`}
              onClick={() => handleMunicipioClick(municipio.id_municipio)}
            >
              <span className="font-medium">{municipio.nombre}</span>
              <span className="text-sm text-gray-500 ml-2">({municipio.codigo_municipio})</span>
            </button>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}


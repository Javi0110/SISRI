"use client"

import { useCallback, useState } from "react"
import Map from "./components/Map"
import Sidebar from "./components/Sidebar"

export default function Home() {
  const [map, setMap] = useState<any>(null)

  // Use useCallback to memoize these functions
  const handleMapInitialized = useCallback((mapInstance: any) => {
    setMap(mapInstance)
  }, [])

  const handleUSNGSelect = useCallback((coords: number[], zoom: number) => {
    if (!map) return
    
    map.getView().animate({
      center: coords,
      zoom: zoom,
      duration: 500
    })
  }, [map])
  
  const handleMunicipioSelect = useCallback((coords: number[], zoom: number) => {
    if (!map) return
    
    map.getView().animate({
      center: coords,
      zoom: zoom,
      duration: 500
    })
  }, [map])

  const handleCuencaSelect = useCallback((cuenca: any) => {
    if (!map || !map.handleCuencaSelect) return
    
    // Use the method we attached to the map instance
    map.handleCuencaSelect(cuenca)
  }, [map])

  return (
    <main className="flex h-screen">
      <Sidebar 
        onUSNGSelect={handleUSNGSelect} 
        onMunicipioSelect={handleMunicipioSelect}
        onCuencaSelect={handleCuencaSelect}
      />
      <Map onMapInitialized={handleMapInitialized} />
    </main>
  )
}


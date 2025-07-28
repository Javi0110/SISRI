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
  
  const handleMunicipalitySelect = useCallback((coords: number[], zoom: number) => {
    if (!map) return
    
    map.getView().animate({
      center: coords,
      zoom: zoom,
      duration: 500
    })
  }, [map])

  const handleWatershedSelect = useCallback((watershed: any) => {
    if (!map || !map.handleWatershedSelect) return
    
    // Use the method we attached to the map instance
    map.handleWatershedSelect(watershed)
  }, [map])

  return (
    <main className="flex h-screen">
      <Sidebar 
        onUSNGSelect={handleUSNGSelect} 
        onMunicipioSelect={handleMunicipalitySelect}
        onCuencaSelect={handleWatershedSelect}
      />
      <Map onMapInitialized={handleMapInitialized} />
    </main>
  )
}


"use client"

import { useState, useEffect, useCallback } from "react"
import Map from "./components/Map"
import Sidebar from "./components/Sidebar"
import { View } from "ol"
import { fromLonLat } from "ol/proj"

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

  return (
    <main className="flex h-screen">
      <Sidebar 
        onUSNGSelect={handleUSNGSelect} 
        onMunicipioSelect={handleMunicipioSelect}
      />
      <Map onMapInitialized={handleMapInitialized} />
    </main>
  )
}


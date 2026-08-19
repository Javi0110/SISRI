"use client"

import { useCallback, useState } from "react"
import Map from "./components/Map"
import Sidebar from "./components/Sidebar"

export default function Home() {
  const [map, setMap] = useState<any>(null)

  const handleMapInitialized = useCallback((mapInstance: any) => {
    setMap(mapInstance)
  }, [])

  const handleUSNGSelect = useCallback(
    (coords: number[], zoom: number) => {
      if (!map) return

      map.getView().animate({
        center: coords,
        zoom: zoom,
        duration: 500,
      })
    },
    [map]
  )

  const handleMunicipioSelect = useCallback(
    (coords: number[], zoom: number) => {
      if (!map) return

      map.getView().animate({
        center: coords,
        zoom: zoom,
        duration: 500,
      })
    },
    [map]
  )

  const handleCuencaSelect = useCallback(
    (cuenca: any) => {
      if (!map || !map.handleCuencaSelect) return
      map.handleCuencaSelect(cuenca)
    },
    [map]
  )

  return (
    <div className="flex h-full min-h-0 flex-1">
      <Sidebar
        onUSNGSelect={handleUSNGSelect}
        onMunicipioSelect={handleMunicipioSelect}
        onCuencaSelect={handleCuencaSelect}
      />
      <div className="relative min-w-0 flex-1">
        <Map onMapInitialized={handleMapInitialized} />
      </div>
    </div>
  )
}

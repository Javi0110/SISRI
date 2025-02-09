"use client"

import dynamic from "next/dynamic"
import Sidebar from "./components/Sidebar"

const Map = dynamic(() => import("./components/Map"), { ssr: false })

export default function Home() {
  const handleUSNGSelect = (coords: number[], zoom: number) => {
    // This will be handled by the Map component
    if (window.mapInstance) {
      window.mapInstance.getView().animate({
        center: coords,
        zoom: zoom,
        duration: 1000
      })
    }
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <Sidebar onUSNGSelect={handleUSNGSelect} />
      <div className="flex-1">
        <Map />
      </div>
    </div>
  )
}


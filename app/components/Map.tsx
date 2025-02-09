"use client"

import { useEffect, useRef, useState } from "react"
import Map from "ol/Map"
import View from "ol/View"
import TileLayer from "ol/layer/Tile"
import OSM from "ol/source/OSM"
import { fromLonLat } from "ol/proj"
import VectorLayer from "ol/layer/Vector"
import VectorSource from "ol/source/Vector"
import GeoJSON from "ol/format/GeoJSON"
import { Style, Fill, Stroke } from "ol/style"
import { motion } from "framer-motion"
import Sidebar from "./Sidebar"

export default function MapComponent() {
  const mapRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!mapRef.current) return

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM()
        })
      ],
      view: new View({
        center: fromLonLat([-66.5901, 18.2208]), // Puerto Rico coordinates
        zoom: 9
      })
    })

    // Store map instance globally for access from other components
    window.mapInstance = map

    setLoading(false)

    return () => {
      map.setTarget(undefined)
      window.mapInstance = undefined
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current) return

    // Fetch and display municipios
    fetch("/api/municipios")
      .then((res) => res.json())
      .then((data) => {
        const vectorSource = new VectorSource({
          features: new GeoJSON().readFeatures(
            {
              type: "FeatureCollection",
              features: data.map((municipio: any) => ({
                type: "Feature",
                geometry: municipio.geometria,
                properties: { id: municipio.id, nombre: municipio.nombre },
              })),
            },
            { featureProjection: "EPSG:3857" },
          ),
        })

        const vectorLayer = new VectorLayer({
          source: vectorSource,
          style: new Style({
            fill: new Fill({
              color: "rgba(0, 0, 255, 0.1)",
            }),
            stroke: new Stroke({
              color: "#0000ff",
              width: 1,
            }),
          }),
        })

        if (mapRef.current) {
          const mapElement = mapRef.current.querySelector("ol-map") as HTMLElement
          if (mapElement && 'map' in mapElement) {
            (mapElement as any).map.addLayer(vectorLayer)
          }
        }
      })
      .catch((error) => console.error("Error fetching municipios:", error))
  }, [])

  return (
    <div className="flex h-screen">
      {/* <Sidebar onUSNGSelect={function (coords: number[], zoom: number): void {
        throw new Error("Function not implemented.")
      } } /> */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative flex-1"
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
        <div ref={mapRef} className="w-full h-full" />
      </motion.div>
    </div>
  )
}


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
import { Style, Fill, Stroke, Text } from "ol/style"
import { motion } from "framer-motion"
import EsriJSON from 'ol/format/EsriJSON'
import { bbox } from 'ol/loadingstrategy'
import { intersects } from 'ol/extent'

// Declare global window type
declare global {
  interface Window {
    mapInstance?: Map
  }
}

interface MapComponentProps {
  onMapInitialized?: (map: Map) => void
}

// Constants for map configuration
const PUERTO_RICO_CENTER = [-66.5901, 18.2208]
const ZOOM_LEVELS = {
  MIN: 6,
  MAX: 19,
  INITIAL: 8,
  USNG_MIN: 8,
  USNG_MAX: 19
}

const COLORS = {
  USNG: {
    STROKE: '#FF4444',
    FILL: 'rgba(255, 68, 68, 0.05)',
    TEXT: '#FF4444',
    TEXT_STROKE: '#FFFFFF'
  },
  MUNICIPIO: {
    STROKE: '#4444FF',
    FILL: 'rgba(68, 68, 255, 0.1)'
  }
}

// Constants for Puerto Rico extent in Web Mercator (EPSG:3857)
const PUERTO_RICO_EXTENT = {
  xmin: -7526593.264043136,
  ymin: 1941281.9702659545,
  xmax: -7250000.369888829,
  ymax: 2213831.9532818417,
  spatialReference: { wkid: 3857 }
}

// Styles
const municipioStyle = new Style({
  fill: new Fill({ color: COLORS.MUNICIPIO.FILL }),
  stroke: new Stroke({ color: COLORS.MUNICIPIO.STROKE, width: 1 })
})

const createUSNGStyle = (feature: any) => {
  const usng = feature.get('USNG')
  return new Style({
    stroke: new Stroke({
      color: COLORS.USNG.STROKE,
      width: 1.5
    }),
    text: new Text({
      text: usng || '',
      font: '7.5px Arial',
      fill: new Fill({ color: COLORS.USNG.TEXT }),
      stroke: new Stroke({
        color: COLORS.USNG.TEXT_STROKE,
        width: 0.75
      }),
      textAlign: 'center',
      textBaseline: 'middle'
    })
  })
}

// USNG Source configuration
const usngSource = new VectorSource({
  format: new EsriJSON(),
  loader: async (extent, resolution, projection) => {
    try {
      // Clear features outside view
      const currentFeatures = usngSource.getFeatures()
      currentFeatures.forEach(feature => {
        const geometry = feature.getGeometry()
        if (geometry && !intersects(geometry.getExtent(), extent)) {
          usngSource.removeFeature(feature)
        }
      })

      const url = '/api/usng/proxy?' + new URLSearchParams({
        f: 'json',
        returnGeometry: 'true',
        spatialRel: 'esriSpatialRelIntersects',
        where: '1=1',
        outFields: 'USNG',
        outSR: '102100',
        inSR: '102100',
        geometryType: 'esriGeometryEnvelope',
        geometry: JSON.stringify({
          xmin: extent[0],
          ymin: extent[1],
          xmax: extent[2],
          ymax: extent[3],
          spatialReference: { wkid: 3857 }
        })
      })

      const response = await fetch(url)
      const data = await response.json()
      
      if (data.features?.length > 0) {
        const features = new EsriJSON().readFeatures(data, {
          featureProjection: projection
        })
        usngSource.addFeatures(features)
      }
    } catch (error) {
      console.error('Error loading USNG features:', error)
    }
  },
  strategy: bbox
})

// USNG Layer configuration
const usngLayer = new VectorLayer({
  source: usngSource,
  style: createUSNGStyle,
  minZoom: ZOOM_LEVELS.USNG_MIN,
  maxZoom: ZOOM_LEVELS.USNG_MAX,
  zIndex: 2,
  updateWhileAnimating: false,
  updateWhileInteracting: false,
  renderBuffer: 100,
  declutter: true
})

export default function MapComponent({ onMapInitialized }: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!mapRef.current) return

    // Create base map layer
    const baseLayer = new TileLayer({ 
      source: new OSM(),
      zIndex: 0
    })

    // Initialize map
    const map = new Map({
      target: mapRef.current,
      layers: [baseLayer, usngLayer],
      view: new View({
        center: fromLonLat(PUERTO_RICO_CENTER),
        zoom: ZOOM_LEVELS.INITIAL,
        maxZoom: ZOOM_LEVELS.MAX,
        minZoom: ZOOM_LEVELS.MIN,
        constrainResolution: true,
        projection: 'EPSG:3857'
      })
    })

    // Add municipios layer
    const addMunicipiosLayer = async () => {
      try {
        const response = await fetch("/api/municipios")
        const data = await response.json()
        
        const vectorSource = new VectorSource({
          features: new GeoJSON().readFeatures(
            {
              type: "FeatureCollection",
              features: data.map((municipio: any) => ({
                type: "Feature",
                geometry: municipio.geometria,
                properties: { id: municipio.id, nombre: municipio.nombre }
              }))
            },
            { featureProjection: "EPSG:3857" }
          )
        })

        const vectorLayer = new VectorLayer({
          source: vectorSource,
          style: municipioStyle,
          zIndex: 1
        })

        map.addLayer(vectorLayer)
      } catch (error) {
        console.error("Error fetching municipios:", error)
      } finally {
        setLoading(false)
      }
    }

    addMunicipiosLayer()
    
    // Initialize map instance
    window.mapInstance = map
    if (onMapInitialized) {
      onMapInitialized(map)
    }

    return () => {
      map.setTarget(undefined)
      window.mapInstance = undefined
    }
  }, [onMapInitialized])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative flex-1 w-full h-full"
      style={{ minHeight: '500px' }}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500" />
        </div>
      )}
      <div 
        ref={mapRef} 
        className="w-full h-full" 
        style={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 }}
      />
    </motion.div>
  )
}

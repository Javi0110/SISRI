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

// Constants for USNG layer
const USNG_LAYER_CONFIG = {
  BATCH_SIZE: 500,
  BUFFER_SIZE: 200,
  MIN_RESOLUTION: 50, // Adjust this value to control when labels appear
  LABEL_MIN_ZOOM: 12  // Minimum zoom level for labels
}

// Styles
const municipioStyle = new Style({
  fill: new Fill({ color: COLORS.MUNICIPIO.FILL }),
  stroke: new Stroke({ color: COLORS.MUNICIPIO.STROKE, width: 1 })
})

// Improved USNG style function
const createUSNGStyle = (feature: any, resolution: number) => {
  const usng = feature.get('USNG')
  const styles = [
    new Style({
      stroke: new Stroke({
        color: COLORS.USNG.STROKE,
        width: 1
      }),
      fill: new Fill({
        color: COLORS.USNG.FILL
      })
    })
  ]

  // Only add labels at certain zoom levels
  if (resolution < USNG_LAYER_CONFIG.MIN_RESOLUTION) {
    styles.push(new Style({
      text: new Text({
        text: usng || '',
        font: '10px Arial',
        fill: new Fill({ color: COLORS.USNG.TEXT }),
        stroke: new Stroke({
          color: COLORS.USNG.TEXT_STROKE,
          width: 2
        }),
        textAlign: 'center',
        textBaseline: 'middle',
        overflow: true,
        scale: Math.min(1.5, 1 / (resolution * 0.1))
      })
    }))
  }

  return styles
}

// Update the USNG Source configuration
const usngSource = new VectorSource({
  format: new EsriJSON(),
  loader: async (extent, resolution, projection) => {
    try {
      // Define smaller chunks for Puerto Rico area
      const chunks = [
        // Row 1 (Far North)
        {
          xmin: -67.4,
          ymin: 19.0,
          xmax: -66.8,
          ymax: 19.4
        },
        {
          xmin: -67.4,
          ymin: 19.0,
          xmax: -66.8,
          ymax: 19.4
        },
        {
          xmin: -67.4,
          ymin: 19.0,
          xmax: -66.8,
          ymax: 19.4
        },
        {
          xmin: -66.8,
          ymin: 19.0,
          xmax: -66.2,
          ymax: 19.4
        },
        {
          xmin: -66.2,
          ymin: 19.0,
          xmax: -65.6,
          ymax: 19.4
        },
        {
          xmin: -65.6,
          ymin: 19.0,
          xmax: -65.0,
          ymax: 19.4
        },
        // Row 2 (North)
        {
          xmin: -67.4,
          ymin: 18.6,
          xmax: -66.8,
          ymax: 19.0
        },
        {
          xmin: -67.4,
          ymin: 18.6,
          xmax: -66.8,
          ymax: 19.0
        },
        {
          xmin: -66.8,
          ymin: 18.6,
          xmax: -66.2,
          ymax: 19.0
        },
        {
          xmin: -66.2,
          ymin: 18.6,
          xmax: -65.6,
          ymax: 19.0
        },
        {
          xmin: -65.6,
          ymin: 18.6,
          xmax: -65.0,
          ymax: 19.0
        },
        // Row 3 (Middle)
        {
          xmin: -67.4,
          ymin: 18.2,
          xmax: -66.8,
          ymax: 18.6
        },
        {
          xmin: -66.8,
          ymin: 18.2,
          xmax: -66.2,
          ymax: 18.6
        },
        {
          xmin: -66.2,
          ymin: 18.2,
          xmax: -65.6,
          ymax: 18.6
        },
        {
          xmin: -65.6,
          ymin: 18.2,
          xmax: -65.0,
          ymax: 18.6
        },
        // Row 4 (South)
        {
          xmin: -67.4,
          ymin: 17.8,
          xmax: -66.8,
          ymax: 18.2
        },
        {
          xmin: -66.8,
          ymin: 17.8,
          xmax: -66.2,
          ymax: 18.2
        },
        {
          xmin: -66.2,
          ymin: 17.8,
          xmax: -65.6,
          ymax: 18.2
        },
        {
          xmin: -65.6,
          ymin: 17.8,
          xmax: -65.0,
          ymax: 18.2
        },
        // Row 5 (Far South)
        {
          xmin: -67.4,
          ymin: 17.4,
          xmax: -66.8,
          ymax: 17.8
        },
        {
          xmin: -66.8,
          ymin: 17.4,
          xmax: -66.2,
          ymax: 17.8
        },
        {
          xmin: -66.2,
          ymin: 17.4,
          xmax: -65.6,
          ymax: 17.8
        },
        {
          xmin: -65.6,
          ymin: 17.4,
          xmax: -65.0,
          ymax: 17.8
        },
        // Eastern areas (Vieques and Culebra)
        {
          xmin: -65.6,
          ymin: 18.0,
          xmax: -65.0,
          ymax: 18.4
        },
        {
          xmin: -65.4,
          ymin: 18.2,
          xmax: -64.8,
          ymax: 18.6
        },
        {
          xmin: -65.0,
          ymin: 18.0,
          xmax: -64.4,
          ymax: 18.4
        },
        {
          xmin: -65.0,
          ymin: 18.4,
          xmax: -64.4,
          ymax: 18.8
        },
        // Additional Eastern chunks
        {
          xmin: -65.0,
          ymin: 17.6,
          xmax: -64.4,
          ymax: 18.0
        },
        {
          xmin: -64.8,
          ymin: 18.2,
          xmax: -64.2,
          ymax: 18.6
        },
        // Far Eastern chunks
        {
          xmin: -64.4,
          ymin: 18.0,
          xmax: -63.8,
          ymax: 18.4
        },
        {
          xmin: -64.4,
          ymin: 18.4,
          xmax: -63.8,
          ymax: 18.8
        },
        // Western extension
        {
          xmin: -67.8,
          ymin: 18.0,
          xmax: -67.2,
          ymax: 18.4
        },
        {
          xmin: -67.8,
          ymin: 18.4,
          xmax: -67.2,
          ymax: 18.8
        }
      ];

      for (const chunk of chunks) {
        const url = '/api/usng/proxy?' + new URLSearchParams({
          f: 'json',
          returnGeometry: 'true',
          spatialRel: 'esriSpatialRelIntersects',
          where: "1=1",
          outFields: '*',
          outSR: '102100',
          resultRecordCount: '8000',
          geometryType: 'esriGeometryEnvelope',
          geometry: JSON.stringify({
            ...chunk,
            spatialReference: { wkid: 4269 }
          })
        });

        console.log('Fetching USNG features for chunk:', chunk);
        const response = await fetch(url);
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Service error:', errorData);
          continue; // Continue with next chunk even if this one fails
        }
        
        const data = await response.json();
        console.log('USNG Response for chunk:', {
          chunk,
          featureCount: data.features?.length || 0
        });
        
        if (data.features?.length > 0) {
          const features = new EsriJSON().readFeatures(data, {
            featureProjection: projection,
            dataProjection: 'EPSG:4269'
          });
          usngSource.addFeatures(features);
        }
      }
    } catch (error) {
      console.error('Error loading USNG features:', error);
    }
  },
  strategy: bbox
});

// Add click handler for USNG features
const handleUSNGClick = (feature: any) => {
  const usng = feature.get('USNG')
  // You can dispatch an event or update state to show property information
  console.log(`USNG Grid clicked: ${usng}`)
}

// Improved USNG Layer configuration
const usngLayer = new VectorLayer({
  source: usngSource,
  style: (feature, resolution) => createUSNGStyle(feature, resolution),
  minZoom: ZOOM_LEVELS.USNG_MIN,
  maxZoom: ZOOM_LEVELS.USNG_MAX,
  zIndex: 3,
  updateWhileAnimating: true,
  updateWhileInteracting: true,
  renderBuffer: USNG_LAYER_CONFIG.BUFFER_SIZE,
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

    // Add USNG layer immediately
    const map = new Map({
      target: mapRef.current,
      layers: [baseLayer, usngLayer], // Add USNG layer from the start
      view: new View({
        center: fromLonLat(PUERTO_RICO_CENTER),
        zoom: ZOOM_LEVELS.INITIAL,
        maxZoom: ZOOM_LEVELS.MAX,
        minZoom: ZOOM_LEVELS.MIN,
        constrainResolution: true,
        projection: 'EPSG:3857'
      })
    })

    // Update the municipios layer addition
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
          zIndex: 1 // Keep municipios below USNG
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

    // Add click interaction
    map.on('click', (event) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (feature) => feature)
      if (feature) {
        const usng = feature.get('USNG')
        if (usng) {
          handleUSNGClick(feature)
        }
      }
    })

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

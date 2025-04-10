"use client"

import { motion } from "framer-motion"
import Map from "ol/Map"
import View from "ol/View"
import EsriJSON from 'ol/format/EsriJSON'
import GeoJSON from "ol/format/GeoJSON"
import { defaults as defaultInteractions } from 'ol/interaction'
import TileLayer from "ol/layer/Tile"
import VectorLayer from "ol/layer/Vector"
import { fromLonLat } from "ol/proj"
import OSM from "ol/source/OSM"
import VectorSource from "ol/source/Vector"
import { Fill, Stroke, Style, Text } from "ol/style"
import { useCallback, useEffect, useRef, useState } from "react"

// Remove global window declaration - we'll use refs instead
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
  },
  WATER: {
    STROKE: '#0077be',
    FILL: 'rgba(0, 119, 190, 0.3)'
  }
}


// Constants for USNG layer - optimized for full coverage
const USNG_LAYER_CONFIG = {
  BATCH_SIZE: 8000,
  BUFFER_SIZE: 2000, // Significantly increased buffer
  MIN_RESOLUTION: 40,
  LABEL_MIN_ZOOM: 10
}

// Styles
const municipioStyle = new Style({
  fill: new Fill({ color: COLORS.MUNICIPIO.FILL }),
  stroke: new Stroke({ color: COLORS.MUNICIPIO.STROKE, width: 1 })
})

const waterBodyStyle = new Style({
  fill: new Fill({ color: COLORS.WATER.FILL }),
  stroke: new Stroke({ color: COLORS.WATER.STROKE, width: 1 })
})

// Improved USNG style function with better performance
const createUSNGStyle = (feature: any, resolution: number) => {
  const usng = feature.get('USNG')
  
  // Base style - always applied
  const baseStyle = new Style({
      stroke: new Stroke({
        color: COLORS.USNG.STROKE,
      width: 1.5
      }),
      fill: new Fill({
        color: COLORS.USNG.FILL
      })
    })

  // Only create text style at appropriate zoom levels
  if (resolution < USNG_LAYER_CONFIG.MIN_RESOLUTION) {
    const textStyle = new Style({
      text: new Text({
        text: usng || '',
        font: '11px Arial',
        fill: new Fill({ color: COLORS.USNG.TEXT }),
        stroke: new Stroke({
          color: COLORS.USNG.TEXT_STROKE,
          width: 2.5
        }),
        textAlign: 'center',
        textBaseline: 'middle',
        overflow: true,
        scale: Math.min(1.8, 1 / (resolution * 0.08))
      })
    })
    
    return [baseStyle, textStyle]
  }

  return [baseStyle]
}

// Completely revised USNG Source configuration for full Puerto Rico coverage
const usngSource = new VectorSource({
  format: new EsriJSON(),
  // The loader will be set in the component
  strategy: () => [[
    -7800000, 1800000, // Southwest corner in Web Mercator (greatly expanded)
    -7000000, 2400000  // Northeast corner in Web Mercator (greatly expanded)
  ]]
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
  zIndex: 5,
  updateWhileAnimating: false,
  updateWhileInteracting: false,
  renderBuffer: USNG_LAYER_CONFIG.BUFFER_SIZE,
  declutter: true
})

export default function MapComponent({ onMapInitialized }: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<Map | null>(null)
  const [loading, setLoading] = useState(true)

  // Move the loader logic into a memoized function inside the component
  const handleLoadUSNGData = useCallback(async (projection: any) => {
    const mapInstance = mapInstanceRef.current
    if (!mapInstance) return

    const view = mapInstance.getView()
    const zoom = view.getZoom() || 0

    if (zoom < ZOOM_LEVELS.USNG_MIN) return

    try {
      // Track processed features to avoid duplicates
      const processedIds = new Set();
      
      // Helper function to fetch and process USNG data
      const fetchUSNGData = async (params: any, sectionName = "Unknown") => {
        try {
          const response = await fetch('/api/usng/proxy?' + new URLSearchParams(params));
          
          if (!response.ok) {
            console.error(`Service error for ${sectionName}`);
            return 0;
          }
          
          const data = await response.json() as { features?: Array<{ attributes: { OBJECTID: number } }> };
          
          if (!data || !data.features?.length) return 0;
          
          // Filter out duplicates
          const uniqueFeatures = data.features.filter(feature => {
            const id = feature.attributes.OBJECTID;
            if (processedIds.has(id)) return false;
            processedIds.add(id);
            return true;
          });
          
          if (uniqueFeatures.length === 0) return 0;
          
          const uniqueData = { ...data, features: uniqueFeatures };
          const features = new EsriJSON().readFeatures(uniqueData, {
            featureProjection: projection,
            dataProjection: 'EPSG:4269'
          });
          
          usngSource.addFeatures(features);
          console.log(`Added ${features.length} USNG features for ${sectionName}`);
          return features.length;
        } catch (error) {
          console.error(`Error loading ${sectionName}:`, error);
          return 0;
        }
      };
      
      // Common request parameters
      const baseParams = {
          f: 'json',
          returnGeometry: 'true',
          spatialRel: 'esriSpatialRelIntersects',
          outFields: 'USNG,OBJECTID,UTM_Zone,GRID1MIL',
          outSR: '102100',
          resultRecordCount: '2000', // Reduced from 8000 to 2000
          geometryType: 'esriGeometryEnvelope'
      };
      
      // Start with a single large request for the entire island
      // This is the most efficient approach if the service can handle it
      console.log("Starting with a single large request for the entire island");
      
      const fullIslandParams = {
        ...baseParams,
        where: "1=1",
        geometry: JSON.stringify({
          xmin: -67.5, // Extended west
          ymin: 17.4,  // Extended south
          xmax: -65.1, // Extended east
          ymax: 18.7,  // Extended north
          spatialReference: { wkid: 4269 }
        })
      };
      
      const fullIslandCount = await fetchUSNGData(fullIslandParams, "Full Island");
      
      // If the full island approach didn't return enough features, try with a grid of overlapping sections
      if (fullIslandCount < 5000) {
        console.log("Full island approach didn't return enough features, trying with overlapping sections");
        
        // Define a super-dense grid with maximum overlap to ensure no gaps
        // Using a 0.3 degree grid with 0.2 degree overlap
        const gridSize = 0.3;
        const overlap = 0.2;
        const sections = [];
        
        // Generate a dense grid covering the entire island
        for (let lon = -67.5; lon < -65.0; lon += gridSize - overlap) {
          for (let lat = 17.4; lat < 18.7; lat += gridSize - overlap) {
            sections.push({
              xmin: lon,
              ymin: lat,
              xmax: lon + gridSize,
              ymax: lat + gridSize,
              name: `Grid ${lon.toFixed(1)},${lat.toFixed(1)}`
            });
          }
        }
        
        // Add specific sections for known problematic areas
        const specificSections = [
          // Western region
          { xmin: -67.5, ymin: 17.9, xmax: -67.0, ymax: 18.5, name: "Northwest Special" },
          { xmin: -67.5, ymin: 17.4, xmax: -67.0, ymax: 18.0, name: "Southwest Special" },
          
          // Central region
          { xmin: -67.1, ymin: 17.9, xmax: -66.6, ymax: 18.5, name: "North-Central West Special" },
          { xmin: -67.1, ymin: 17.4, xmax: -66.6, ymax: 18.0, name: "South-Central West Special" },
          { xmin: -66.7, ymin: 17.9, xmax: -66.2, ymax: 18.5, name: "North-Central Special" },
          { xmin: -66.7, ymin: 17.4, xmax: -66.2, ymax: 18.0, name: "South-Central Special" },
          
          // Eastern region
          { xmin: -66.3, ymin: 17.9, xmax: -65.8, ymax: 18.5, name: "North-Central East Special" },
          { xmin: -66.3, ymin: 17.4, xmax: -65.8, ymax: 18.0, name: "South-Central East Special" },
          { xmin: -65.9, ymin: 17.9, xmax: -65.4, ymax: 18.5, name: "Northeast Special" },
          { xmin: -65.9, ymin: 17.4, xmax: -65.4, ymax: 18.0, name: "Southeast Special" },
          { xmin: -65.5, ymin: 17.9, xmax: -65.0, ymax: 18.5, name: "Far Northeast Special" },
          { xmin: -65.5, ymin: 17.4, xmax: -65.0, ymax: 18.0, name: "Far Southeast Special" },
          
          // Islands
          { xmin: -68.6, ymin: 17.9, xmax: -67.7, ymax: 18.4, name: "Mona Island Special" },
          { xmin: -65.7, ymin: 17.9, xmax: -65.1, ymax: 18.4, name: "Vieques Special" },
          { xmin: -65.5, ymin: 18.1, xmax: -64.9, ymax: 18.6, name: "Culebra Special" },
          
          // Extra coverage for visible gaps
          { xmin: -67.2, ymin: 18.0, xmax: -66.7, ymax: 18.5, name: "Gap Fill 1" },
          { xmin: -66.8, ymin: 18.0, xmax: -66.3, ymax: 18.5, name: "Gap Fill 2" },
          { xmin: -66.4, ymin: 18.0, xmax: -65.9, ymax: 18.5, name: "Gap Fill 3" },
          { xmin: -66.0, ymin: 18.0, xmax: -65.5, ymax: 18.5, name: "Gap Fill 4" },
          { xmin: -67.2, ymin: 17.5, xmax: -66.7, ymax: 18.0, name: "Gap Fill 5" },
          { xmin: -66.8, ymin: 17.5, xmax: -66.3, ymax: 18.0, name: "Gap Fill 6" },
          { xmin: -66.4, ymin: 17.5, xmax: -65.9, ymax: 18.0, name: "Gap Fill 7" },
          { xmin: -66.0, ymin: 17.5, xmax: -65.5, ymax: 18.0, name: "Gap Fill 8" }
        ];
        
        // Combine the grid and specific sections
        const allSections = [...sections, ...specificSections];
      
      // Process each section with a small delay between requests
        for (const section of allSections) {
        const sectionParams = {
          ...baseParams,
            where: "1=1",
          geometry: JSON.stringify({
            ...section,
            spatialReference: { wkid: 4269 }
          })
        };
        
        await fetchUSNGData(sectionParams, section.name);
          // Minimal delay to speed up loading
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      // Try with UTM zones as a final approach
      if (usngSource.getFeatures().length < 8000) {
        console.log("Trying with UTM zones for complete coverage");
        
        // Puerto Rico spans UTM zones 19 and 20
        for (const zone of [19, 20]) {
          const utmParams = {
            ...baseParams,
            where: `UTM_Zone = ${zone}`,
          };
          
          try {
            await fetchUSNGData(utmParams, `UTM Zone ${zone}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`Error loading UTM zone ${zone}:`, error);
          }
        }
      }
      
      console.log(`Total USNG features loaded: ${usngSource.getFeatures().length}`);
    } catch (error) {
      console.error('Error loading USNG features:', error);
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current) return

    // Create base map layer
    const baseLayer = new TileLayer({ 
      source: new OSM(),
      zIndex: 0
    })

    // Create map with better initial view
    const map = new Map({
      target: mapRef.current,
      layers: [baseLayer],
      view: new View({
        center: fromLonLat(PUERTO_RICO_CENTER),
        zoom: ZOOM_LEVELS.INITIAL,
        maxZoom: ZOOM_LEVELS.MAX,
        minZoom: ZOOM_LEVELS.MIN,
        constrainResolution: true,
        projection: 'EPSG:3857'
      }),
      controls: [],
      interactions: defaultInteractions({
        mouseWheelZoom: true,
        doubleClickZoom: true,
        pinchZoom: true
      })
    })

    // Store map in ref
    mapInstanceRef.current = map;

    // Helper function to load USNG data
    const loadUSNGData = () => {
      const extent = [
        -7700000, 1850000,
        -7100000, 2300000
      ];
      usngSource.loadFeatures(extent, map.getView().getResolution() || 1, map.getView().getProjection());
    };

    // Update the municipios layer addition
    const addMunicipiosLayer = async () => {
      try {
        const response = await fetch("/api/municipios")
        const data = await response.json() as any[]
        
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
        // Always add USNG layer and load data
        map.addLayer(usngLayer)
        loadUSNGData()
        setLoading(false)
      }
    }

    const addWaterBodiesLayer = async (map: Map) => {
      try {
        const waterSource = new VectorSource({
          format: new EsriJSON(),
          url: (_extent, _resolution, _projection) => {
            return '/api/water/proxy?' + new URLSearchParams({
              f: 'json',
              returnGeometry: 'true',
              spatialRel: 'esriSpatialRelIntersects',
              outFields: '*',
              outSR: '102100',
              where: '1=1',
              geometryType: 'esriGeometryEnvelope',
              geometry: JSON.stringify({
                xmin: -67.5,
                ymin: 17.4,
                xmax: -65.1,
                ymax: 18.7,
                spatialReference: { wkid: 4269 }
              })
            })
          }
        })

        const waterLayer = new VectorLayer({
          source: waterSource,
          style: waterBodyStyle,
          zIndex: 2, // Above municipios but below USNG grid
        })

        map.addLayer(waterLayer)
      } catch (error) {
        console.error("Error adding water bodies layer:", error)
      }
    }

    addMunicipiosLayer()
    addWaterBodiesLayer(map)
    
    // Notify parent component
    if (onMapInitialized) {
      onMapInitialized(map)
    }

    // Improved click interaction with better feature detection
    map.on('click', (event) => {
      const feature = map.forEachFeatureAtPixel(
        event.pixel, 
        (feature) => feature,
        {
          layerFilter: (layer) => layer === usngLayer,
          hitTolerance: 5
        }
      )
      
      if (feature) {
        const usng = feature.get('USNG')
        if (usng) {
          handleUSNGClick(feature)
        }
      }
    })

    // Simplified moveend event
    map.on('moveend', () => {
      const zoom = map.getView().getZoom() || 0;
      if (zoom >= ZOOM_LEVELS.USNG_MIN && usngSource.getFeatures().length === 0) {
        loadUSNGData();
      }
    });

    // Update the source to use the new loader
    usngSource.setLoader(handleLoadUSNGData)

    return () => {
      map.setTarget(undefined)
      mapInstanceRef.current = null
    }
  }, [handleLoadUSNGData, onMapInitialized])

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

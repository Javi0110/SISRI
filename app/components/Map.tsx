"use client"

import { motion } from "framer-motion"
import Map from "ol/Map"
import View from "ol/View"
import EsriJSON from 'ol/format/EsriJSON'
import GeoJSON from "ol/format/GeoJSON"
import { defaults as defaultInteractions } from 'ol/interaction'
import TileLayer from "ol/layer/Tile"
import VectorLayer from "ol/layer/Vector"
import { fromLonLat, transform } from "ol/proj"
import OSM from "ol/source/OSM"
import VectorSource from "ol/source/Vector"
import { Fill, Stroke, Style, Text } from "ol/style"
import { useCallback, useEffect, useRef, useState, useMemo } from "react"
import { debounce } from "lodash"

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
  USNG_MIN: 11,
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
  BATCH_SIZE: 2000, // Reduced from 8000 to improve performance
  BUFFER_SIZE: 1000, // Reduced buffer size
  MIN_RESOLUTION: 40,
  LABEL_MIN_ZOOM: 10,
  MAX_FEATURES: 5000 // Add maximum features limit
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
const createUSNGStyle = (feature: any, resolution: number): Style | Style[] => {
  const usng = feature.get('USNG');
  const geomType = feature.getGeometry()?.getType();
  
  console.log('Styling feature:', {
    usng,
    resolution,
    geometryType: geomType,
    coordinates: feature.getGeometry()?.getCoordinates()
  });
  
  // Skip styling if no USNG value
  if (!usng) {
    console.warn('Feature missing USNG value:', feature.getProperties());
    return new Style({});
  }

  // Base style with optimized settings
  const baseStyle = new Style({
    stroke: new Stroke({
      color: COLORS.USNG.STROKE,
      width: 1,
      lineDash: undefined,
      lineCap: 'butt'
    }),
    fill: new Fill({
      color: COLORS.USNG.FILL
    })
  });

  // Only add text at appropriate zoom levels and resolutions
  if (resolution < USNG_LAYER_CONFIG.MIN_RESOLUTION) {
    return new Style({
      stroke: baseStyle.getStroke() || undefined,
      fill: baseStyle.getFill() || undefined,
      text: new Text({
        text: usng,
        font: '11px Arial',
        fill: new Fill({ color: COLORS.USNG.TEXT }),
        stroke: new Stroke({
          color: COLORS.USNG.TEXT_STROKE,
          width: 2
        }),
        textAlign: 'center',
        textBaseline: 'middle',
        overflow: true,
        scale: Math.min(1.5, 1 / (resolution * 0.08))
      })
    });
  }

  return baseStyle;
}

// Update the USNG source configuration with wider boundaries
const usngSource = new VectorSource({
  format: new EsriJSON(),
  strategy: () => [[
    -7900000, 1700000, // Southwest corner in Web Mercator (expanded further west)
    -6900000, 2500000  // Northeast corner in Web Mercator (expanded further east)
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
  updateWhileAnimating: true,
  updateWhileInteracting: true,
  renderBuffer: USNG_LAYER_CONFIG.BUFFER_SIZE,
  declutter: true,
  visible: true
})

// interface USNGFeature {
//   attributes: {
//     OBJECTID: number;
//     USNG: string;
//     UTM_Zone: number;
//     GRID1MIL: string;
//   };
// }

// Utility function outside component
const createDebounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export default function MapComponent({ onMapInitialized }: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<Map | null>(null)
  const [loading, setLoading] = useState(true)

  const handleLoadUSNGData = useCallback(async (map: Map) => {
    if (!map) return;

    const view = map.getView();
    const zoom = view.getZoom() || 0;
    console.log('Loading USNG data at zoom:', zoom);

    if (zoom < ZOOM_LEVELS.USNG_MIN) {
      usngSource.clear();
      return;
    }

    try {
      // Instead of clearing immediately, create a new temporary source
      const tempSource = new VectorSource();
      
      const fetchUSNGData = async (params: any) => {
        try {
          const queryParams = new URLSearchParams({
            ...params,
            _t: Date.now().toString()
          }).toString();

          const response = await fetch('/api/usng/proxy?' + queryParams, {
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          
          if (!data || !data.features?.length) {
            console.log('No features returned from API');
            return 0;
          }

          // Create features with explicit projection handling
          const features = new EsriJSON().readFeatures(data, {
            featureProjection: 'EPSG:3857',
            dataProjection: 'EPSG:4269'
          });

          // Add features to temporary source
          tempSource.addFeatures(features);
          
          return features.length;
        } catch (error) {
          console.error('Error fetching USNG data:', error);
          return 0;
        }
      };

      // Get current viewport extent
      const extent = view.calculateExtent(map.getSize() || [500, 500]);
      const buffer = (view.getResolution() || 1) * 100;
      
      const [minx, miny, maxx, maxy] = extent;
      const [x1, y1] = transform([minx - buffer, miny - buffer], 'EPSG:3857', 'EPSG:4326');
      const [x2, y2] = transform([maxx + buffer, maxy + buffer], 'EPSG:3857', 'EPSG:4326');

      const params = {
        f: 'json',
        returnGeometry: 'true',
        spatialRel: 'esriSpatialRelIntersects',
        outFields: 'USNG,OBJECTID,UTM_Zone,GRID1MIL',
        outSR: '102100',
        resultRecordCount: USNG_LAYER_CONFIG.BATCH_SIZE.toString(),
        geometryType: 'esriGeometryEnvelope',
        where: "1=1",
        geometry: JSON.stringify({
          xmin: Math.min(x1, x2),
          ymin: Math.min(y1, y2),
          xmax: Math.max(x1, x2),
          ymax: Math.max(y1, y2),
          spatialReference: { wkid: 4326 }
        })
      };

      const featureCount = await fetchUSNGData(params);
      
      if (featureCount > 0) {
        // Only clear the main source after successful fetch
        usngSource.clear();
        // Add all features from temp source
        usngSource.addFeatures(tempSource.getFeatures());
        // Force update
        usngLayer.changed();
        map.render();
      }

      console.log(`Loaded ${featureCount} USNG features`);

    } catch (error) {
      console.error('Error in USNG loading process:', error);
    }
  }, []);

  const debouncedLoadUSNGData = useMemo(
    () => createDebounce((map: Map) => handleLoadUSNGData(map), 300),
    [handleLoadUSNGData]
  );

  useEffect(() => {
    if (!mapRef.current) return;

    // Create base map layer
    const baseLayer = new TileLayer({ 
      source: new OSM(),
      zIndex: 0
    })

    // Debug USNG layer configuration
    console.log('Initializing USNG layer with config:', {
      batchSize: USNG_LAYER_CONFIG.BATCH_SIZE,
      bufferSize: USNG_LAYER_CONFIG.BUFFER_SIZE,
      minResolution: USNG_LAYER_CONFIG.MIN_RESOLUTION,
      maxFeatures: USNG_LAYER_CONFIG.MAX_FEATURES
    });

    // Create map with better initial view
    const map = new Map({
      target: mapRef.current,
      layers: [baseLayer, usngLayer], // Add USNG layer immediately
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

    // Initial load of USNG data when map is created
    const initialLoadUSNG = () => {
      const zoom = map.getView().getZoom() || 0;
      console.log('Initial map zoom:', zoom);
      if (zoom >= ZOOM_LEVELS.USNG_MIN) {
        console.log('Loading initial USNG grid');
        handleLoadUSNGData(map);
      }
    };

    // Set up event listeners with debounce
    const handleMoveEnd = debounce(() => {
      const zoom = map.getView().getZoom() || 0;
      console.log('Move ended, current zoom:', zoom);
      
      if (zoom >= ZOOM_LEVELS.USNG_MIN) {
        console.log('Loading USNG grid after move');
        handleLoadUSNGData(map);
      } else {
        console.log('Zoom too low for USNG grid');
        usngSource.clear();
      }
    }, 300);

    // Add move end listener
    map.on('moveend', handleMoveEnd);

    // Add render complete listener
    map.on('rendercomplete', () => {
      console.log('Render complete:', {
        features: usngSource.getFeatures().length,
        visible: usngLayer.getVisible(),
        extent: usngSource.getExtent()
      });
    });

    // Initial load attempt
    initialLoadUSNG();

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

    // Debug layer visibility
    map.on('postrender', () => {
      console.log('Map rendered, USNG layer state:', {
        visible: usngLayer.getVisible(),
        opacity: usngLayer.getOpacity(),
        sourceFeatures: usngSource.getFeatures().length,
        zIndex: usngLayer.getZIndex(),
        extent: usngLayer.getExtent()
      });
    });

    // Clean up
    return () => {
      map.un('moveend', handleMoveEnd);
      handleMoveEnd.cancel();
      map.setTarget(undefined)
      mapInstanceRef.current = null
    }
  }, [handleLoadUSNGData, onMapInitialized, debouncedLoadUSNGData])

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

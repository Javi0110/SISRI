"use client"

import { motion } from "framer-motion"
import { debounce } from "lodash"
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

// Create the style function with better visibility settings
const createUSNGStyle = (feature: any, resolution: number): Style => {
  const usng = feature.get('USNG');
  console.log('[DEBUG] Styling feature:', {
    usng,
    resolution,
    hasGeometry: Boolean(feature.getGeometry())
  });
  
  // Base style with more prominent settings
  const baseStyle = new Style({
    stroke: new Stroke({
      color: COLORS.USNG.STROKE,
      width: 2,
      lineCap: 'square',
      lineJoin: 'miter'
    }),
    fill: new Fill({
      color: COLORS.USNG.FILL
    })
  });

  if (resolution < USNG_LAYER_CONFIG.MIN_RESOLUTION) {
    return new Style({
      stroke: new Stroke({
        color: COLORS.USNG.STROKE,
        width: 2,
        lineCap: 'square',
        lineJoin: 'miter'
      }),
      fill: new Fill({
        color: COLORS.USNG.FILL
      }),
      text: new Text({
        text: usng,
        font: '12px Arial',
        fill: new Fill({ color: COLORS.USNG.TEXT }),
        stroke: new Stroke({
          color: COLORS.USNG.TEXT_STROKE,
          width: 3
        }),
        textAlign: 'center',
        textBaseline: 'middle',
        overflow: true,
        scale: Math.min(1.5, 1 / (resolution * 0.08))
      })
    });
  }

  return baseStyle;
};

// Create source with explicit configuration
const createEmptySource = () => new VectorSource({
  wrapX: false,
  overlaps: false,
  useSpatialIndex: true
});

// Create initial source
let usngSource = createEmptySource();

// Configure layer with explicit rendering settings
const usngLayer = new VectorLayer({
  source: usngSource,
  style: createUSNGStyle,
  minZoom: ZOOM_LEVELS.USNG_MIN,
  maxZoom: ZOOM_LEVELS.USNG_MAX,
  zIndex: 5,
  updateWhileAnimating: true,
  updateWhileInteracting: true,
  renderBuffer: 1000,
  declutter: true,
  visible: true,
  opacity: 1
});

// Add click handler for USNG features
const handleUSNGClick = (feature: any) => {
  const usng = feature.get('USNG')
  // You can dispatch an event or update state to show property information
  console.log(`USNG Grid clicked: ${usng}`)
}

// interface USNGFeature {
//   attributes: {
//     OBJECTID: number;
//     USNG: string;
//     UTM_Zone: number;
//     GRID1MIL: string;
//   };
// }

// Utility function outside component
// const createDebounce = (func: Function, wait: number) => {
//   let timeout: NodeJS.Timeout;
//   return function executedFunction(...args: any[]) {
//     const later = () => {
//       clearTimeout(timeout);
//       func(...args);
//     };
//     clearTimeout(timeout);
//     timeout = setTimeout(later, wait);
//   };
// };

export default function MapComponent({ onMapInitialized }: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<Map | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Create a stable reference to the debounced function
  const debouncedLoadUSNGData = useCallback(
    debounce((map: Map) => {
      const view = map.getView();
      const zoom = view.getZoom() || 0;
      
      if (zoom >= ZOOM_LEVELS.USNG_MIN) {
        handleLoadUSNGData(map);
      } else {
        usngSource.clear();
      }
    }, 300, { leading: true, trailing: true }),
    [] // Empty dependencies since we want this to be stable
  );

  // Memoize the load handler
  const handleLoadUSNGData = useCallback(async (map: Map) => {
    if (!map) return;

    const view = map.getView();
    const zoom = view.getZoom() || 0;
    console.log('[DEBUG] Starting USNG load:', {
      zoom,
      center: view.getCenter(),
      resolution: view.getResolution()
    });

    if (zoom < ZOOM_LEVELS.USNG_MIN) {
      console.log('[DEBUG] Zoom too low, clearing source');
      usngSource.clear();
      return;
    }

    try {
      // Create new source for this viewport
      const newSource = createEmptySource();
      console.log('[DEBUG] Created new source');
      
      const fetchUSNGData = async (params: any) => {
        try {
          const searchParams = new URLSearchParams();
          Object.entries(params).forEach(([key, value]) => {
            if (key === 'geometry') {
              searchParams.append(key, JSON.stringify(value));
            } else {
              searchParams.append(key, value as string);
            }
          });
          searchParams.append('_t', Date.now().toString());

          console.log('[DEBUG] Fetching USNG data:', {
            url: '/api/usng/proxy?' + searchParams.toString()
          });

          const response = await fetch('/api/usng/proxy?' + searchParams.toString(), {
            method: 'GET',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });

          console.log('[DEBUG] API Response:', {
            status: response.status,
            ok: response.ok
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('[DEBUG] API Error:', {
              status: response.status,
              text: errorText
            });
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          console.log('[DEBUG] API Data:', {
            featuresCount: data.features?.length || 0,
            hasFeatures: Boolean(data.features),
            spatialReference: data.spatialReference
          });
          
          if (!data || !data.features?.length) {
            console.log('[DEBUG] No features in response');
            return 0;
          }

          // Create features with explicit projection
          const features = new EsriJSON().readFeatures(data, {
            featureProjection: 'EPSG:3857',
            dataProjection: 'EPSG:4269'
          });

          console.log('[DEBUG] Created features:', {
            count: features.length,
            sampleFeature: features[0] ? {
              usng: features[0].get('USNG'),
              geometry: features[0].getGeometry()?.getType()
            } : null
          });

          // Add features to new source
          newSource.addFeatures(features);
          
          // Force feature refresh
          features.forEach(feature => {
            feature.changed();
          });

          console.log('[DEBUG] Added features to source:', {
            sourceFeatures: newSource.getFeatures().length
          });

          return features.length;
        } catch (error) {
          console.error('[DEBUG] Error fetching USNG data:', error);
          return 0;
        }
      };

      // Calculate viewport extent
      const extent = view.calculateExtent(map.getSize() || [500, 500]);
      const buffer = (view.getResolution() || 1) * 100;
      
      const [minx, miny, maxx, maxy] = extent;
      const [x1, y1] = transform([minx - buffer, miny - buffer], 'EPSG:3857', 'EPSG:4326');
      const [x2, y2] = transform([maxx + buffer, maxy + buffer], 'EPSG:3857', 'EPSG:4326');

      console.log('[DEBUG] Calculated extent:', {
        mercator: [minx, miny, maxx, maxy],
        geographic: [x1, y1, x2, y2],
        buffer
      });

      const params = {
        f: 'json',
        returnGeometry: 'true',
        spatialRel: 'esriSpatialRelIntersects',
        outFields: 'USNG,OBJECTID,UTM_Zone,GRID1MIL',
        outSR: '102100',
        resultRecordCount: '2000',
        geometryType: 'esriGeometryEnvelope',
        where: "1=1",
        geometry: {
          xmin: Math.min(x1, x2),
          ymin: Math.min(y1, y2),
          xmax: Math.max(x1, x2),
          ymax: Math.max(y1, y2),
          spatialReference: { wkid: 4326 }
        }
      };

      const featureCount = await fetchUSNGData(params);
      
      if (featureCount > 0) {
        console.log('[DEBUG] Setting new source on layer:', {
          featureCount,
          oldSourceFeatures: usngLayer.getSource()?.getFeatures().length || 0
        });

        // Update layer source
        usngLayer.setSource(newSource);
        
        // Force immediate render
        requestAnimationFrame(() => {
          console.log('[DEBUG] Forcing layer update');
          newSource.changed();
          usngLayer.changed();
          map.renderSync();

          // Verify update
          console.log('[DEBUG] Layer state after update:', {
            sourceFeatures: usngLayer.getSource()?.getFeatures().length || 0,
            visible: usngLayer.getVisible(),
            opacity: usngLayer.getOpacity(),
            extent: usngLayer.getExtent()
          });
        });
      } else {
        console.log('[DEBUG] No features to update');
      }

    } catch (error) {
      console.error('[DEBUG] Error in USNG loading process:', error);
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    // Create base map layer
    const baseLayer = new TileLayer({ 
      source: new OSM(),
      zIndex: 0
    });

    // Debug USNG layer configuration
    console.log('Initializing USNG layer with config:', {
      batchSize: USNG_LAYER_CONFIG.BATCH_SIZE,
      bufferSize: USNG_LAYER_CONFIG.BUFFER_SIZE,
      minResolution: USNG_LAYER_CONFIG.MIN_RESOLUTION,
      maxFeatures: USNG_LAYER_CONFIG.MAX_FEATURES
    });

    // Create map instance
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
      }),
      controls: [],
      interactions: defaultInteractions({
        mouseWheelZoom: true,
        doubleClickZoom: true,
        pinchZoom: true
      })
    });

    // Store map instance
    mapInstanceRef.current = map;

    // Add moveend listener
    const moveEndListener = () => {
      const zoom = map.getView().getZoom() || 0;
      console.log('[DEBUG] Move ended:', {
        zoom,
        center: map.getView().getCenter(),
        extent: map.getView().calculateExtent(map.getSize() || [500, 500])
      });
      
      if (zoom >= ZOOM_LEVELS.USNG_MIN) {
        console.log('[DEBUG] Triggering USNG update');
        debouncedLoadUSNGData(map);
      } else {
        console.log('[DEBUG] Clearing USNG - zoom too low');
        usngSource.clear();
      }
    };

    map.on('moveend', moveEndListener);

    // Add render complete listener
    map.on('rendercomplete', () => {
      console.log('[DEBUG] Render complete:', {
        features: usngLayer.getSource()?.getFeatures().length || 0,
        visible: usngLayer.getVisible(),
        opacity: usngLayer.getOpacity(),
        extent: usngLayer.getExtent()
      });
    });

    // Initial load
    const initialZoom = map.getView().getZoom() || 0;
    if (initialZoom >= ZOOM_LEVELS.USNG_MIN) {
      handleLoadUSNGData(map);
    }

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

    // // Debug layer visibility
    // map.on('postrender', () => {
    //   console.log('Map rendered, USNG layer state:', {
    //     visible: usngLayer.getVisible(),
    //     opacity: usngLayer.getOpacity(),
    //     sourceFeatures: usngSource.getFeatures().length,
    //     zIndex: usngLayer.getZIndex(),
    //     extent: usngLayer.getExtent()
    //   });
    // });

    // Cleanup
    return () => {
      map.un('moveend', moveEndListener);
      debouncedLoadUSNGData.cancel();
      map.setTarget(undefined);
      mapInstanceRef.current = null;
    }
  }, [handleLoadUSNGData, debouncedLoadUSNGData, onMapInitialized]);

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

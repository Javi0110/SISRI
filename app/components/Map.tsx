"use client"

import { motion } from "framer-motion"
import { debounce } from "lodash"
import Feature from 'ol/Feature'
import Map from "ol/Map"
import View from "ol/View"
import EsriJSON from 'ol/format/EsriJSON'
import Geometry from 'ol/geom/Geometry'
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
const usngSource = createEmptySource();

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

export default function MapComponent({ onMapInitialized }: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<Map | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Add click handler for USNG features
  const handleUSNGClick = useCallback((feature: any) => {
    const usng = feature.get('USNG')
    // You can dispatch an event or update state to show property information
    console.log(`USNG Grid clicked: ${usng}`)
    // Force refresh when clicking on a feature
    if (mapInstanceRef.current) {
      debouncedLoadUSNGData(mapInstanceRef.current, true);
    }
  }, []);

  // Memoize the load handler
  const handleLoadUSNGData = useCallback(async (map: Map, forceRefresh: boolean = false) => {
    if (!map) return;

    const view = map.getView();
    const zoom = view.getZoom() || 0;

    if (zoom < ZOOM_LEVELS.USNG_MIN) {
      usngSource.clear();
      return;
    }

    try {
      // Calculate viewport extent first
      const extent = view.calculateExtent(map.getSize() || [500, 500]);
      const buffer = (view.getResolution() || 1) * 100;
      
      const [minx, miny, maxx, maxy] = extent;
      const [x1, y1] = transform([minx - buffer, miny - buffer], 'EPSG:3857', 'EPSG:4326');
      const [x2, y2] = transform([maxx + buffer, maxy + buffer], 'EPSG:3857', 'EPSG:4326');

      const geometry = {
        xmin: Math.min(x1, x2),
        ymin: Math.min(y1, y2),
        xmax: Math.max(x1, x2),
        ymax: Math.max(y1, y2),
        spatialReference: { wkid: 4326 }
      };

      const params = new URLSearchParams({
        geometry: JSON.stringify(geometry),
        _t: Date.now().toString(),
        refresh: forceRefresh.toString()
      });

      const response = await fetch(`/api/usng/proxy?${params}`);
      if (!response.ok) throw new Error('Failed to fetch USNG data');
      const data = await response.json();
      
      if (!data || !data.features?.length) {
        return;
      }

      // Create features
      const features = new EsriJSON().readFeatures(data, {
        featureProjection: 'EPSG:3857',
        dataProjection: 'EPSG:4269'
      });

      if (features.length > 0) {
        // Clear existing features
        usngSource.clear();
        
        // Add new features
        usngSource.addFeatures(features);

        // Force update of source extent
        const sourceExtent = usngSource.getExtent();
        usngSource.changed();
        
        // Update layer with explicit extent
        usngLayer.setExtent(sourceExtent);
        
        // Force layer update
        requestAnimationFrame(() => {
          usngLayer.changed();
          map.render();
        });
      }

    } catch (error) {
      console.error('Error loading USNG data:', error);
    }
  }, []);

  // Create a stable reference to the debounced function
  const debouncedLoadUSNGData = useCallback(
    debounce((map: Map, forceRefresh: boolean = false) => {
      const view = map.getView();
      const zoom = view.getZoom() || 0;
      
      if (zoom >= ZOOM_LEVELS.USNG_MIN) {
        handleLoadUSNGData(map, forceRefresh);
      } else {
        usngSource.clear();
      }
    }, 300, { leading: true, trailing: true }),
    [handleLoadUSNGData] // Add handleLoadUSNGData as dependency
  );

  // Function to handle view changes
  const handleViewChange = useCallback((coords: [number, number], zoom: number, forceRefresh?: boolean) => {
    if (!mapInstanceRef.current) return;
    
    const view = mapInstanceRef.current.getView();
    
    // Stop any ongoing animations
    view.cancelAnimations();
    
    // Update view without animation if it's a force refresh
    if (forceRefresh) {
      view.setCenter(coords);
      view.setZoom(zoom);
      // Trigger USNG update immediately
      handleLoadUSNGData(mapInstanceRef.current, true);
    } else {
      // Animate view change if it's not a force refresh
      view.animate({
        center: coords,
        zoom: zoom,
        duration: 1000
      });
    }
  }, [handleLoadUSNGData]);

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

    // Add moveend listener with proper cleanup
    const moveEndListener = () => {
      if (!map) return;
      const zoom = map.getView().getZoom() || 0;
      
      if (zoom >= ZOOM_LEVELS.USNG_MIN) {
        debouncedLoadUSNGData(map, false);
      } else {
        usngSource.clear();
      }
    };

    map.on('moveend', moveEndListener);

    // Add municipios layer
    const addMunicipiosLayer = async () => {
      try {
        const response = await fetch("/api/municipios")
        if (!response.ok) throw new Error('Failed to fetch municipios')
        const data = await response.json()
        
        const features = data.map((municipio: any) => {
          try {
            // Ensure the geometry has a spatial reference
            const geometria = municipio.geometria;
            if (!geometria.spatialReference) {
              geometria.spatialReference = { wkid: 4326 }; // Add default spatial reference
            }
            
            const feature = new EsriJSON().readFeature(geometria, {
              featureProjection: 'EPSG:3857'
            }) as Feature<Geometry>;
            
            feature.set('id', municipio.id_municipio);
            feature.set('nombre', municipio.nombre);
            return feature;
          } catch (error) {
            console.warn(`Failed to create feature for municipio ${municipio.nombre}:`, error);
            return null;
          }
        }).filter(Boolean); // Remove any null features

        const vectorSource = new VectorSource({
          features
        });

        const vectorLayer = new VectorLayer({
          source: vectorSource,
          style: municipioStyle,
          zIndex: 1
        });

        map.addLayer(vectorLayer);
      } catch (error) {
        console.error("Error fetching municipios:", error);
      } finally {
        setLoading(false);
      }
    };

    // Add water bodies layer
    const addWaterBodiesLayer = async () => {
      try {
        const waterSource = new VectorSource({
          format: new EsriJSON(),
          url: '/api/water/proxy?' + new URLSearchParams({
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
          }).toString()
        });

        const waterLayer = new VectorLayer({
          source: waterSource,
          style: waterBodyStyle,
          zIndex: 2
        });

        map.addLayer(waterLayer);
      } catch (error) {
        console.error("Error adding water bodies layer:", error);
      }
    };

    // Initialize layers
    addMunicipiosLayer();
    addWaterBodiesLayer();

    // Expose handleViewChange through map instance
    // @ts-ignore
    map.handleViewChange = handleViewChange;

    // Notify parent component
    if (onMapInitialized) {
      onMapInitialized(map);
    }

    // Add click handler for USNG features
    map.on('click', (event) => {
      const feature = map.forEachFeatureAtPixel(
        event.pixel,
        (feature) => feature,
        {
          layerFilter: (layer) => layer === usngLayer,
          hitTolerance: 5
        }
      );
      
      if (feature) {
        handleUSNGClick(feature);
      }
    });

    // Cleanup
    return () => {
      map.un('moveend', moveEndListener);
      debouncedLoadUSNGData.cancel();
      map.setTarget(undefined);
      mapInstanceRef.current = null;
    }
  }, [handleLoadUSNGData, debouncedLoadUSNGData, onMapInitialized, handleViewChange]);

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

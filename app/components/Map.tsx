"use client"

import { motion } from "framer-motion"
import { debounce } from "lodash"
import Feature from 'ol/Feature'
import Map from "ol/Map"
import View from "ol/View"
import EsriJSON from 'ol/format/EsriJSON'
import WKT from 'ol/format/WKT'
import Geometry from 'ol/geom/Geometry'
import { defaults as defaultInteractions } from 'ol/interaction'
import TileLayer from "ol/layer/Tile"
import VectorLayer from "ol/layer/Vector"
import { fromLonLat, transform } from "ol/proj"
import OSM from "ol/source/OSM"
import VectorSource from "ol/source/Vector"
import { Fill, Stroke, Style, Text } from "ol/style"
import { useCallback, useEffect, useRef, useState } from "react"

// WKT format instance for parsing geometries
const wktFormat = new WKT()

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
  USNG_MIN: 10,
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
  },
  CUENCA: {
    STROKE: '#0066FF',
    FILL: 'rgba(0, 102, 255, 0.25)',
    TEXT: '#0066FF',
    TEXT_STROKE: '#FFFFFF'
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
  
  // Check if this grid is part of a selected cuenca
  const isPartOfCuenca = feature.get('isPartOfCuenca') === true;
  
  // Log styling of cuenca features for debugging
  if (isPartOfCuenca) {
    console.log(`Styling cuenca feature: ${usng}`);
  }
  
  // Base style with more prominent settings
  const baseStyle = new Style({
    stroke: new Stroke({
      color: isPartOfCuenca ? COLORS.CUENCA.STROKE : COLORS.USNG.STROKE,
      width: isPartOfCuenca ? 3 : 2,
      lineCap: 'square',
      lineJoin: 'miter'
    }),
    fill: new Fill({
      color: isPartOfCuenca ? COLORS.CUENCA.FILL : COLORS.USNG.FILL
    })
  });

  if (resolution < USNG_LAYER_CONFIG.MIN_RESOLUTION) {
    return new Style({
      stroke: new Stroke({
        color: isPartOfCuenca ? COLORS.CUENCA.STROKE : COLORS.USNG.STROKE,
        width: isPartOfCuenca ? 3 : 2,
        lineCap: 'square',
        lineJoin: 'miter'
      }),
      fill: new Fill({
        color: isPartOfCuenca ? COLORS.CUENCA.FILL : COLORS.USNG.FILL
      }),
      text: new Text({
        text: usng,
        font: isPartOfCuenca ? 'bold 12px Arial' : '12px Arial',
        fill: new Fill({ 
          color: isPartOfCuenca ? COLORS.CUENCA.TEXT : COLORS.USNG.TEXT 
        }),
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

interface USNGContextData {
  usng: string
  properties: Array<{ id: number; direccion?: string | null; type?: string | null }>
  eventos: Array<{ id: number; titulo: string | null; tipo: string | null; estado: string | null }>
  habitantes: Array<{ id: number; nombre: string | null; apellido1: string | null; apellido2: string | null }>
}

export default function MapComponent({ onMapInitialized }: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<Map | null>(null)
  const [loading, setLoading] = useState(true)
  const selectedCuencaRef = useRef<string[]>([])
  const [usngContext, setUsngContext] = useState<{
    x: number
    y: number
    loading: boolean
    data: USNGContextData | null
    error: string | null
  } | null>(null)
  
  // Helper function to match and highlight features
  const tryHighlightFeatures = useCallback((features: any[], usngCoords: string[]) => {
    // Create variants of the cuenca USNG values for better matching
    const cuencaVariants = usngCoords.flatMap(coord => {
      // Normalize the coordinate first
      const normalized = coord.replace(/\s+/g, ' ').trim();
      
      // Original format with spaces
      const original = normalized;
      
      // Without spaces
      const noSpaces = normalized.replace(/\s+/g, '');
      
      // With standardized spacing
      const parts = normalized.split(/\s+/);
      let standardized = '';
      if (parts.length >= 3) {
        // Standard format: "19Q GA 8945"
        standardized = `${parts[0]} ${parts[1]} ${parts[2]}`;
        
        // Also try with different spacing
        const alternate1 = `${parts[0]}${parts[1]} ${parts[2]}`; // "19QGA 8945"
        const alternate2 = `${parts[0]} ${parts[1]}${parts[2]}`; // "19Q GA8945"
        const alternate3 = `${parts[0]}${parts[1]}${parts[2]}`; // "19QGA8945"
        
        return [original, noSpaces, standardized, alternate1, alternate2, alternate3].filter(Boolean);
      }
      
      return [original, noSpaces].filter(Boolean);
    });
    
    // Track how many we successfully matched
    let matchCount = 0;
    
    features.forEach(feature => {
      const usng = feature.get('USNG');
      if (!usng) return;
      
      // Normalize the feature USNG
      const normalizedUSNG = usng.replace(/\s+/g, ' ').trim();
      const noSpacesUSNG = normalizedUSNG.replace(/\s+/g, '');
      
      // Try all possible matching methods
      if (
        usngCoords.includes(usng) || 
        usngCoords.includes(normalizedUSNG) ||
        cuencaVariants.includes(normalizedUSNG) ||
        cuencaVariants.includes(noSpacesUSNG)
      ) {
        feature.set('isPartOfCuenca', true);
        matchCount++;
        console.log(`Matched cuenca feature with USNG: ${usng}`);
      }
    });
    
    console.log(`Successfully highlighted ${matchCount} features out of ${features.length}`);
    return matchCount;
  }, []);

  // Highlight USNG cells for a cuenca
  const highlightCuencaUSNG = useCallback((usngCoords: string[]) => {
    if (!mapInstanceRef.current) return;
    
    // Store the cuenca USNG coords - normalize them first
    // Create standardized versions for better matching
    const normalizedCoords = usngCoords.map(coord => {
      // Handle different spacing formats
      const cleanCoord = coord.replace(/\s+/g, ' ').trim();
      
      // Split into parts
      const parts = cleanCoord.split(' ');
      if (parts.length >= 3) {
        // Standardized format: "19Q GA 8945"
        return `${parts[0]} ${parts[1]} ${parts[2]}`;
      }
      return cleanCoord;
    });
    
    selectedCuencaRef.current = normalizedCoords;
    
    // Update features to mark those that are part of the cuenca
    const features = usngSource.getFeatures();
    
    // Clear any previous highlighting
    features.forEach(feature => {
      feature.set('isPartOfCuenca', false);
    });
    
    // Debug logging
    console.log("Sample USNG values from API:", features.slice(0, 5).map(f => f.get('USNG')));
    console.log("Sample cuenca USNG values:", selectedCuencaRef.current.slice(0, 5));
    
    // Set new highlighting using enhanced matching
    const matchCount = tryHighlightFeatures(features, selectedCuencaRef.current);
    console.log(`Highlighted ${matchCount} features out of ${features.length} total features`);
    
    // Trigger a redraw
    usngSource.changed();
    usngLayer.changed();
    mapInstanceRef.current.render();
  }, [tryHighlightFeatures]);

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
        
        // Mark features that are part of the selected cuenca
        if (selectedCuencaRef.current.length > 0) {
          tryHighlightFeatures(features, selectedCuencaRef.current);
        }
        
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
  }, [tryHighlightFeatures]);

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
    [handleLoadUSNGData]
  );
  
  // Add click handler for USNG features
  const handleUSNGClick = useCallback((feature: any) => {
    const usng = feature.get('USNG')
    // You can dispatch an event or update state to show property information
    console.log(`USNG Grid clicked: ${usng}`)
    // Force refresh when clicking on a feature
    if (mapInstanceRef.current) {
      debouncedLoadUSNGData(mapInstanceRef.current, true);
    }
  }, [debouncedLoadUSNGData]);

  // Function to calculate bounds of multiple USNG cells
  const calculateUSNGBounds = (usngCoords: string[]) => {
    // This would typically call an API to convert USNG to geographic coordinates
    // For now, we'll use a simplified approach
    
    // Extract grid IDs (19QGA) and convert coordinates to numbers
    const parsedCoords = usngCoords.map(coord => {
      const parts = coord.replace(/\s+/g, ' ').trim().split(' ');
      if (parts.length >= 3) {
        return {
          grid: parts[0] + parts[1],
          x: parseInt(parts[2].substring(0, 2), 10),
          y: parseInt(parts[2].substring(2), 10)
        };
      }
      return null;
    }).filter(Boolean);
    
    if (parsedCoords.length === 0) return null;
    
    // For Rio La Plata specifically
    if (usngCoords.some(coord => coord.includes("19Q GA 89"))) {
      // Rio La Plata specific center coordinates 
      return [-66.38, 18.27]; // Better coordinates for Rio La Plata
    }
    
    // Fallback to a rough estimation by using center of Puerto Rico
    return PUERTO_RICO_CENTER;
  };

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

  // Function to handle cuenca selection
  const handleCuencaSelect = useCallback(async (selectedCuenca: any) => {
    try {
      const cuencaId = selectedCuenca?.id || null;
      
      if (cuencaId) {
        setLoading(true);
        console.log("Selected cuenca:", selectedCuenca);
        
        // Get USNG grid cells for cuenca
        const response = await fetch(`/api/usng/cuenca/${cuencaId}`);
        if (!response.ok) throw new Error('Failed to fetch cuenca USNG data');
        
        const data = await response.json();
        console.log("Cuenca USNG data:", data);
        
        // Store the USNG coordinates for the selected cuenca
        selectedCuencaRef.current = data.data;
        
        // Calculate center point for the USNG coordinates 
        let centerPoint = null;
        let zoomLevel = 12; // Default zoom level
        
        // For Rio La Plata (ID 1), use specific settings
        if (cuencaId === 1) {
          centerPoint = fromLonLat([-66.38, 18.27]);
          zoomLevel = 13; // Higher zoom level for better visibility
        } else {
          // Use WKT geometry to calculate extent if available
          if (selectedCuenca.geom) {
            const geometry = wktFormat.readFeature(selectedCuenca.geom).getGeometry();
            if (geometry) {
              // Instead of just fitting the extent, extract center point
              const extent = geometry.getExtent();
              const center = [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2];
              centerPoint = center;
            }
          }
          
          // If no center point was determined from geometry, calculate from USNG
          if (!centerPoint) {
            const coords = calculateUSNGBounds(data.data);
            if (coords) {
              centerPoint = fromLonLat(coords);
            }
          }
        }
        
        // Highlight the USNG grid cells that are part of the selected cuenca
        highlightCuencaUSNG(data.data);
        
        // Reload USNG data with highlight information
        handleLoadUSNGData(mapInstanceRef.current!, true);
        
        // Adjust map view to show cuenca
        if (mapInstanceRef.current && centerPoint) {
          // Cancel any ongoing animations first
          mapInstanceRef.current.getView().cancelAnimations();
          
          // Use animation for smooth transition
          mapInstanceRef.current.getView().animate({
            center: centerPoint,
            zoom: zoomLevel,
            duration: 1000
          });
        }
      } else {
        // Clear selection
        selectedCuencaRef.current = [];
        highlightCuencaUSNG([]);
        
        // Reload USNG data without highlights
        handleLoadUSNGData(mapInstanceRef.current!, true);
      }
    } catch (error) {
      console.error("Error selecting cuenca:", error);
    } finally {
      setLoading(false);
    }
  }, [highlightCuencaUSNG, handleLoadUSNGData, calculateUSNGBounds]);

  const usngPopoverRef = useRef<HTMLDivElement>(null)
  // Close USNG context popover when clicking outside or Escape
  useEffect(() => {
    if (!usngContext) return
    const close = () => setUsngContext(null)
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    const onMouseDown = (e: MouseEvent) => {
      if (usngPopoverRef.current && !usngPopoverRef.current.contains(e.target as Node)) close()
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onMouseDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [usngContext])

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

    // Track if component is mounted to prevent state updates after unmount
    let isMounted = true;

    // Add municipios layer - only do this once
    const addMunicipiosLayer = async () => {
      if (!isMounted) return;
      
      try {
        const response = await fetch("/api/municipios");
        if (!response.ok) throw new Error('Failed to fetch municipios');
        const data = await response.json();
        
        if (!isMounted) return; // Check again after async operation
        
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

        if (!isMounted) return; // Check again before adding to map
        
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
      }
    };

    // Add water bodies layer
    const addWaterBodiesLayer = async () => {
      if (!isMounted) return;
      
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

    // Initialize layers - use Promise.all to wait for all layers to load
    Promise.all([
      addMunicipiosLayer(),
      addWaterBodiesLayer()
    ]).finally(() => {
      if (isMounted) {
        setLoading(false);
      }
    });

    // Expose handleViewChange and handleCuencaSelect through map instance
    // @ts-ignore
    map.handleViewChange = handleViewChange;
    // @ts-ignore
    map.handleCuencaSelect = handleCuencaSelect;

    // Notify parent component
    if (onMapInitialized) {
      onMapInitialized(map);
    }

    // Add click handler for USNG features
    const clickListener = (event: any) => {
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
    };

    map.on('click', clickListener);

    // Right-click (contextmenu) handler for USNG details - use DOM listener since OL Map has no contextmenu event
    const contextMenuListener = async (ev: MouseEvent) => {
      const pixel = map.getEventPixel(ev)
      const feature = map.forEachFeatureAtPixel(
        pixel,
        (f) => f,
        { layerFilter: (layer) => layer === usngLayer, hitTolerance: 5 }
      )
      if (!feature) return
      ev.preventDefault()
      const usng = feature.get('USNG')
      if (!usng) return
      setUsngContext({ x: ev.clientX, y: ev.clientY, loading: true, data: null, error: null })
      try {
        const res = await fetch(`/api/usng/${encodeURIComponent(usng)}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to fetch')
        setUsngContext({
          x: ev.clientX,
          y: ev.clientY,
          loading: false,
          data: {
            usng: json.usng || usng,
            properties: json.properties || [],
            eventos: json.eventos || [],
            habitantes: json.habitantes || [],
          },
          error: null,
        })
      } catch (err) {
        setUsngContext({
          x: ev.clientX,
          y: ev.clientY,
          loading: false,
          data: null,
          error: err instanceof Error ? err.message : 'Failed to load',
        })
      }
    }
    const mapEl = mapRef.current
    mapEl?.addEventListener('contextmenu', contextMenuListener)

    // Cleanup
    return () => {
      mapEl?.removeEventListener('contextmenu', contextMenuListener)
      isMounted = false;
      map.un('moveend', moveEndListener);
      map.un('click', clickListener);
      debouncedLoadUSNGData.cancel();
      map.setTarget(undefined);
      mapInstanceRef.current = null;
    }
  }, []); // Empty dependency array to ensure the map is initialized only once

  const handleZoomIn = useCallback(() => {
    if (!mapInstanceRef.current) return
    const view = mapInstanceRef.current.getView()
    const zoom = view.getZoom() ?? ZOOM_LEVELS.INITIAL
    view.animate({ zoom: Math.min(zoom + 1, ZOOM_LEVELS.MAX), duration: 200 })
  }, [])

  const handleZoomOut = useCallback(() => {
    if (!mapInstanceRef.current) return
    const view = mapInstanceRef.current.getView()
    const zoom = view.getZoom() ?? ZOOM_LEVELS.INITIAL
    view.animate({ zoom: Math.max(zoom - 1, ZOOM_LEVELS.MIN), duration: 200 })
  }, [])

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
      {/* USNG right-click context popover */}
      {usngContext && (
        <div
          ref={usngPopoverRef}
          className="fixed z-[9999] w-80 max-h-[70vh] overflow-auto bg-white rounded-lg shadow-lg border border-gray-200 p-4"
          style={{ left: Math.max(8, Math.min(usngContext.x, window.innerWidth - 328)), top: Math.max(8, Math.min(usngContext.y, window.innerHeight - 308)) }}
        >
          {usngContext.loading ? (
            <div className="flex justify-center py-6"><div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" /></div>
          ) : usngContext.error ? (
            <p className="text-sm text-red-600">{usngContext.error}</p>
          ) : usngContext.data ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-gray-800">USNG: {usngContext.data.usng}</h3>
              <div className="text-xs text-gray-600 space-y-2">
                <p><strong>Properties:</strong> {usngContext.data.properties.length}</p>
                <p><strong>Events:</strong> {usngContext.data.eventos.length}</p>
                <p><strong>Residents:</strong> {usngContext.data.habitantes.length}</p>
              </div>
              {usngContext.data.eventos.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Events</p>
                  <div className="max-h-24 overflow-y-auto space-y-1 text-xs">
                    {usngContext.data.eventos.slice(0, 5).map((e) => (
                      <div key={e.id} className="py-1 border-b border-gray-100 last:border-0">
                        {e.titulo || 'Untitled'} · {e.tipo || '-'} ({e.estado || '-'})
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {usngContext.data.properties.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Properties</p>
                  <div className="max-h-24 overflow-y-auto space-y-1 text-xs">
                    {usngContext.data.properties.slice(0, 5).map((p) => (
                      <div key={p.id} className="py-1 border-b border-gray-100 last:border-0">
                        {p.direccion || 'No address'} · {p.type || '-'}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-500 mb-2">Add to this USNG</p>
                <div className="flex flex-col gap-1">
                  <a
                    href={`/reports?usng=${encodeURIComponent(usngContext.data.usng)}`}
                    className="text-xs px-2 py-1.5 rounded bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                  >
                    + Add Event
                  </a>
                  <a
                    href={`/reports?usng=${encodeURIComponent(usngContext.data.usng)}&mode=property`}
                    className="text-xs px-2 py-1.5 rounded bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
                  >
                    + Add Property
                  </a>
                  <a
                    href={`/reports?usng=${encodeURIComponent(usngContext.data.usng)}&mode=resident`}
                    className="text-xs px-2 py-1.5 rounded bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors"
                  >
                    + Add Person
                  </a>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-24 right-4 flex flex-col gap-1 z-10 bg-white rounded-lg shadow-md border overflow-hidden">
        <button
          type="button"
          onClick={handleZoomIn}
          className="p-2 hover:bg-gray-100 transition-colors text-lg font-bold text-gray-700"
          aria-label="Zoom in"
        >
          +
        </button>
        <div className="h-px bg-gray-200" />
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-2 hover:bg-gray-100 transition-colors text-lg font-bold text-gray-700"
          aria-label="Zoom out"
        >
          −
        </button>
      </div>
    </motion.div>
  )
}

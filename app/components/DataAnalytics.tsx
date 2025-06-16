"use client";

import { AlertCircle, Bell, ChevronDown, ChevronUp, Clock, FileText, Home, MapPin, Printer, Search, Users, Eye, EyeOff } from "lucide-react";
import { useCallback, useState, useEffect } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { ScrollArea } from "../../components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { cn } from "../../lib/utils";

type SearchType = 'evento' | 'usng' | 'municipio' | 'residente';

interface EventData {
  id: number;
  titulo: string;
  descripcion: string;
  fecha: string;
  tipo: string;
  estado: string;
  usng: string | null;
}

interface PropertyData {
  id: number;
  tipo: string;
  daños: string | null;
  fecha: string | null;
  municipio: string;
  barrio: string;
  sector: string;
  usng: string;
  direccion?: string | null;
  notificaciones?: {
    id: number;
    numero_notificacion: string | null;
    tipo: string;
    estado: string | null;
    fecha_creacion: string;
  }[];
  habitantes: ResidentData[];
}

interface ResidentData {
  id: number;
  nombre: string;
  edad: number;
  categoria: string;
  contacto?: string;
  propiedad_id: number;
  family_id?: number | null;
  apellido1?: string | null;
  apellido2?: string | null;
  sex?: string;
  sexo?: string;
  condicion_id?: number | null;
  limitacion_id?: number | null;
  disposicion_id?: number | null;
  limitacion?: string;
  limitacion_descripcion?: string | null;
  condicion?: string;
  condicion_descripcion?: string | null;
  disposicion?: string;
  disposicion_descripcion?: string | null;
  family?: {
    id: number;
    apellidos: string;
    description?: string;
  } | null;
  propiedad_info?: {
    id: number | null;
    tipo: string;
    municipio: string;
    barrio: string;
    sector: string;
    usng: string;
    direccion?: string | null;
  };
  // Include _property field which might be used in some parts of the code
  _property?: {
    id: number;
    tipo: string;
    daños?: string | null;
    fecha?: string | null;
    municipio: string;
    barrio: string;
    sector: string;
    usng: string;
    direccion?: string | null;
  };
}

interface NotificationData {
  id: number;
  eventoId: number;
  tipo: string;
  mensaje: string;
  fecha_creacion: string;
  estado: string;
  numero_notificacion: string;
  propiedades?: PropertyData[];
}

interface ReportData {
  searchType: SearchType;
  searchQuery?: string;
  evento?: EventData | null;
  usngQuery?: string;
  municipioQuery?: string;
  propiedades: PropertyData[];
  notificaciones?: NotificationData[];
  residentes?: {
    id: number;
    nombre: string;
    apellido1?: string | null;
    apellido2?: string | null;
    edad: number;
    categoria: string;
    contacto?: string;
    propiedad_id: number;
    family_id?: number | null;
    condicion_id?: number | null;
    limitacion_id?: number | null;
    disposicion_id?: number | null;
    condiciones?: {
      id: number;
      nombre: string;
      descripcion?: string | null;
      codigo?: string | null;
    } | null;
    limitaciones?: {
      id: number;
      nombre: string;
      descripcion?: string | null;
      codigo?: string | null;
    } | null;
    disposiciones?: {
      id: number;
      nombre: string;
      descripcion?: string | null;
      codigo?: string | null;
    } | null;
    family?: {
      id: number;
      apellidos: string;
      description?: string;
    } | null;
    propiedad_info: {
      id: number | null;
      tipo: string;
      municipio: string;
      barrio: string;
      sector: string;
      usng: string;
      direccion?: string | null;
    }
  }[];
}

interface ExpandedState {
  [key: string]: boolean;
}

interface NotificationDetailProps {
  notification: NotificationData;
  properties: PropertyData[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getStatusColor: (status: string) => string;
  formatDateFn: (dateString: string) => string;
}

export function DataAnalytics() {
  const [searchType, setSearchType] = useState<SearchType>('evento');
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [expandedProperties, setExpandedProperties] = useState<ExpandedState>({});
  const [activeTab, setActiveTab] = useState("properties");
  const [selectedNotification, setSelectedNotification] = useState<NotificationData | null>(null);
  const [notificationDetailOpen, setNotificationDetailOpen] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Advanced filters state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState<{
    usng?: string;
    municipio?: string;
    barrio?: string;
    sector?: string;
    ageRange?: { min: number; max: number };
    propertyType?: string;
    incidentType?: string;
    residentCategory?: string;
    residentCondition?: string;
    residentLimitation?: string;
    residentDisposition?: string;
    residentName?: string;
    familyName?: string;
    dateRange?: { start: string; end: string };
    sex?: string;
  }>({});

  // Add a state for quick filtering resident names
  const [quickResidentFilter, setQuickResidentFilter] = useState("");

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<{
    [key: string]: boolean;
  }>({
    // Property table columns
    property_tipo: true,
    property_location: true,
    property_address: true,
    property_usng: true,
    property_damage: true,
    property_date: true,
    property_residents: true,
    
    // Resident table columns
    id: true,
    nombre: true,
    apellido1: true,
    apellido2: true,
    edad: true,
    sex: true,
    categoria: true,
    family: true,
    contacto: true,
    limitacion: true,
    condicion: true,
    disposicion: true,
    property: true,
    municipio: true,
    barrio: true,
    sector: true,
    usng: true,
    direccion: true
  });

  // Modify sortConfig to be an array of sort configurations
  const [sortConfigs, setSortConfigs] = useState<{
    key: string;
    direction: 'ascending' | 'descending';
  }[]>([]);

  // Update the sorting function to handle multiple sort criteria
  const sortData = (data: any[]) => {
    if (!sortConfigs.length) return data;
    
    return [...data].sort((a, b) => {
      // Try each sort config in order until we find a difference
      for (const sortConfig of sortConfigs) {
        const { key, direction } = sortConfig;
        
        // Handle nested properties with dot notation
        const aValue = key.includes('.') 
          ? key.split('.').reduce((obj, prop) => obj && obj[prop], a) 
          : a[key];
        const bValue = key.includes('.') 
          ? key.split('.').reduce((obj, prop) => obj && obj[prop], b) 
          : b[key];
        
        // Handle null or undefined values
        if (aValue == null && bValue != null) return direction === 'ascending' ? -1 : 1;
        if (bValue == null && aValue != null) return direction === 'ascending' ? 1 : -1;
        if (aValue == null && bValue == null) continue; // Try next sort config
        
        // Handle different data types
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const compareResult = direction === 'ascending' 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue);
          
          if (compareResult !== 0) return compareResult;
          continue; // If values are equal, try next sort config
        }
        
        if (aValue === bValue) continue; // Try next sort config
        
        return direction === 'ascending' 
          ? (aValue > bValue ? 1 : -1) 
          : (aValue < bValue ? 1 : -1);
      }
      
      return 0; // All sort configs resulted in equality
    });
  };

  // Update the request sort function to handle multiple sort configs
  const requestSort = (key: string, event?: React.MouseEvent) => {
    const isShiftPressed = event?.shiftKey;
    
    // Find if this key is already in the sort configs
    const existingIndex = sortConfigs.findIndex(config => config.key === key);
    
    // Create a copy of the current sort configs
    const newSortConfigs = [...sortConfigs];
    
    if (existingIndex >= 0) {
      // Key exists, toggle direction or remove if already descending
      if (newSortConfigs[existingIndex].direction === 'ascending') {
        newSortConfigs[existingIndex].direction = 'descending';
      } else {
        // Remove this sort config
        newSortConfigs.splice(existingIndex, 1);
      }
    } else {
      // Key doesn't exist, add it
      const newConfig = { key, direction: 'ascending' as const };
      
      if (isShiftPressed) {
        // Add as additional sort criteria
        newSortConfigs.push(newConfig);
      } else {
        // Replace all existing sort criteria
        newSortConfigs.length = 0;
        newSortConfigs.push(newConfig);
      }
    }
    
    setSortConfigs(newSortConfigs);
  };

  // Update the function to get the sort direction indicator
  const getSortDirectionIndicator = (key: string) => {
    const sortConfig = sortConfigs.find(config => config.key === key);
    if (!sortConfig) return null;
    
    const index = sortConfigs.findIndex(config => config.key === key);
    const prefix = sortConfigs.length > 1 ? `${index + 1}` : '';
    
    return sortConfig.direction === 'ascending' 
      ? `${prefix}↑` 
      : `${prefix}↓`;
  };

  // Add debounce function
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // Add search suggestions function
  const fetchSearchSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchSuggestions([]);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      let endpoint = '';
      switch (searchType) {
        case 'evento':
          endpoint = `/api/eventos/search?term=${encodeURIComponent(query)}`;
          break;
        case 'municipio':
          endpoint = `/api/municipios?search=${encodeURIComponent(query)}`;
          break;
        case 'usng':
          // For USNG, we'll use the comprehensive report endpoint
          endpoint = `/api/analytics/comprehensive-report`;
          break;
        case 'residente':
          endpoint = `/api/residentes/search?term=${encodeURIComponent(query)}`;
          break;
      }

      if (searchType === 'usng') {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ searchType: 'usng', searchQuery: query })
        });
        const data = await response.json();
        if (data.propiedades) {
          setSearchSuggestions(data.propiedades.map((prop: any) => ({
            id: prop.id,
            label: prop.usng,
            type: 'usng'
          })));
        }
      } else if (searchType === 'residente') {
        const response = await fetch(endpoint);
        const data = await response.json();
        setSearchSuggestions(data.map((resident: any) => ({
          id: resident.id,
          label: resident.nombre,
          type: 'residente',
          edad: resident.edad,
          categoria: resident.categoria
        })));
      } else {
        const response = await fetch(endpoint);
        const data = await response.json();
        if (searchType === 'evento') {
          setSearchSuggestions(data.map((event: any) => ({
            id: event.id,
            label: event.titulo,
            type: 'evento'
          })));
        } else if (searchType === 'municipio') {
          setSearchSuggestions(data.map((municipio: any) => ({
            id: municipio.id_municipio,
            label: municipio.nombre,
            type: 'municipio'
          })));
        }
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSearchSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [searchType]);

  // Remove the useEffect that was automatically triggering search
  const debouncedFetchSuggestions = useCallback(
    debounce((query: string) => {
      if (!query || query.length < 2) {
        setSearchSuggestions([]);
        return;
      }
      fetchSearchSuggestions(query);
    }, 300),
    [fetchSearchSuggestions]
  );
  
  // Add a function to reset filters when changing search types
  const resetFilters = () => {
    setFilters({});
    setQuickResidentFilter("");
  };

  // Update the search type change handler to reset filters
  const handleSearchTypeChange = (value: SearchType) => {
    setSearchType(value);
    resetFilters();
    setSearchQuery("");
  };

  // Update the handleSearch function to improve the filtering process
  const handleSearch = async () => {
    // Only require search term for non-residente searches
    if (!searchQuery.trim() && searchType !== 'residente') {
      setError("Please enter a search term");
      return;
    }

    // Clear error and start loading
    setLoading(true);
    setError(null);

    try {
      // Build filter object only with valid values
      const filterObj: any = {};
      
      if (filters.usng) filterObj.usng = filters.usng;
      if (filters.municipio) filterObj.municipio = filters.municipio;
      if (filters.barrio) filterObj.barrio = filters.barrio;
      if (filters.sector) filterObj.sector = filters.sector;
      
      if (filters.ageRange?.min || filters.ageRange?.max) {
        filterObj.ageRange = {
          min: Number(filters.ageRange?.min || 0),
          max: Number(filters.ageRange?.max || 200)
        };
      }
      
      if (filters.propertyType) {
        // Don't translate property types, send the exact value to backend
        filterObj.propertyType = filters.propertyType;
      }
      
      if (filters.incidentType) filterObj.incidentType = filters.incidentType;
      if (filters.residentCategory && filters.residentCategory !== 'all') filterObj.residentCategory = filters.residentCategory;
      if (filters.residentCondition) filterObj.residentCondition = filters.residentCondition;
      if (filters.residentLimitation) filterObj.residentLimitation = filters.residentLimitation;
      if (filters.residentDisposition) filterObj.residentDisposition = filters.residentDisposition;
      if (filters.residentName) filterObj.residentName = filters.residentName;
      if (filters.familyName) filterObj.familyName = filters.familyName;
      if (filters.sex) filterObj.sex = filters.sex;
      
      if (filters.dateRange?.start || filters.dateRange?.end) {
        filterObj.dateRange = {};
        if (filters.dateRange?.start) filterObj.dateRange.start = filters.dateRange.start;
        if (filters.dateRange?.end) filterObj.dateRange.end = filters.dateRange.end;
      }

      // Combine main search with filters
      const searchPayload = {
        searchType,
        searchQuery,
        filters: filterObj
      };

      console.log("Sending search payload:", searchPayload); // Debug log

      const response = await fetch("/api/analytics/comprehensive-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchPayload)
      });

      const data = await response.json();
      console.log("Received response data:", data); // Debug log

      if (data.error) {
        setError(data.error);
      } else {
        // If we're searching for residents and have location filters, apply them to the results
        if (searchType === 'residente' && data.residentes && 
            (filters.municipio || filters.barrio || filters.sector)) {
          console.log("Applying client-side location filters", filters);
          
          // Apply municipio filter
          if (filters.municipio) {
            const municipioFilter = filters.municipio.toLowerCase();
            data.residentes = data.residentes.filter((resident: ResidentData) => {
              const propInfoMunicipio = resident.propiedad_info?.municipio?.toLowerCase() || '';
              const propMunicipio = resident._property?.municipio?.toLowerCase() || '';
              return propInfoMunicipio === municipioFilter || propMunicipio === municipioFilter;
            });
            console.log(`Filtered residents by municipio "${filters.municipio}": ${data.residentes.length} results`);
          }
          
          // Apply barrio filter
          if (filters.barrio) {
            const barrioFilter = filters.barrio.toLowerCase();
            data.residentes = data.residentes.filter((resident: ResidentData) => {
              const propInfoBarrio = resident.propiedad_info?.barrio?.toLowerCase() || '';
              const propBarrio = resident._property?.barrio?.toLowerCase() || '';
              return propInfoBarrio === barrioFilter || propBarrio === barrioFilter;
            });
            console.log(`Filtered residents by barrio "${filters.barrio}": ${data.residentes.length} results`);
          }
          
          // Apply sector filter
          if (filters.sector) {
            const sectorFilter = filters.sector.toLowerCase();
            data.residentes = data.residentes.filter((resident: ResidentData) => {
              const propInfoSector = resident.propiedad_info?.sector?.toLowerCase() || '';
              const propSector = resident._property?.sector?.toLowerCase() || '';
              return propInfoSector === sectorFilter || propSector === sectorFilter;
            });
            console.log(`Filtered residents by sector "${filters.sector}": ${data.residentes.length} results`);
          }
          
          // Apply property type filter if needed
          if (filters.propertyType) {
            const propertyTypeFilter = filters.propertyType.toLowerCase();
            data.residentes = data.residentes.filter((resident: ResidentData) => {
              const propInfoTipo = resident.propiedad_info?.tipo?.toLowerCase() || '';
              const propTipo = resident._property?.tipo?.toLowerCase() || '';
              return propInfoTipo === propertyTypeFilter || propTipo === propertyTypeFilter;
            });
            console.log(`Filtered residents by property type "${filters.propertyType}": ${data.residentes.length} results`);
          }
          
          // Apply category filter if needed
          if (filters.residentCategory) {
            const categoryFilter = filters.residentCategory.toLowerCase();
            data.residentes = data.residentes.filter((resident: ResidentData) => {
              return resident.categoria.toLowerCase() === categoryFilter;
            });
            console.log(`Filtered residents by category "${filters.residentCategory}": ${data.residentes.length} results`);
          }
          
          // Apply sex filter if needed
          if (filters.sex) {
            const sexFilter = filters.sex.toLowerCase();
            data.residentes = data.residentes.filter((resident: ResidentData) => {
              const sex = resident.sex?.toLowerCase() || '';
              const sexo = resident.sexo?.toLowerCase() || '';
              return sex === sexFilter || sexo === sexFilter;
            });
            console.log(`Filtered residents by sex "${filters.sex}": ${data.residentes.length} results`);
          }
        }
        
        // Add the searchQuery to the reportData
        setReportData({
          ...data,
          searchQuery: searchType === 'residente' && !searchQuery.trim() ? 'All residents' : searchQuery
        });
        setExpandedProperties({});
        
        if (searchType === 'evento' && data.evento) {
          try {
            const notificationsResponse = await fetch(`/api/notifications/event/${data.evento.id}`);
            const notificationsData = await notificationsResponse.json();
            
            if (!notificationsResponse.ok) {
              console.error("Error fetching notifications:", notificationsData.error);
            } else {
              setReportData(prev => prev ? {...prev, notificaciones: notificationsData.notifications} : prev);
            }
          } catch (notifError) {
            console.error("Failed to fetch notifications:", notifError);
          }
        }
      }
    } catch (error) {
      setError("Error processing search");
      console.error("Query error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Add state for filter options
  const [municipalityOptions, setMunicipalityOptions] = useState<{id_municipio: number, nombre: string}[]>([]);
  const [barrioOptions, setBarrioOptions] = useState<{id_barrio: number, nombre: string}[]>([]);
  const [sectorOptions, setSectorOptions] = useState<{id_sector: number, nombre: string}[]>([]);
  const [propertyTypeOptions] = useState(["residencial", "comercial", "industrial", "hospital"]);
  const [incidentTypeOptions] = useState(["inundacion", "deslizamiento", "derrumbe"]);
  const [residentCategoryOptions] = useState(["Adulto", "Niño", "Adulto Mayor"]);
  const [sexOptions] = useState(["Masculino", "Femenino"]);
  const [conditionOptions, setConditionOptions] = useState<string[]>([]);
  const [limitationOptions, setLimitationOptions] = useState<string[]>([]);
  const [dispositionOptions, setDispositionOptions] = useState<string[]>([]);
  
  // Fetch filter options on component mount
  useEffect(() => {
    const fetchMunicipalities = async () => {
      try {
        const response = await fetch('/api/municipios');
        if (response.ok) {
          const data = await response.json();
          setMunicipalityOptions(data);
        }
      } catch (error) {
        console.error("Failed to fetch municipalities:", error);
      }
    };
    
    // Fetch common conditions, limitations, and dispositions from resident data
    const fetchResidentOptions = async () => {
      try {
        const response = await fetch('/api/residentes/options');
        if (response.ok) {
          const data = await response.json();
          setConditionOptions(data.conditions || []);
          setLimitationOptions(data.limitations || []);
          setDispositionOptions(data.dispositions || []);
        }
      } catch (error) {
        console.error("Failed to fetch resident options:", error);
      }
    };
    
    fetchMunicipalities();
    fetchResidentOptions();
  }, []);
  
  // Fetch barrios when municipality changes
  useEffect(() => {
    const fetchBarrios = async () => {
      if (!filters.municipio) {
        setBarrioOptions([]);
        return;
      }
      
      try {
        const municipioId = municipalityOptions.find(m => 
          m.nombre.toLowerCase() === filters.municipio?.toLowerCase()
        )?.id_municipio;
        
        if (municipioId) {
          const response = await fetch(`/api/barrios/search?term=&municipioId=${municipioId}`);
          if (response.ok) {
            const data = await response.json();
            setBarrioOptions(data);
          }
        }
      } catch (error) {
        console.error("Failed to fetch barrios:", error);
      }
    };
    
    fetchBarrios();
  }, [filters.municipio, municipalityOptions]);
  
  // Fetch sectors when barrio changes
  useEffect(() => {
    const fetchSectors = async () => {
      if (!filters.barrio) {
        setSectorOptions([]);
        return;
      }
      
      try {
        const barrioId = barrioOptions.find(b => 
          b.nombre.toLowerCase() === filters.barrio?.toLowerCase()
        )?.id_barrio;
        
        if (barrioId) {
          const response = await fetch(`/api/sectores/search?term=&barrioId=${barrioId}`);
          if (response.ok) {
            const data = await response.json();
            setSectorOptions(data);
          }
        }
      } catch (error) {
        console.error("Failed to fetch sectors:", error);
      }
    };
    
    fetchSectors();
  }, [filters.barrio, barrioOptions]);

  const renderAdvancedFilters = () => {
    if (!showAdvancedFilters) return null;

    return (
      <div className="space-y-4 mt-4 p-4 border rounded-md bg-muted/30">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Resident Name Filter - Show prominently for resident searches */}
          {searchType === 'residente' && (
            <div className="space-y-2 lg:col-span-3">
              <label className="text-sm font-medium">Resident Name</label>
              <Input
                placeholder="Filter residents by name"
                value={filters.residentName || ''}
                onChange={(e) => handleFilterChange('residentName', e.target.value)}
                className="w-full"
              />
            </div>
          )}

          {/* USNG Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">USNG</label>
            <Input
              placeholder="Filter by USNG"
              value={filters.usng || ''}
              onChange={(e) => handleFilterChange('usng', e.target.value)}
            />
          </div>

          {/* Municipality Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Municipality</label>
            <Select
              value={filters.municipio || 'all'}
              onValueChange={(value) => handleFilterChange('municipio', value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select municipality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All municipalities</SelectItem>
                {municipalityOptions.map((municipality) => (
                  <SelectItem key={municipality.id_municipio} value={municipality.nombre}>
                    {municipality.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Barrio Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Barrio</label>
            <Select
              value={filters.barrio || 'all'}
              onValueChange={(value) => handleFilterChange('barrio', value === 'all' ? '' : value)}
              disabled={!filters.municipio || barrioOptions.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select barrio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All barrios</SelectItem>
                {barrioOptions.map((barrio) => (
                  <SelectItem key={barrio.id_barrio} value={barrio.nombre}>
                    {barrio.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Sector Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Sector</label>
            <Select
              value={filters.sector || 'all'}
              onValueChange={(value) => handleFilterChange('sector', value === 'all' ? '' : value)}
              disabled={!filters.barrio || sectorOptions.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select sector" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sectors</SelectItem>
                {sectorOptions.map((sector) => (
                  <SelectItem key={sector.id_sector} value={sector.nombre}>
                    {sector.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Age Range Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Age Range</label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={filters.ageRange?.min || ''}
                onChange={(e) => handleFilterChange('ageRange', { 
                  ...filters.ageRange, 
                  min: e.target.value 
                })}
              />
              <Input
                type="number"
                placeholder="Max"
                value={filters.ageRange?.max || ''}
                onChange={(e) => handleFilterChange('ageRange', { 
                  ...filters.ageRange, 
                  max: e.target.value 
                })}
              />
            </div>
          </div>

          {/* Property Type Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Property Type</label>
            <Select
              value={filters.propertyType || 'all'}
              onValueChange={(value) => handleFilterChange('propertyType', value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {propertyTypeOptions.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type === 'residencial' ? 'Residential' : 
                     type === 'comercial' ? 'Commercial' : 
                     type === 'industrial' ? 'Industrial' : 
                     type === 'hospital' ? 'Hospital' : type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Incident Type Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Incident Type</label>
            <Select
              value={filters.incidentType || 'all'}
              onValueChange={(value) => handleFilterChange('incidentType', value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {incidentTypeOptions.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type === 'inundacion' ? 'Flood' : 
                     type === 'deslizamiento' ? 'Landslide' : 
                     type === 'derrumbe' ? 'Collapse' : type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Resident Category Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Resident Category</label>
            <Select
              value={filters.residentCategory || 'all'}
              onValueChange={(value) => handleFilterChange('residentCategory', value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {residentCategoryOptions.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category === 'Adulto' ? 'Adult' : 
                     category === 'Niño' ? 'Minor' : 
                     category === 'Adulto Mayor' ? 'Elderly' : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Sex Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Sex</label>
            <Select
              value={filters.sex || 'all'}
              onValueChange={(value) => handleFilterChange('sex', value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select sex" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {sexOptions.map((sex) => (
                  <SelectItem key={sex} value={sex}>
                    {sex === 'Masculino' ? 'Male' : 
                     sex === 'Femenino' ? 'Female' : sex}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Resident Condition Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Resident Condition</label>
            <Select
              value={filters.residentCondition || 'all'}
              onValueChange={(value) => handleFilterChange('residentCondition', value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All conditions</SelectItem>
                {conditionOptions.map((condition) => (
                  <SelectItem key={condition} value={condition}>
                    {condition || 'None'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Resident Limitation Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Resident Limitation</label>
            <Select
              value={filters.residentLimitation || 'all'}
              onValueChange={(value) => handleFilterChange('residentLimitation', value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select limitation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All limitations</SelectItem>
                {limitationOptions.map((limitation) => (
                  <SelectItem key={limitation} value={limitation}>
                    {limitation || 'None'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Resident Disposition Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Resident Disposition</label>
            <Select
              value={filters.residentDisposition || 'all'}
              onValueChange={(value) => handleFilterChange('residentDisposition', value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select disposition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dispositions</SelectItem>
                {dispositionOptions.map((disposition) => (
                  <SelectItem key={disposition} value={disposition}>
                    {disposition || 'None'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Date Range</label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={filters.dateRange?.start || ''}
                onChange={(e) => handleFilterChange('dateRange', { 
                  ...filters.dateRange, 
                  start: e.target.value 
                })}
              />
              <Input
                type="date"
                value={filters.dateRange?.end || ''}
                onChange={(e) => handleFilterChange('dateRange', { 
                  ...filters.dateRange, 
                  end: e.target.value 
                })}
              />
            </div>
          </div>

          {/* Family Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Family</label>
            <Input
              placeholder="Filter by family name"
              value={filters.familyName || ''}
              onChange={(e) => handleFilterChange('familyName', e.target.value)}
            />
          </div>
        </div>

        {/* Clear Filters Button */}
        <div className="flex justify-end mt-4">
          <Button
            variant="outline"
            onClick={() => {
              setFilters({});
              handleSearch();
            }}
          >
            Clear Filters
          </Button>
        </div>
      </div>
    );
  };

  const toggleProperty = (propertyId: number) => {
    setExpandedProperties(prev => ({
      ...prev,
      [propertyId]: !prev[propertyId]
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-red-100 text-red-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getNotificationStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'procesada':
        return 'bg-blue-100 text-blue-800';
      case 'completada':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSearchPlaceholder = () => {
    switch (searchType) {
      case 'evento':
        return 'Event name';
      case 'usng':
        return 'USNG coordinates';
      case 'municipio':
        return 'Municipality name';
      case 'residente':
        return 'Resident name (optional)';
      default:
        return 'Search...';
    }
  };

  const renderHeader = () => {
    if (!reportData) return null;

    if (reportData.searchType === 'evento' && reportData.evento) {
      return (
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{reportData.evento.titulo}</CardTitle>
            <CardDescription>
              Date: {new Date(reportData.evento.fecha).toLocaleDateString()}
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            {reportData.evento.usng && (
              <Badge variant="outline" className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {reportData.evento.usng}
              </Badge>
            )}
            <Badge className={cn("text-sm", getStatusColor(reportData.evento.estado))}>
              {reportData.evento.estado}
            </Badge>
          </div>
        </div>
      );
    }

    if (reportData.searchType === 'usng') {
      return (
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Properties in USNG: 
              <span className="relative">
                {reportData.usngQuery}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-pink-500 rounded-full"></div>
              </span>
              <Badge variant="outline" className="ml-2 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {reportData.usngQuery}
              </Badge>
            </CardTitle>
            <CardDescription className="mt-1 flex items-center gap-2">
              <span className="font-medium">{reportData.propiedades.length} properties found</span>
              <span className="text-muted-foreground">•</span>
              <div className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                <span>
                  {reportData.propiedades.reduce((total, property) => total + property.habitantes.length, 0)} residents in total
                </span>
              </div>
            </CardDescription>
          </div>
        </div>
      );
    }

    if (reportData.searchType === 'municipio') {
      return (
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Properties in: {reportData.municipioQuery}</CardTitle>
            <CardDescription>
              {reportData.propiedades.length} properties found
            </CardDescription>
          </div>
        </div>
      );
    }

    if (reportData.searchType === 'residente') {
      return (
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {reportData.searchQuery === 'All residents' 
                ? 'All Residents' 
                : `Resident Search: ${reportData.searchQuery}`}
            </CardTitle>
            <CardDescription>
              {reportData.residentes ? reportData.residentes.length : 0} residents found
            </CardDescription>
          </div>
        </div>
      );
    }

    // Default case for other search types
    return (
      <div className="flex items-center justify-between">
        <div>
          <CardTitle>
            Invalid search
          </CardTitle>
        </div>
      </div>
    );
  };

  const handleNotificationDetails = (notification: NotificationData) => {
    setSelectedNotification(notification);
    setNotificationDetailOpen(true);
  };

  // Add function to toggle column visibility
  const toggleColumnVisibility = (columnKey: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  };

  // Add a print function
  const handlePrintReport = () => {
    if (!reportData) return;
    
    // Create a new window for the printable report
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print the report');
      return;
    }
    
    // Prepare filtered and sorted data for the report
    const hasProperties = reportData.propiedades && reportData.propiedades.length > 0;
    const hasResidents = reportData.residentes && reportData.residentes.length > 0;
    
    // Apply current filtering to properties
    let filteredProperties = hasProperties ? [...reportData.propiedades] : [];
    
    // Apply current filtering to residents
    let filteredResidents: ResidentData[] = [];
    if (hasResidents && reportData.residentes) {
      filteredResidents = reportData.residentes.filter(resident => {
        if (!quickResidentFilter) return true;
        return resident.nombre.toLowerCase().includes(quickResidentFilter.toLowerCase());
      });
    } else if (hasProperties) {
      // Get residents from property expansions and apply filters
      filteredResidents = filteredProperties.flatMap(property => 
        applyResidentFilters(property.habitantes).map(resident => ({
          ...resident,
          _property: property
        }))
      );
    }
    
    // Apply current sorting to the data
    const sortedProperties = sortConfigs.length > 0 ? sortData(filteredProperties) : filteredProperties;
    const sortedResidents = sortConfigs.length > 0 ? sortData(filteredResidents) : filteredResidents;
    const sortedNotifications = reportData.notificaciones && reportData.notificaciones.length > 0
      ? sortConfigs.length > 0 ? sortData(reportData.notificaciones) : reportData.notificaciones
      : [];
    
    const propertiesCount = sortedProperties.length;
    const residentsCount = sortedResidents.length;
    
    // Create sort information text
    const sortInfoText = sortConfigs.length > 0 
      ? `Sorted by: ${sortConfigs.map((config, index) => 
          `${index + 1}. ${config.key} (${config.direction})`).join(', ')}`
      : '';
    
    // Create filter information text
    const activeFilters = [];
    if (quickResidentFilter) activeFilters.push(`Name filter: "${quickResidentFilter}"`);
    if (filters.municipio) activeFilters.push(`Municipality: ${filters.municipio}`);
    if (filters.barrio) activeFilters.push(`Barrio: ${filters.barrio}`);
    if (filters.sector) activeFilters.push(`Sector: ${filters.sector}`);
    if (filters.usng) activeFilters.push(`USNG: ${filters.usng}`);
    if (filters.ageRange?.min || filters.ageRange?.max) {
      activeFilters.push(`Age: ${filters.ageRange?.min || 0}-${filters.ageRange?.max || 200}`);
    }
    if (filters.sex) activeFilters.push(`Sex: ${filters.sex}`);
    if (filters.residentCategory) activeFilters.push(`Category: ${filters.residentCategory}`);
    if (filters.propertyType) activeFilters.push(`Property Type: ${filters.propertyType}`);
    
    const filterInfoText = activeFilters.length > 0 
      ? `Active filters: ${activeFilters.join(', ')}`
      : '';
    
    // Helper function to get visible property columns
    const getVisiblePropertyColumns = () => {
      const columns = [];
      if (visibleColumns.property_tipo) columns.push({ key: 'tipo', label: 'Property' });
      if (visibleColumns.property_location) columns.push({ key: 'location', label: 'Location' });
      if (visibleColumns.property_address) columns.push({ key: 'direccion', label: 'Address' });
      if (visibleColumns.property_usng) columns.push({ key: 'usng', label: 'USNG' });
      if (visibleColumns.property_damage) columns.push({ key: 'daños', label: 'Damage' });
      if (visibleColumns.property_date) columns.push({ key: 'fecha', label: 'Date' });
      if (visibleColumns.property_residents) columns.push({ key: 'habitantes', label: 'Residents' });
      return columns;
    };
    
    // Helper function to get visible resident columns
    const getVisibleResidentColumns = () => {
      const columns = [];
      if (visibleColumns.id) columns.push({ key: 'id', label: 'ID' });
      if (visibleColumns.nombre) columns.push({ key: 'nombre', label: 'Name' });
      if (visibleColumns.apellido1) columns.push({ key: 'apellido1', label: 'Last Name 1' });
      if (visibleColumns.apellido2) columns.push({ key: 'apellido2', label: 'Last Name 2' });
      if (visibleColumns.edad) columns.push({ key: 'edad', label: 'Age' });
      if (visibleColumns.sex) columns.push({ key: 'sex', label: 'Sex' });
      if (visibleColumns.categoria) columns.push({ key: 'categoria', label: 'Category' });
      if (visibleColumns.family) columns.push({ key: 'family', label: 'Family' });
      if (visibleColumns.contacto) columns.push({ key: 'contacto', label: 'Contact' });
      if (visibleColumns.limitacion) columns.push({ key: 'limitacion', label: 'Limitation' });
      if (visibleColumns.condicion) columns.push({ key: 'condicion', label: 'Condition' });
      if (visibleColumns.disposicion) columns.push({ key: 'disposicion', label: 'Disposition' });
      if (visibleColumns.property) columns.push({ key: 'property', label: 'Property' });
      if (visibleColumns.municipio) columns.push({ key: 'municipio', label: 'Municipality' });
      if (visibleColumns.barrio) columns.push({ key: 'barrio', label: 'Barrio' });
      if (visibleColumns.sector) columns.push({ key: 'sector', label: 'Sector' });
      if (visibleColumns.usng) columns.push({ key: 'usng', label: 'USNG' });
      if (visibleColumns.direccion) columns.push({ key: 'direccion', label: 'Address' });
      return columns;
    };
    
    const visiblePropertyColumns = getVisiblePropertyColumns();
    const visibleResidentColumns = getVisibleResidentColumns();
    
    // Create the HTML content for the report
    printWindow.document.write(`
      <html>
        <head>
          <title>SISRI-PR Analytics Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              margin: 0;
              padding: 20px;
              color: #333;
            }
            .report-header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
            }
            .section {
              margin-bottom: 20px;
              break-inside: avoid;
            }
            .section-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 10px;
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
            }
            .row {
              display: flex;
              margin-bottom: 5px;
            }
            .label {
              font-weight: bold;
              min-width: 200px;
            }
            .value {
              flex: 1;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 10px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            .badge {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 9999px;
              font-size: 12px;
              font-weight: 500;
              line-height: 1.5;
            }
            .badge-outline {
              background-color: transparent;
              border: 1px solid #ccc;
            }
            .badge-pending {
              background-color: #FEF9C3;
              color: #854D0E;
            }
            .badge-active {
              background-color: #FEE2E2;
              color: #991B1B;
            }
            .badge-resolved {
              background-color: #DCFCE7;
              color: #166534;
            }
            .status-badge {
              padding: 3px 10px;
              border-radius: 4px;
              font-size: 13px;
              font-weight: bold;
            }
            .nested-table {
              margin-left: 20px;
              width: calc(100% - 20px);
            }
            .nested-th {
              background-color: #f8f8f8;
              font-size: 13px;
            }
            .nested-td {
              font-size: 13px;
            }
            .property-row {
              background-color: #f9f9f9;
            }
            @media print {
              body {
                padding: 0;
              }
              .no-print {
                display: none;
              }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              thead { display: table-header-group; }
            }
            .signature-area {
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
            }
            .signature-line {
              width: 45%;
              border-top: 1px solid #000;
              padding-top: 5px;
              text-align: center;
            }
            .residents-table {
              margin-top: 5px;
              margin-bottom: 15px;
              margin-left: 30px;
              width: calc(100% - 30px);
              font-size: 0.9em;
            }
            .residents-table th {
              background-color: #f8f8f8;
              font-size: 0.9em;
              padding: 6px;
            }
            .residents-table td {
              padding: 6px;
              border: 1px solid #eee;
              vertical-align: top;
            }
            .property-divider {
              margin: 15px 0;
              border-top: 1px dashed #ccc;
            }
            .info-text {
              font-style: italic;
              color: #666;
              margin: 5px 0;
            }
          </style>
        </head>
        <body>
          <div class="no-print">
            <button onclick="window.print()" style="padding: 8px 16px; background: #0066ff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">Print Report</button>
            <button onclick="window.close()" style="padding: 8px 16px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
          </div>
          
          <div class="report-header">
            <h1>SISRI-PR ANALYTICS REPORT</h1>
            <h3>Generated: ${new Date().toLocaleString()}</h3>
            ${sortInfoText ? `<p class="info-text">${sortInfoText}</p>` : ''}
            ${filterInfoText ? `<p class="info-text">${filterInfoText}</p>` : ''}
            ${visiblePropertyColumns.length < 7 || visibleResidentColumns.length < 18 ? 
              `<p class="info-text">Note: Some columns are hidden based on user preferences</p>` : ''}
          </div>
          
          <div class="section">
            <div class="section-title">Search Information</div>
            <div class="row">
              <div class="label">Search Type:</div>
              <div class="value">${
                reportData.searchType === 'evento' ? 'Event' : 
                reportData.searchType === 'usng' ? 'USNG Coordinates' : 
                reportData.searchType === 'municipio' ? 'Municipality' :
                reportData.searchType === 'residente' ? 'Resident' : 'Unknown'
              }</div>
            </div>
            ${reportData.searchType === 'evento' && reportData.evento ? `
              <div class="row">
                <div class="label">Event Name:</div>
                <div class="value">${reportData.evento.titulo}</div>
              </div>
              <div class="row">
                <div class="label">Date:</div>
                <div class="value">${new Date(reportData.evento.fecha).toLocaleDateString()}</div>
              </div>
              <div class="row">
                <div class="label">Status:</div>
                <div class="value">
                  <span class="status-badge badge-${reportData.evento.estado.toLowerCase()}">${reportData.evento.estado}</span>
                </div>
              </div>
              <div class="row">
                <div class="label">Description:</div>
                <div class="value">${reportData.evento.descripcion}</div>
              </div>
              ${reportData.evento.usng ? `
                <div class="row">
                  <div class="label">USNG Coordinates:</div>
                  <div class="value">${reportData.evento.usng}</div>
                </div>
              ` : ''}
            ` : reportData.searchType === 'usng' ? `
              <div class="row">
                <div class="label">USNG Coordinates:</div>
                <div class="value">${reportData.usngQuery}</div>
              </div>
            ` : reportData.searchType === 'municipio' ? `
              <div class="row">
                <div class="label">Municipality:</div>
                <div class="value">${reportData.municipioQuery}</div>
              </div>
            ` : reportData.searchType === 'residente' ? `
              <div class="row">
                <div class="label">Resident Search:</div>
                <div class="value">${reportData.searchQuery || 'All Residents'}</div>
              </div>
              <div class="row">
                <div class="label">Results:</div>
                <div class="value">${residentsCount} residents found</div>
              </div>
            ` : ''}
          </div>
          
          ${propertiesCount > 0 ? `
          <div class="section">
            <div class="section-title">Properties (${propertiesCount})</div>
            <table>
              <thead>
                <tr>
                  ${visiblePropertyColumns.map(col => `<th>${col.label}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${sortedProperties.map((property) => `
                  <tr>
                    ${visiblePropertyColumns.map(col => {
                      switch(col.key) {
                        case 'tipo': return `<td>${property.tipo}</td>`;
                        case 'location': return `<td>
                          <div>
                            <span>${property.municipio}</span>
                            <br>
                            <span style="font-size: 0.9em; color: #666;">
                              ${property.barrio} • ${property.sector}
                            </span>
                          </div>
                        </td>`;
                        case 'direccion': return `<td>${property.direccion || 'N/A'}</td>`;
                        case 'usng': return `<td>${property.usng}</td>`;
                        case 'daños': return `<td>${property.daños || 'N/A'}</td>`;
                        case 'fecha': return `<td>${property.fecha ? new Date(property.fecha).toLocaleDateString() : 'N/A'}</td>`;
                        case 'habitantes': return `<td>${property.habitantes.length}</td>`;
                        default: return '<td>N/A</td>';
                      }
                    }).join('')}
                  </tr>
                  ${property.habitantes.length > 0 ? `
                  <tr>
                    <td colspan="${visiblePropertyColumns.length}" style="padding: 0;">
                      <table class="residents-table">
                        <thead>
                          <tr>
                            ${visibleResidentColumns.map(col => `<th>${col.label}</th>`).join('')}
                          </tr>
                        </thead>
                        <tbody>
                          ${(sortConfigs ? sortData(property.habitantes) : property.habitantes).map((resident: ResidentData) => `
                            <tr>
                              ${visibleResidentColumns.map(col => {
                                switch(col.key) {
                                  case 'id': return `<td><span class="badge badge-outline">${resident.family_id || '0'}-${resident.id}</span></td>`;
                                  case 'nombre': return `<td>${resident.nombre}</td>`;
                                  case 'apellido1': return `<td>${resident.apellido1 || 'N/A'}</td>`;
                                  case 'apellido2': return `<td>${resident.apellido2 || 'N/A'}</td>`;
                                  case 'edad': return `<td>${resident.edad}</td>`;
                                  case 'sex': return `<td>${resident.sex || resident.sexo || 'N/A'}</td>`;
                                  case 'categoria': return `<td>${resident.categoria}</td>`;
                                  case 'family': return `<td>${resident.family ? resident.family.apellidos : 'N/A'}</td>`;
                                  case 'contacto': return `<td>${resident.contacto || 'N/A'}</td>`;
                                  case 'limitacion': return `<td>
                                    <div>
                                      <span class="badge badge-outline">${resident.limitacion || 'N/A'}</span>
                                      ${resident.limitacion_descripcion ? `<br><span style="font-size: 0.9em; color: #666;">${resident.limitacion_descripcion}</span>` : ''}
                                    </div>
                                  </td>`;
                                  case 'condicion': return `<td>
                                    <div>
                                      <span class="badge badge-outline">${resident.condicion || 'N/A'}</span>
                                      ${resident.condicion_descripcion ? `<br><span style="font-size: 0.9em; color: #666;">${resident.condicion_descripcion}</span>` : ''}
                                    </div>
                                  </td>`;
                                  case 'disposicion': return `<td>
                                    <div>
                                      <span class="badge badge-outline">${resident.disposicion || 'N/A'}</span>
                                      ${resident.disposicion_descripcion ? `<br><span style="font-size: 0.9em; color: #666;">${resident.disposicion_descripcion}</span>` : ''}
                                    </div>
                                  </td>`;
                                  case 'property': return `<td>${resident.propiedad_info?.tipo || property.tipo}</td>`;
                                  case 'municipio': return `<td>${resident.propiedad_info?.municipio || property.municipio}</td>`;
                                  case 'barrio': return `<td>${resident.propiedad_info?.barrio || property.barrio}</td>`;
                                  case 'sector': return `<td>${resident.propiedad_info?.sector || property.sector}</td>`;
                                  case 'usng': return `<td>${resident.propiedad_info?.usng || property.usng}</td>`;
                                  case 'direccion': return `<td>${resident.propiedad_info?.direccion || property.direccion || 'N/A'}</td>`;
                                  default: return '<td>N/A</td>';
                                }
                              }).join('')}
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  <tr><td colspan="${visiblePropertyColumns.length}" class="property-divider"></td></tr>
                  ` : ''}
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}
          
          ${residentsCount > 0 && reportData.searchType === 'residente' ? `
          <div class="section">
            <div class="section-title">Residents (${residentsCount})</div>
            <table>
              <thead>
                <tr>
                  ${visibleResidentColumns.map(col => `<th>${col.label}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${sortedResidents.map((resident) => `
                  <tr>
                    ${visibleResidentColumns.map(col => {
                      switch(col.key) {
                        case 'id': return `<td>${resident.family_id || '0'}-${resident.id}</td>`;
                        case 'nombre': return `<td>${resident.nombre}</td>`;
                        case 'apellido1': return `<td>${resident.apellido1 || 'N/A'}</td>`;
                        case 'apellido2': return `<td>${resident.apellido2 || 'N/A'}</td>`;
                        case 'edad': return `<td>${resident.edad}</td>`;
                        case 'sex': return `<td>${resident.sex || resident.sexo || 'N/A'}</td>`;
                        case 'categoria': return `<td>${resident.categoria}</td>`;
                        case 'family': return `<td>${resident.family ? resident.family.apellidos : 'N/A'}</td>`;
                        case 'contacto': return `<td>${resident.contacto || 'N/A'}</td>`;
                        case 'limitacion': return `<td>
                          <div>
                            <span class="badge badge-outline">${resident.limitacion || 'N/A'}</span>
                            ${resident.limitacion_descripcion ? `<br><span style="font-size: 0.9em; color: #666;">${resident.limitacion_descripcion}</span>` : ''}
                          </div>
                        </td>`;
                        case 'condicion': return `<td>
                          <div>
                            <span class="badge badge-outline">${resident.condicion || 'N/A'}</span>
                            ${resident.condicion_descripcion ? `<br><span style="font-size: 0.9em; color: #666;">${resident.condicion_descripcion}</span>` : ''}
                          </div>
                        </td>`;
                        case 'disposicion': return `<td>
                          <div>
                            <span class="badge badge-outline">${resident.disposicion || 'N/A'}</span>
                            ${resident.disposicion_descripcion ? `<br><span style="font-size: 0.9em; color: #666;">${resident.disposicion_descripcion}</span>` : ''}
                          </div>
                        </td>`;
                        case 'property': return `<td>${resident.propiedad_info ? resident.propiedad_info.tipo : (resident._property ? resident._property.tipo : 'N/A')}</td>`;
                        case 'municipio': return `<td>${resident.propiedad_info ? resident.propiedad_info.municipio : (resident._property ? resident._property.municipio : 'N/A')}</td>`;
                        case 'barrio': return `<td>${resident.propiedad_info ? resident.propiedad_info.barrio : (resident._property ? resident._property.barrio : 'N/A')}</td>`;
                        case 'sector': return `<td>${resident.propiedad_info ? resident.propiedad_info.sector : (resident._property ? resident._property.sector : 'N/A')}</td>`;
                        case 'usng': return `<td>${resident.propiedad_info ? resident.propiedad_info.usng : (resident._property ? resident._property.usng : 'N/A')}</td>`;
                        case 'direccion': return `<td>${resident.propiedad_info ? resident.propiedad_info.direccion || 'N/A' : (resident._property ? resident._property.direccion || 'N/A' : 'N/A')}</td>`;
                        default: return '<td>N/A</td>';
                      }
                    }).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}
          
          ${reportData.notificaciones && reportData.notificaciones.length > 0 ? `
            <div class="section">
              <div class="section-title">Notifications (${reportData.notificaciones.length})</div>
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Notification #</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  ${sortedNotifications.map((notification) => `
                    <tr>
                      <td>${notification.id}</td>
                      <td>${notification.numero_notificacion || 'NOT-' + notification.id}</td>
                      <td>${notification.tipo}</td>
                      <td>
                        <span class="status-badge badge-${(notification.estado || 'pending').toLowerCase()}">
                          ${notification.estado || 'Pending'}
                        </span>
                      </td>
                      <td>${formatDate(notification.fecha_creacion)}</td>
                      <td>${notification.mensaje.substring(0, 50)}${notification.mensaje.length > 50 ? '...' : ''}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
          
          <div class="signature-area">
            <div class="signature-line">
              Prepared by
            </div>
            <div class="signature-line">
              Authorized by
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #666;">
            <p>SISRI-PR Official Analytics Report - Confidential</p>
            <p>Generated by the Sistema de Información de Respuesta a Incidentes</p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  // Add this helper function to apply all filters to habitants
  const applyResidentFilters = (residents: ResidentData[]): ResidentData[] => {
    let filteredResidents = residents;
    
    // Apply name filter from both quick filter and advanced filters
    const nameFilter = quickResidentFilter || filters.residentName;
    if (nameFilter) {
      const filterLower = nameFilter.toLowerCase();
      filteredResidents = filteredResidents.filter(resident => 
        resident.nombre.toLowerCase().includes(filterLower)
      );
    }
    
    // Apply family name filter
    if (filters.familyName) {
      const familyFilter = filters.familyName.toLowerCase();
      filteredResidents = filteredResidents.filter(resident => 
        resident.family?.apellidos?.toLowerCase().includes(familyFilter)
      );
    }
    
    // Apply category filter
    if (filters.residentCategory) {
      const categoryFilter = filters.residentCategory.toLowerCase();
      filteredResidents = filteredResidents.filter((resident: ResidentData) => {
        return resident.categoria.toLowerCase() === categoryFilter;
      });
    }
    
    // Apply condition filter
    if (filters.residentCondition) {
      filteredResidents = filteredResidents.filter(resident => {
        const conditionFilter = filters.residentCondition!.toLowerCase();
        const residentCondition = (resident.condicion || '').toLowerCase();
        return residentCondition.includes(conditionFilter);
      });
    }
    
    // Apply limitation filter
    if (filters.residentLimitation) {
      filteredResidents = filteredResidents.filter((resident: ResidentData) => {
        const limitationFilter = filters.residentLimitation!.toLowerCase();
        const residentLimitation = (resident.limitacion || "").toLowerCase();
        
        // Special cases handling for diabetes
        if (limitationFilter === "diabetes" && 
            (residentLimitation.includes("diabetes") || 
             residentLimitation.includes("diabetico") || 
             residentLimitation.includes("diabética") ||
             residentLimitation.includes("diabetica") || 
             residentLimitation.includes("diabetis") ||
             residentLimitation.includes("tipo 1") ||
             residentLimitation.includes("tipo 2") ||
             residentLimitation.includes("azucar"))) {
          return true;
        }
        
        // Handle exact matches
        if (residentLimitation === limitationFilter) {
          return true;
        }
        
        // Fall back to contains for partial matches
        return residentLimitation.includes(limitationFilter);
      });
    }
    
    // Apply disposition filter
    if (filters.residentDisposition) {
      filteredResidents = filteredResidents.filter(resident => {
        const dispositionFilter = filters.residentDisposition!.toLowerCase();
        const residentDisposition = (resident.disposicion || '').toLowerCase();
        return residentDisposition.includes(dispositionFilter);
      });
    }
    
    // Apply age filter
    if (filters.ageRange?.min || filters.ageRange?.max) {
      filteredResidents = filteredResidents.filter(resident => {
        const min = Number(filters.ageRange?.min || 0);
        const max = Number(filters.ageRange?.max || 200);
        return resident.edad >= min && resident.edad <= max;
      });
    }
    
    // Apply sex filter
    if (filters.sex) {
      const sexFilter = filters.sex.toLowerCase();
      filteredResidents = filteredResidents.filter((resident: ResidentData) => {
        const sex = resident.sex?.toLowerCase() || '';
        const sexo = resident.sexo?.toLowerCase() || '';
        return sex === sexFilter || sexo === sexFilter;
      });
    }
    
    // Apply location filters (USNG, municipio, barrio, sector)
    if (filters.usng) {
      const usngFilter = filters.usng.toLowerCase();
      filteredResidents = filteredResidents.filter(resident => {
        const propInfoUsng = resident.propiedad_info?.usng?.toLowerCase() || '';
        const propUsng = resident._property?.usng?.toLowerCase() || '';
        return propInfoUsng.includes(usngFilter) || propUsng.includes(usngFilter);
      });
    }
    
    if (filters.municipio) {
      const municipioFilter = filters.municipio.toLowerCase();
      filteredResidents = filteredResidents.filter(resident => {
        const propInfoMunicipio = resident.propiedad_info?.municipio?.toLowerCase() || '';
        const propMunicipio = resident._property?.municipio?.toLowerCase() || '';
        return propInfoMunicipio === municipioFilter || propMunicipio === municipioFilter;
      });
    }
    
    if (filters.barrio) {
      const barrioFilter = filters.barrio.toLowerCase();
      filteredResidents = filteredResidents.filter(resident => {
        const propInfoBarrio = resident.propiedad_info?.barrio?.toLowerCase() || '';
        const propBarrio = resident._property?.barrio?.toLowerCase() || '';
        return propInfoBarrio === barrioFilter || propBarrio === barrioFilter;
      });
    }
    
    if (filters.sector) {
      const sectorFilter = filters.sector.toLowerCase();
      filteredResidents = filteredResidents.filter(resident => {
        const propInfoSector = resident.propiedad_info?.sector?.toLowerCase() || '';
        const propSector = resident._property?.sector?.toLowerCase() || '';
        return propInfoSector === sectorFilter || propSector === sectorFilter;
      });
    }
    
    // Apply property type filter
    if (filters.propertyType) {
      const propertyTypeFilter = filters.propertyType.toLowerCase();
      filteredResidents = filteredResidents.filter(resident => {
        const propInfoTipo = resident.propiedad_info?.tipo?.toLowerCase() || '';
        const propTipo = resident._property?.tipo?.toLowerCase() || '';
        return propInfoTipo === propertyTypeFilter || propTipo === propertyTypeFilter;
      });
    }
    
    // Apply category filter if needed
    if (filters.residentCategory) {
      const categoryFilter = filters.residentCategory.toLowerCase();
      filteredResidents = filteredResidents.filter((resident: ResidentData) => {
        return resident.categoria.toLowerCase() === categoryFilter;
      });
    }
    
    // Apply sex filter if needed
    if (filters.sex) {
      const sexFilter = filters.sex.toLowerCase();
      filteredResidents = filteredResidents.filter((resident: ResidentData) => {
        const sex = resident.sex?.toLowerCase() || '';
        const sexo = resident.sexo?.toLowerCase() || '';
        return sex === sexFilter || sexo === sexFilter;
      });
    }
    
    return filteredResidents;
  };

  // Add function to render column visibility controls for properties
  const renderPropertyColumnControls = () => (
    <div className="mb-4 p-4 border rounded-md bg-muted/30">
      <h4 className="text-sm font-medium mb-3">Property Column Visibility</h4>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2">
        {[
          { key: 'property_tipo', label: 'Property' },
          { key: 'property_location', label: 'Location' },
          { key: 'property_address', label: 'Address' },
          { key: 'property_usng', label: 'USNG' },
          { key: 'property_damage', label: 'Damage' },
          { key: 'property_date', label: 'Date' },
          { key: 'property_residents', label: 'Residents' }
        ].map(({ key, label }) => (
          <Button
            key={key}
            variant={visibleColumns[key] ? "default" : "outline"}
            size="sm"
            className="justify-start h-8 text-xs"
            onClick={() => toggleColumnVisibility(key)}
          >
            {visibleColumns[key] ? (
              <Eye className="h-4 w-4 mr-2" />
            ) : (
              <EyeOff className="h-4 w-4 mr-2" />
            )}
            {label}
          </Button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const propertyKeys = ['property_tipo', 'property_location', 'property_address', 'property_usng', 'property_damage', 'property_date', 'property_residents'];
            setVisibleColumns(prev => ({
              ...prev,
              ...propertyKeys.reduce((acc, key) => ({ ...acc, [key]: true }), {})
            }));
          }}
        >
          Show All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const propertyKeys = ['property_tipo', 'property_location', 'property_address', 'property_usng', 'property_damage', 'property_date', 'property_residents'];
            setVisibleColumns(prev => ({
              ...prev,
              ...propertyKeys.reduce((acc, key) => ({ ...acc, [key]: false }), {})
            }));
          }}
        >
          Hide All
        </Button>
      </div>
    </div>
  );

  // Add function to render column visibility controls for residents
  const renderResidentColumnControls = () => (
    <div className="mb-4 p-4 border rounded-md bg-muted/30">
      <h4 className="text-sm font-medium mb-3">Resident Column Visibility</h4>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { key: 'id', label: 'ID' },
          { key: 'nombre', label: 'Name' },
          { key: 'apellido1', label: 'Last Name 1' },
          { key: 'apellido2', label: 'Last Name 2' },
          { key: 'edad', label: 'Age' },
          { key: 'sex', label: 'Sex' },
          { key: 'categoria', label: 'Category' },
          { key: 'family', label: 'Family' },
          { key: 'contacto', label: 'Contact' },
          { key: 'limitacion', label: 'Limitation' },
          { key: 'condicion', label: 'Condition' },
          { key: 'disposicion', label: 'Disposition' },
          { key: 'property', label: 'Property' },
          { key: 'municipio', label: 'Municipality' },
          { key: 'barrio', label: 'Barrio' },
          { key: 'sector', label: 'Sector' },
          { key: 'usng', label: 'USNG' },
          { key: 'direccion', label: 'Address' }
        ].map(({ key, label }) => (
          <Button
            key={key}
            variant={visibleColumns[key] ? "default" : "outline"}
            size="sm"
            className="justify-start h-8 text-xs"
            onClick={() => toggleColumnVisibility(key)}
          >
            {visibleColumns[key] ? (
              <Eye className="h-4 w-4 mr-2" />
            ) : (
              <EyeOff className="h-4 w-4 mr-2" />
            )}
            {label}
          </Button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const residentKeys = ['id', 'nombre', 'apellido1', 'apellido2', 'edad', 'sex', 'categoria', 'family', 'contacto', 'limitacion', 'condicion', 'disposicion', 'property', 'municipio', 'barrio', 'sector', 'usng', 'direccion'];
            setVisibleColumns(prev => ({
              ...prev,
              ...residentKeys.reduce((acc, key) => ({ ...acc, [key]: true }), {})
            }));
          }}
        >
          Show All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const residentKeys = ['id', 'nombre', 'apellido1', 'apellido2', 'edad', 'sex', 'categoria', 'family', 'contacto', 'limitacion', 'condicion', 'disposicion', 'property', 'municipio', 'barrio', 'sector', 'usng', 'direccion'];
            setVisibleColumns(prev => ({
              ...prev,
              ...residentKeys.reduce((acc, key) => ({ ...acc, [key]: false }), {})
            }));
          }}
        >
          Hide All
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle>Comprehensive Report</CardTitle>
          <CardDescription>
            Search by event, USNG coordinates, or municipality to see all related details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Select value={searchType} onValueChange={handleSearchTypeChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Type of search" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="evento">Event</SelectItem>
                  <SelectItem value="usng">USNG</SelectItem>
                  <SelectItem value="municipio">Municipality</SelectItem>
                  <SelectItem value="residente">Resident</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative flex-1">
                <Input
                  placeholder={getSearchPlaceholder()}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    debouncedFetchSuggestions(e.target.value);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="flex-1"
                />
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border">
                    <ScrollArea className="h-[200px]">
                      {isLoadingSuggestions ? (
                        <div className="p-2 text-center text-sm text-muted-foreground">
                          Loading suggestions...
                        </div>
                      ) : (
                        <div className="py-1">
                          {searchSuggestions.map((suggestion) => (
                            <button
                              key={suggestion.id}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none"
                              onClick={() => {
                                setSearchQuery(suggestion.label);
                                setShowSuggestions(false);
                              }}
                            >
                              {suggestion.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                )}
              </div>
              {searchType === 'residente' && (
                <Button variant="outline" onClick={() => {
                  setSearchQuery('');
                  handleSearch();
                }} className="whitespace-nowrap">
                  View All
                </Button>
              )}
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? (
                  <span className="animate-spin mr-2">⏳</span>
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Search
              </Button>
            </div>

            {/* Advanced Filters Toggle */}
            <div className="flex justify-end">
              <Button
                variant="ghost"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="text-sm"
              >
                {showAdvancedFilters ? "Hide advanced filters" : "Show advanced filters"}
              </Button>
            </div>

            {/* Advanced Filters Section */}
            {renderAdvancedFilters()}
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Results Display */}
      {reportData && (
        <Card>
          <CardHeader>
            {renderHeader()}
            {reportData.searchType === 'evento' && reportData.evento && (
              <p className="text-sm text-muted-foreground mt-2">
                {reportData.evento.descripcion}
              </p>
            )}
            
            {/* Add Print Button */}
            <div className="flex justify-end mt-4">
              <Button 
                variant="outline" 
                className="flex items-center gap-2" 
                onClick={handlePrintReport}
              >
                <Printer className="h-4 w-4" />
                Print Professional Report
              </Button>
            </div>
          </CardHeader>
          
          {reportData.searchType === 'evento' && reportData.evento && (
            <Tabs defaultValue="properties" value={activeTab} onValueChange={setActiveTab} className="px-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="properties" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  <span>Affected Properties</span>
                  <Badge variant="secondary" className="ml-1">{reportData.propiedades.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <span>Notifications</span>
                  <Badge variant="secondary" className="ml-1">{reportData.notificaciones?.length || 0}</Badge>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="properties" className="pt-4">
                {/* Column Visibility Controls for Properties */}
                {renderPropertyColumnControls()}
                
                {/* Column Visibility Controls for Residents in expanded view */}
                {renderResidentColumnControls()}
                
                <div className="text-xs text-muted-foreground mb-2">
                  <span className="font-medium">Tip:</span> Click column headers to sort. Hold Shift + Click to add secondary sort criteria.
                </div>
                <div className="rounded-md border">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted/50">
                          {visibleColumns.property_tipo && (
                            <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('tipo', e)}>
                              Property {getSortDirectionIndicator('tipo')}
                            </th>
                          )}
                          {visibleColumns.property_location && (
                            <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('municipio', e)}>
                              Location {getSortDirectionIndicator('municipio')}
                            </th>
                          )}
                          {visibleColumns.property_address && (
                            <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('direccion', e)}>
                              Address {getSortDirectionIndicator('direccion')}
                            </th>
                          )}
                          {visibleColumns.property_usng && (
                            <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('usng', e)}>
                              USNG {getSortDirectionIndicator('usng')}
                            </th>
                          )}
                          {visibleColumns.property_damage && (
                            <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('daños', e)}>
                              Damage {getSortDirectionIndicator('daños')}
                            </th>
                          )}
                          {visibleColumns.property_date && (
                            <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('fecha', e)}>
                              Date {getSortDirectionIndicator('fecha')}
                            </th>
                          )}
                          {visibleColumns.property_residents && (
                            <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('habitantes.length', e)}>
                              Residents {getSortDirectionIndicator('habitantes.length')}
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {(sortConfigs 
                          ? sortData(reportData.propiedades) 
                          : reportData.propiedades).map((property) => (
                          <>
                            <tr key={property.id} className="border-t hover:bg-muted/50 transition-colors">
                              {visibleColumns.property_tipo && (
                                <td className="py-3 px-4">{property.tipo}</td>
                              )}
                              {visibleColumns.property_location && (
                                <td className="py-3 px-4">
                                  <div className="flex flex-col">
                                    <span>{property.municipio}</span>
                                    <span className="text-sm text-muted-foreground">
                                      {property.barrio} • {property.sector}
                                    </span>
                                  </div>
                                </td>
                              )}
                              {visibleColumns.property_address && (
                                <td className="py-3 px-4">{property.direccion || 'N/A'}</td>
                              )}
                              {visibleColumns.property_usng && (
                                <td className="py-3 px-4">{property.usng}</td>
                              )}
                              {visibleColumns.property_damage && (
                                <td className="py-3 px-4">{property.daños || 'N/A'}</td>
                              )}
                              {visibleColumns.property_date && (
                                <td className="py-3 px-4">
                                  {property.fecha ? new Date(property.fecha).toLocaleDateString() : 'N/A'}
                                </td>
                              )}
                              {visibleColumns.property_residents && (
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1">
                                    <Users className="h-4 w-4" />
                                    <span>{property.habitantes.length}</span>
                                    {property.habitantes.length > 0 && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 ml-1"
                                        onClick={() => toggleProperty(property.id)}
                                      >
                                        {expandedProperties[property.id] ? (
                                          <ChevronUp className="h-4 w-4" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4" />
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              )}
                            </tr>
                            {expandedProperties[property.id] && property.habitantes.length > 0 && (
                              <tr className="bg-muted/30">
                                <td colSpan={Object.values(visibleColumns).filter(v => v && (typeof v === 'boolean')).filter((_, i) => i < 7).length} className="py-2 px-4">
                                  <div className="ml-8">
                                    <table className="w-full">
                                      <thead>
                                        <tr className="text-sm text-muted-foreground">
                                          {visibleColumns.id && (
                                            <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('id', e)}>
                                              ID {getSortDirectionIndicator('id')}
                                            </th>
                                          )}
                                          {visibleColumns.nombre && (
                                            <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('nombre', e)}>
                                              Name {getSortDirectionIndicator('nombre')}
                                            </th>
                                          )}
                                          {visibleColumns.apellido1 && (
                                            <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('apellido1', e)}>
                                              Last Name 1 {getSortDirectionIndicator('apellido1')}
                                            </th>
                                          )}
                                          {visibleColumns.apellido2 && (
                                            <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('apellido2', e)}>
                                              Last Name 2 {getSortDirectionIndicator('apellido2')}
                                            </th>
                                          )}
                                          {visibleColumns.edad && (
                                            <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('edad', e)}>
                                              Age {getSortDirectionIndicator('edad')}
                                            </th>
                                          )}
                                          {visibleColumns.sex && (
                                            <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('sex', e)}>
                                              Sex {getSortDirectionIndicator('sex')}
                                            </th>
                                          )}
                                          {visibleColumns.categoria && (
                                            <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('categoria', e)}>
                                              Category {getSortDirectionIndicator('categoria')}
                                            </th>
                                          )}
                                          {visibleColumns.family && (
                                            <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('family.apellidos', e)}>
                                              Family {getSortDirectionIndicator('family.apellidos')}
                                            </th>
                                          )}
                                          {visibleColumns.contacto && (
                                            <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('contacto', e)}>
                                              Contact {getSortDirectionIndicator('contacto')}
                                            </th>
                                          )}
                                          {visibleColumns.limitacion && (
                                            <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('limitacion', e)}>
                                              Limitation {getSortDirectionIndicator('limitacion')}
                                            </th>
                                          )}
                                          {visibleColumns.condicion && (
                                            <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('condicion', e)}>
                                              Condition {getSortDirectionIndicator('condicion')}
                                            </th>
                                          )}
                                          {visibleColumns.disposicion && (
                                            <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('disposicion', e)}>
                                              Disposition {getSortDirectionIndicator('disposicion')}
                                            </th>
                                          )}
                                          {visibleColumns.property && (
                                            <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('propiedad_info.tipo', e)}>
                                              Property {getSortDirectionIndicator('propiedad_info.tipo')}
                                            </th>
                                          )}
                                          {visibleColumns.municipio && (
                                            <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('propiedad_info.municipio', e)}>
                                              Municipality {getSortDirectionIndicator('propiedad_info.municipio')}
                                            </th>
                                          )}
                                          {visibleColumns.barrio && (
                                            <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('propiedad_info.barrio', e)}>
                                              Barrio {getSortDirectionIndicator('propiedad_info.barrio')}
                                            </th>
                                          )}
                                          {visibleColumns.sector && (
                                            <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('propiedad_info.sector', e)}>
                                              Sector {getSortDirectionIndicator('propiedad_info.sector')}
                                            </th>
                                          )}
                                          {visibleColumns.direccion && (
                                            <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('propiedad_info.direccion', e)}>
                                              Address {getSortDirectionIndicator('propiedad_info.direccion')}
                                            </th>
                                          )}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(sortConfigs && expandedProperties[property.id]
                                          ? sortData(property.habitantes)
                                          : property.habitantes).map((resident: ResidentData) => (
                                          <tr key={resident.id} className="text-sm">
                                            {visibleColumns.id && (
                                              <td className="py-2 px-3">
                                                <Badge variant="outline" className="font-mono text-xs">
                                                  {resident.family_id || '0'}-{resident.id}
                                                </Badge>
                                              </td>
                                            )}
                                            {visibleColumns.nombre && (
                                              <td className="py-2 px-3">{resident.nombre}</td>
                                            )}
                                            {visibleColumns.apellido1 && (
                                              <td className="py-2 px-3">{resident.apellido1 || 'N/A'}</td>
                                            )}
                                            {visibleColumns.apellido2 && (
                                              <td className="py-2 px-3">{resident.apellido2 || 'N/A'}</td>
                                            )}
                                            {visibleColumns.edad && (
                                              <td className="py-2 px-3">{resident.edad}</td>
                                            )}
                                            {visibleColumns.sex && (
                                              <td className="py-2 px-3">{resident.sex || resident.sexo || 'N/A'}</td>
                                            )}
                                            {visibleColumns.categoria && (
                                              <td className="py-2 px-3">
                                                <Badge variant="outline">{resident.categoria}</Badge>
                                              </td>
                                            )}
                                            {visibleColumns.family && (
                                              <td className="py-2 px-3">
                                                {resident.family ? resident.family.apellidos : 'N/A'}
                                              </td>
                                            )}
                                            {visibleColumns.contacto && (
                                              <td className="py-2 px-3">{resident.contacto || 'N/A'}</td>
                                            )}
                                            {visibleColumns.limitacion && (
                                              <td className="py-2 px-3">
                                                <div className="flex flex-col">
                                                  <Badge variant="outline" className="mb-1">{resident.limitacion || 'N/A'}</Badge>
                                                  {resident.limitacion_descripcion && (
                                                    <span className="text-xs text-muted-foreground">
                                                      {resident.limitacion_descripcion}
                                                    </span>
                                                  )}
                                                </div>
                                              </td>
                                            )}
                                            {visibleColumns.condicion && (
                                              <td className="py-2 px-3">
                                                <div className="flex flex-col">
                                                  <Badge variant="outline" className="mb-1">{resident.condicion || 'N/A'}</Badge>
                                                  {resident.condicion_descripcion && (
                                                    <span className="text-xs text-muted-foreground">
                                                      {resident.condicion_descripcion}
                                                    </span>
                                                  )}
                                                </div>
                                              </td>
                                            )}
                                            {visibleColumns.disposicion && (
                                              <td className="py-2 px-3">
                                                <div className="flex flex-col">
                                                  <Badge variant="outline" className="mb-1">{resident.disposicion || 'N/A'}</Badge>
                                                  {resident.disposicion_descripcion && (
                                                    <span className="text-xs text-muted-foreground">
                                                      {resident.disposicion_descripcion}
                                                    </span>
                                                  )}
                                                </div>
                                              </td>
                                            )}
                                            {visibleColumns.property && (
                                              <td className="py-2 px-3">
                                                <div className="flex flex-col">
                                                  <Badge variant="outline" className="mb-1">{resident.propiedad_info?.tipo || 'N/A'}</Badge>
                                                  <span className="text-xs text-muted-foreground">
                                                    {resident.propiedad_info?.municipio || 'N/A'}, {resident.propiedad_info?.barrio || 'N/A'}, {resident.propiedad_info?.sector || 'N/A'}
                                                  </span>
                                                  <span className="text-xs font-mono mt-1">{resident.propiedad_info?.usng || 'N/A'}</span>
                                                </div>
                                              </td>
                                            )}
                                            {visibleColumns.municipio && (
                                              <td className="py-2 px-3">
                                                <div className="flex flex-col">
                                                  <Badge variant="outline" className="mb-1">{resident.propiedad_info?.municipio || 'N/A'}</Badge>
                                                  <span className="text-xs text-muted-foreground">
                                                    {resident.propiedad_info?.municipio || 'N/A'}
                                                  </span>
                                                </div>
                                              </td>
                                            )}
                                            {visibleColumns.barrio && (
                                              <td className="py-2 px-3">
                                                <div className="flex flex-col">
                                                  <Badge variant="outline" className="mb-1">{resident.propiedad_info?.barrio || 'N/A'}</Badge>
                                                  <span className="text-xs text-muted-foreground">
                                                    {resident.propiedad_info?.barrio || 'N/A'}
                                                  </span>
                                                </div>
                                              </td>
                                            )}
                                            {visibleColumns.sector && (
                                              <td className="py-2 px-3">
                                                <div className="flex flex-col">
                                                  <Badge variant="outline" className="mb-1">{resident.propiedad_info?.sector || 'N/A'}</Badge>
                                                  <span className="text-xs text-muted-foreground">
                                                    {resident.propiedad_info?.sector || 'N/A'}
                                                  </span>
                                                </div>
                                              </td>
                                            )}
                                            {visibleColumns.direccion && (
                                              <td className="py-2 px-3">
                                                <div className="flex flex-col">
                                                  <Badge variant="outline" className="mb-1">{resident.propiedad_info?.direccion || 'N/A'}</Badge>
                                                  <span className="text-xs text-muted-foreground">
                                                    {resident.propiedad_info?.direccion || 'N/A'}
                                                  </span>
                                                </div>
                                              </td>
                                            )}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="notifications" className="pt-4">
                {reportData.notificaciones && reportData.notificaciones.length > 0 ? (
                  <ScrollArea className="h-[400px] rounded-md border p-4">
                    <div className="space-y-4">
                      {reportData.notificaciones.map((notification) => (
                        <Card key={notification.id} className="overflow-hidden">
                          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                            <div className="space-y-1">
                              <CardTitle className="text-base font-medium flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                {notification.numero_notificacion || `NOT-${notification.id}`}
                              </CardTitle>
                              <CardDescription className="flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                {formatDate(notification.fecha_creacion)}
                              </CardDescription>
                            </div>
                            <Badge className={cn(getNotificationStatusColor(notification.estado))}>
                              {notification.estado}
                            </Badge>
                          </CardHeader>
                          <CardContent className="p-4 pt-2">
                            <p className="text-sm">{notification.mensaje}</p>
                          </CardContent>
                          <CardFooter className="px-4 py-2 bg-muted/30 flex justify-between">
                            <span className="text-xs text-muted-foreground">Type: {notification.tipo}</span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 text-xs"
                              onClick={() => handleNotificationDetails(notification)}
                            >
                              View details
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/20 rounded-md">
                    <p className="text-muted-foreground">No notifications registered for this event.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
          
          {(reportData.searchType !== 'evento' || !reportData.evento) && reportData.searchType !== 'residente' && (
            <CardContent>
              {/* Column Visibility Controls for Properties */}
              {renderPropertyColumnControls()}
              
              {/* Column Visibility Controls for Residents in expanded view */}
              {renderResidentColumnControls()}
              
              <div className="text-xs text-muted-foreground mb-2">
                <span className="font-medium">Tip:</span> Click column headers to sort. Hold Shift + Click to add secondary sort criteria.
              </div>
              <div className="rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/50">
                        {visibleColumns.property_tipo && (
                          <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('tipo', e)}>
                            Property {getSortDirectionIndicator('tipo')}
                          </th>
                        )}
                        {visibleColumns.property_location && (
                          <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('municipio', e)}>
                            Location {getSortDirectionIndicator('municipio')}
                          </th>
                        )}
                        {visibleColumns.property_address && (
                          <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('direccion', e)}>
                            Address {getSortDirectionIndicator('direccion')}
                          </th>
                        )}
                        {visibleColumns.property_usng && (
                          <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('usng', e)}>
                            USNG {getSortDirectionIndicator('usng')}
                          </th>
                        )}
                        {visibleColumns.property_damage && (
                          <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('daños', e)}>
                            Damage {getSortDirectionIndicator('daños')}
                          </th>
                        )}
                        {visibleColumns.property_date && (
                          <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('fecha', e)}>
                            Date {getSortDirectionIndicator('fecha')}
                          </th>
                        )}
                        {visibleColumns.property_residents && (
                          <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('habitantes.length', e)}>
                            Residents {getSortDirectionIndicator('habitantes.length')}
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {(sortConfigs 
                        ? sortData(reportData.propiedades) 
                        : reportData.propiedades).map((property) => (
                        <>
                          <tr key={property.id} className="border-t hover:bg-muted/50 transition-colors">
                            {visibleColumns.property_tipo && (
                              <td className="py-3 px-4">{property.tipo}</td>
                            )}
                            {visibleColumns.property_location && (
                              <td className="py-3 px-4">
                                <div className="flex flex-col">
                                  <span>{property.municipio}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {property.barrio} • {property.sector}
                                  </span>
                                </div>
                              </td>
                            )}
                            {visibleColumns.property_address && (
                              <td className="py-3 px-4">{property.direccion || 'N/A'}</td>
                            )}
                            {visibleColumns.property_usng && (
                              <td className="py-3 px-4">{property.usng}</td>
                            )}
                            {visibleColumns.property_damage && (
                              <td className="py-3 px-4">{property.daños || 'N/A'}</td>
                            )}
                            {visibleColumns.property_date && (
                              <td className="py-3 px-4">
                                {property.fecha ? new Date(property.fecha).toLocaleDateString() : 'N/A'}
                              </td>
                            )}
                            {visibleColumns.property_residents && (
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1">
                                  <Users className="h-4 w-4" />
                                  <span>{property.habitantes.length}</span>
                                  {property.habitantes.length > 0 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 ml-1"
                                      onClick={() => toggleProperty(property.id)}
                                    >
                                      {expandedProperties[property.id] ? (
                                        <ChevronUp className="h-4 w-4" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                          {expandedProperties[property.id] && property.habitantes.length > 0 && (
                            <tr className="bg-muted/30">
                              <td colSpan={Object.values(visibleColumns).filter(v => v && (typeof v === 'boolean')).filter((_, i) => i < 7).length} className="py-2 px-4">
                                <div className="ml-8">
                                  <table className="w-full">
                                    <thead>
                                      <tr className="text-sm text-muted-foreground">
                                        {visibleColumns.id && (
                                          <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('id', e)}>
                                            ID {getSortDirectionIndicator('id')}
                                          </th>
                                        )}
                                        {visibleColumns.nombre && (
                                          <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('nombre', e)}>
                                            Name {getSortDirectionIndicator('nombre')}
                                          </th>
                                        )}
                                        {visibleColumns.apellido1 && (
                                          <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('apellido1', e)}>
                                            Last Name 1 {getSortDirectionIndicator('apellido1')}
                                          </th>
                                        )}
                                        {visibleColumns.apellido2 && (
                                          <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('apellido2', e)}>
                                            Last Name 2 {getSortDirectionIndicator('apellido2')}
                                          </th>
                                        )}
                                        {visibleColumns.edad && (
                                          <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('edad', e)}>
                                            Age {getSortDirectionIndicator('edad')}
                                          </th>
                                        )}
                                        {visibleColumns.sex && (
                                          <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('sex', e)}>
                                            Sex {getSortDirectionIndicator('sex')}
                                          </th>
                                        )}
                                        {visibleColumns.categoria && (
                                          <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('categoria', e)}>
                                            Category {getSortDirectionIndicator('categoria')}
                                          </th>
                                        )}
                                        {visibleColumns.family && (
                                          <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('family.apellidos', e)}>
                                            Family {getSortDirectionIndicator('family.apellidos')}
                                          </th>
                                        )}
                                        {visibleColumns.contacto && (
                                          <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('contacto', e)}>
                                            Contact {getSortDirectionIndicator('contacto')}
                                          </th>
                                        )}
                                        {visibleColumns.limitacion && (
                                          <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('limitacion', e)}>
                                            Limitation {getSortDirectionIndicator('limitacion')}
                                          </th>
                                        )}
                                        {visibleColumns.condicion && (
                                          <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('condicion', e)}>
                                            Condition {getSortDirectionIndicator('condicion')}
                                          </th>
                                        )}
                                        {visibleColumns.disposicion && (
                                          <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('disposicion', e)}>
                                            Disposition {getSortDirectionIndicator('disposicion')}
                                          </th>
                                        )}
                                        {visibleColumns.property && (
                                          <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('propiedad_info.tipo', e)}>
                                            Property {getSortDirectionIndicator('propiedad_info.tipo')}
                                          </th>
                                        )}
                                        {visibleColumns.municipio && (
                                          <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('propiedad_info.municipio', e)}>
                                            Municipality {getSortDirectionIndicator('propiedad_info.municipio')}
                                          </th>
                                        )}
                                        {visibleColumns.barrio && (
                                          <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('propiedad_info.barrio', e)}>
                                            Barrio {getSortDirectionIndicator('propiedad_info.barrio')}
                                          </th>
                                        )}
                                        {visibleColumns.sector && (
                                          <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('propiedad_info.sector', e)}>
                                            Sector {getSortDirectionIndicator('propiedad_info.sector')}
                                          </th>
                                        )}
                                        {visibleColumns.direccion && (
                                          <th className="py-2 px-3 text-left font-medium cursor-pointer" onClick={(e) => requestSort('propiedad_info.direccion', e)}>
                                            Address {getSortDirectionIndicator('propiedad_info.direccion')}
                                          </th>
                                        )}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(sortConfigs && expandedProperties[property.id]
                                        ? sortData(property.habitantes)
                                        : property.habitantes).map((resident: ResidentData) => (
                                        <tr key={resident.id} className="text-sm">
                                          {visibleColumns.id && (
                                            <td className="py-2 px-3">
                                              <Badge variant="outline" className="font-mono text-xs">
                                                {resident.family_id || '0'}-{resident.id}
                                              </Badge>
                                            </td>
                                          )}
                                          {visibleColumns.nombre && (
                                            <td className="py-2 px-3">{resident.nombre}</td>
                                          )}
                                          {visibleColumns.apellido1 && (
                                            <td className="py-2 px-3">{resident.apellido1 || 'N/A'}</td>
                                          )}
                                          {visibleColumns.apellido2 && (
                                            <td className="py-2 px-3">{resident.apellido2 || 'N/A'}</td>
                                          )}
                                          {visibleColumns.edad && (
                                            <td className="py-2 px-3">{resident.edad}</td>
                                          )}
                                          {visibleColumns.sex && (
                                            <td className="py-2 px-3">{resident.sex || resident.sexo || 'N/A'}</td>
                                          )}
                                          {visibleColumns.categoria && (
                                            <td className="py-2 px-3">
                                              <Badge variant="outline">{resident.categoria}</Badge>
                                            </td>
                                          )}
                                          {visibleColumns.family && (
                                            <td className="py-2 px-3">
                                              {resident.family ? resident.family.apellidos : 'N/A'}
                                            </td>
                                          )}
                                          {visibleColumns.contacto && (
                                            <td className="py-2 px-3">{resident.contacto || 'N/A'}</td>
                                          )}
                                          {visibleColumns.limitacion && (
                                            <td className="py-2 px-3">
                                              <div className="flex flex-col">
                                                <Badge variant="outline" className="mb-1">{resident.limitacion || 'N/A'}</Badge>
                                                {resident.limitacion_descripcion && (
                                                  <span className="text-xs text-muted-foreground">
                                                    {resident.limitacion_descripcion}
                                                  </span>
                                                )}
                                              </div>
                                            </td>
                                          )}
                                          {visibleColumns.condicion && (
                                            <td className="py-2 px-3">
                                              <div className="flex flex-col">
                                                <Badge variant="outline" className="mb-1">{resident.condicion || 'N/A'}</Badge>
                                                {resident.condicion_descripcion && (
                                                  <span className="text-xs text-muted-foreground">
                                                    {resident.condicion_descripcion}
                                                  </span>
                                                )}
                                              </div>
                                            </td>
                                          )}
                                          {visibleColumns.disposicion && (
                                            <td className="py-2 px-3">
                                              <div className="flex flex-col">
                                                <Badge variant="outline" className="mb-1">{resident.disposicion || 'N/A'}</Badge>
                                                {resident.disposicion_descripcion && (
                                                  <span className="text-xs text-muted-foreground">
                                                    {resident.disposicion_descripcion}
                                                  </span>
                                                )}
                                              </div>
                                            </td>
                                          )}
                                          {visibleColumns.property && (
                                            <td className="py-2 px-3">
                                              <div className="flex flex-col">
                                                <Badge variant="outline" className="mb-1">{resident.propiedad_info?.tipo || 'N/A'}</Badge>
                                                <span className="text-xs text-muted-foreground">
                                                  {resident.propiedad_info?.municipio || 'N/A'}, {resident.propiedad_info?.barrio || 'N/A'}, {resident.propiedad_info?.sector || 'N/A'}
                                                </span>
                                                <span className="text-xs font-mono mt-1">{resident.propiedad_info?.usng || 'N/A'}</span>
                                              </div>
                                            </td>
                                          )}
                                          {visibleColumns.municipio && (
                                            <td className="py-2 px-3">
                                              <div className="flex flex-col">
                                                <Badge variant="outline" className="mb-1">{resident.propiedad_info?.municipio || 'N/A'}</Badge>
                                                <span className="text-xs text-muted-foreground">
                                                  {resident.propiedad_info?.municipio || 'N/A'}
                                                </span>
                                              </div>
                                            </td>
                                          )}
                                          {visibleColumns.barrio && (
                                            <td className="py-2 px-3">
                                              <div className="flex flex-col">
                                                <Badge variant="outline" className="mb-1">{resident.propiedad_info?.barrio || 'N/A'}</Badge>
                                                <span className="text-xs text-muted-foreground">
                                                  {resident.propiedad_info?.barrio || 'N/A'}
                                                </span>
                                              </div>
                                            </td>
                                          )}
                                          {visibleColumns.sector && (
                                            <td className="py-2 px-3">
                                              <div className="flex flex-col">
                                                <Badge variant="outline" className="mb-1">{resident.propiedad_info?.sector || 'N/A'}</Badge>
                                                <span className="text-xs text-muted-foreground">
                                                  {resident.propiedad_info?.sector || 'N/A'}
                                                </span>
                                              </div>
                                            </td>
                                          )}
                                          {visibleColumns.direccion && (
                                            <td className="py-2 px-3">
                                              <div className="flex flex-col">
                                                <Badge variant="outline" className="mb-1">{resident.propiedad_info?.direccion || 'N/A'}</Badge>
                                                <span className="text-xs text-muted-foreground">
                                                  {resident.propiedad_info?.direccion || 'N/A'}
                                                </span>
                                              </div>
                                            </td>
                                          )}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          )}

          {reportData && reportData.searchType === 'residente' && (
            <CardContent>
              {/* Add a quick filter input above the results */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search resident by name..."
                    value={quickResidentFilter}
                    onChange={(e) => setQuickResidentFilter(e.target.value)}
                    className="pl-10"
                  />
                  {quickResidentFilter && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="absolute right-1 top-1 h-8 px-2"
                      onClick={() => setQuickResidentFilter("")}
                    >
                      ✕
                    </Button>
                  )}
                </div>
              </div>

              {/* Column Visibility Controls */}
              {renderResidentColumnControls()}
              
              <div className="text-xs text-muted-foreground mb-2">
                <span className="font-medium">Tip:</span> Click column headers to sort. Hold Shift + Click to add secondary sort criteria.
              </div>
              <div className="rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/50">
                        {visibleColumns.id && (
                          <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('id', e)}>
                            <div className="flex items-center gap-1">
                              ID {getSortDirectionIndicator('id')}
                            </div>
                          </th>
                        )}
                        {visibleColumns.nombre && (
                          <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('nombre', e)}>
                            <div className="flex items-center gap-1">
                              Name {getSortDirectionIndicator('nombre')}
                            </div>
                          </th>
                        )}
                        {visibleColumns.apellido1 && (
                          <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('apellido1', e)}>
                            <div className="flex items-center gap-1">
                              Last Name 1 {getSortDirectionIndicator('apellido1')}
                            </div>
                          </th>
                        )}
                        {visibleColumns.apellido2 && (
                          <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('apellido2', e)}>
                            <div className="flex items-center gap-1">
                              Last Name 2 {getSortDirectionIndicator('apellido2')}
                            </div>
                          </th>
                        )}
                        {visibleColumns.edad && (
                          <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('edad', e)}>
                            <div className="flex items-center gap-1">
                              Age {getSortDirectionIndicator('edad')}
                            </div>
                          </th>
                        )}
                        {visibleColumns.sex && (
                          <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('sex', e)}>
                            <div className="flex items-center gap-1">
                              Sex {getSortDirectionIndicator('sex')}
                            </div>
                          </th>
                        )}
                        {visibleColumns.categoria && (
                          <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('categoria', e)}>
                            <div className="flex items-center gap-1">
                              Category {getSortDirectionIndicator('categoria')}
                            </div>
                          </th>
                        )}
                        {visibleColumns.family && (
                          <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('family.apellidos', e)}>
                            <div className="flex items-center gap-1">
                              Family {getSortDirectionIndicator('family.apellidos')}
                            </div>
                          </th>
                        )}
                        {visibleColumns.contacto && (
                          <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('contacto', e)}>
                            <div className="flex items-center gap-1">
                              Contact {getSortDirectionIndicator('contacto')}
                            </div>
                          </th>
                        )}
                        {visibleColumns.limitacion && (
                          <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('limitacion', e)}>
                            <div className="flex items-center gap-1">
                              Limitation {getSortDirectionIndicator('limitacion')}
                            </div>
                          </th>
                        )}
                        {visibleColumns.condicion && (
                          <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('condicion', e)}>
                            <div className="flex items-center gap-1">
                              Condition {getSortDirectionIndicator('condicion')}
                            </div>
                          </th>
                        )}
                        {visibleColumns.disposicion && (
                          <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('disposicion', e)}>
                            <div className="flex items-center gap-1">
                              Disposition {getSortDirectionIndicator('disposicion')}
                            </div>
                          </th>
                        )}
                        {visibleColumns.property && (
                          <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('propiedad_info.tipo', e)}>
                            <div className="flex items-center gap-1">
                              Property {getSortDirectionIndicator('propiedad_info.tipo')}
                            </div>
                          </th>
                        )}
                        {visibleColumns.municipio && (
                          <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('propiedad_info.municipio', e)}>
                            <div className="flex items-center gap-1">
                              Municipality {getSortDirectionIndicator('propiedad_info.municipio')}
                            </div>
                          </th>
                        )}
                        {visibleColumns.barrio && (
                          <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('propiedad_info.barrio', e)}>
                            <div className="flex items-center gap-1">
                              Barrio {getSortDirectionIndicator('propiedad_info.barrio')}
                            </div>
                          </th>
                        )}
                        {visibleColumns.sector && (
                          <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('propiedad_info.sector', e)}>
                            <div className="flex items-center gap-1">
                              Sector {getSortDirectionIndicator('propiedad_info.sector')}
                            </div>
                          </th>
                        )}
                        {visibleColumns.usng && (
                          <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('propiedad_info.usng', e)}>
                            <div className="flex items-center gap-1">
                              USNG {getSortDirectionIndicator('propiedad_info.usng')}
                            </div>
                          </th>
                        )}
                        {visibleColumns.direccion && (
                          <th className="py-3 px-4 text-left font-medium cursor-pointer" onClick={(e) => requestSort('propiedad_info.direccion', e)}>
                            <div className="flex items-center gap-1">
                              Address {getSortDirectionIndicator('propiedad_info.direccion')}
                            </div>
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.residentes ? (
                        // Filter and sort the residents
                        (sortConfigs 
                          ? sortData(
                              reportData.residentes.filter(resident => {
                                if (!quickResidentFilter) return true;
                                return resident.nombre.toLowerCase().includes(quickResidentFilter.toLowerCase());
                              })
                            )
                          : reportData.residentes.filter(resident => {
                              if (!quickResidentFilter) return true;
                              return resident.nombre.toLowerCase().includes(quickResidentFilter.toLowerCase());
                            })
                        ).map((resident: ResidentData) => (
                          <tr key={resident.id} className="border-t hover:bg-muted/50 transition-colors">
                            {visibleColumns.id && (
                              <td className="py-3 px-4">
                                <Badge variant="outline" className="font-mono text-xs">
                                  {resident.family_id || '0'}-{resident.id}
                                </Badge>
                              </td>
                            )}
                            {visibleColumns.nombre && (
                              <td className="py-3 px-4">{resident.nombre}</td>
                            )}
                            {visibleColumns.apellido1 && (
                              <td className="py-3 px-4">{resident.apellido1 || 'N/A'}</td>
                            )}
                            {visibleColumns.apellido2 && (
                              <td className="py-3 px-4">{resident.apellido2 || 'N/A'}</td>
                            )}
                            {visibleColumns.edad && (
                              <td className="py-3 px-4">{resident.edad}</td>
                            )}
                            {visibleColumns.sex && (
                              <td className="py-3 px-4">{resident.sex || resident.sexo || 'N/A'}</td>
                            )}
                            {visibleColumns.categoria && (
                              <td className="py-3 px-4">
                                <Badge variant="outline">{resident.categoria}</Badge>
                              </td>
                            )}
                            {visibleColumns.family && (
                              <td className="py-3 px-4">
                                {resident.family ? (
                                  <Badge variant="secondary">{resident.family.apellidos}</Badge>
                                ) : (
                                  <span className="text-muted-foreground text-xs">No family</span>
                                )}
                              </td>
                            )}
                            {visibleColumns.contacto && (
                              <td className="py-3 px-4">{resident.contacto || 'N/A'}</td>
                            )}
                            {visibleColumns.limitacion && (
                              <td className="py-3 px-4">
                                <div className="flex flex-col">
                                  <Badge variant="outline" className="mb-1">{resident.limitacion || 'N/A'}</Badge>
                                  {resident.limitacion_descripcion && (
                                    <span className="text-xs text-muted-foreground">
                                      {resident.limitacion_descripcion}
                                    </span>
                                  )}
                                </div>
                              </td>
                            )}
                            {visibleColumns.condicion && (
                              <td className="py-3 px-4">
                                <div className="flex flex-col">
                                  <Badge variant="outline" className="mb-1">{resident.condicion || 'N/A'}</Badge>
                                  {resident.condicion_descripcion && (
                                    <span className="text-xs text-muted-foreground">
                                      {resident.condicion_descripcion}
                                    </span>
                                  )}
                                </div>
                              </td>
                            )}
                            {visibleColumns.disposicion && (
                              <td className="py-3 px-4">
                                <div className="flex flex-col">
                                  <Badge variant="outline" className="mb-1">{resident.disposicion || 'N/A'}</Badge>
                                  {resident.disposicion_descripcion && (
                                    <span className="text-xs text-muted-foreground">
                                      {resident.disposicion_descripcion}
                                    </span>
                                  )}
                                </div>
                              </td>
                            )}
                            {visibleColumns.property && (
                              <td className="py-3 px-4">
                                <Badge variant="outline">{resident.propiedad_info?.tipo || 'N/A'}</Badge>
                              </td>
                            )}
                            {visibleColumns.municipio && (
                              <td className="py-3 px-4">
                                <Badge variant="outline">{resident.propiedad_info?.municipio || 'N/A'}</Badge>
                              </td>
                            )}
                            {visibleColumns.barrio && (
                              <td className="py-3 px-4">
                                <Badge variant="outline">{resident.propiedad_info?.barrio || 'N/A'}</Badge>
                              </td>
                            )}
                            {visibleColumns.sector && (
                              <td className="py-3 px-4">
                                <Badge variant="outline">{resident.propiedad_info?.sector || 'N/A'}</Badge>
                              </td>
                            )}
                            {visibleColumns.usng && (
                              <td className="py-3 px-4">
                                <Badge variant="outline">{resident.propiedad_info?.usng || 'N/A'}</Badge>
                              </td>
                            )}
                            {visibleColumns.direccion && (
                              <td className="py-3 px-4">
                                <Badge variant="outline">{resident.propiedad_info?.direccion || 'N/A'}</Badge>
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        // Fix the property reference error
                        (sortConfigs 
                          ? sortData(
                              reportData.propiedades.flatMap(property => {
                                // Create residents with property reference
                                return applyResidentFilters(property.habitantes).map(resident => ({
                                  ...resident,
                                  _property: property // Add property reference
                                }));
                              })
                            )
                          : reportData.propiedades.flatMap(property => {
                              // Create residents with property reference
                              return applyResidentFilters(property.habitantes).map(resident => ({
                                ...resident,
                                _property: property // Add property reference
                              }));
                            })
                        ).map((resident: ResidentData & { _property?: PropertyData }) => (
                          <tr key={resident.id} className="border-t hover:bg-muted/50 transition-colors">
                            {visibleColumns.id && (
                              <td className="py-3 px-4">
                                <Badge variant="outline" className="font-mono text-xs">
                                  {resident.family_id || '0'}-{resident.id}
                                </Badge>
                              </td>
                            )}
                            {visibleColumns.nombre && (
                              <td className="py-3 px-4">{resident.nombre}</td>
                            )}
                            {visibleColumns.apellido1 && (
                              <td className="py-3 px-4">{resident.apellido1 || 'N/A'}</td>
                            )}
                            {visibleColumns.apellido2 && (
                              <td className="py-3 px-4">{resident.apellido2 || 'N/A'}</td>
                            )}
                            {visibleColumns.edad && (
                              <td className="py-3 px-4">{resident.edad}</td>
                            )}
                            {visibleColumns.sex && (
                              <td className="py-3 px-4">{resident.sex || resident.sexo || 'N/A'}</td>
                            )}
                            {visibleColumns.categoria && (
                              <td className="py-3 px-4">
                                <Badge variant="outline">{resident.categoria}</Badge>
                              </td>
                            )}
                            {visibleColumns.family && (
                              <td className="py-3 px-4">
                                {resident.family ? (
                                  <Badge variant="secondary">{resident.family.apellidos}</Badge>
                                ) : (
                                  <span className="text-muted-foreground text-xs">No family</span>
                                )}
                              </td>
                            )}
                            {visibleColumns.contacto && (
                              <td className="py-3 px-4">{resident.contacto || 'N/A'}</td>
                            )}
                            {visibleColumns.limitacion && (
                              <td className="py-3 px-4">
                                <div className="flex flex-col">
                                  <Badge variant="outline" className="mb-1">{resident.limitacion || 'N/A'}</Badge>
                                  {resident.limitacion_descripcion && (
                                    <span className="text-xs text-muted-foreground">
                                      {resident.limitacion_descripcion}
                                    </span>
                                  )}
                                </div>
                              </td>
                            )}
                            {visibleColumns.condicion && (
                              <td className="py-3 px-4">
                                <div className="flex flex-col">
                                  <Badge variant="outline" className="mb-1">{resident.condicion || 'N/A'}</Badge>
                                  {resident.condicion_descripcion && (
                                    <span className="text-xs text-muted-foreground">
                                      {resident.condicion_descripcion}
                                    </span>
                                  )}
                                </div>
                              </td>
                            )}
                            {visibleColumns.disposicion && (
                              <td className="py-3 px-4">
                                <div className="flex flex-col">
                                  <Badge variant="outline" className="mb-1">{resident.disposicion || 'N/A'}</Badge>
                                  {resident.disposicion_descripcion && (
                                    <span className="text-xs text-muted-foreground">
                                      {resident.disposicion_descripcion}
                                    </span>
                                  )}
                                </div>
                              </td>
                            )}
                            {visibleColumns.property && (
                              <td className="py-3 px-4">
                                <Badge variant="outline">{resident._property?.tipo || 'N/A'}</Badge>
                              </td>
                            )}
                            {visibleColumns.municipio && (
                              <td className="py-3 px-4">
                                <Badge variant="outline">{resident._property?.municipio || 'N/A'}</Badge>
                              </td>
                            )}
                            {visibleColumns.barrio && (
                              <td className="py-3 px-4">
                                <Badge variant="outline">{resident._property?.barrio || 'N/A'}</Badge>
                              </td>
                            )}
                            {visibleColumns.sector && (
                              <td className="py-3 px-4">
                                <Badge variant="outline">{resident._property?.sector || 'N/A'}</Badge>
                              </td>
                            )}
                            {visibleColumns.usng && (
                              <td className="py-3 px-4">
                                <Badge variant="outline">{resident._property?.usng || 'N/A'}</Badge>
                              </td>
                            )}
                            {visibleColumns.direccion && (
                              <td className="py-3 px-4">
                                <Badge variant="outline">{resident._property?.direccion || 'N/A'}</Badge>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                      {((reportData.residentes && reportData.residentes.filter(r => !quickResidentFilter || r.nombre.toLowerCase().includes(quickResidentFilter.toLowerCase())).length === 0) || 
                        (!reportData.residentes && reportData.propiedades.flatMap(property => applyResidentFilters(property.habitantes)).length === 0)) && (
                        <tr className="border-t">
                          <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="py-6 px-4 text-center text-muted-foreground">
                            No residents found matching the search criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {selectedNotification && (
        <NotificationDetail 
          notification={selectedNotification}
          properties={reportData?.propiedades || []}
          open={notificationDetailOpen}
          onOpenChange={setNotificationDetailOpen}
          getStatusColor={getNotificationStatusColor}
          formatDateFn={formatDate}
        />
      )}
    </div>
  );
}

function NotificationDetail({ notification, properties, open, onOpenChange, getStatusColor, formatDateFn }: NotificationDetailProps) {
  const relatedProperties = notification.propiedades || 
    properties.filter(property => 
      property.notificaciones?.some(n => n.id === notification.id)
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span>{notification.numero_notificacion || `NOT-${notification.id}`}</span>
              <Badge className={cn(getStatusColor(notification.estado || "pending"))}>
                {notification.estado || "pending"}
              </Badge>
            </DialogTitle>
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatDateFn(notification.fecha_creacion)}
            </div>
          </div>
          <DialogDescription className="pt-2">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">{notification.tipo}</Badge>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col space-y-6 overflow-auto py-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Message</h3>
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm">{notification.mensaje}</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Home className="h-4 w-4" />
              Affected Properties ({relatedProperties.length})
            </h3>
            {relatedProperties.length > 0 ? (
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="py-2 px-3 text-left font-medium">Type</th>
                      <th className="py-2 px-3 text-left font-medium">Location</th>
                      <th className="py-2 px-3 text-left font-medium">USNG</th>
                      <th className="py-2 px-3 text-left font-medium">Damage</th>
                      <th className="py-2 px-3 text-left font-medium">Habitantes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedProperties.map(property => (
                      <tr key={property.id} className="border-t">
                        <td className="py-2 px-3">{property.tipo}</td>
                        <td className="py-2 px-3">
                          <div className="flex flex-col">
                            <span>{property.municipio}</span>
                            <span className="text-sm text-muted-foreground">
                              {property.barrio} • {property.sector}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <Badge variant="outline" className="font-mono">{property.usng}</Badge>
                        </td>
                        <td className="py-2 px-3">{property.daños || 'N/A'}</td>
                        <td className="py-2 px-3">
                          {property.habitantes.length > 0 ? (
                            <details className="text-xs">
                              <summary className="cursor-pointer font-medium hover:text-primary">
                                View {property.habitantes.length} residents
                              </summary>
                              <div className="mt-2 space-y-1">
                                {property.habitantes.map(resident => (
                                  <div key={resident.id} className="pl-2 border-l-2 border-muted-foreground/20">
                                    <p><strong>{resident.nombre}</strong> ({resident.edad} years)
                                      {resident.family && <span className="ml-1">• Family: {resident.family.apellidos}</span>}
                                      {resident.contacto && <span className="ml-1">• Contact: {resident.contacto}</span>}
                                    </p>
                                    <p className="text-muted-foreground">
                                      {resident.categoria}
                                      {resident.limitacion && (
                                        <span>
                                          {` • ${resident.limitacion}`}
                                          {resident.limitacion_descripcion && (
                                            <span className="text-xs"> - {resident.limitacion_descripcion}</span>
                                          )}
                                        </span>
                                      )}
                                      {resident.condicion && (
                                        <span>
                                          {` • ${resident.condicion}`}
                                          {resident.condicion_descripcion && (
                                            <span className="text-xs"> - {resident.condicion_descripcion}</span>
                                          )}
                                        </span>
                                      )}
                                      {resident.disposicion && (
                                        <span>
                                          {` • ${resident.disposicion}`}
                                          {resident.disposicion_descripcion && (
                                            <span className="text-xs"> - {resident.disposicion_descripcion}</span>
                                          )}
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </details>
                          ) : (
                            <span>No residents</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center bg-muted/20 rounded-md">
                <p className="text-muted-foreground">No properties associated with this notification</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


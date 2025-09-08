"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { debounce } from "lodash"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import * as z from "zod"

// Material UI imports
import {
  Add as AddIcon,
  Phone
} from "@mui/icons-material"
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  FormHelperText,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography
} from "@mui/material"

// Constants
const incidentTypes = [
  "Hurricane",
  "Flood",
  "Landslide",
  "Storm Surge",
  "Heavy Rain",
  "Tropical Storm",
  "Drought",
  "Coastal Erosion",
] as const

const propertyTypes = ["House", "Apartment", "Business", "School", "Hospital", "Government Building", "Other"] as const

const eventStatus = [
  "pending",
  "active",
  "resolved"
] as const

// Add habitantes related constants
const habitanteCategories = [
  "Adult",
  "Child",
  "Elderly",
  "Disabled"
] as const

const habitanteRoles = [
  "Resident",
  "Owner",
  "Tenant",
  "Visitor"
] as const

// Add sex options
const sexOptions = [
  "M",
  "F"
] as const

// Add form mode options after the constants
const formModes = [
  "Full Report",
  "Event Only", 
  "Property Only",
  "Resident Only"
] as const;

// Types
interface Municipio {
  id_municipio: number
  nombre: string
  barrios?: Barrio[]
}

interface Barrio {
  id_barrio: number
  nombre: string
  sectores?: Sector[]
}

interface Sector {
  id_sector: number
  nombre: string
}

interface Cuenca {
  id: number
  nombre: string
  codigo_cuenca: string
}

interface USNG {
  id: number
  usng: string
}

// Add this type for event search results
interface EventSearchResult {
  id: number
  titulo: string
  tipo: string
  estado: string
  fecha: string
}

// Add these interfaces after the existing interfaces
interface BarrioSearchResult {
  id_barrio: number
  nombre: string
  codigo_barrio?: string
  id_municipio: number
}

interface SectorSearchResult {
  id_sector: number
  nombre: string
  codigo_sector?: string
  id_barrio: number
}

// Add family interface after other interfaces
interface Family {
  id: number;
  apellidos: string;
  description: string;
}

// Add interfaces for resident options
interface LimitationOption {
  id: number;
  nombre: string;
}

interface ConditionOption {
  id: number;
  nombre: string;
}

interface DispositionOption {
  id: number;
  nombre: string;
}

interface PropertyTypeOption {
  id: number;
  type_name: string;
}

// Update form schema
const formSchema = z.object({
  notificationNumber: z.string(),
  eventName: z.string().min(2, "Event name must be at least 2 characters"),
  eventDescription: z.string().optional(),
  date: z.string(),
  time: z.string(),
  usngCode: z.string().min(1, "USNG code is required"),
  tipo: z.enum(incidentTypes),
  estado: z.enum(eventStatus),
  incidents: z.array(z.object({
    type: z.enum(incidentTypes),
    description: z.string(),
    cuencaId: z.string().optional(),
  })).min(1, "At least one incident is required"),
  cuencaIds: z.array(z.string()).optional().default([]),
  properties: z.array(z.object({
    type: z.string(),
    municipioId: z.string(),
    barrioId: z.string().optional(),
    sectorId: z.string().optional(),
    newBarrioName: z.string().optional(),
    newBarrioCode: z.string().optional(),
    newSectorName: z.string().optional(),
    newSectorCode: z.string().optional(),
    address: z.string(),
    propertyNumber: z.string().optional(),
    value: z.string().optional(),
    location: z.object({
      lat: z.number().optional(),
      lng: z.number().optional(),
    }).optional(),
    habitantes: z.array(z.object({
      name: z.string(),
      apellido1: z.string(),
      apellido2: z.string().optional(),
      sex: z.enum(sexOptions),
      categoria: z.enum(habitanteCategories),
      rol: z.enum(habitanteRoles),
      age: z.string(),
      limitations: z.array(z.object({
        id: z.string(),
        observacion: z.string().optional(),
      })).optional().default([]),
      conditions: z.array(z.object({
        id: z.string(),
        observacion: z.string().optional(),
      })).optional().default([]),
      dispositions: z.array(z.object({
        id: z.string(),
        observacion: z.string().optional(),
      })).optional().default([]),
      contacto: z.string().optional(),
      familyId: z.string().min(1, "Family is required"),
      newFamilyApellido1: z.string().optional(),
      newFamilyApellido2: z.string().optional(),
      newFamilyDescription: z.string().optional(),
    })).optional().default([]),
  })).min(1, "At least one property must be added"),
})

// Generate notification number
const generateNotificationNumber = () => 
  `NOT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`

// Main component
export function ReportForm() {
  // State
  const [formMode, setFormMode] = useState<typeof formModes[number]>("Full Report")
  const [municipios, setMunicipios] = useState<Municipio[]>([])
  const [cuencas, setCuencas] = useState<Cuenca[]>([])
  const [selectedMunicipios, setSelectedMunicipios] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)
  const [isValidatingUsng, setIsValidatingUsng] = useState(false)
  const [usngValidationResult, setUsngValidationResult] = useState<{valid: boolean, message?: string} | null>(null)
  const [dataFetchError, setDataFetchError] = useState<string | null>(null)
  const [usngSuggestions, setUsngSuggestions] = useState<USNG[]>([])
  const [isLoadingUsngSuggestions, setIsLoadingUsngSuggestions] = useState(false)
  const [isMunicipiosLoading, setIsMunicipiosLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [eventSearchResults, setEventSearchResults] = useState<EventSearchResult[]>([])
  const [selectedEvent, setSelectedEvent] = useState<EventSearchResult | null>(null)
  const [isSearchingEvent, setIsSearchingEvent] = useState(false)
  const [barrioSearchResults, setBarrioSearchResults] = useState<BarrioSearchResult[]>([])
  const [sectorSearchResults, setSectorSearchResults] = useState<SectorSearchResult[]>([])
  const [isSearchingBarrio, setIsSearchingBarrio] = useState(false)
  const [isSearchingSector, setIsSearchingSector] = useState(false)
  const [familySearchResults, setFamilySearchResults] = useState<Family[]>([])
  const [isSearchingFamily, setIsSearchingFamily] = useState(false)
  const [selectedExistingProperty, setSelectedExistingProperty] = useState<{
    id: number;
    direccion: string;
    tipo: string;
    id_municipio: number;
    id_barrio?: number;
    id_sector?: number;
    municipio?: { nombre: string };
    barrio?: { nombre: string };
    sector?: { nombre: string };
  } | null>(null);
  const [limitationOptions, setLimitationOptions] = useState<LimitationOption[]>([]);
  const [conditionOptions, setConditionOptions] = useState<ConditionOption[]>([]);
  const [dispositionOptions, setDispositionOptions] = useState<DispositionOption[]>([]);
  const [propertyTypeOptions, setPropertyTypeOptions] = useState<PropertyTypeOption[]>([]);
  const [isResidentOptionsLoading, setIsResidentOptionsLoading] = useState(true);
  
  // Debounce timer reference
  const usngSearchTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize form
  const defaultValues = useMemo(() => ({
    notificationNumber: generateNotificationNumber(),
    eventDescription: "",
    date: new Date().toISOString().split('T')[0],
    usngCode: "",
    tipo: incidentTypes[0],
    estado: "pending" as const,
    incidents: [{ type: incidentTypes[0], description: "", cuencaId: "" }],
    properties: [{ 
      type: propertyTypeOptions.length > 0 ? propertyTypeOptions[0].id.toString() : "1",
      municipioId: "", 
      address: "",
      propertyNumber: "",
      habitantes: [],
    }],
    cuencaIds: [] as string[],
  }), [propertyTypeOptions])

  const { 
    control, 
    handleSubmit, 
    formState: { errors }, 
    setValue, 
    getValues,
    watch,
    reset
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  // Fetch municipios and cuencas data
  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()
    
    const fetchFormData = async () => {
      try {
        const response = await fetch('/api/form-data', {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
        
        if (!response.ok) throw new Error(`Failed to fetch form data: ${response.status}`)
        
        const data = await response.json() as { municipios: Municipio[], cuencas: Cuenca[] }
        
        if (isMounted) {
          setMunicipios(data.municipios || [])
          setCuencas(data.cuencas || [])
          setLoading(false)
          setIsMunicipiosLoading(false)
        }
      } catch (error: any) {
        console.error("Error fetching form data:", error)
        // Don't set error state if it was an abort error (from cleanup)
        if (isMounted && error.name !== 'AbortError') {
          setDataFetchError("Failed to load form data. Please refresh the page.")
        }
        if (isMounted) {
          setLoading(false)
          setIsMunicipiosLoading(false)
        }
      }
    }

    fetchFormData()
    
    return () => {
      isMounted = false
      controller.abort()
    }
  }, [])

  // Fetch resident options and property types on mount
  useEffect(() => {
    let isMounted = true;
    setIsResidentOptionsLoading(true);
    
    const fetchResidentOptions = async () => {
      try {
        const [residentOptionsResponse, propertyTypesResponse] = await Promise.all([
          fetch('/api/residentes/options'),
          fetch('/api/property-types')
        ]);
        
        const residentOptionsData = await residentOptionsResponse.json();
        const propertyTypesData = await propertyTypesResponse.json();
        
        if (isMounted) {
          setLimitationOptions(residentOptionsData.limitations || []);
          setConditionOptions(residentOptionsData.conditions || []);
          setDispositionOptions(residentOptionsData.dispositions || []);
          setPropertyTypeOptions(propertyTypesData || []);
          setIsResidentOptionsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching resident/property options:', error);
        if (isMounted) {
          setIsResidentOptionsLoading(false);
        }
      }
    };
    
    fetchResidentOptions();
    return () => { isMounted = false; };
  }, []);

  // USNG validation - only when needed
  const validateUsngCode = useCallback(async (code: string) => {
    if (!code) {
      setUsngValidationResult(null)
      return false
    }
    
    setIsValidatingUsng(true)
    
    try {
      const response = await fetch(`/api/usng/validate?code=${encodeURIComponent(code)}`)
      const data = await response.json() as { valid: boolean, message?: string }
      
      setUsngValidationResult({
        valid: data.valid,
        message: data.valid ? "Valid USNG code" : "Invalid USNG code"
      })
      
      return data.valid
    } catch (error) {
      console.error("Error validating USNG code:", error)
      setUsngValidationResult({
        valid: false,
        message: "Error validating USNG code"
      })
      return false
    } finally {
      setIsValidatingUsng(false)
    }
  }, [])

  // Search for USNG suggestions - debounced
  const searchUsngCodes = useCallback(async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setUsngSuggestions([])
      return
    }
    
    if (usngSearchTimerRef.current) {
      clearTimeout(usngSearchTimerRef.current)
    }
    
    usngSearchTimerRef.current = setTimeout(async () => {
      setIsLoadingUsngSuggestions(true)
      
      try {
        const url = `/api/usng/search?term=${encodeURIComponent(searchTerm)}&limit=10`
        console.log('Calling USNG search API:', url)
        
        const response = await fetch(url)
        
        if (!response.ok) throw new Error(`Failed to search USNG codes: ${response.status}`)
        
        const data = await response.json() as USNG[]
        console.log('USNG search results:', data)
        
        setUsngSuggestions(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error("Error searching USNG codes:", error)
        setUsngSuggestions([])
      } finally {
        setIsLoadingUsngSuggestions(false)
      }
    }, 300)
  }, [])

  // Watch for form values
  const incidents = watch("incidents")
  const properties = watch("properties")
  const cuencaIds = watch("cuencaIds")

  // Add state to track selected barrios
  const [selectedBarrios, setSelectedBarrios] = useState<Record<number, number>>({})
  
  // Add these functions after the existing functions
  const searchBarrios = useCallback(async (searchTerm: string, municipioId: number) => {
    // Allow empty searches to show all barrios for the municipality
    setIsSearchingBarrio(true);
    try {
      const response = await fetch(`/api/barrios/search?term=${encodeURIComponent(searchTerm || '')}&municipioId=${municipioId}`);
      if (!response.ok) throw new Error('Failed to search barrios');
      const data = await response.json();
      console.log('Barrio search results:', data);
      setBarrioSearchResults(data);
    } catch (error) {
      console.error('Error searching barrios:', error);
      setBarrioSearchResults([]);
    } finally {
      setIsSearchingBarrio(false);
    }
  }, []);

  const searchSectores = useCallback(async (searchTerm: string, barrioId: number) => {
    // Allow empty searches to show all sectors for the barrio
    setIsSearchingSector(true);
    try {
      const response = await fetch(`/api/sectores/search?term=${encodeURIComponent(searchTerm || '')}&barrioId=${barrioId}`);
      if (!response.ok) throw new Error('Failed to search sectores');
      const data = await response.json();
      console.log('Sector search results:', data);
      setSectorSearchResults(data);
    } catch (error) {
      console.error('Error searching sectores:', error);
      setSectorSearchResults([]);
    } finally {
      setIsSearchingSector(false);
    }
  }, []);

  // Debounce the search functions
  const debouncedBarrioSearch = useCallback(
    debounce((term: string, municipioId: number) => searchBarrios(term, municipioId), 300),
    [searchBarrios]
  );

  const debouncedSectorSearch = useCallback(
    debounce((term: string, barrioId: number) => searchSectores(term, barrioId), 300),
    [searchSectores]
  );

  // Add property search function

  // Add debounced property search function

  // Enhance the municipio selection handler to load barrios
  const handleMunicipioSelect = useCallback((index: number, value: string) => {
    setValue(`properties.${index}.municipioId`, value);
    // Reset barrio and sector when municipio changes
    setValue(`properties.${index}.barrioId`, "");
    setValue(`properties.${index}.sectorId`, "");
    
    const municipioId = Number(value);
    setSelectedMunicipios(prev => ({
      ...prev,
      [index]: municipioId
    }));
    
    // Clear previous barrio and sector selections
    setSelectedBarrios({});
    
    // Load all barrios for this municipio with empty search
    if (municipioId) {
      searchBarrios("", municipioId);
    }
  }, [setValue, searchBarrios]);
  
  // Update barrio selection handler to load sectors
  const handleBarrioSelect = useCallback((index: number, value: string, isNewBarrio: boolean = false) => {
    setValue(`properties.${index}.barrioId`, value);
    // Reset sector when barrio changes
    setValue(`properties.${index}.sectorId`, "");
    
    // Don't try to load sectors for a new barrio being created
    if (!isNewBarrio && value !== "new") {
      const barrioId = Number(value);
      setSelectedBarrios(prev => ({
        ...prev,
        [index]: barrioId
      }));
      
      // Load all sectors for this barrio with empty search
      if (barrioId) {
        searchSectores("", barrioId);
      }
    }
  }, [setValue, searchSectores]);

  // Add event search function
  const searchEvents = useCallback(async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setEventSearchResults([])
      return
    }

    setIsSearchingEvent(true)
    try {
      const response = await fetch(`/api/eventos/search?term=${encodeURIComponent(searchTerm)}`)
      if (!response.ok) throw new Error('Failed to search events')
      const data = await response.json()
      setEventSearchResults(data)
    } catch (error) {
      console.error('Error searching events:', error)
      setEventSearchResults([])
    } finally {
      setIsSearchingEvent(false)
    }
  }, [])

  // Debounce event search
  const debouncedEventSearch = useCallback(
    debounce((term: string) => searchEvents(term), 300),
    [searchEvents]
  )

  // Handle event selection
  const handleEventSelect = useCallback((event: EventSearchResult | null) => {
    setSelectedEvent(event)
    if (event) {
      // Update form values with selected event data
      setValue('tipo', event.tipo as any)
      setValue('estado', event.estado as any)
      setValue('date', new Date(event.fecha).toISOString().split('T')[0])
      setValue('time', new Date(event.fecha).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }))
    }
  }, [setValue])

  // Update the searchFamilies function to allow empty searches
  const searchFamilies = useCallback(async (searchTerm: string = '') => {
    setIsSearchingFamily(true);
    try {
      const response = await fetch(`/api/families/search?term=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) throw new Error('Failed to search families');
      const data = await response.json();
      
      // If the API still returns apellidos field, adapt it to the new structure
      const formattedData = data.map((family: any) => {
        if (family.apellidos && !family.apellido1) {
          // Split the apellidos into apellido1 and apellido2
          const parts = family.apellidos.split(' ');
          return {
            ...family,
            apellido1: parts[0] || '',
            apellido2: parts.slice(1).join(' ') || '',
          };
        }
        return family;
      });
      
      setFamilySearchResults(formattedData);
    } catch (error) {
      console.error('Error searching families:', error);
      setFamilySearchResults([]);
    } finally {
      setIsSearchingFamily(false);
    }
  }, []);

  // Update the debounced family search to handle empty searches
  const debouncedFamilySearch = useCallback(
    debounce((term: string = '') => searchFamilies(term), 300),
    [searchFamilies]
  );

  // Add this function to handle form mode change
  const handleFormModeChange = useCallback((mode: typeof formModes[number]) => {
    setFormMode(mode);

    // Reset relevant form sections based on selected mode
    if (mode === "Event Only") {
      // Keep event info, reset properties and residents
      setValue("properties", [{ 
        type: propertyTypes[0],
        municipioId: "", 
        address: "",
        propertyNumber: "",
        habitantes: [],
      }]);
      
      // Make sure we have a description field for the event
      if (!getValues("incidents") || getValues("incidents").length === 0) {
        setValue("incidents", [{ type: incidentTypes[0], description: "", cuencaId: "" }]);
      }
    } else if (mode === "Property Only") {
      // Reset event info, keep properties
      setValue("eventName", "Property Registration");
      setValue("tipo", incidentTypes[0]);
      setValue("estado", "pending" as const);
      setValue("date", new Date().toISOString().split('T')[0]);
      // Don't reset USNG code if user has already entered one for Property Only mode
      if (!getValues("usngCode")) {
        setValue("usngCode", "");
      }
      setValue("incidents", [{ type: incidentTypes[0], description: "Property Registration", cuencaId: "" }]);
      
      // Make sure we have at least one property
      if (!getValues("properties") || getValues("properties").length === 0) {
        setValue("properties", [{ 
          type: propertyTypes[0],
          municipioId: "", 
          address: "",
          propertyNumber: "",
          habitantes: [],
        }]);
      }
    } else if (mode === "Resident Only") {
      // Reset event info, keep residents
      setValue("eventName", "Resident Registration");
      setValue("tipo", incidentTypes[0]);
      setValue("estado", "pending" as const);
      setValue("date", new Date().toISOString().split('T')[0]);
      setValue("incidents", [{ type: incidentTypes[0], description: "Resident Registration", cuencaId: "" }]);
    }
  }, [setValue, getValues]);

  // Modify the onSubmit function to adapt to different form modes
  const onSubmit = useCallback(async (values: z.infer<typeof formSchema>) => {
    console.log("onSubmit called with form mode:", formMode);
    console.log("Form values:", values);
    
    try {
      setIsSubmitting(true);
      
      // Validate USNG code before submission
      const isValidUsng = await validateUsngCode(values.usngCode);
      console.log("USNG validation in onSubmit:", isValidUsng);
      
      if (!isValidUsng && (formMode === "Full Report" || formMode === "Event Only" || formMode === "Property Only")) {
        window.alert('Please enter a valid USNG code');
        return;
      }
      
      // Get USNG ID from the code before submitting
      let usngId = null;
      try {
        console.log('Getting USNG ID for code:', values.usngCode);
        const usngResponse = await fetch(`/api/usng/getById?code=${encodeURIComponent(values.usngCode)}`);
        console.log("USNG API response status:", usngResponse.status);
        
        if (usngResponse.ok) {
          const usngData = await usngResponse.json();
          console.log('Retrieved USNG data:', usngData);
          usngId = usngData.id;
        } else {
          // Handle error case - try uppercase version if original failed
          console.warn('USNG code not found, trying uppercase version:', values.usngCode);
          const uppercaseCode = values.usngCode.toUpperCase();
          if (uppercaseCode !== values.usngCode) {
            const retryResponse = await fetch(`/api/usng/getById?code=${encodeURIComponent(uppercaseCode)}`);
            console.log("USNG API retry response status:", retryResponse.status);
            
            if (retryResponse.ok) {
              const usngData = await retryResponse.json();
              console.log('Retrieved USNG data with uppercase:', usngData);
              usngId = usngData.id;
            } else {
              console.error('USNG code not found even with uppercase:', uppercaseCode);
              let errorData;
              try {
                errorData = await retryResponse.json();
              } catch (e) {
                errorData = "Could not parse error response";
              }
              console.error('Error details:', errorData);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching USNG ID:', error);
      }
      
      if (!usngId && (formMode === "Full Report" || formMode === "Event Only" || formMode === "Property Only")) {
        const errorMsg = 'Could not find a valid USNG ID for the provided coordinates. Please enter a valid USNG code.';
        console.error(errorMsg);
        window.alert(errorMsg);
        return;
      }
      
      console.log("USNG ID retrieved:", usngId);
      
      // Adjust formattedData based on form mode
      let formattedData: any = {};
      
      // Common fields for all modes
      if (formMode === "Full Report" || formMode === "Event Only") {
        // If we have a selected event, use its ID
        formattedData.eventoId = selectedEvent?.id;
        // Only include event creation data if no existing event was selected
        formattedData.evento = !selectedEvent ? {
          create: {
            titulo: values.eventName,
            tipo: values.tipo,
            estado: values.estado,
            descripcion: values.eventDescription || values.incidents[0].description,
            fecha: new Date(values.date).toISOString(),
            usngId: usngId, // Add USNG ID to the event for Event Only mode
          }
        } : undefined;
        
        // Notification specific data - only include for Full Report mode
        if (formMode === "Full Report") {
          formattedData.notificacion = {
            numero_notificacion: values.notificationNumber,
            tipo: values.tipo,
            mensaje: values.eventDescription || values.incidents[0].description,
            estado: values.estado,
            fecha: new Date(values.date).toISOString(),
          };
          
          // Format incidents with cuenca - only for Full Report mode
          formattedData.incidentes = values.incidents.map(incident => ({
            tipo: incident.type,
            descripcion: incident.description,
            cuencaId: incident.cuencaId ? parseInt(incident.cuencaId) : parseInt(values.cuencaIds[0])
          }));
        }
      }
      
      // Add properties data for Full Report, Property Only, and Resident Only modes
      if (formMode === "Full Report" || formMode === "Property Only" || formMode === "Resident Only") {
        console.log(`Formatting properties for ${formMode} mode`);
        
        // Format properties with required fields and habitantes
        formattedData.propiedades_afectadas = values.properties.map(property => {
          console.log("Processing property:", property);
          
          // Handle new barrio or sector creation
          const propertyData: any = {
            tipo: property.type,
            id_municipio: parseInt(property.municipioId),
            direccion: property.address,
            property_number: property.propertyNumber || null,
            gridId: usngId, // Use the numeric USNG ID retrieved from API
            geometria: property.location || null,
          };

          console.log("Basic property data:", propertyData);

          // Handle existing or new barrio
          if (property.barrioId === "new") {
            // Include fields for new barrio creation
            if (!property.newBarrioName) {
              window.alert('Please provide a name for the new barrio');
              throw new Error('Missing new barrio name');
            }
            propertyData.newBarrio = {
              nombre: property.newBarrioName,
              codigo_barrio: property.newBarrioCode || null,
              id_municipio: parseInt(property.municipioId)
            };
            console.log("Adding new barrio:", propertyData.newBarrio);
          } else if (property.barrioId) {
            propertyData.id_barrio = parseInt(property.barrioId);
            console.log("Using existing barrio ID:", propertyData.id_barrio);
          }

          // Handle existing or new sector
          if (property.sectorId === "new") {
            // Include fields for new sector creation
            if (!property.newSectorName) {
              window.alert('Please provide a name for the new sector');
              throw new Error('Missing new sector name');
            }
            
            // For new sector, we need either a parent barrio ID or also a new barrio
            const parentBarrioId = property.barrioId === "new" 
              ? null  // Will be created with the new barrio
              : (property.barrioId && typeof property.barrioId === 'string') 
                  ? parseInt(property.barrioId) 
                  : null;
              
            propertyData.newSector = {
              nombre: property.newSectorName,
              codigo_sector: property.newSectorCode || null,
              id_barrio: parentBarrioId
            };
            console.log("Adding new sector:", propertyData.newSector);
          } else if (property.sectorId) {
            propertyData.id_sector = parseInt(property.sectorId);
            console.log("Using existing sector ID:", propertyData.id_sector);
          }

          // Add habitantes with family information if in Full Report or Resident Only mode
          if (formMode === "Full Report" || formMode === "Resident Only") {
            propertyData.habitantes = {
              create: property.habitantes?.map(habitante => {
                const habitanteData: any = {
                  name: habitante.name,
                  apellido1: habitante.apellido1,
                  apellido2: habitante.apellido2 || "",
                  sex: habitante.sex,
                  categoria: habitante.categoria,
                  rol: habitante.rol,
                  age: parseInt(habitante.age),
                  limitations: habitante.limitations,
                  conditions: habitante.conditions,
                  dispositions: habitante.dispositions,
                  contacto: habitante.contacto,
                };

                // For family information, use the apellidos from the habitante
                if (habitante.familyId === "new") {
                  // Create a new family using the habitante's apellidos
                  if (habitante.newFamilyApellido1) {
                    habitanteData.newFamily = {
                      apellidos: `${habitante.newFamilyApellido1} ${habitante.newFamilyApellido2 || ""}`,
                      description: habitante.newFamilyDescription || `Family of ${habitante.name} ${habitante.apellido1} ${habitante.apellido2 || ""}`
                    };
                  } else {
                    // Use the habitante's last names if no specific family names provided
                    habitanteData.newFamily = {
                      apellidos: `${habitante.apellido1} ${habitante.apellido2 || ""}`,
                      description: habitante.newFamilyDescription || `Family of ${habitante.name} ${habitante.apellido1} ${habitante.apellido2 || ""}`
                    };
                  }
                } else if (habitante.familyId !== "new") {
                  // Link to existing family
                  habitanteData.family_id = parseInt(habitante.familyId);
                }

                return habitanteData;
              }) || []
            };
          } else {
            // For Property Only mode, initialize empty habitantes array
            propertyData.habitantes = { create: [] };
            console.log("Property Only mode - initialized empty habitantes array");
          }

          const formattedProperty = {
            daños: property.value || (formMode === "Property Only" || formMode === "Resident Only" ? "No damage" : "No damage reported"),
            propiedad: {
              create: propertyData
            }
          };
          
          console.log("Final formatted property data:", formattedProperty);
          return formattedProperty;
        });
      }
      
      // For Event Only mode, include minimal property info if required by API
      if (formMode === "Event Only") {
        formattedData.propiedades_afectadas = [];
      }
      
      console.log('Submitting formatted data:', JSON.stringify(formattedData, null, 2));

      // Use different endpoint based on form mode
      let endpoint = '/api/eventos';
      if (formMode === "Property Only") {
        endpoint = '/api/properties';
        console.log("Using Property Only endpoint:", endpoint);
        
        // Make sure formattedData has the right structure for Property Only mode
        if (!formattedData.propiedades_afectadas || formattedData.propiedades_afectadas.length === 0) {
          console.error("No properties to submit in Property Only mode");
          window.alert("Please add at least one property to submit");
          return;
        }
      } else if (formMode === "Resident Only") {
        endpoint = '/api/residents';
        console.log("Using Resident Only endpoint:", endpoint);
        
        // Structure data differently for Resident Only mode
        if (selectedExistingProperty) {
          // If we're adding residents to an existing property
          console.log("Adding residents to existing property ID:", selectedExistingProperty.id);
          
          formattedData = {
            propertyId: selectedExistingProperty.id,
            habitantes: values.properties[0].habitantes?.map(() => {
            }) || []
          };
        } else {
          // Creating both a new property and residents
          console.log("Creating new property with residents in Resident Only mode");
          
          // For a new property in Resident Only mode, we need minimal event information
          const property = values.properties[0];
          
          // Validate that required property fields are filled
          if (!property.municipioId || !property.address) {
            window.alert("Please provide municipality and address for the new property");
            throw new Error("Missing required property fields");
          }
          
          // Create a simplified property structure
          const propertyData: any = {
            tipo: property.type,
            id_municipio: parseInt(property.municipioId),
            direccion: property.address,
            property_number: property.propertyNumber || null,
            habitantes: {
              create: property.habitantes?.map(habitante => ({
                name: habitante.name,
                apellido1: habitante.apellido1,
                apellido2: habitante.apellido2 || "",
                sex: habitante.sex,
                categoria: habitante.categoria,
                rol: habitante.rol,
                age: parseInt(habitante.age),
                limitations: habitante.limitations,
                conditions: habitante.conditions,
                dispositions: habitante.dispositions,
                contacto: habitante.contacto,
                family_id: habitante.familyId === "new" ? null : parseInt(habitante.familyId),
                newFamily: habitante.familyId === "new"
                  ? {
                      apellidos: habitante.newFamilyApellido1
                        ? `${habitante.newFamilyApellido1} ${habitante.newFamilyApellido2 || ""}`
                        : `${habitante.apellido1} ${habitante.apellido2 || ""}`,
                      description: habitante.newFamilyDescription || `Family of ${habitante.name} ${habitante.apellido1}`
                    }
                  : null
              }))
            }
          };

          // Add barrio data if present
          if (property.barrioId && property.barrioId !== "new") {
            propertyData.id_barrio = parseInt(property.barrioId as string);
          } else if (property.barrioId === "new") {
            if (!property.newBarrioName) {
              window.alert('Please provide a name for the new barrio');
              throw new Error('Missing new barrio name');
            }
            propertyData.newBarrio = {
              nombre: property.newBarrioName,
              codigo_barrio: property.newBarrioCode || null,
              id_municipio: parseInt(property.municipioId)
            };
          }

          // Add sector data if present
          if (property.sectorId && property.sectorId !== "new") {
            propertyData.id_sector = parseInt(property.sectorId);
          } else if (property.sectorId === "new") {
            if (!property.newSectorName) {
              window.alert('Please provide a name for the new sector');
              throw new Error('Missing new sector name');
            }
            
            const parentBarrioId = property.barrioId === "new" 
              ? null 
              : (property.barrioId ? parseInt(property.barrioId as string) : null);
            
            propertyData.newSector = {
              nombre: property.newSectorName,
              codigo_sector: property.newSectorCode || null,
              id_barrio: parentBarrioId
            };
          }

          // Format the habitantes data with family information
          propertyData.habitantes = {
            create: property.habitantes?.map(habitante => {
              const habitanteData: any = {
                name: habitante.name,
                apellido1: habitante.apellido1,
                apellido2: habitante.apellido2 || "",
                sex: habitante.sex,
                categoria: habitante.categoria,
                rol: habitante.rol,
                age: parseInt(habitante.age),
                limitations: habitante.limitations,
                conditions: habitante.conditions,
                dispositions: habitante.dispositions,
                contacto: habitante.contacto,
              };

              // Handle family data
              if (habitante.familyId === "new") {
                if (habitante.newFamilyApellido1) {
                  habitanteData.newFamily = {
                    apellidos: `${habitante.newFamilyApellido1} ${habitante.newFamilyApellido2 || ""}`.trim(),
                    description: habitante.newFamilyDescription || `Family of ${habitante.name} ${habitante.apellido1} ${habitante.apellido2 || ""}`
                  };
                } else {
                  habitanteData.newFamily = {
                    apellidos: `${habitante.apellido1} ${habitante.apellido2 || ""}`.trim(),
                    description: habitante.newFamilyDescription || `Family of ${habitante.name} ${habitante.apellido1} ${habitante.apellido2 || ""}`
                  };
                }
              } else if (habitante.familyId !== "new") {
                habitanteData.family_id = parseInt(habitante.familyId);
              }

              return habitanteData;
            }) || []
          };

          // Format the final data structure for creating a new property with residents
          formattedData = {
            newProperty: propertyData,
            // Add a minimal event reference since the API might expect it
            eventReference: {
              titulo: "Resident Registration",
              descripcion: "Resident Registration",
              tipo: "Flood", // Default type
              estado: "pending"
            }
          };
        }
      } else {
        console.log("Using default endpoint:", endpoint);
      }

      // For Event Only mode, format data appropriately
      if (formMode === "Event Only" && !formattedData.eventoId) {
        // Ensure we're creating a simple event with just the basic data and USNG
        formattedData = {
          evento: {
            create: {
              titulo: values.eventName,
              descripcion: values.eventDescription || values.incidents[0].description,
              fecha: new Date(values.date).toISOString(),
              tipo: values.tipo,
              estado: values.estado,
              usngId: usngId
            }
          }
        };
        console.log("Reformatted data for Event Only mode:", formattedData);
      }

      // For Property Only mode, format data appropriately
      if (formMode === "Property Only") {
        // For Property Only mode, use a very simple format - exactly like the Direct Submit button
        const property = values.properties[0];
        formattedData = {
          tipo: property.type,
          id_municipio: parseInt(property.municipioId),
          direccion: property.address,
          usngId: usngId,
          gridId: usngId,
          habitantes: { create: [] }
        };
        
        // Add barrio data if present
        if (property.barrioId && property.barrioId !== "new") {
          formattedData.id_barrio = parseInt(property.barrioId as string);
        } else if (property.barrioId === "new" && property.newBarrioName) {
          formattedData.newBarrio = {
            nombre: property.newBarrioName,
            codigo_barrio: property.newBarrioCode || null,
            id_municipio: parseInt(property.municipioId)
          };
        }
        
        // Add sector data if present
        if (property.sectorId && property.sectorId !== "new") {
          formattedData.id_sector = parseInt(property.sectorId);
        } else if (property.sectorId === "new" && property.newSectorName) {
          const parentBarrioId = property.barrioId === "new" 
            ? null 
            : (property.barrioId ? parseInt(property.barrioId as string) : null);
          
          formattedData.newSector = {
            nombre: property.newSectorName,
            codigo_sector: property.newSectorCode || null,
            id_barrio: parentBarrioId
          };
        }
        
        console.log("Simplified Property Only data:", formattedData);
      }

      console.log(`Sending POST request to ${endpoint}`);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedData),
      });
      
      console.log("API response status:", response.status);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error("Error response data:", errorData);
        } catch (e) {
          console.error("Failed to parse error response:", e);
          errorData = { message: `Server responded with ${response.status}` };
        }
        throw new Error(errorData.message || `Server responded with ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log(`${formMode} submitted successfully:`, responseData);
      
      window.alert(`${formMode} submitted successfully!`);
      
      // Reset form completely using react-hook-form's reset method
      handleEventSelect(null);
      setSelectedMunicipios({});
      setSelectedBarrios({});
      setBarrioSearchResults([]);
      setSectorSearchResults([]);
      setFamilySearchResults([]);
      
      // Reset form with default values
      reset({
        notificationNumber: generateNotificationNumber(),
        eventDescription: "",
        date: new Date().toISOString().split('T')[0],
        usngCode: "",
        tipo: incidentTypes[0],
        estado: "pending" as const,
        incidents: [{ type: incidentTypes[0], description: "", cuencaId: "" }],
        properties: [{ 
          type: propertyTypes[0],
          municipioId: "", 
          address: "",
          propertyNumber: "",
          habitantes: [],
        }],
        cuencaIds: [] as string[],
      });
      
    } catch (error) {
      console.error(`Error submitting ${formMode}:`, error);
      window.alert(`Failed to submit ${formMode}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [validateUsngCode, reset, selectedEvent, handleEventSelect, setSelectedMunicipios, setSelectedBarrios, setBarrioSearchResults, setSectorSearchResults, setFamilySearchResults, formMode, selectedExistingProperty]);

  // Handlers
  const handleAddIncident = useCallback(() => {
    const currentIncidents = getValues("incidents")
    setValue("incidents", [
      ...currentIncidents,
      { type: incidentTypes[0], description: "", cuencaId: "" }
    ])
  }, [getValues, setValue])

  const handleAddProperty = useCallback(() => {
    const currentProperties = getValues("properties")
    setValue("properties", [
      ...currentProperties,
      { type: propertyTypes[0], municipioId: "", address: "", propertyNumber: "", habitantes: [] }
    ])
  }, [getValues, setValue])

  const handleCuencaSelect = useCallback((value: string) => {
    const currentValues = getValues("cuencaIds")
    if (!currentValues.includes(value)) {
      setValue("cuencaIds", [...currentValues, value])
    }
  }, [getValues, setValue])

  const handleRemoveCuenca = useCallback((cuencaId: string) => {
    const currentValues = getValues("cuencaIds")
    setValue("cuencaIds", currentValues.filter(id => id !== cuencaId))
  }, [getValues, setValue])

  const handleUsngInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    
    setValue("usngCode", value)
    
    // Clear validation result when typing
    setUsngValidationResult(null)
    
    // Search for suggestions as user types
    searchUsngCodes(value)
  }, [setValue, searchUsngCodes])

  // Add this near the top of your component
  useEffect(() => {
    // Log when form values change
    const subscription = watch((value) => {
      console.log('Form values changed:', value)
    })
    return () => subscription.unsubscribe()
  }, [watch])

  // Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress />
        <Typography ml={2}>Loading form data...</Typography>
      </Box>
    )
  }

  // Error state
  if (dataFetchError) {
    return (
      <Box p={4} textAlign="center">
        <Typography color="error" mb={2}>{dataFetchError}</Typography>
        <Button 
          variant="contained" 
          onClick={() => window.location.reload()}
        >
          Refresh Page
        </Button>
      </Box>
    )
  }

  // Property existence checking functionality was removed to fix React hooks error

  // Render form
  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 2 }}>
      {/* Form Mode Selection */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Report Type</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {formModes.map((mode) => (
            <Button
              key={mode}
              variant={formMode === mode ? "contained" : "outlined"}
              onClick={() => handleFormModeChange(mode)}
              sx={{ minWidth: '150px' }}
            >
              {mode}
            </Button>
          ))}
        </Box>
        <Typography variant="body2" color="text.secondary" mt={2}>
          {formMode === "Full Report" && "Create a complete report with event information, properties, and residents."}
          {formMode === "Event Only" && "Create only an event without adding properties or residents."}
          {formMode === "Property Only" && "Register properties without creating a full incident report."}
          {formMode === "Resident Only" && "Register residents associated with properties."}
        </Typography>
      </Paper>

      {/* Show Event Information Section if form mode is Full Report or Event Only */}
      {(formMode === "Full Report" || formMode === "Event Only") && (
        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Event Information</Typography>
          <Grid container spacing={3}>
            {/* Only show notification number in Full Report mode */}
            {formMode === "Full Report" && (
              <Grid item xs={12} md={6}>
                <Controller
                  name="notificationNumber"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Notification #"
                      variant="outlined"
                      fullWidth
                      disabled
                    />
                  )}
                />
              </Grid>
            )}
            <Grid item xs={12} md={formMode === "Event Only" ? 12 : 6}>
              <Controller
                name="eventName"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    {...field}
                    freeSolo
                    options={eventSearchResults}
                    getOptionLabel={(option) => 
                      typeof option === 'string' ? option : option.titulo
                    }
                    loading={isSearchingEvent}
                    value={selectedEvent}
                    onChange={(_, newValue) => {
                      if (typeof newValue === 'string') {
                        field.onChange(newValue);
                      } else {
                        handleEventSelect(newValue as EventSearchResult | null);
                        field.onChange(newValue?.titulo || '');
                      }
                    }}
                    onInputChange={(_, newValue) => {
                      field.onChange(newValue)
                      debouncedEventSearch(newValue)
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Event Name"
                        variant="outlined"
                        fullWidth
                        error={!!errors.eventName}
                        helperText={errors.eventName?.message || (selectedEvent ? 'Using existing event' : '')}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {isSearchingEvent && <CircularProgress size={20} />}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <li {...props}>
                        <Box>
                          <Typography variant="body1">{option.titulo}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {`Type: ${option.tipo} | Status: ${option.estado} | Date: ${new Date(option.fecha).toLocaleDateString()}`}
                          </Typography>
                        </Box>
                      </li>
                    )}
                  />
                )}
              />
            </Grid>

            {/* Show these fields only when creating a new event (no selected event) */}
            {!selectedEvent && (
              <>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="date"
                    control={control}
                    render={({ field: { value, onChange, ...field } }) => (
                      <TextField
                        {...field}
                        value={value || ''}
                        onChange={(e) => {
                          onChange(e.target.value)
                        }}
                        type="date"
                        label="Event Date"
                        variant="outlined"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        error={!!errors.date}
                        helperText={errors.date?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="time"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="time"
                        label="Event Time"
                        variant="outlined"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        error={!!errors.time}
                        helperText={errors.time?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="tipo"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth error={!!errors.tipo}>
                        <InputLabel>Event Type</InputLabel>
                        <Select
                          {...field}
                          label="Event Type"
                        >
                          {incidentTypes.map((type) => (
                            <MenuItem key={type} value={type}>
                              {type}
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.tipo && (
                          <FormHelperText>
                            {errors.tipo.message}
                          </FormHelperText>
                        )}
                      </FormControl>
                    )}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="estado"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth error={!!errors.estado}>
                        <InputLabel>Event Status</InputLabel>
                        <Select
                          {...field}
                          label="Event Status"
                        >
                          {eventStatus.map((status) => (
                            <MenuItem key={status} value={status}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.estado && (
                          <FormHelperText>
                            {errors.estado.message}
                          </FormHelperText>
                        )}
                      </FormControl>
                    )}
                  />
                </Grid>

                {/* USNG field for both Event Only and Full Report mode */}
                <Grid item xs={12}>
                  <Controller
                    name="usngCode"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete
                        freeSolo
                        options={usngSuggestions}
                        getOptionLabel={(option) => 
                          typeof option === 'string' ? option : option.usng
                        }
                        loading={isLoadingUsngSuggestions}
                        onInputChange={(_, newValue) => {
                          setValue("usngCode", newValue)
                          searchUsngCodes(newValue)
                        }}
                        onChange={(_, newValue) => {
                          const value = typeof newValue === 'string' 
                            ? newValue 
                            : newValue?.usng || ''
                          setValue("usngCode", value)
                          validateUsngCode(value)
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            {...field} 
                            label="USNG Coordinates"
                            variant="outlined"
                            fullWidth
                            error={!!errors.usngCode}
                            helperText={
                              errors.usngCode?.message || 
                              (usngValidationResult && (
                                <Typography 
                                  component="span" 
                                  color={usngValidationResult.valid ? "success.main" : "error"}
                                >
                                  {usngValidationResult.message}
                                </Typography>
                              ))
                            }
                            InputProps={{
                              ...params.InputProps,
                              endAdornment: (
                                <>
                                  {isValidatingUsng || isLoadingUsngSuggestions ? (
                                    <CircularProgress color="inherit" size={20} />
                                  ) : null}
                                  {params.InputProps.endAdornment}
                                </>
                              ),
                            }}
                            onChange={handleUsngInputChange}
                            onBlur={() => {
                              if (field.value) {
                                validateUsngCode(field.value)
                              }
                            }}
                          />
                        )}
                      />
                    )}
                  />
                </Grid>
                
                {/* Event Description field */}
                <Grid item xs={12}>
                  <Controller
                    name="eventDescription"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Event Description"
                        variant="outlined"
                        fullWidth
                        multiline
                        rows={3}
                        error={!!errors.eventDescription}
                        helperText={errors.eventDescription?.message}
                      />
                    )}
                  />
                </Grid>

                {/* Affected Cuencas in Full Report mode only */}
                {formMode === "Full Report" && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>Affected Cuencas (Optional)</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <FormControl fullWidth>
                          <InputLabel>Select Cuencas</InputLabel>
                          <Select
                            label="Select Cuencas"
                            value=""
                            onChange={(e) => {
                              const target = e.target as HTMLInputElement;
                              handleCuencaSelect(target.value);
                            }}
                          >
                            {cuencas.map((cuenca) => (
                              <MenuItem key={cuenca.id} value={String(cuenca.id)}>
                                {cuenca.nombre} ({cuenca.codigo_cuenca})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: 100, overflow: 'auto' }}>
                          {cuencaIds?.map((cuencaId) => {
                            const cuenca = cuencas.find((c) => String(c.id) === cuencaId)
                            return cuenca ? (
                              <Chip
                                key={cuenca.id}
                                label={cuenca.nombre}
                                onDelete={() => handleRemoveCuenca(cuencaId)}
                                color="primary"
                                variant="outlined"
                              />
                            ) : null
                          })}
                        </Box>
                      </Grid>
                    </Grid>
                  </Grid>
                )}
              </>
            )}
          </Grid>
        </Paper>
      )}

      {/* Show Notification Information Section only for Full Report mode */}
      {formMode === "Full Report" && (
        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Notification Information</Typography>
          <Grid container spacing={3}>
            {/* Date and Time */}
            <Grid item xs={12} md={6}>
              <Controller
                name="date"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <TextField
                    {...field}
                    value={value || ''}
                    onChange={(e) => {
                      onChange(e.target.value)
                    }}
                    type="date"
                    label="Date"
                    variant="outlined"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.date}
                    helperText={errors.date?.message}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="time"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="time"
                    label="Time"
                    variant="outlined"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.time}
                    helperText={errors.time?.message}
                  />
                )}
              />
            </Grid>

            {/* Type and Status */}
            <Grid item xs={12} md={6}>
              <Controller
                name="tipo"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.tipo}>
                    <InputLabel>Event Type</InputLabel>
                    <Select
                      {...field}
                      label="Event Type"
                    >
                      {incidentTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.tipo && (
                      <FormHelperText>
                        {errors.tipo.message}
                      </FormHelperText>
                    )}
                  </FormControl>
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Controller
                name="estado"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.estado}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      {...field}
                      label="Status"
                    >
                      {eventStatus.map((status) => (
                        <MenuItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.estado && (
                      <FormHelperText>
                        {errors.estado.message}
                      </FormHelperText>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            {/* USNG Code */}
            <Grid item xs={12}>
              <Controller
                name="usngCode"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    freeSolo
                    options={usngSuggestions}
                    getOptionLabel={(option) => 
                      typeof option === 'string' ? option : option.usng
                    }
                    loading={isLoadingUsngSuggestions}
                    onInputChange={(_, newValue) => {
                      setValue("usngCode", newValue)
                      searchUsngCodes(newValue)
                    }}
                    onChange={(_, newValue) => {
                      const value = typeof newValue === 'string' 
                        ? newValue 
                        : newValue?.usng || ''
                      setValue("usngCode", value)
                      validateUsngCode(value)
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        {...field} 
                        label="USNG Coordinates"
                        variant="outlined"
                        fullWidth
                        error={!!errors.usngCode}
                        helperText={
                          errors.usngCode?.message || 
                          (usngValidationResult && (
                            <Typography 
                              component="span" 
                              color={usngValidationResult.valid ? "success.main" : "error"}
                            >
                              {usngValidationResult.message}
                            </Typography>
                          ))
                        }
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {isValidatingUsng || isLoadingUsngSuggestions ? (
                                <CircularProgress color="inherit" size={20} />
                              ) : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                        onChange={handleUsngInputChange}
                        onBlur={() => {
                          if (field.value) {
                            validateUsngCode(field.value)
                          }
                        }}
                      />
                    )}
                  />
                )}
              />
            </Grid>

            {/* Incidents */}
            <Grid item xs={12}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle1">Incidents</Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddIncident}
                  size="small"
                >
                  Add Incident
                </Button>
              </Box>
              
              <Box sx={{ maxHeight: 400, overflow: 'auto', pr: 1 }}>
                {incidents.map((_, index) => (
                  <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Controller
                            name={`incidents.${index}.type`}
                            control={control}
                            render={({ field }) => (
                              <FormControl fullWidth error={!!errors.incidents?.[index]?.type}>
                                <InputLabel>Incident Type</InputLabel>
                                <Select
                                  {...field}
                                  label="Incident Type"
                                >
                                  {incidentTypes.map((type) => (
                                    <MenuItem key={type} value={type}>
                                      {type}
                                    </MenuItem>
                                  ))}
                                </Select>
                                {errors.incidents?.[index]?.type && (
                                  <FormHelperText>
                                    {String(errors.incidents[index]?.type || "Invalid type")}
                                  </FormHelperText>
                                )}
                              </FormControl>
                            )}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Controller
                            name={`incidents.${index}.description`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                label="Description"
                                variant="outlined"
                                fullWidth
                                multiline
                                rows={2}
                                error={!!errors.incidents?.[index]?.description}
                                helperText={errors.incidents?.[index]?.description?.message}
                              />
                            )}
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Grid>

            {/* Affected Cuencas */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>Affected Cuencas (Optional)</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Select Cuencas</InputLabel>
                    <Select
                      label="Select Cuencas"
                      value=""
                      onChange={(e) => {
                        const target = e.target as HTMLInputElement;
                        handleCuencaSelect(target.value);
                      }}
                    >
                      {cuencas.map((cuenca) => (
                        <MenuItem key={cuenca.id} value={String(cuenca.id)}>
                          {cuenca.nombre} ({cuenca.codigo_cuenca})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: 100, overflow: 'auto' }}>
                    {cuencaIds?.map((cuencaId) => {
                      const cuenca = cuencas.find((c) => String(c.id) === cuencaId)
                      return cuenca ? (
                        <Chip
                          key={cuenca.id}
                          label={cuenca.nombre}
                          onDelete={() => handleRemoveCuenca(cuencaId)}
                          color="primary"
                          variant="outlined"
                        />
                      ) : null
                    })}
                  </Box>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Properties Section */}
      {(formMode === "Full Report" || formMode === "Property Only" || formMode === "Resident Only") && (
        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              {formMode === "Resident Only" ? "Property for Residents" : "Affected Properties"}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddProperty}
              size="small"
            >
              Add Property
            </Button>
          </Box>

          {/* Show property existence notification in Resident Only mode */}
          {formMode === "Resident Only" && selectedExistingProperty && (
            <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'rgba(76, 175, 80, 0.08)' }}>
              <Typography variant="subtitle2" gutterBottom color="success.main">
                <b>Existing property detected:</b> {selectedExistingProperty.direccion}
              </Typography>
              <Typography variant="body2">
                {selectedExistingProperty.tipo} in {selectedExistingProperty.municipio?.nombre || ''} 
                {selectedExistingProperty.barrio?.nombre ? `, ${selectedExistingProperty.barrio.nombre}` : ''} 
                {selectedExistingProperty.sector?.nombre ? `, ${selectedExistingProperty.sector.nombre}` : ''}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Property ID: {selectedExistingProperty.id}
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                <Typography variant="body2">
                  Residents will be added to this existing property.
                </Typography>
                <Button 
                  size="small" 
                  color="error" 
                  onClick={() => setSelectedExistingProperty(null)}
                >
                  Clear
                </Button>
              </Box>
            </Paper>
          )}

          <Box sx={{ maxHeight: 500, overflow: 'auto', pr: 1 }}>
            {properties.map((_, index) => (
              <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Controller
                        name={`properties.${index}.type`}
                        control={control}
                        render={({ field }) => (
                          <FormControl fullWidth error={!!errors.properties?.[index]?.type}>
                            <InputLabel>Property Type</InputLabel>
                            <Select
                              {...field}
                              label="Property Type"
                            >
                              {propertyTypeOptions.map((type) => (
                                <MenuItem key={type.id} value={type.id.toString()}>
                                  {type.id} - {type.type_name}
                                </MenuItem>
                              ))}
                            </Select>
                            {errors.properties?.[index]?.type && (
                              <FormHelperText>
                                {String(errors.properties[index]?.type || "Invalid type")}
                              </FormHelperText>
                            )}
                          </FormControl>
                        )}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Controller
                        name={`properties.${index}.municipioId`}
                        control={control}
                        render={({ field }) => (
                          <FormControl fullWidth error={!!errors.properties?.[index]?.municipioId}>
                            <Autocomplete
                              value={municipios.find(m => String(m.id_municipio) === field.value) || null}
                              options={municipios}
                              getOptionLabel={(option) => option.nombre}
                              loading={isMunicipiosLoading}
                              onChange={(_, newValue) => {
                                const municipioId = newValue ? String(newValue.id_municipio) : "";
                                field.onChange(municipioId);
                                handleMunicipioSelect(index, municipioId);
                              }}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="Municipality"
                                  error={!!errors.properties?.[index]?.municipioId}
                                  helperText={errors.properties?.[index]?.municipioId?.message}
                                  required
                                />
                              )}
                            />
                          </FormControl>
                        )}
                      />
                    </Grid>

                    {selectedMunicipios[index] && (
                      <>
                        <Grid item xs={12} md={6}>
                          <Controller
                            name={`properties.${index}.barrioId`}
                            control={control}
                            render={({ field }) => (
                              <FormControl fullWidth>
                                <Autocomplete
                                  freeSolo
                                  options={barrioSearchResults}
                                  getOptionLabel={(option) => 
                                    typeof option === 'string' ? option : option.nombre
                                  }
                                  loading={isSearchingBarrio}
                                  // Don't use a value from state, use the field value to get the selected option
                                  value={field.value === "new" 
                                    ? null 
                                    : barrioSearchResults.find(b => String(b.id_barrio) === field.value) || null}
                                  onChange={(_, newValue) => {
                                    if (typeof newValue === 'string') {
                                      field.onChange(newValue);
                                    } else if (newValue) {
                                      field.onChange(String(newValue.id_barrio));
                                      handleBarrioSelect(index, String(newValue.id_barrio));
                                    } else {
                                      field.onChange("");
                                    }
                                  }}
                                  onInputChange={(_, newValue) => {
                                    if (selectedMunicipios[index]) {
                                      debouncedBarrioSearch(newValue, selectedMunicipios[index]);
                                    }
                                  }}
                                  onFocus={() => {
                                    // Load all barrios for the selected municipality when field is focused
                                    if (selectedMunicipios[index] && barrioSearchResults.length === 0) {
                                      searchBarrios("", selectedMunicipios[index]);
                                    }
                                  }}
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      label="Neighborhood"
                                      placeholder="Select or search neighborhood..."
                                      error={!!errors.properties?.[index]?.barrioId}
                                      helperText={errors.properties?.[index]?.barrioId?.message || 
                                        (barrioSearchResults.length > 0 ? `${barrioSearchResults.length} neighborhoods available` : "Click to load neighborhoods")}
                                      InputProps={{
                                        ...params.InputProps,
                                        endAdornment: (
                                          <>
                                            {isSearchingBarrio && <CircularProgress size={20} />}
                                            {params.InputProps.endAdornment}
                                          </>
                                        ),
                                      }}
                                    />
                                  )}
                                  renderOption={(props, option) => (
                                    <li {...props}>
                                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                        <Typography variant="body1">
                                          <Typography component="span" fontWeight="bold">
                                            {option.nombre}
                                          </Typography>
                                        </Typography>
                                        {option.codigo_barrio && (
                                          <Typography variant="caption" color="text.secondary">
                                            Código: {option.codigo_barrio}
                                          </Typography>
                                        )}
                                      </Box>
                                    </li>
                                  )}
                                />
                                <Button
                                  size="small"
                                  onClick={() => {
                                    setValue(`properties.${index}.barrioId`, "new");
                                    handleBarrioSelect(index, "new", true);
                                  }}
                                  sx={{ mt: 1 }}
                                >
                                  + Add New Neighborhood
                                </Button>
                              </FormControl>
                            )}
                          />
                        </Grid>
                        
                        {/* New Barrio Name Fields - shown when "new" is selected */}
                        {getValues(`properties.${index}.barrioId`) === "new" && (
                          <>
                            <Grid item xs={12} md={6}>
                              <Controller
                                name={`properties.${index}.newBarrioName`}
                                control={control}
                                defaultValue=""
                                render={({ field }) => (
                                  <TextField
                                    {...field}
                                    label="New Neighborhood Name"
                                    variant="outlined"
                                    fullWidth
                                    required
                                  />
                                )}
                              />
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Controller
                                name={`properties.${index}.newBarrioCode`}
                                control={control}
                                defaultValue=""
                                render={({ field }) => (
                                  <TextField
                                    {...field}
                                    label="New Neighborhood Code (Optional)"
                                    variant="outlined"
                                    fullWidth
                                  />
                                )}
                              />
                            </Grid>
                          </>
                        )}
                        
                        {/* Sector Selection with Add New Option */}
                        {(selectedBarrios[index] || getValues(`properties.${index}.barrioId`) === "new") && (
                          <Grid item xs={12} md={6}>
                            <Controller
                              name={`properties.${index}.sectorId`}
                              control={control}
                              render={({ field }) => (
                                <FormControl fullWidth>
                                  <Autocomplete
                                    freeSolo
                                    options={sectorSearchResults}
                                    getOptionLabel={(option) => 
                                      typeof option === 'string' ? option : option.nombre
                                    }
                                    loading={isSearchingSector}
                                    // Don't use a value from state, use the field value to get the selected option
                                    value={field.value === "new" 
                                      ? null 
                                      : sectorSearchResults.find(s => String(s.id_sector) === field.value) || null}
                                    onChange={(_, newValue) => {
                                      if (typeof newValue === 'string') {
                                        field.onChange(newValue);
                                      } else if (newValue) {
                                        field.onChange(String(newValue.id_sector));
                                      } else {
                                        field.onChange("");
                                      }
                                    }}
                                    onInputChange={(_, newValue) => {
                                      if (selectedBarrios[index]) {
                                        debouncedSectorSearch(newValue, selectedBarrios[index]);
                                      }
                                    }}
                                    onFocus={() => {
                                      // Load all sectors for the selected barrio when field is focused
                                      if (selectedBarrios[index] && sectorSearchResults.length === 0) {
                                        searchSectores("", selectedBarrios[index]);
                                      }
                                    }}
                                    renderInput={(params) => (
                                      <TextField
                                        {...params}
                                        label="Sector"
                                        placeholder="Select or search sector..."
                                        error={!!errors.properties?.[index]?.sectorId}
                                        helperText={errors.properties?.[index]?.sectorId?.message || 
                                          (sectorSearchResults.length > 0 ? `${sectorSearchResults.length} sectors available` : "Click to load sectors")}
                                        InputProps={{
                                          ...params.InputProps,
                                          endAdornment: (
                                            <>
                                              {isSearchingSector && <CircularProgress size={20} />}
                                              {params.InputProps.endAdornment}
                                            </>
                                          ),
                                        }}
                                      />
                                    )}
                                    renderOption={(props, option) => (
                                      <li {...props}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                          <Typography variant="body1">
                                            <Typography component="span" fontWeight="bold">
                                              {option.nombre}
                                            </Typography>
                                          </Typography>
                                          {option.codigo_sector && (
                                            <Typography variant="caption" color="text.secondary">
                                              Código: {option.codigo_sector}
                                            </Typography>
                                          )}
                                        </Box>
                                      </li>
                                    )}
                                  />
                                  <Button
                                    size="small"
                                    onClick={() => {
                                      setValue(`properties.${index}.sectorId`, "new");
                                    }}
                                    sx={{ mt: 1 }}
                                  >
                                    + Add New Sector
                                  </Button>
                                </FormControl>
                              )}
                            />
                          </Grid>
                        )}
                        
                        {/* New Sector Name Fields - shown when "new" is selected */}
                        {getValues(`properties.${index}.sectorId`) === "new" && (
                          <>
                            <Grid item xs={12} md={6}>
                              <Controller
                                name={`properties.${index}.newSectorName`}
                                control={control}
                                defaultValue=""
                                render={({ field }) => (
                                  <TextField
                                    {...field}
                                    label="New Sector Name"
                                    variant="outlined"
                                    fullWidth
                                    required
                                  />
                                )}
                              />
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Controller
                                name={`properties.${index}.newSectorCode`}
                                control={control}
                                defaultValue=""
                                render={({ field }) => (
                                  <TextField
                                    {...field}
                                    label="New Sector Code (Optional)"
                                    variant="outlined"
                                    fullWidth
                                  />
                                )}
                              />
                            </Grid>
                          </>
                        )}
                        
                        <Grid item xs={12} md={6}>
                          <Controller
                            name={`properties.${index}.address`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                label="Address"
                                variant="outlined"
                                fullWidth
                                error={!!errors.properties?.[index]?.address}
                                helperText={errors.properties?.[index]?.address?.message}
                              />
                            )}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Controller
                            name={`properties.${index}.propertyNumber`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                label="Property Number"
                                variant="outlined"
                                fullWidth
                                placeholder="e.g., PROP-001, 12345"
                                error={!!errors.properties?.[index]?.propertyNumber}
                                helperText={errors.properties?.[index]?.propertyNumber?.message || "Optional property identifier"}
                              />
                            )}
                          />
                        </Grid>
                      </>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Paper>
      )}

      {/* Residents Section - Now in its own Paper component */}
      {(formMode === "Full Report" || formMode === "Resident Only") && (
        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Residents</Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => {
                const currentProperties = getValues("properties");
                const propertyIndex = 0; // Default to first property
                const currentHabitantes = currentProperties[propertyIndex].habitantes || [];
                setValue(`properties.${propertyIndex}.habitantes`, [
                  ...currentHabitantes,
                  {
                    name: "",
                    apellido1: "",
                    apellido2: "",
                    sex: "M",
                    categoria: "Adult",
                    rol: "Resident",
                    age: "",
                    limitations: [],
                    conditions: [],
                    dispositions: [],
                    contacto: "",
                    familyId: "",
                    newFamilyApellido1: "",
                    newFamilyApellido2: "",
                    newFamilyDescription: "",
                  }
                ]);
              }}
              size="small"
            >
              Add Resident
            </Button>
          </Box>
          
          {properties.map((_, propertyIndex) => (
            <Box key={propertyIndex} sx={{ mt: 1 }}>
              <Controller
                name={`properties.${propertyIndex}.habitantes`}
                control={control}
                defaultValue={[]}
                render={({ field }) => (
                  <Box>
                    {field.value?.map((habitante, habitanteIndex) => (
                      <Card key={habitanteIndex} variant="outlined" sx={{ mb: 2, p: 2 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={3}>
                            <TextField
                              label="First Name"
                              variant="outlined"
                              fullWidth
                              value={habitante.name || ""}
                              onChange={(e) => {
                                const newHabitantes = [...field.value];
                                newHabitantes[habitanteIndex].name = e.target.value;
                                field.onChange(newHabitantes);
                              }}
                              error={!!errors.properties?.[propertyIndex]?.habitantes?.[habitanteIndex]?.name}
                              helperText={errors.properties?.[propertyIndex]?.habitantes?.[habitanteIndex]?.name?.message}
                              required
                            />
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <TextField
                              label="Last Name 1"
                              variant="outlined"
                              fullWidth
                              value={habitante.apellido1 || ""}
                              onChange={(e) => {
                                const newHabitantes = [...field.value];
                                newHabitantes[habitanteIndex].apellido1 = e.target.value;
                                field.onChange(newHabitantes);
                              }}
                              required
                            />
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <TextField
                              label="Last Name 2"
                              variant="outlined"
                              fullWidth
                              value={habitante.apellido2 || ""}
                              onChange={(e) => {
                                const newHabitantes = [...field.value];
                                newHabitantes[habitanteIndex].apellido2 = e.target.value;
                                field.onChange(newHabitantes);
                              }}
                            />
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <FormControl fullWidth>
                              <InputLabel>Sex</InputLabel>
                              <Select
                                value={habitante.sex}
                                onChange={(e) => {
                                  const newHabitantes = [...field.value];
                                  const value = e.target.value;
                                  if (sexOptions.includes(value as any)) {
                                    newHabitantes[habitanteIndex].sex = value as (typeof sexOptions)[number];
                                    field.onChange(newHabitantes);
                                  }
                                }}
                                label="Sex"
                              >
                                {sexOptions.map((sex) => (
                                  <MenuItem key={sex} value={sex}>
                                    {sex === "M" ? "Male" : sex === "F" ? "Female" : sex}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <FormControl fullWidth>
                              <InputLabel>Category</InputLabel>
                              <Select
                                value={habitante.categoria}
                                onChange={(e) => {
                                  const newHabitantes = [...field.value];
                                  const value = e.target.value;
                                  if (habitanteCategories.includes(value as any)) {
                                    newHabitantes[habitanteIndex].categoria = value as (typeof habitanteCategories)[number];
                                    field.onChange(newHabitantes);
                                  }
                                }}
                                label="Category"
                              >
                                {habitanteCategories.map((cat) => (
                                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <FormControl fullWidth>
                              <InputLabel>Role</InputLabel>
                              <Select
                                value={habitante.rol}
                                onChange={(e) => {
                                  const newHabitantes = [...field.value];
                                  const value = e.target.value;
                                  if (habitanteRoles.includes(value as any)) {
                                    newHabitantes[habitanteIndex].rol = value as (typeof habitanteRoles)[number];
                                    field.onChange(newHabitantes);
                                  }
                                }}
                                label="Role"
                              >
                                {habitanteRoles.map((rol) => (
                                  <MenuItem key={rol} value={rol}>{rol}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <TextField
                              label="Age"
                              variant="outlined"
                              fullWidth
                              type="number"
                              InputProps={{ inputProps: { min: 0 } }}
                              value={habitante.age || ""}
                              onChange={(e) => {
                                const newHabitantes = [...field.value];
                                newHabitantes[habitanteIndex].age = e.target.value;
                                field.onChange(newHabitantes);
                              }}
                              error={!!errors.properties?.[propertyIndex]?.habitantes?.[habitanteIndex]?.age}
                              helperText={errors.properties?.[propertyIndex]?.habitantes?.[habitanteIndex]?.age?.message}
                            />
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <FormControl fullWidth disabled={isResidentOptionsLoading}>
                              <InputLabel>Limitation</InputLabel>
                              <Select
                                multiple
                                value={habitante.limitations?.map(limitation => limitation.id) || []}
                                label="Limitation"
                                onChange={e => {
                                  const selectedIds = Array.isArray(e.target.value) ? e.target.value : [e.target.value];
                                  const newHabitantes = [...field.value];
                                  newHabitantes[habitanteIndex].limitations = selectedIds.map(id => ({ id, observacion: "" }));
                                  field.onChange(newHabitantes);
                                }}
                                renderValue={selected => {
                                  if (selected.length === 0) return 'None';
                                  return selected.map(id => {
                                    const option = limitationOptions.find(opt => opt.id.toString() === id);
                                    return option ? `${option.id} - ${option.nombre}` : id;
                                  }).join(', ');
                                }}
                              >
                                {limitationOptions.map(option => (
                                  <MenuItem key={option.id} value={option.id.toString()}>
                                    {option.id} - {option.nombre}
                                  </MenuItem>
                                ))}
                              </Select>
                              {isResidentOptionsLoading && <FormHelperText>Loading...</FormHelperText>}
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <FormControl fullWidth disabled={isResidentOptionsLoading}>
                              <InputLabel>Condition</InputLabel>
                              <Select
                                multiple
                                value={habitante.conditions?.map(condition => condition.id) || []}
                                label="Condition"
                                onChange={e => {
                                  const selectedIds = Array.isArray(e.target.value) ? e.target.value : [e.target.value];
                                  const newHabitantes = [...field.value];
                                  newHabitantes[habitanteIndex].conditions = selectedIds.map(id => ({ id, observacion: "" }));
                                  field.onChange(newHabitantes);
                                }}
                                renderValue={selected => {
                                  if (selected.length === 0) return 'None';
                                  return selected.map(id => {
                                    const option = conditionOptions.find(opt => opt.id.toString() === id);
                                    return option ? `${option.id} - ${option.nombre}` : id;
                                  }).join(', ');
                                }}
                              >
                                {conditionOptions.map(option => (
                                  <MenuItem key={option.id} value={option.id.toString()}>
                                    {option.id} - {option.nombre}
                                  </MenuItem>
                                ))}
                              </Select>
                              {isResidentOptionsLoading && <FormHelperText>Loading...</FormHelperText>}
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <FormControl fullWidth disabled={isResidentOptionsLoading}>
                              <InputLabel>Disposition</InputLabel>
                              <Select
                                multiple
                                value={habitante.dispositions?.map(disposition => disposition.id) || []}
                                label="Disposition"
                                onChange={e => {
                                  const selectedIds = Array.isArray(e.target.value) ? e.target.value : [e.target.value];
                                  const newHabitantes = [...field.value];
                                  newHabitantes[habitanteIndex].dispositions = selectedIds.map(id => ({ id, observacion: "" }));
                                  field.onChange(newHabitantes);
                                }}
                                renderValue={selected => {
                                  if (selected.length === 0) return 'None';
                                  return selected.map(id => {
                                    const option = dispositionOptions.find(opt => opt.id.toString() === id);
                                    return option ? `${option.id} - ${option.nombre}` : id;
                                  }).join(', ');
                                }}
                              >
                                {dispositionOptions.map(option => (
                                  <MenuItem key={option.id} value={option.id.toString()}>
                                    {option.id} - {option.nombre}
                                  </MenuItem>
                                ))}
                              </Select>
                              {isResidentOptionsLoading && <FormHelperText>Loading...</FormHelperText>}
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <TextField
                              fullWidth
                              label="Contact"
                              value={habitante.contacto || ""}
                              onChange={(e) => {
                                // Format phone number as (xxx)xxx-xxxx
                                let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                                if (value.length > 0) {
                                  // Format the phone number
                                  if (value.length <= 3) {
                                    value = `(${value}`;
                                  } else if (value.length <= 6) {
                                    value = `(${value.slice(0, 3)})${value.slice(3)}`;
                                  } else {
                                    value = `(${value.slice(0, 3)})${value.slice(3, 6)}-${value.slice(6, 10)}`;
                                  }
                                }
                                
                                const newHabitantes = [...field.value];
                                newHabitantes[habitanteIndex].contacto = value;
                                field.onChange(newHabitantes);
                              }}
                              placeholder="(123)456-7890"
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <Phone sx={{ color: 'text.secondary', fontSize: 20 }} />
                                  </InputAdornment>
                                ),
                              }}
                            />
                          </Grid>
                            
                          <Grid item xs={12}>
                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                              Family Information
                            </Typography>
                            <Typography variant="caption" gutterBottom sx={{ display: 'block', mb: 1 }}>
                              Select an existing family or create a new one. The family shares the same last names.
                            </Typography>
                            <FormControl fullWidth error={!habitante.familyId}>
                              <Autocomplete
                                freeSolo
                                options={familySearchResults}
                                getOptionLabel={(option) =>
                                  typeof option === 'string' ? option : 
                                  `${option.apellidos || ''}`
                                }
                                loading={isSearchingFamily}
                                value={habitante.familyId === "new" ? 
                                  { id: -1, apellidos: `${habitante.newFamilyApellido1 || ""} ${habitante.newFamilyApellido2 || ""}`.trim(), description: "" } :
                                  familySearchResults.find(f => String(f.id) === habitante.familyId) || null
                                }
                                onChange={(_, newValue) => {
                                  const newHabitantes = [...field.value];
                                  if (typeof newValue === 'string') {
                                    // Handle string input (not an option from the list)
                                    newHabitantes[habitanteIndex].familyId = "new";
                                    // Try to parse the input string for last names
                                    const parts = newValue.trim().split(/\s+/);
                                    if (parts.length > 0) {
                                      newHabitantes[habitanteIndex].newFamilyApellido1 = parts[0] || "";
                                      newHabitantes[habitanteIndex].newFamilyApellido2 = parts.slice(1).join(' ') || "";
                                      // Also set the resident's last names to match if they're empty
                                      if (!newHabitantes[habitanteIndex].apellido1) {
                                        newHabitantes[habitanteIndex].apellido1 = parts[0] || "";
                                      }
                                      if (!newHabitantes[habitanteIndex].apellido2) {
                                        newHabitantes[habitanteIndex].apellido2 = parts.slice(1).join(' ') || "";
                                      }
                                    }
                                  } else if (newValue && 'id' in newValue) {
                                    // Selected an existing family
                                    newHabitantes[habitanteIndex].familyId = String(newValue.id);
                                    // Clear new family fields
                                    newHabitantes[habitanteIndex].newFamilyApellido1 = "";
                                    newHabitantes[habitanteIndex].newFamilyApellido2 = "";
                                    newHabitantes[habitanteIndex].newFamilyDescription = "";
                                    // Optionally update the resident's last names to match the family
                                    if (newValue.apellidos) {
                                      const parts = newValue.apellidos.trim().split(/\s+/);
                                      if (!newHabitantes[habitanteIndex].apellido1 && parts.length > 0) {
                                        newHabitantes[habitanteIndex].apellido1 = parts[0] || "";
                                      }
                                      if (!newHabitantes[habitanteIndex].apellido2 && parts.length > 1) {
                                        newHabitantes[habitanteIndex].apellido2 = parts.slice(1).join(' ') || "";
                                      }
                                    }
                                  } else {
                                    // Cleared the selection
                                    newHabitantes[habitanteIndex].familyId = "";
                                  }
                                  field.onChange(newHabitantes);
                                }}
                                onInputChange={(_, newValue) => {
                                  debouncedFamilySearch(newValue);
                                }}
                                onFocus={() => {
                                  // Load all families on focus if we don't have any loaded
                                  if (familySearchResults.length === 0) {
                                    searchFamilies('');
                                  }
                                }}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    label="Family Last Names"
                                    placeholder="Search or create a new family"
                                    required
                                    error={!habitante.familyId}
                                    helperText={!habitante.familyId ? "Family is required" : (
                                      habitante.familyId && habitante.familyId !== "new" ? 
                                      `Selected family ID: ${habitante.familyId}` : ""
                                    )}
                                    InputProps={{
                                      ...params.InputProps,
                                      endAdornment: (
                                        <>
                                          {isSearchingFamily && <CircularProgress size={20} />}
                                          {params.InputProps.endAdornment}
                                        </>
                                      ),
                                    }}
                                  />
                                )}
                                renderOption={(props, option) => (
                                  <li {...props}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                      <Typography variant="body1">
                                        <Typography component="span" fontWeight="bold">
                                          {option.apellidos}
                                        </Typography>
                                        <Typography component="span" variant="caption" color="primary" sx={{ ml: 1 }}>
                                          ID: {option.id}
                                        </Typography>
                                      </Typography>
                                      {option.description && (
                                        <Typography variant="caption" color="text.secondary">
                                          {option.description}
                                        </Typography>
                                      )}
                                    </Box>
                                  </li>
                                )}
                              />
                              <Button
                                size="small"
                                onClick={() => {
                                  const newHabitantes = [...field.value];
                                  // Set the new family with the resident's last names
                                  newHabitantes[habitanteIndex].familyId = "new";
                                  if (newHabitantes[habitanteIndex].apellido1) {
                                    newHabitantes[habitanteIndex].newFamilyApellido1 = newHabitantes[habitanteIndex].apellido1;
                                    newHabitantes[habitanteIndex].newFamilyApellido2 = newHabitantes[habitanteIndex].apellido2 || "";
                                  }
                                  field.onChange(newHabitantes);
                                }}
                                sx={{ mt: 1 }}
                                disabled={Boolean(habitante.familyId && habitante.familyId !== "new" && habitante.familyId !== "")}
                                startIcon={<AddIcon />}
                              >
                                Create New Family Using Last Names
                              </Button>
                            </FormControl>
                          </Grid>

                          {/* New Family fields - shown when "new" is selected */}
                          {habitante.familyId === "new" && (
                            <Grid item xs={12}>
                              <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'rgba(0, 0, 0, 0.02)' }}>
                                <Typography variant="subtitle2" gutterBottom sx={{ color: 'primary.main' }}>
                                  Create New Family
                                </Typography>
                                <Grid container spacing={2}>
                                  <Grid item xs={12} md={6}>
                                    <TextField
                                      fullWidth
                                      label="Family Last Name 1"
                                      required
                                      value={habitante.newFamilyApellido1 || ""}
                                      onChange={(e) => {
                                        const newHabitantes = [...field.value];
                                        newHabitantes[habitanteIndex].newFamilyApellido1 = e.target.value;
                                        field.onChange(newHabitantes);
                                      }}
                                      error={!habitante.newFamilyApellido1}
                                      helperText={!habitante.newFamilyApellido1 ? "Last name 1 required" : ""}
                                      InputProps={{
                                        endAdornment: (
                                          <Button 
                                            size="small"
                                            onClick={() => {
                                              const newHabitantes = [...field.value];
                                              if (habitante.apellido1) {
                                                newHabitantes[habitanteIndex].newFamilyApellido1 = habitante.apellido1;
                                                field.onChange(newHabitantes);
                                              }
                                            }}
                                            disabled={!habitante.apellido1}
                                            sx={{ minWidth: 'auto', p: 0.5 }}
                                          >
                                            Use Resident's
                                          </Button>
                                        )
                                      }}
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <TextField
                                      fullWidth
                                      label="Family Last Name 2"
                                      value={habitante.newFamilyApellido2 || ""}
                                      onChange={(e) => {
                                        const newHabitantes = [...field.value];
                                        newHabitantes[habitanteIndex].newFamilyApellido2 = e.target.value;
                                        field.onChange(newHabitantes);
                                      }}
                                      InputProps={{
                                        endAdornment: (
                                          <Button 
                                            size="small"
                                            onClick={() => {
                                              const newHabitantes = [...field.value];
                                              if (habitante.apellido2) {
                                                newHabitantes[habitanteIndex].newFamilyApellido2 = habitante.apellido2;
                                                field.onChange(newHabitantes);
                                              }
                                            }}
                                            disabled={!habitante.apellido2}
                                            sx={{ minWidth: 'auto', p: 0.5 }}
                                          >
                                            Use Resident's
                                          </Button>
                                        )
                                      }}
                                    />
                                  </Grid>
                                  <Grid item xs={12}>
                                    <TextField
                                      fullWidth
                                      label="Family Description"
                                      value={habitante.newFamilyDescription || ""}
                                      onChange={(e) => {
                                        const newHabitantes = [...field.value];
                                        newHabitantes[habitanteIndex].newFamilyDescription = e.target.value;
                                        field.onChange(newHabitantes);
                                      }}
                                      placeholder="Example: Family of 4 members"
                                    />
                                  </Grid>
                                </Grid>
                              </Paper>
                            </Grid>
                          )}
                          
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              label="Limitation"
                              value={habitante.limitations?.map(limitation => limitation.observacion).join(', ') || ""}
                              onChange={(e) => {
                                const newHabitantes = [...field.value];
                                newHabitantes[habitanteIndex].limitations = e.target.value.split(',').map(observacion => ({ id: "", observacion }));
                                field.onChange(newHabitantes);
                              }}
                              placeholder="Physical limitations, if any"
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              label="Condition"
                              value={habitante.conditions?.map(condition => condition.observacion).join(', ') || ""}
                              onChange={(e) => {
                                const newHabitantes = [...field.value];
                                newHabitantes[habitanteIndex].conditions = e.target.value.split(',').map(observacion => ({ id: "", observacion }));
                                field.onChange(newHabitantes);
                              }}
                              placeholder="Health conditions, if any"
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              label="Disposition"
                              value={habitante.dispositions?.map(disposition => disposition.observacion).join(', ') || ""}
                              onChange={(e) => {
                                const newHabitantes = [...field.value];
                                newHabitantes[habitanteIndex].dispositions = e.target.value.split(',').map(observacion => ({ id: "", observacion }));
                                field.onChange(newHabitantes);
                              }}
                              placeholder="Current disposition/status"
                            />
                          </Grid>
                          {habitanteIndex > 0 && (
                            <Grid item xs={12} display="flex" justifyContent="flex-end">
                              <Button 
                                variant="outlined" 
                                color="error"
                                size="small"
                                onClick={() => {
                                  const newHabitantes = field.value.filter((_, idx) => idx !== habitanteIndex);
                                  field.onChange(newHabitantes);
                                }}
                              >
                                Remove Resident
                              </Button>
                            </Grid>
                          )}
                        </Grid>
                      </Card>
                    ))}
                  </Box>
                )}
              />
            </Box>
          ))}
        </Paper>
      )}

      {/* Add USNG field for Property Only mode */}
      {formMode === "Property Only" && (
        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Location Information</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Controller
                name="usngCode"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    freeSolo
                    options={usngSuggestions}
                    getOptionLabel={(option) => 
                      typeof option === 'string' ? option : option.usng
                    }
                    loading={isLoadingUsngSuggestions}
                    onInputChange={(_, newValue) => {
                      setValue("usngCode", newValue)
                      searchUsngCodes(newValue)
                    }}
                    onChange={(_, newValue) => {
                      const value = typeof newValue === 'string' 
                        ? newValue 
                        : newValue?.usng || ''
                      setValue("usngCode", value)
                      validateUsngCode(value)
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        {...field} 
                        label="USNG Coordinates"
                        variant="outlined"
                        fullWidth
                        error={!!errors.usngCode}
                        helperText={
                          errors.usngCode?.message || 
                          (usngValidationResult && (
                            <Typography 
                              component="span" 
                              color={usngValidationResult.valid ? "success.main" : "error"}
                            >
                              {usngValidationResult.message}
                            </Typography>
                          ))
                        }
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {isValidatingUsng || isLoadingUsngSuggestions ? (
                                <CircularProgress color="inherit" size={20} />
                              ) : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                        onChange={handleUsngInputChange}
                        onBlur={() => {
                          if (field.value) {
                            validateUsngCode(field.value)
                          }
                        }}
                      />
                    )}
                  />
                )}
              />
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Submit Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        {/* Debug buttons - only shown in development */}
        {/* Removing debug buttons */}
        
        <Button
          variant="contained"
          color="primary"
          size="large"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
          onClick={async () => {
            console.log("Submit button clicked, form mode:", formMode);
            
            // Add special handling for Resident Only mode
            if (formMode === "Resident Only") {
              try {
                setIsSubmitting(true);
                
                // Get form values
                const values = getValues();
                const property = values.properties[0];
                
                // Validate property data
                if (!property.municipioId || !property.address) {
                  window.alert("Please provide municipality and address for the property");
                  setIsSubmitting(false);
                  return;
                }
                
                // Validate residents data
                if (!property.habitantes || property.habitantes.length === 0) {
                  window.alert("Please add at least one resident");
                  setIsSubmitting(false);
                  return;
                }
                
                // Validate all residents have family
                const invalidResidents = property.habitantes.filter(h => !h.familyId);
                if (invalidResidents.length > 0) {
                  window.alert("All residents must have a family assigned");
                  setIsSubmitting(false);
                  return;
                }
                
                // Format the habitantes data consistently for both cases
                const formattedHabitantes = property.habitantes.map(habitante => ({
                  name: habitante.name,
                  apellido1: habitante.apellido1,
                  apellido2: habitante.apellido2 || "",
                  sex: habitante.sex,
                  categoria: habitante.categoria,
                  rol: habitante.rol,
                  age: parseInt(habitante.age),
                  limitations: habitante.limitations,
                  conditions: habitante.conditions,
                  dispositions: habitante.dispositions,
                  contacto: habitante.contacto,
                  family_id: habitante.familyId === "new" ? null : parseInt(habitante.familyId),
                  newFamily: habitante.familyId === "new"
                    ? {
                        apellidos: habitante.newFamilyApellido1
                          ? `${habitante.newFamilyApellido1} ${habitante.newFamilyApellido2 || ""}`
                          : `${habitante.apellido1} ${habitante.apellido2 || ""}`,
                        description: habitante.newFamilyDescription || `Family of ${habitante.name} ${habitante.apellido1}`
                      }
                    : null
                }));
                
                // Prepare submission data based on whether we're adding to existing property or creating new
                let submissionData;
                
                if (selectedExistingProperty) {
                  // Adding residents to existing property
                  console.log("Adding residents to existing property:", selectedExistingProperty.id);
                  
                  submissionData = {
                    propertyId: selectedExistingProperty.id,
                    habitantes: formattedHabitantes
                  };
                } else {
                  // Creating a new property with residents - two-step process
                  console.log("Creating new property with residents (two-step process)");
                  
                  try {
                    // STEP 1: Create the property using our direct property endpoint
                    const propertyData = {
                      tipo: property.type,
                      id_municipio: parseInt(property.municipioId),
                      direccion: property.address
                    } as any; // Use type assertion to avoid TypeScript errors
                    
                    // Add barrio data if needed
                    if (property.barrioId && property.barrioId !== "new") {
                      propertyData.id_barrio = parseInt(property.barrioId);
                    } else if (property.barrioId === "new" && property.newBarrioName) {
                      propertyData.newBarrio = {
                        nombre: property.newBarrioName,
                        codigo_barrio: property.newBarrioCode || null,
                        id_municipio: parseInt(property.municipioId)
                      };
                    }
                    
                    // Add sector data if needed
                    if (property.sectorId && property.sectorId !== "new") {
                      propertyData.id_sector = parseInt(property.sectorId);
                    } else if (property.sectorId === "new" && property.newSectorName) {
                      const parentBarrioId = property.barrioId === "new" 
                        ? null 
                        : (property.barrioId ? parseInt(property.barrioId) : null);
                      
                      propertyData.newSector = {
                        nombre: property.newSectorName,
                        codigo_sector: property.newSectorCode || null,
                        id_barrio: parentBarrioId
                      };
                    }
                    
                    console.log("STEP 1: Creating property:", propertyData);
                    
                    // Call the property API
                    const propertyResponse = await fetch('/api/properties', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(propertyData),
                    });
                    
                    if (!propertyResponse.ok) {
                      let errorData;
                      try {
                        errorData = await propertyResponse.json();
                      } catch (e) {
                        errorData = { message: `Server responded with ${propertyResponse.status}` };
                      }
                      throw new Error(errorData.message || `Failed to create property: ${propertyResponse.status}`);
                    }
                    
                    // Get the created property data
                    const createdPropertyData = await propertyResponse.json();
                    console.log("Property created successfully:", createdPropertyData);
                    
                    // Extract the property ID from the response
                    const newPropertyId = createdPropertyData.id;
                    
                    if (!newPropertyId) {
                      throw new Error("Property was created but no property ID was returned");
                    }
                    
                    // STEP 2: Add residents to the newly created property
                    console.log("STEP 2: Adding residents to property ID:", newPropertyId);
                    
                    const residentPayload = {
                      propertyId: newPropertyId,
                      habitantes: formattedHabitantes
                    };
                    
                    // Submit residents
                    const residentsResponse = await fetch('/api/residents', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(residentPayload),
                    });
                    
                    if (!residentsResponse.ok) {
                      let errorData;
                      try {
                        errorData = await residentsResponse.json();
                      } catch (e) {
                        errorData = { message: `Server responded with ${residentsResponse.status}` };
                      }
                      throw new Error(errorData.message || `Failed to add residents: ${residentsResponse.status}`);
                    }
                    
                    const responseData = await residentsResponse.json();
                    console.log("Residents added successfully:", responseData);
                    window.alert("Property and residents created successfully!");
                    
                    // Reset the form (this is already handled in the outer try/catch)
                    return;
                    
                  } catch (error) {
                    console.error("Error in two-step process:", error);
                    throw error; // Re-throw to be caught by outer try/catch
                  }
                }
                
                console.log("Submitting Resident Only data:", submissionData);
                
                // Submit to the API (this only runs for existing properties)
                const response = await fetch('/api/residents', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(submissionData),
                });
                
                if (!response.ok) {
                  let errorData;
                  try {
                    errorData = await response.json();
                    console.error("Error response data:", errorData);
                  } catch (e) {
                    console.error("Failed to parse error response:", e);
                    errorData = { message: `Server responded with ${response.status}` };
                  }
                  throw new Error(errorData.message || `Server responded with ${response.status}`);
                }
                
                const responseData = await response.json();
                console.log("Resident submission successful:", responseData);
                window.alert("Residents submitted successfully!");
                
                // Reset the form
                reset({
                  notificationNumber: generateNotificationNumber(),
                  eventDescription: "",
                  date: new Date().toISOString().split('T')[0],
                  usngCode: "",
                  tipo: incidentTypes[0],
                  estado: "pending" as const,
                  incidents: [{ type: incidentTypes[0], description: "", cuencaId: "" }],
                  properties: [{ 
                    type: propertyTypes[0],
                    municipioId: "", 
                    address: "",
                    propertyNumber: "",
                    habitantes: [],
                  }],
                  cuencaIds: [] as string[],
                });
                
                // Reset state
                setSelectedExistingProperty(null);
                setSelectedMunicipios({});
                setSelectedBarrios({});
                setBarrioSearchResults([]);
                setSectorSearchResults([]);
                setFamilySearchResults([]);
                
              } catch (error) {
                console.error("Error submitting residents:", error);
                window.alert(`Failed to submit residents: ${error instanceof Error ? error.message : 'Unknown error'}`);
              } finally {
                setIsSubmitting(false);
              }
              
              return;
            }
            
            // For Property Only mode, explicitly validate USNG before form submission
            if (formMode === "Property Only") {
              const currentUsngCode = getValues("usngCode");
              
              if (!currentUsngCode) {
                window.alert('Please enter a USNG code');
                return;
              }
              
              const isValid = await validateUsngCode(currentUsngCode);
              
              if (!isValid) {
                window.alert('Please enter a valid USNG code');
                return;
              }
              
              // Get USNG ID for Property Only mode
              let usngId = null;
              try {
                const usngResponse = await fetch(`/api/usng/getById?code=${encodeURIComponent(currentUsngCode)}`);
                if (usngResponse.ok) {
                  const usngData = await usngResponse.json();
                  usngId = usngData.id;
                } else {
                  window.alert('Could not find USNG ID. Please enter a valid USNG code.');
                  return;
                }
              } catch (error) {
                window.alert('Error retrieving USNG ID. Please try again.');
                return;
              }
              
              // Format data for Property Only submission
              try {
                // Get form values
                const values = getValues();
                const property = values.properties[0];
                
                // Create payload
                const formattedData: any = {
                  tipo: property.type,
                  id_municipio: parseInt(property.municipioId),
                  direccion: property.address,
                  property_number: property.propertyNumber || null,
                  usngId: usngId,
                  gridId: usngId,
                  habitantes: { create: [] }
                };
                
                // Add barrio data if present
                if (property.barrioId && property.barrioId !== "new") {
                  formattedData.id_barrio = parseInt(property.barrioId as string);
                } else if (property.barrioId === "new" && property.newBarrioName) {
                  formattedData.newBarrio = {
                    nombre: property.newBarrioName,
                    codigo_barrio: property.newBarrioCode || null,
                    id_municipio: parseInt(property.municipioId)
                  };
                }
                
                // Add sector data if present
                if (property.sectorId && property.sectorId !== "new") {
                  formattedData.id_sector = parseInt(property.sectorId);
                } else if (property.sectorId === "new" && property.newSectorName) {
                  const parentBarrioId = property.barrioId === "new" 
                    ? null 
                    : (property.barrioId ? parseInt(property.barrioId as string) : null);
                  
                  formattedData.newSector = {
                    nombre: property.newSectorName,
                    codigo_sector: property.newSectorCode || null,
                    id_barrio: parentBarrioId
                  };
                }
                
                // Set isSubmitting
                setIsSubmitting(true);
                
                // For creating a new property, we need to structure the data correctly
                // Create a more structured payload matching the expected format
                const propertyPayload = {
                  // Use the expected structure for property registration via the eventos endpoint
                  propiedades_afectadas: [{
                    daños: "No damage", // Default for Property Only mode
                    propiedad: {
                      create: formattedData
                    }
                  }],
                  // Add minimal event data since we're using the eventos endpoint
                  evento: {
                    create: {
                      titulo: "Property Registration",
                      descripcion: "Property Registration",
                      tipo: "Flood", // Default type
                      estado: "pending",
                      fecha: new Date().toISOString(),
                      usngId: usngId
                    }
                  }
                };
                
                console.log("Submitting property with payload:", propertyPayload);
                
                // Submit directly to property endpoint - try the eventos endpoint since properties is not found
                const response = await fetch('/api/eventos', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(propertyPayload),
                });
                
                if (!response.ok) {
                  const errorText = await response.text();
                  throw new Error(errorText || `Server responded with ${response.status}`);
                }
                
                window.alert(`Property submitted successfully!`);
                
                // Reset form
                reset({
                  notificationNumber: generateNotificationNumber(),
                  eventDescription: "",
                  date: new Date().toISOString().split('T')[0],
                  usngCode: "",
                  tipo: incidentTypes[0],
                  estado: "pending" as const,
                  incidents: [{ type: incidentTypes[0], description: "", cuencaId: "" }],
                  properties: [{ 
                    type: propertyTypes[0],
                    municipioId: "", 
                    address: "",
                    propertyNumber: "",
                    habitantes: [],
                  }],
                  cuencaIds: [] as string[],
                });
                
                // Reset state
                setSelectedMunicipios({});
                setSelectedBarrios({});
                setBarrioSearchResults([]);
                setSectorSearchResults([]);
                
              } catch (error) {
                window.alert(`Failed to submit property: ${error instanceof Error ? error.message : 'Unknown error'}`);
              } finally {
                setIsSubmitting(false);
              }
              
              return;
            }
            
            // For other modes, use the normal submission
            try {
              await handleSubmit(onSubmit)();
            } catch (error) {
              console.error("Error in form submission:", error);
              window.alert(`Submission error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            return undefined;
          }}
          >
          {isSubmitting ? 'Submitting...' : `Submit ${formMode}`}
        </Button>
      </Box>
    </Box>
  );
}

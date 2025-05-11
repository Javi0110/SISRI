"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import * as z from "zod"
import { debounce } from "lodash"

// Material UI imports
import {
  Add as AddIcon
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

// Update form schema
const formSchema = z.object({
  notificationNumber: z.string(),
  eventName: z.string().min(2, "Event name must be at least 2 characters"),
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
    value: z.string().optional(),
    location: z.object({
      lat: z.number().optional(),
      lng: z.number().optional(),
    }).optional(),
    habitantes: z.array(z.object({
      name: z.string(),
      categoria: z.enum(habitanteCategories),
      rol: z.enum(habitanteRoles),
      age: z.string(),
      limitation: z.string().optional(),
      condition: z.string().optional(),
      disposition: z.string().optional(),
      familyId: z.string().min(1, "Family is required"),
      newFamilyApellidos: z.string().optional(),
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
  
  // Debounce timer reference
  const usngSearchTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize form
  const defaultValues = useMemo(() => ({
    notificationNumber: generateNotificationNumber(),
    date: new Date().toISOString().split('T')[0],
    usngCode: "",
    tipo: incidentTypes[0],
    estado: "pending" as const,
    incidents: [{ type: incidentTypes[0], description: "", cuencaId: "" }],
    properties: [{ 
      type: propertyTypes[0],
      municipioId: "", 
      address: "",
      habitantes: [],
    }],
    cuencaIds: [] as string[],
  }), [])

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
      setFamilySearchResults(data);
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

  // Update the onSubmit function to properly reset the form after successful submission
  const onSubmit = useCallback(async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      
      // Validate USNG code before submission
      const isValidUsng = await validateUsngCode(values.usngCode);
      if (!isValidUsng) {
        window.alert('Please enter a valid USNG code');
        return;
      }
      
      // Get USNG ID from the code before submitting
      let usngId = null;
      try {
        console.log('Getting USNG ID for code:', values.usngCode);
        const usngResponse = await fetch(`/api/usng/getById?code=${encodeURIComponent(values.usngCode)}`);
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
            if (retryResponse.ok) {
              const usngData = await retryResponse.json();
              console.log('Retrieved USNG data with uppercase:', usngData);
              usngId = usngData.id;
            } else {
              console.error('USNG code not found even with uppercase:', uppercaseCode);
              const errorData = await retryResponse.json();
              console.error('Error details:', errorData);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching USNG ID:', error);
      }
      
      if (!usngId) {
        console.warn('No USNG ID found, continuing without it');
      }
      
      // Format the data to match new Prisma schema
      const formattedData = {
        // If we have a selected event, use its ID
        eventoId: selectedEvent?.id,
        // Only include event creation data if no existing event was selected
        evento: !selectedEvent ? {
          create: {
            titulo: values.eventName,
            tipo: values.tipo,
            estado: values.estado,
            descripcion: values.incidents[0].description,
            fecha: new Date(values.date).toISOString(),
          }
        } : undefined,
        // Notification specific data
        notificacion: {
          numero_notificacion: values.notificationNumber,
          tipo: values.tipo,
          mensaje: values.incidents[0].description,
          estado: values.estado,
          fecha: new Date(values.date).toISOString(),
          // Add other notification fields as needed
        },
        // Format incidents with cuenca
        incidentes: values.incidents.map(incident => ({
          tipo: incident.type,
          descripcion: incident.description,
          cuencaId: incident.cuencaId ? parseInt(incident.cuencaId) : parseInt(values.cuencaIds[0])
        })),
        // Format properties with required fields and habitantes
        propiedades_afectadas: values.properties.map(property => {
          // Handle new barrio or sector creation
          const propertyData: any = {
            tipo: property.type,
            id_municipio: parseInt(property.municipioId),
            direccion: property.address,
            gridId: usngId, // Use the numeric USNG ID retrieved from API
            geometria: property.location || null,
          };

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
          } else if (property.barrioId) {
            propertyData.id_barrio = parseInt(property.barrioId);
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
          } else if (property.sectorId) {
            propertyData.id_sector = parseInt(property.sectorId);
          }

          // Add habitantes with family information
          propertyData.habitantes = {
            create: property.habitantes?.map(habitante => {
              const habitanteData: any = {
                name: habitante.name,
                categoria: habitante.categoria,
                rol: habitante.rol,
                age: parseInt(habitante.age),
                limitation: habitante.limitation,
                condition: habitante.condition,
                disposition: habitante.disposition,
              };

              // Handle family connection
              if (habitante.familyId === "new" && habitante.newFamilyApellidos) {
                // Create a new family
                habitanteData.newFamily = {
                  apellidos: habitante.newFamilyApellidos,
                  description: habitante.newFamilyDescription || ""
                };
              } else if (habitante.familyId !== "new") {
                // Link to existing family
                habitanteData.family_id = parseInt(habitante.familyId);
              }

              return habitanteData;
            }) || []
          };

          return {
            daños: property.value || "No damage reported",
            propiedad: {
              create: propertyData
            }
          };
        })
      };
      
      console.log('Submitting formatted data:', formattedData);

      const response = await fetch('/api/eventos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Server responded with ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log('Event submitted successfully:', responseData);
      
      window.alert('Event submitted successfully!');
      
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
        date: new Date().toISOString().split('T')[0],
        usngCode: "",
        tipo: incidentTypes[0],
        estado: "pending" as const,
        incidents: [{ type: incidentTypes[0], description: "", cuencaId: "" }],
        properties: [{ 
          type: propertyTypes[0],
          municipioId: "", 
          address: "",
          habitantes: [],
        }],
        cuencaIds: [] as string[],
      });
      
    } catch (error) {
      console.error('Error submitting event:', error);
      window.alert(`Failed to submit event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [validateUsngCode, reset, selectedEvent, handleEventSelect, setSelectedMunicipios, setSelectedBarrios, setBarrioSearchResults, setSectorSearchResults, setFamilySearchResults]);

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
      { type: propertyTypes[0], municipioId: "", address: "", habitantes: [] }
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

  // Render form
  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 2 }}>
      {/* Event Information Section */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Event Information</Typography>
        <Grid container spacing={3}>
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
          <Grid item xs={12} md={6}>
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
            </>
          )}
        </Grid>
      </Paper>

      {/* Notification Information Section */}
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

      {/* Properties Section */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Affected Properties</Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddProperty}
            size="small"
          >
            Add Property
          </Button>
        </Box>

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
                            {propertyTypes.map((type) => (
                              <MenuItem key={type} value={type}>
                                {type}
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
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    label="Neighborhood"
                                    error={!!errors.properties?.[index]?.barrioId}
                                    helperText={errors.properties?.[index]?.barrioId?.message}
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
                                    <Box>
                                      <Typography variant="body1">{option.nombre}</Typography>
                                      {option.codigo_barrio && (
                                        <Typography variant="caption" color="textSecondary">
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
                                  renderInput={(params) => (
                                    <TextField
                                      {...params}
                                      label="Sector"
                                      error={!!errors.properties?.[index]?.sectorId}
                                      helperText={errors.properties?.[index]?.sectorId?.message}
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
                                      <Box>
                                        <Typography variant="body1">{option.nombre}</Typography>
                                        {option.codigo_sector && (
                                          <Typography variant="caption" color="textSecondary">
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
                    </>
                  )}

                  {/* Habitantes Section */}
                  <Box mt={2}>
                    <Typography variant="h6">Residents</Typography>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        const currentProperties = getValues("properties");
                        const currentHabitantes = currentProperties[index].habitantes || [];
                        setValue(`properties.${index}.habitantes`, [
                          ...currentHabitantes,
                          {
                            name: "",
                            categoria: "Adult",
                            rol: "Resident",
                            age: "",
                            limitation: "",
                            condition: "",
                            disposition: "",
                            familyId: "",
                            newFamilyApellidos: "",
                            newFamilyDescription: "",
                          }
                        ]);
                      }}
                      size="small"
                    >
                      Add Resident
                    </Button>
                    
                    <Controller
                      name={`properties.${index}.habitantes`}
                      control={control}
                      defaultValue={[]}
                      render={({ field }) => (
                        <Box sx={{ mt: 1 }}>
                          {field.value?.map((habitante, habitanteIndex) => (
                            <Card key={habitanteIndex} variant="outlined" sx={{ mb: 2, p: 2 }}>
                              <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                  <TextField
                                    label="Name"
                                    variant="outlined"
                                    fullWidth
                                    value={habitante.name || ""}
                                    onChange={(e) => {
                                      const newHabitantes = [...field.value];
                                      newHabitantes[habitanteIndex].name = e.target.value;
                                      field.onChange(newHabitantes);
                                    }}
                                    error={!!errors.properties?.[index]?.habitantes?.[habitanteIndex]?.name}
                                    helperText={errors.properties?.[index]?.habitantes?.[habitanteIndex]?.name?.message}
                                    required
                                  />
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
                                    error={!!errors.properties?.[index]?.habitantes?.[habitanteIndex]?.age}
                                    helperText={errors.properties?.[index]?.habitantes?.[habitanteIndex]?.age?.message}
                                  />
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
                                
                                {/* Family Section */}
                                <Grid item xs={12}>
                                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                    Family Information (Required)
                                  </Typography>
                                  <FormControl fullWidth error={!habitante.familyId}>
                                    <Autocomplete
                                      freeSolo
                                      options={familySearchResults}
                                      getOptionLabel={(option) =>
                                        typeof option === 'string' ? option : option.apellidos
                                      }
                                      loading={isSearchingFamily}
                                      value={habitante.familyId === "new" ? 
                                        { id: -1, apellidos: habitante.newFamilyApellidos || "New Family", description: "" } :
                                        familySearchResults.find(f => String(f.id) === habitante.familyId) || null
                                      }
                                      onChange={(_, newValue) => {
                                        const newHabitantes = [...field.value];
                                        if (typeof newValue === 'string') {
                                          // Handle string input (not an option from the list)
                                          newHabitantes[habitanteIndex].familyId = "new";
                                          newHabitantes[habitanteIndex].newFamilyApellidos = newValue;
                                        } else if (newValue && 'id' in newValue) {
                                          // Selected an existing family
                                          newHabitantes[habitanteIndex].familyId = String(newValue.id);
                                          // Clear new family fields
                                          newHabitantes[habitanteIndex].newFamilyApellidos = "";
                                          newHabitantes[habitanteIndex].newFamilyDescription = "";
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
                                          helperText={!habitante.familyId ? "Family is required" : ""}
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
                                          <Box>
                                            <Typography variant="body1">{option.apellidos}</Typography>
                                            {option.description && (
                                              <Typography variant="caption" color="textSecondary">
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
                                        // Toggle between new and empty
                                        if (newHabitantes[habitanteIndex].familyId === "new") {
                                          newHabitantes[habitanteIndex].familyId = "";
                                        } else {
                                          newHabitantes[habitanteIndex].familyId = "new";
                                        }
                                        field.onChange(newHabitantes);
                                      }}
                                      sx={{ mt: 1 }}
                                      disabled={Boolean(habitante.familyId && habitante.familyId !== "new" && habitante.familyId !== "")}
                                    >
                                      + Create New Family
                                    </Button>
                                  </FormControl>
                                </Grid>

                                {/* New Family fields - shown when "new" is selected */}
                                {habitante.familyId === "new" && (
                                  <>
                                    <Grid item xs={12} md={6}>
                                      <TextField
                                        fullWidth
                                        label="New Family Last Names"
                                        required
                                        value={habitante.newFamilyApellidos || ""}
                                        onChange={(e) => {
                                          const newHabitantes = [...field.value];
                                          newHabitantes[habitanteIndex].newFamilyApellidos = e.target.value;
                                          field.onChange(newHabitantes);
                                        }}
                                        error={!habitante.newFamilyApellidos}
                                        helperText={!habitante.newFamilyApellidos ? "Last names required" : ""}
                                      />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
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
                                  </>
                                )}
                                
                                <Grid item xs={12}>
                                  <TextField
                                    fullWidth
                                    label="Limitation"
                                    value={habitante.limitation || ""}
                                    onChange={(e) => {
                                      const newHabitantes = [...field.value];
                                      newHabitantes[habitanteIndex].limitation = e.target.value;
                                      field.onChange(newHabitantes);
                                    }}
                                    placeholder="Physical limitations, if any"
                                  />
                                </Grid>
                                <Grid item xs={12}>
                                  <TextField
                                    fullWidth
                                    label="Condition"
                                    value={habitante.condition || ""}
                                    onChange={(e) => {
                                      const newHabitantes = [...field.value];
                                      newHabitantes[habitanteIndex].condition = e.target.value;
                                      field.onChange(newHabitantes);
                                    }}
                                    placeholder="Health conditions, if any"
                                  />
                                </Grid>
                                <Grid item xs={12}>
                                  <TextField
                                    fullWidth
                                    label="Disposition"
                                    value={habitante.disposition || ""}
                                    onChange={(e) => {
                                      const newHabitantes = [...field.value];
                                      newHabitantes[habitanteIndex].disposition = e.target.value;
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
                </Grid>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Paper>

      {/* Submit Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          size="large"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Report'}
        </Button>
      </Box>
    </Box>
  );
}
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import * as z from "zod"

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

const propertyTypes = [
  "Residential",
  "Commercial",
  "Industrial",
  "Agricultural",
  "Government",
  "Educational",
  "Healthcare"
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

// Form schema
const formSchema = z.object({
  notificationNumber: z.string(),
  eventName: z.string().min(2, "Event name must be at least 2 characters"),
  date: z.string(),
  time: z.string(),
  usngCode: z.string().min(1, "USNG code is required"),
  incidents: z.array(z.object({
    type: z.enum(incidentTypes),
    description: z.string(),
  })).min(1, "At least one incident is required"),
  cuencaIds: z.array(z.string()).min(1, "At least one cuenca must be selected"),
  properties: z.array(z.object({
    type: z.enum(propertyTypes),
    municipioId: z.string(),
    barrioId: z.string().optional(),
    sectorId: z.string().optional(),
    address: z.string(),
    value: z.string().optional(),
    location: z.object({
      lat: z.number().optional(),
      lng: z.number().optional(),
    }).optional(),
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
  
  // Debounce timer reference
  const usngSearchTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize form
  const defaultValues = useMemo(() => ({
    notificationNumber: generateNotificationNumber(),
    date: new Date().toISOString().split('T')[0],
    usngCode: "",
    incidents: [{ type: incidentTypes[0], description: "" }],
    properties: [{ 
      type: propertyTypes[0], 
      municipioId: "", 
      address: "",
    }],
    cuencaIds: [] as string[],
  }), [])

  const { 
    control, 
    handleSubmit, 
    formState: { errors }, 
    setValue, 
    getValues,
    watch
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
  
  // Enhance the municipio selection handler
  const handleMunicipioSelect = useCallback((index: number, value: string) => {
    setValue(`properties.${index}.municipioId`, value)
    // Reset barrio and sector when municipio changes
    setValue(`properties.${index}.barrioId`, "")
    setValue(`properties.${index}.sectorId`, "")
    setSelectedMunicipios(prev => ({
      ...prev,
      [index]: Number(value)
    }))
  }, [setValue])
  
  // Add barrio selection handler
  const handleBarrioSelect = useCallback((index: number, value: string) => {
    setValue(`properties.${index}.barrioId`, value)
    // Reset sector when barrio changes
    setValue(`properties.${index}.sectorId`, "")
    setSelectedBarrios(prev => ({
      ...prev,
      [index]: Number(value)
    }))
  }, [setValue])
  
  // Update the onSubmit function
  const onSubmit = useCallback(async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true)
      
      // Validate USNG code before submission
      const isValidUsng = await validateUsngCode(values.usngCode)
      if (!isValidUsng) {
        window.alert('Please enter a valid USNG code')
        return
      }
      
      // Format the data to match Prisma schema
      const formattedData = {
        notificacionId: parseInt(values.notificationNumber.split('-')[2]),
        titulo: values.eventName,
        descripcion: values.incidents[0].description,
        fecha: new Date(values.date).toISOString(),
        gridId: values.usngCode,
        // Format incidents with cuenca
        incidentes: values.incidents.map(incident => ({
          tipo: incident.type,
          descripcion: incident.description,
          cuencaId: values.cuencaIds.length > 0 ? parseInt(values.cuencaIds[0]) : 1
        })),
        // Format properties with required fields
        propiedades_afectadas: values.properties.map(property => ({
          daños: property.value || "No damage reported",
          propiedad: {
            create: {
              tipo: property.type,
              valor: property.value ? parseFloat(property.value) : 0,
              id_municipio: parseInt(property.municipioId),
              id_barrio: property.barrioId ? parseInt(property.barrioId) : 1, // Default barrio ID
              id_sector: property.sectorId ? parseInt(property.sectorId) : 1, // Default sector ID
              direccion: property.address,
              gridId: 0, // Will be set by API
              geometria: property.location || {}
            }
          }
        }))
      }
      
      console.log('Submitting formatted data:', formattedData)

      const response = await fetch('/api/eventos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedData),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Server responded with ${response.status}`)
      }
      
      const responseData = await response.json()
      console.log('Event submitted successfully:', responseData)
      
      // Show success message
      window.alert('Event submitted successfully!')
      
      // Reset form to default values
      setValue("notificationNumber", generateNotificationNumber())
      setValue("eventName", "")
      setValue("date", new Date().toISOString().split('T')[0])
      setValue("time", "")
      setValue("usngCode", "")
      setValue("incidents", [{ type: incidentTypes[0], description: "" }])
      setValue("properties", [{ type: propertyTypes[0], municipioId: "", address: "" }])
      setValue("cuencaIds", [])
      
      // Reset selected states
      setSelectedMunicipios({})
      setSelectedBarrios({})
      
    } catch (error) {
      console.error('Error submitting event:', error)
      window.alert(`Failed to submit event: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }, [validateUsngCode, setValue])

  // Handlers
  const handleAddIncident = useCallback(() => {
    const currentIncidents = getValues("incidents")
    setValue("incidents", [
      ...currentIncidents,
      { type: incidentTypes[0], description: "" }
    ])
  }, [getValues, setValue])

  const handleAddProperty = useCallback(() => {
    const currentProperties = getValues("properties")
    setValue("properties", [
      ...currentProperties,
      { type: propertyTypes[0], municipioId: "", address: "" }
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
      {/* Basic Info Section */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Basic Information</Typography>
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
                <TextField
                  {...field}
                  label="Event Name"
                  variant="outlined"
                  fullWidth
                  error={!!errors.eventName}
                  helperText={errors.eventName?.message}
                />
              )}
            />
          </Grid>
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
        </Grid>
      </Paper>

      {/* USNG Code Section */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>USNG Location</Typography>
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
                      label="USNG Code"
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

      {/* Incidents Section */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Incidents</Typography>
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
        {errors.incidents && !Array.isArray(errors.incidents) && (
          <Typography color="error" variant="body2" mt={1}>
            {errors.incidents.message}
          </Typography>
        )}
      </Paper>

      {/* Cuencas Selection */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Affected Cuencas</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControl fullWidth error={!!errors.cuencaIds}>
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
              {errors.cuencaIds && (
                <FormHelperText>{errors.cuencaIds.message}</FormHelperText>
              )}
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
                                label="Municipio"
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
                              <InputLabel>Barrio</InputLabel>
                              <Select
                                {...field}
                                label="Barrio"
                                value={field.value || ""}
                                onChange={(e) => {
                                  field.onChange(e.target.value);
                                  handleBarrioSelect(index, e.target.value as string);
                                }}
                                disabled={!selectedMunicipios[index]}
                              >
                                {municipios
                                  .find((m) => m.id_municipio === selectedMunicipios[index])
                                  ?.barrios?.map((barrio) => (
                                    <MenuItem
                                      key={barrio.id_barrio}
                                      value={String(barrio.id_barrio)}
                                    >
                                      {barrio.nombre}
                                    </MenuItem>
                                  )) || []}
                              </Select>
                            </FormControl>
                          )}
                        />
                      </Grid>
                      
                      {/* Add sector selection if barrio is selected */}
                      {selectedBarrios[index] && (
                        <Grid item xs={12} md={6}>
                          <Controller
                            name={`properties.${index}.sectorId`}
                            control={control}
                            render={({ field }) => (
                              <FormControl fullWidth>
                                <InputLabel>Sector</InputLabel>
                                <Select
                                  {...field}
                                  label="Sector"
                                  value={field.value || ""}
                                  disabled={!selectedBarrios[index]}
                                >
                                  {municipios
                                    .find((m) => m.id_municipio === selectedMunicipios[index])
                                    ?.barrios?.find((b) => b.id_barrio === selectedBarrios[index])
                                    ?.sectores?.map((sector) => (
                                      <MenuItem
                                        key={sector.id_sector}
                                        value={String(sector.id_sector)}
                                      >
                                        {sector.nombre}
                                      </MenuItem>
                                    )) || []}
                                </Select>
                              </FormControl>
                            )}
                          />
                        </Grid>
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
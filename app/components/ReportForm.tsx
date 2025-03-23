"use client"

import { useEffect, useState, useMemo, useCallback, useRef } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

// Material UI imports
import {
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  FormHelperText,
  InputLabel,
  Typography,
  Box,
  Grid,
  Paper,
  Chip,
  IconButton,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete
} from "@mui/material"
import {
  Add as AddIcon, 
  Delete as DeleteIcon, 
  Close as CloseIcon, 
  CalendarMonth as CalendarIcon,
  Search as SearchIcon
} from "@mui/icons-material"

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
  barrios: {
    id_barrio: number
    nombre: string
    sectores: {
      id_sector: number
      nombre: string
    }[]
  }[]
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
  date: z.date(),
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
  })).min(1, "At least one property must be added"),
})

// Generate notification number
const generateNotificationNumber = () => 
  `NOT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`

// Main component
export function ReportForm() {
  // State
  const [municipios, setMunicipios] = useState<Array<{ id_municipio: number; nombre: string }>>([])
  const [cuencas, setCuencas] = useState<Cuenca[]>([])
  const [selectedMunicipios, setSelectedMunicipios] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)
  const [isValidatingUsng, setIsValidatingUsng] = useState(false)
  const [usngValidationResult, setUsngValidationResult] = useState<{valid: boolean, message?: string} | null>(null)
  const [dataFetchError, setDataFetchError] = useState<string | null>(null)
  const [usngSuggestions, setUsngSuggestions] = useState<USNG[]>([])
  const [isLoadingUsngSuggestions, setIsLoadingUsngSuggestions] = useState(false)
  const [isMunicipiosLoading, setIsMunicipiosLoading] = useState(true)
  
  // Debounce timer reference
  const usngSearchTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize form
  const defaultValues = useMemo(() => ({
    notificationNumber: generateNotificationNumber(),
    usngCode: "",
    incidents: [{ type: incidentTypes[0], description: "" }],
    properties: [{ type: propertyTypes[0], municipioId: "", address: "" }],
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

  // Fetch only municipios and cuencas data
  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()
    
    const fetchFormData = async () => {
      try {
        const response = await fetch('/api/form-data', {
          signal: controller.signal,
          cache: 'force-cache'
        })
        
        if (!response.ok) throw new Error(`Failed to fetch form data: ${response.status}`)
        
        const data = await response.json()
        
        if (isMounted) {
          setMunicipios(data.municipios || [])
          setCuencas(data.cuencas || [])
          setLoading(false)
        }
      } catch (error) {
        console.error("Error fetching form data:", error)
        if (isMounted) {
          setDataFetchError("Failed to load form data. Please refresh the page.")
        setLoading(false)
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
      const data = await response.json()
      
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
        
        const data = await response.json()
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

  // Form submission
  const onSubmit = useCallback(async (values: z.infer<typeof formSchema>) => {
    // Validate USNG code before submission
    const isValidUsng = await validateUsngCode(values.usngCode)
    if (!isValidUsng) {
      return
    }
    
    console.log(values)
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      })
      
      if (!response.ok) {
        throw new Error('Failed to submit report')
      }
      
      alert('Report submitted successfully!')
    } catch (error) {
      console.error('Error submitting report:', error)
      alert('Failed to submit report. Please try again.')
    }
  }, [validateUsngCode])

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

  const handleRemoveProperty = useCallback((index: number) => {
    const currentProperties = getValues("properties")
    setValue(
      "properties",
      currentProperties.filter((_, i) => i !== index)
    )
  }, [getValues, setValue])

  const handleMunicipioSelect = useCallback((index: number, value: string) => {
    setValue(`properties.${index}.municipioId`, value)
    setSelectedMunicipios(prev => ({
      ...prev,
      [index]: Number(value)
    }))
  }, [setValue])

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

  // Watch for form values
  const incidents = watch("incidents")
  const properties = watch("properties")
  const cuencaIds = watch("cuencaIds")

  // Add this function to fetch municipios
  const fetchMunicipios = async () => {
    try {
      const response = await fetch('/api/municipios', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch municipios');
      
      const data = await response.json();
      setMunicipios(data);
    } catch (error) {
      console.error('Error fetching municipios:', error);
    } finally {
      setIsMunicipiosLoading(false);
    }
  };

  // Add this useEffect to load municipios when component mounts
  useEffect(() => {
    fetchMunicipios();
  }, []);

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
        <Button variant="contained" onClick={() => window.location.reload()}>
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
              render={({ field }) => (
                <TextField
                  {...field}
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
                            <FormHelperText>{errors.incidents[index]?.type?.message}</FormHelperText>
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
                onChange={(e) => handleCuencaSelect(e.target.value as string)}
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
                            <FormHelperText>{errors.properties[index]?.type?.message}</FormHelperText>
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
                          <InputLabel>Municipio</InputLabel>
                      <Autocomplete
                        value={municipios.find(m => m.id_municipio === field.value) || null}
                        options={municipios}
                        getOptionLabel={(option) => option.nombre}
                        loading={isMunicipiosLoading}
                        onChange={(_, newValue) => {
                          field.onChange(newValue?.id_municipio || null)
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
                        fullWidth
                      />
                          {errors.properties?.[index]?.municipioId && (
                            <FormHelperText>{errors.properties[index]?.municipioId?.message}</FormHelperText>
                          )}
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
                              >
                            {municipios
                              .find((m) => m.id_municipio === selectedMunicipios[index])
                              ?.barrios.map((barrio) => (
                                    <MenuItem
                                  key={barrio.id_barrio}
                                  value={String(barrio.id_barrio)}
                                >
                                  {barrio.nombre}
                                    </MenuItem>
                              ))}
                        </Select>
                            </FormControl>
                          )}
                        />
                      </Grid>
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
                  <Grid item xs={12}>
                    <Box display="flex" justifyContent="flex-end">
              <Button
                        variant="text"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleRemoveProperty(index)}
                        size="small"
                      >
                Remove Property
              </Button>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ))}
        </Box>
        {errors.properties && !Array.isArray(errors.properties) && (
          <Typography color="error" variant="body2" mt={1}>
            {errors.properties.message}
          </Typography>
        )}
      </Paper>

      <Box display="flex" justifyContent="center" mt={4} mb={2}>
        <Button 
          type="submit" 
          variant="contained" 
          color="primary" 
          size="large"
          sx={{ minWidth: 200 }}
        >
          Submit Report
        </Button>
      </Box>
    </Box>
  )
} 
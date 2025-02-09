"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Plus, Trash2, X } from "lucide-react"

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

const propertyTypes = [
  "Residential",
  "Commercial",
  "Industrial",
  "Agricultural",
  "Government",
  "Educational",
  "Healthcare"
] as const

const formSchema = z.object({
  notificationNumber: z.string(),
  eventName: z.string().min(2, "Event name must be at least 2 characters"),
  date: z.date(),
  time: z.string(),
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

export function ReportForm() {
  const [municipios, setMunicipios] = useState<Municipio[]>([])
  const [cuencas, setCuencas] = useState<Cuenca[]>([])
  const [selectedMunicipios, setSelectedMunicipios] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFormData = async () => {
      try {
        const response = await fetch('/api/form-data')
        const data = await response.json()
        setMunicipios(data.municipios)
        setCuencas(data.cuencas)
      } catch (error) {
        console.error("Error fetching form data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchFormData()
  }, [])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notificationNumber: `NOT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      incidents: [{ type: incidentTypes[0], description: "" }],
      properties: [{ type: propertyTypes[0], municipioId: "", address: "" }],
      cuencaIds: [],
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values)
    // Handle form submission
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-2 gap-6">
          {/* Notification Number */}
          <FormField
            control={form.control}
            name="notificationNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notification #</FormLabel>
                <FormControl>
                  <Input {...field} disabled />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Event Name */}
          <FormField
            control={form.control}
            name="eventName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Event name..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Date */}
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Time */}
          <FormField
            control={form.control}
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Incidents */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel>Incidents</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const currentIncidents = form.getValues("incidents")
                form.setValue("incidents", [
                  ...currentIncidents,
                  { type: incidentTypes[0], description: "" }
                ])
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Incident
            </Button>
          </div>
          
          {form.watch("incidents").map((_, index) => (
            <div key={index} className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
              <FormField
                control={form.control}
                name={`incidents.${index}.type`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select incident type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {incidentTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name={`incidents.${index}.description`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Incident description..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          ))}
        </div>

        {/* Cuencas Selection */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="cuencaIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Affected Cuencas</FormLabel>
                <Select
                  onValueChange={(value) => {
                    const currentValues = field.value || []
                    if (!currentValues.includes(value)) {
                      field.onChange([...currentValues, value])
                    }
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select cuencas" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {cuencas.map((cuenca) => (
                      <SelectItem key={cuenca.id} value={String(cuenca.id)}>
                        {cuenca.nombre} ({cuenca.codigo_cuenca})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2 mt-2">
                  {field.value?.map((cuencaId) => {
                    const cuenca = cuencas.find((c) => String(c.id) === cuencaId)
                    return cuenca ? (
                      <div
                        key={cuenca.id}
                        className="flex items-center gap-2 bg-secondary px-3 py-1 rounded-full"
                      >
                        <span>{cuenca.nombre}</span>
                        <button
                          type="button"
                          onClick={() => {
                            field.onChange(field.value?.filter((id) => id !== cuencaId))
                          }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Properties */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel>Affected Properties</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const currentProperties = form.getValues("properties")
                form.setValue("properties", [
                  ...currentProperties,
                  { type: propertyTypes[0], municipioId: "", address: "" }
                ])
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          </div>

          {form.watch("properties").map((_, index) => (
            <div key={index} className="grid gap-4 p-4 border rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`properties.${index}.type`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {propertyTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`properties.${index}.municipioId`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Municipio</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value)
                          setSelectedMunicipios({
                            ...selectedMunicipios,
                            [index]: Number(value)
                          })
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select municipio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {municipios.map((municipio) => (
                            <SelectItem
                              key={municipio.id_municipio}
                              value={String(municipio.id_municipio)}
                            >
                              {municipio.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Barrio and Sector dropdowns (only show if municipio is selected) */}
              {selectedMunicipios[index] && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`properties.${index}.barrioId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Barrio</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select barrio" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {municipios
                              .find((m) => m.id_municipio === selectedMunicipios[index])
                              ?.barrios.map((barrio) => (
                                <SelectItem
                                  key={barrio.id_barrio}
                                  value={String(barrio.id_barrio)}
                                >
                                  {barrio.nombre}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`properties.${index}.address`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Property address..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => {
                  const currentProperties = form.getValues("properties")
                  form.setValue(
                    "properties",
                    currentProperties.filter((_, i) => i !== index)
                  )
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Property
              </Button>
            </div>
          ))}
        </div>

        <Button type="submit" className="w-full">Submit Report</Button>
      </form>
    </Form>
  )
} 
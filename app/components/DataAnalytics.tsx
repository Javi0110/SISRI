"use client";

import { AlertCircle, Bell, ChevronDown, ChevronRight, Clock, FileText, Home, MapPin, Printer, Search, Users } from "lucide-react";
import { useCallback, useState } from "react";
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

type SearchType = 'evento' | 'usng' | 'municipio';

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
  limitacion: string;
  condicion: string;
  disposicion: string;
  propiedad_id: number;
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
  evento?: EventData | null;
  usngQuery?: string;
  municipioQuery?: string;
  propiedades: PropertyData[];
  notificaciones?: NotificationData[];
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
    ageRange?: { min: number; max: number };
    propertyType?: string;
    incidentType?: string;
    damageType?: string;
    residentCategory?: string;
    dateRange?: { start: string; end: string };
  }>({});

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

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError("Por favor ingrese un término de búsqueda");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Combine main search with filters
      const searchPayload = {
        searchType,
        searchQuery,
        filters: {
          ...filters,
          ageRange: filters.ageRange ? {
            min: Number(filters.ageRange.min),
            max: Number(filters.ageRange.max)
          } : undefined
        }
      };

      const response = await fetch("/api/analytics/comprehensive-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchPayload)
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setReportData(data);
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
      setError("Error al buscar datos");
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

  const renderAdvancedFilters = () => {
    if (!showAdvancedFilters) return null;

    return (
      <div className="space-y-4 mt-4 p-4 border rounded-md bg-muted/30">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* USNG Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">USNG</label>
            <Input
              placeholder="Filtrar por USNG"
              value={filters.usng || ''}
              onChange={(e) => handleFilterChange('usng', e.target.value)}
            />
          </div>

          {/* Municipality Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Municipio</label>
            <Input
              placeholder="Filtrar por municipio"
              value={filters.municipio || ''}
              onChange={(e) => handleFilterChange('municipio', e.target.value)}
            />
          </div>

          {/* Age Range Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Rango de Edad</label>
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
            <label className="text-sm font-medium">Tipo de Propiedad</label>
            <Select
              value={filters.propertyType}
              onValueChange={(value) => handleFilterChange('propertyType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="residencial">Residencial</SelectItem>
                <SelectItem value="comercial">Comercial</SelectItem>
                <SelectItem value="industrial">Industrial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Incident Type Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de Incidente</label>
            <Select
              value={filters.incidentType}
              onValueChange={(value) => handleFilterChange('incidentType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inundacion">Inundación</SelectItem>
                <SelectItem value="deslizamiento">Deslizamiento</SelectItem>
                <SelectItem value="derrumbe">Derrumbe</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Resident Category Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Categoría de Residente</label>
            <Select
              value={filters.residentCategory}
              onValueChange={(value) => handleFilterChange('residentCategory', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="adulto">Adulto</SelectItem>
                <SelectItem value="menor">Menor</SelectItem>
                <SelectItem value="envejeciente">Envejeciente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Rango de Fecha</label>
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
            Limpiar Filtros
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
        return 'Nombre del evento';
      case 'usng':
        return 'Coordenadas USNG';
      case 'municipio':
        return 'Nombre del municipio';
      default:
        return 'Buscar...';
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
              Fecha: {new Date(reportData.evento.fecha).toLocaleDateString()}
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
              Propiedades en USNG: 
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
              <span className="font-medium">{reportData.propiedades.length} propiedades encontradas</span>
              <span className="text-muted-foreground">•</span>
              <div className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                <span>
                  {reportData.propiedades.reduce((total, property) => total + property.habitantes.length, 0)} habitantes en total
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
            <CardTitle>Propiedades en: {reportData.municipioQuery}</CardTitle>
            <CardDescription>
              {reportData.propiedades.length} propiedades encontradas
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
            Búsqueda no válida
          </CardTitle>
        </div>
      </div>
    );
  };

  const handleNotificationDetails = (notification: NotificationData) => {
    setSelectedNotification(notification);
    setNotificationDetailOpen(true);
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
          </div>
          
          <div class="section">
            <div class="section-title">Search Information</div>
            <div class="row">
              <div class="label">Search Type:</div>
              <div class="value">${
                reportData.searchType === 'evento' ? 'Event' : 
                reportData.searchType === 'usng' ? 'USNG Coordinates' : 
                reportData.searchType === 'municipio' ? 'Municipality' : 'Unknown'
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
            ` : ''}
          </div>
          
          <div class="section">
            <div class="section-title">Properties (${reportData.propiedades.length})</div>
            ${reportData.propiedades.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Location</th>
                    <th>USNG</th>
                    <th>Damage</th>
                    <th>Date</th>
                    <th>Residents</th>
                  </tr>
                </thead>
                <tbody>
                  ${reportData.propiedades.map((property) => `
                    <tr class="property-row">
                      <td>${property.tipo}</td>
                      <td>
                        <strong>${property.municipio}</strong><br>
                        <span style="font-size: 13px; color: #666;">
                          ${property.barrio} • ${property.sector}
                        </span>
                      </td>
                      <td><span class="badge badge-outline">${property.usng}</span></td>
                      <td>${property.daños || 'N/A'}</td>
                      <td>${property.fecha ? new Date(property.fecha).toLocaleDateString() : 'N/A'}</td>
                      <td>${property.habitantes.length}</td>
                    </tr>
                    ${property.habitantes.length > 0 ? `
                      <tr>
                        <td colspan="6" style="padding: 0;">
                          <table class="nested-table">
                            <thead>
                              <tr>
                                <th class="nested-th">Name</th>
                                <th class="nested-th">Age</th>
                                <th class="nested-th">Category</th>
                                <th class="nested-th">Limitation</th>
                                <th class="nested-th">Condition</th>
                                <th class="nested-th">Disposition</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${property.habitantes.map((resident) => `
                                <tr>
                                  <td class="nested-td">${resident.nombre}</td>
                                  <td class="nested-td">${resident.edad}</td>
                                  <td class="nested-td">${resident.categoria}</td>
                                  <td class="nested-td">${resident.limitacion || 'None'}</td>
                                  <td class="nested-td">${resident.condicion || 'None'}</td>
                                  <td class="nested-td">${resident.disposicion || 'None'}</td>
                                </tr>
                              `).join('')}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    ` : ''}
                  `).join('')}
                </tbody>
              </table>
            ` : `
              <p>No properties found for this search.</p>
            `}
          </div>
          
          ${reportData.notificaciones && reportData.notificaciones.length > 0 ? `
            <div class="section">
              <div class="section-title">Notifications (${reportData.notificaciones.length})</div>
              <table>
                <thead>
                  <tr>
                    <th>Notification #</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  ${reportData.notificaciones.map((notification) => `
                    <tr>
                      <td>${notification.numero_notificacion || `NOT-${notification.id}`}</td>
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

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle>Reporte Comprensivo</CardTitle>
          <CardDescription>
            Busque por evento, coordenadas USNG o municipio para ver todos los detalles relacionados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Select value={searchType} onValueChange={(value: SearchType) => setSearchType(value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Tipo de búsqueda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="evento">Evento</SelectItem>
                  <SelectItem value="usng">USNG</SelectItem>
                  <SelectItem value="municipio">Municipio</SelectItem>
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
                          Cargando sugerencias...
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
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? (
                  <span className="animate-spin mr-2">⏳</span>
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Buscar
              </Button>
            </div>

            {/* Advanced Filters Toggle */}
            <div className="flex justify-end">
              <Button
                variant="ghost"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="text-sm"
              >
                {showAdvancedFilters ? "Ocultar filtros avanzados" : "Mostrar filtros avanzados"}
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
                Imprimir Reporte Profesional
              </Button>
            </div>
          </CardHeader>
          
          {reportData.searchType === 'evento' && reportData.evento && (
            <Tabs defaultValue="properties" value={activeTab} onValueChange={setActiveTab} className="px-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="properties" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  <span>Propiedades Afectadas</span>
                  <Badge variant="secondary" className="ml-1">{reportData.propiedades.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <span>Notificaciones</span>
                  <Badge variant="secondary" className="ml-1">{reportData.notificaciones?.length || 0}</Badge>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="properties" className="pt-4">
                <div className="rounded-md border">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="py-3 px-4 text-left font-medium">Propiedad</th>
                          <th className="py-3 px-4 text-left font-medium">Ubicación</th>
                          <th className="py-3 px-4 text-left font-medium">USNG</th>
                          <th className="py-3 px-4 text-left font-medium">Daños</th>
                          <th className="py-3 px-4 text-left font-medium">Fecha</th>
                          <th className="py-3 px-4 text-left font-medium">Habitantes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.propiedades.map((property) => (
                          <>
                            <tr key={property.id} className="border-t hover:bg-muted/50 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="p-0 h-auto"
                                    onClick={() => toggleProperty(property.id)}
                                  >
                                    {expandedProperties[property.id] ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Home className="h-4 w-4" />
                                  <span>{property.tipo}</span>
                                </div>
                                {property.notificaciones && property.notificaciones.length > 0 && (
                                  <div className="ml-7 mt-1 flex items-center gap-1">
                                    <Bell className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                                      {property.notificaciones[0].numero_notificacion || `NOT-${property.notificaciones[0].id}`}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex flex-col">
                                  <span className="font-medium">{property.municipio}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {property.barrio} • {property.sector}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant="outline">{property.usng}</Badge>
                              </td>
                              <td className="py-3 px-4">{property.daños || 'N/A'}</td>
                              <td className="py-3 px-4">
                                {property.fecha ? new Date(property.fecha).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1">
                                  <Users className="h-4 w-4" />
                                  <span>{property.habitantes.length}</span>
                                </div>
                              </td>
                            </tr>
                            {expandedProperties[property.id] && property.habitantes.length > 0 && (
                              <tr className="bg-muted/30">
                                <td colSpan={6} className="py-2 px-4">
                                  <div className="ml-8">
                                    <table className="w-full">
                                      <thead>
                                        <tr className="text-sm text-muted-foreground">
                                          <th className="py-2 px-3 text-left font-medium">Nombre</th>
                                          <th className="py-2 px-3 text-left font-medium">Edad</th>
                                          <th className="py-2 px-3 text-left font-medium">Categoría</th>
                                          <th className="py-2 px-3 text-left font-medium">Limitación</th>
                                          <th className="py-2 px-3 text-left font-medium">Condición</th>
                                          <th className="py-2 px-3 text-left font-medium">Disposición</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {property.habitantes.map((resident) => (
                                          <tr key={resident.id} className="text-sm">
                                            <td className="py-2 px-3">{resident.nombre}</td>
                                            <td className="py-2 px-3">{resident.edad}</td>
                                            <td className="py-2 px-3">
                                              <Badge variant="outline">{resident.categoria}</Badge>
                                            </td>
                                            <td className="py-2 px-3">{resident.limitacion}</td>
                                            <td className="py-2 px-3">{resident.condicion}</td>
                                            <td className="py-2 px-3">{resident.disposicion}</td>
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
                            <span className="text-xs text-muted-foreground">Tipo: {notification.tipo}</span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 text-xs"
                              onClick={() => handleNotificationDetails(notification)}
                            >
                              Ver detalles
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium">Sin notificaciones</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      No hay notificaciones registradas para este evento.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
          
          {(reportData.searchType !== 'evento' || !reportData.evento) && (
            <CardContent>
              <div className="rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="py-3 px-4 text-left font-medium">Propiedad</th>
                        <th className="py-3 px-4 text-left font-medium">Ubicación</th>
                        <th className="py-3 px-4 text-left font-medium">USNG</th>
                        <th className="py-3 px-4 text-left font-medium">Daños</th>
                        <th className="py-3 px-4 text-left font-medium">Fecha</th>
                        <th className="py-3 px-4 text-left font-medium">Habitantes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.propiedades.map((property) => (
                        <>
                          <tr key={property.id} className="border-t hover:bg-muted/50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="p-0 h-auto"
                                  onClick={() => toggleProperty(property.id)}
                                >
                                  {expandedProperties[property.id] ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                                <Home className="h-4 w-4" />
                                <span>{property.tipo}</span>
                              </div>
                              {property.notificaciones && property.notificaciones.length > 0 && (
                                <div className="ml-7 mt-1 flex items-center gap-1">
                                  <Bell className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    {property.notificaciones[0].numero_notificacion || `NOT-${property.notificaciones[0].id}`}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-col">
                                <span className="font-medium">{property.municipio}</span>
                                <span className="text-sm text-muted-foreground">
                                  {property.barrio} • {property.sector}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline">{property.usng}</Badge>
                            </td>
                            <td className="py-3 px-4">{property.daños || 'N/A'}</td>
                            <td className="py-3 px-4">
                              {property.fecha ? new Date(property.fecha).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                <span>{property.habitantes.length}</span>
                              </div>
                            </td>
                          </tr>
                          {expandedProperties[property.id] && property.habitantes.length > 0 && (
                            <tr className="bg-muted/30">
                              <td colSpan={6} className="py-2 px-4">
                                <div className="ml-8">
                                  <table className="w-full">
                                    <thead>
                                      <tr className="text-sm text-muted-foreground">
                                        <th className="py-2 px-3 text-left font-medium">Nombre</th>
                                        <th className="py-2 px-3 text-left font-medium">Edad</th>
                                        <th className="py-2 px-3 text-left font-medium">Categoría</th>
                                        <th className="py-2 px-3 text-left font-medium">Limitación</th>
                                        <th className="py-2 px-3 text-left font-medium">Condición</th>
                                        <th className="py-2 px-3 text-left font-medium">Disposición</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {property.habitantes.map((resident) => (
                                        <tr key={resident.id} className="text-sm">
                                          <td className="py-2 px-3">{resident.nombre}</td>
                                          <td className="py-2 px-3">{resident.edad}</td>
                                          <td className="py-2 px-3">
                                            <Badge variant="outline">{resident.categoria}</Badge>
                                          </td>
                                          <td className="py-2 px-3">{resident.limitacion}</td>
                                          <td className="py-2 px-3">{resident.condicion}</td>
                                          <td className="py-2 px-3">{resident.disposicion}</td>
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
              <Badge className={cn(getStatusColor(notification.estado || "pendiente"))}>
                {notification.estado || "pendiente"}
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
            <h3 className="text-sm font-medium text-muted-foreground">Mensaje</h3>
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm">{notification.mensaje}</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Home className="h-4 w-4" />
              Propiedades Afectadas ({relatedProperties.length})
            </h3>
            {relatedProperties.length > 0 ? (
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="py-2 px-3 text-left font-medium">Tipo</th>
                      <th className="py-2 px-3 text-left font-medium">Ubicación</th>
                      <th className="py-2 px-3 text-left font-medium">USNG</th>
                      <th className="py-2 px-3 text-left font-medium">Daños</th>
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
                            <span className="text-xs text-muted-foreground">
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
                                Ver {property.habitantes.length} habitantes
                              </summary>
                              <div className="mt-2 space-y-1">
                                {property.habitantes.map(resident => (
                                  <div key={resident.id} className="pl-2 border-l-2 border-muted-foreground/20">
                                    <p><strong>{resident.nombre}</strong> ({resident.edad} años)</p>
                                    <p className="text-muted-foreground">
                                      {resident.categoria}
                                      {resident.limitacion && ` • ${resident.limitacion}`}
                                      {resident.condicion && ` • ${resident.condicion}`}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </details>
                          ) : (
                            <span>Sin habitantes</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center bg-muted/20 rounded-md">
                <p className="text-muted-foreground">No hay propiedades asociadas a esta notificación</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

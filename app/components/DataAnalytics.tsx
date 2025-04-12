"use client";

import { useState } from "react";
import { Search, AlertCircle, ChevronDown, ChevronRight, Home, Users, MapPin } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { cn } from "../../lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

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

interface ReportData {
  searchType: SearchType;
  evento?: EventData | null;
  usngQuery?: string;
  municipioQuery?: string;
  propiedades: PropertyData[];
}

interface ExpandedState {
  [key: string]: boolean;
}

export function DataAnalytics() {
  const [searchType, setSearchType] = useState<SearchType>('evento');
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [expandedProperties, setExpandedProperties] = useState<ExpandedState>({});

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError("Por favor ingrese un término de búsqueda");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analytics/comprehensive-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ searchType, searchQuery })
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setReportData(data);
        setExpandedProperties({});
      }
    } catch (error) {
      setError("Error al buscar datos");
      console.error("Query error:", error);
    } finally {
      setLoading(false);
    }
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
            <CardTitle>Propiedades en USNG: {reportData.usngQuery}</CardTitle>
            <CardDescription>
              {reportData.propiedades.length} propiedades encontradas
            </CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {reportData.usngQuery}
          </Badge>
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
            <Input
              placeholder={getSearchPlaceholder()}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? (
                <span className="animate-spin mr-2">⏳</span>
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Buscar
            </Button>
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
          </CardHeader>
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
        </Card>
      )}
    </div>
  );
}

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
  daños: string;
  fecha: string;
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
  evento: EventData | null;
  propiedades: PropertyData[];
}

interface ExpandedState {
  [key: string]: boolean;
}

export function DataAnalytics() {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData>({
    evento: null,
    propiedades: []
  });
  const [expandedProperties, setExpandedProperties] = useState<ExpandedState>({});

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError("Por favor ingrese el nombre del evento");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analytics/comprehensive-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventTitle: searchQuery })
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

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle>Reporte Comprensivo de Eventos</CardTitle>
          <CardDescription>
            Busque un evento para ver todos los detalles relacionados, incluyendo propiedades afectadas y habitantes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Nombre del evento"
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

      {/* Unified Results Display */}
      {reportData.evento && (
        <Card>
          <CardHeader>
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
            <p className="text-sm text-muted-foreground mt-2">
              {reportData.evento.descripcion}
            </p>
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
                          <td className="py-3 px-4">{property.daños}</td>
                          <td className="py-3 px-4">
                            {new Date(property.fecha).toLocaleDateString()}
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

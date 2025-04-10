"use client";

import { useState } from "react";
import { Search, Filter, AlertCircle } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Input } from "../../components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../components/ui/accordion";

// Available tables and their configurations
const tables = {
  habitantes: {
    name: "Residentes",
    fields: [
      { name: "id", label: "ID", type: "number" },
      { name: "nombre", label: "Nombre", type: "text" },
      { name: "edad", label: "Edad", type: "number" },
      { name: "categoria", label: "Categoría", type: "select", 
        options: ["Adulto", "Joven", "Niño"] },
      { name: "limitacion", label: "Limitación", type: "select",
        options: ["Ninguna", "Movilidad Reducida", "Visual", "Auditiva"] },
      { name: "condicion", label: "Condición", type: "select",
        options: ["Ninguna", "Hipertensión", "Diabetes", "Asma", "Artritis"] },
      { name: "disposicion", label: "Disposición", type: "select",
        options: ["Disponible", "No Disponible"] }
    ]
  },
  eventos: {
    name: "Eventos",
    fields: [
      { name: "id", label: "ID", type: "number" },
      { name: "titulo", label: "Título", type: "text" },
      { name: "tipo", label: "Tipo", type: "select",
        options: ["Hurricane", "Flood", "Storm", "Infrastructure", "Landslide"] },
      { name: "estado", label: "Estado", type: "select",
        options: ["pending", "active", "resolved"] },
      { name: "fecha", label: "Fecha", type: "date" }
    ]
  },
  propiedades_existentes: {
    name: "Propiedades",
    fields: [
      { name: "id", label: "ID", type: "number" },
      { name: "tipo", label: "Tipo", type: "select",
        options: ["Residencial", "Comercial"] }
    ]
  }
};

interface FilterCondition {
  field: string;
  operator: string;
  value: string | number;
}

export function DataAnalytics() {
  const [selectedTable, setSelectedTable] = useState("");
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const addFilter = () => {
    setFilters([...filters, { field: "", operator: "equals", value: "" }]);
  };

  const updateFilter = (index: number, field: string, value: any) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], [field]: value };
    setFilters(newFilters);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const handleSearch = async () => {
    if (!selectedTable) {
      setError("Por favor seleccione una tabla");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analytics/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseTable: selectedTable,
          selectedFields: tables[selectedTable as keyof typeof tables].fields.map(f => f.name),
          conditions: filters.filter(f => f.field && f.value)
        })
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setResults(data.results);
      }
    } catch (error) {
      setError("Error al buscar datos");
      console.error("Query error:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderFilterInput = (field: any, filter: FilterCondition, index: number) => {
    if (field.type === "select") {
      return (
        <Select 
          value={filter.value as string} 
          onValueChange={(value) => updateFilter(index, "value", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar valor" />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option: string) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    
    if (field.type === "date") {
      return (
        <Input
          type="date"
          value={filter.value as string}
          onChange={(e) => updateFilter(index, "value", e.target.value)}
        />
      );
    }

    return (
      <Input
        type={field.type === "number" ? "number" : "text"}
        placeholder="Valor"
        value={filter.value as string}
        onChange={(e) => updateFilter(index, "value", e.target.value)}
      />
    );
  };

  return (
    <div className="space-y-6">
      {/* Table Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Análisis de Datos</CardTitle>
          <CardDescription>Seleccione la tabla y aplique filtros para analizar los datos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Select value={selectedTable} onValueChange={setSelectedTable}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tabla" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(tables).map(([key, table]) => (
                  <SelectItem key={key} value={key}>
                    {table.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedTable && (
              <Accordion type="single" collapsible>
                <AccordionItem value="filters">
                  <AccordionTrigger className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filtros Avanzados
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      {filters.map((filter, index) => (
                        <div key={index} className="flex gap-2 items-start">
                          <Select
                            value={filter.field}
                            onValueChange={(value) => updateFilter(index, "field", value)}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Seleccionar campo" />
                            </SelectTrigger>
                            <SelectContent>
                              {tables[selectedTable as keyof typeof tables].fields.map((field) => (
                                <SelectItem key={field.name} value={field.name}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {filter.field && renderFilterInput(
                            tables[selectedTable as keyof typeof tables].fields.find(
                              f => f.name === filter.field
                            ),
                            filter,
                            index
                          )}

                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => removeFilter(index)}
                          >
                            ×
                          </Button>
                        </div>
                      ))}

                      <Button
                        variant="outline"
                        onClick={addFilter}
                        className="w-full"
                      >
                        Agregar Filtro
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            <Button
              className="w-full"
              onClick={handleSearch}
              disabled={loading}
            >
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

      {/* Results */}
      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados</CardTitle>
            <CardDescription>{results.length} registros encontrados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {tables[selectedTable as keyof typeof tables].fields.map(field => (
                      <TableHead key={field.name}>{field.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((row, i) => (
                    <TableRow key={i}>
                      {tables[selectedTable as keyof typeof tables].fields.map(field => (
                        <TableCell key={field.name}>
                          {field.type === 'date' 
                            ? new Date(row[field.name]).toLocaleDateString()
                            : String(row[field.name] || '')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

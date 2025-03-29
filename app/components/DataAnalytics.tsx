"use client";

import { motion } from "framer-motion";
import { Download, Filter, Search, Table as TableIcon, X } from "lucide-react";
import { useState } from "react";
import * as XLSX from "xlsx";
import { Badge } from "../../components/ui/badge";
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

// Define available tables and their fields
const tables = {
  usng_search: {
    name: "USNG Grid Search",
    fields: [
      { name: "usng", label: "USNG Grid", type: "string" },
      { name: "properties", label: "Properties", type: "relation" },
      { name: "events", label: "Events", type: "relation" },
      { name: "incidents", label: "Incidents", type: "relation" },
    ],
  },
  propiedades: {
    name: "Properties",
    fields: [
      { name: "id", label: "ID", type: "number" },
      { name: "tipo", label: "Type", type: "string" },
      { name: "valor", label: "Value", type: "number" },
      { name: "municipio", label: "Municipality", type: "relation" },
      { name: "barrio", label: "Neighborhood", type: "relation" },
      { name: "sector", label: "Sector", type: "relation" },
      { name: "grid", label: "USNG Grid", type: "relation" },
    ],
  },
  eventos: {
    name: "Events",
    fields: [
      { name: "id", label: "ID", type: "number" },
      { name: "notification_number", label: "Notification #", type: "string" },
      { name: "name", label: "Event Name", type: "string" },
      { name: "date", label: "Date", type: "date" },
      { name: "status", label: "Status", type: "string" },
      { name: "description", label: "Description", type: "string" },
    ],
  },
  incidentes: {
    name: "Incidents",
    fields: [
      { name: "id", label: "ID", type: "number" },
      { name: "type", label: "Type", type: "string" },
      { name: "description", label: "Description", type: "string" },
      { name: "event_id", label: "Event ID", type: "number" },
      { name: "date", label: "Date", type: "date" },
    ],
  },
  cuencas: {
    name: "Watersheds",
    fields: [
      { name: "id", label: "ID", type: "number" },
      { name: "nombre", label: "Name", type: "string" },
      { name: "codigo_cuenca", label: "Code", type: "string" },
    ],
  },
  municipios: {
    name: "Municipalities",
    fields: [
      { name: "id_municipio", label: "ID", type: "number" },
      { name: "nombre", label: "Name", type: "string" },
    ],
  },
  // Add more tables as needed
};

interface Filter {
  field: string;
  operator: string;
  value: string;
}

interface Sort {
  field: string;
  direction: "asc" | "desc";
}

// Update your SearchResponse interface to match the actual API response
interface SearchResponse {
  data: {
    usng: string;
    coordinates: [number, number] | null;
    properties: Array<{
      id: number;
      tipo: string;
      valor: number;
    }>;
    cuencas: Array<{
      id: number;
      nombre: string;
      codigo_cuenca: string;
    }>;
    incidents: Array<{
      id: number;
      tipo: string;
      descripcion: string;
    }>;
  };
  error?: string;
}

// Add a helper function to format cell values
const formatCellValue = (value: any): string => {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "object") {
    // Handle Date objects
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    // Handle other objects by showing their primary identifier or stringified version
    return value.id || value.name || JSON.stringify(value);
  }
  return String(value);
};

// Add USNG specific interface

export function DataAnalytics() {
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [filters, setFilters] = useState<Filter[]>([]);
  const [sorts, setSorts] = useState<Sort[]>([]);
  const [results, setResults] = useState<
    {
      usng: string;
      coordinates: [number, number] | null;
      properties: { id: number; tipo: string; valor: number }[];
      cuencas: { id: number; nombre: string; codigo_cuenca: string }[];
      incidents: { id: number; tipo: string; descripcion: string }[];
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!selectedTable || selectedFields.length === 0) {
      setError("Please select a table and at least one field");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/analytics/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          table: selectedTable,
          filters: filters.filter((f) => f.field && f.operator && f.value), // Only send complete filters
          sorts: sorts.filter((s) => s.field && s.direction), // Only send complete sorts
          fields: selectedFields,
        }),
      });

      const data: SearchResponse = (await response.json()) as SearchResponse;

      if (data.error) {
        setError(data.error);
        setResults([]);
      } else {
        setResults([data.data]);
      }
    } catch (error) {
      setError("Failed to fetch results. Please try again.");
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Add reset function
  const resetSearch = () => {
    setFilters([]);
    setSorts([]);
    setResults([]);
    setError(null);
  };

  // Add field selection validation
  const handleTableChange = (newTable: string) => {
    setSelectedTable(newTable);
    setSelectedFields([]);
    resetSearch();
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(results);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${selectedTable}_export.xlsx`);
  };

  // Add USNG search function
  
  // Add USNG Results component

  return (
    <div className="space-y-6">
      {/* Table Selection */}
      <Card>
        <CardHeader>
          <CardTitle>1. Select Data Source</CardTitle>
          <CardDescription>Choose the main table to query from</CardDescription>
        </CardHeader>
        <CardContent>
          <Select onValueChange={handleTableChange} value={selectedTable}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a table" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(tables).map(([key, table]) => (
                <SelectItem key={key} value={key}>
                  {table.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedTable && (
        <>
          {/* Field Selection */}
          <Card>
            <CardHeader>
              <CardTitle>2. Select Fields</CardTitle>
              <CardDescription>
                Choose which fields to include in the results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {tables[selectedTable as keyof typeof tables].fields.map(
                  (field) => (
                    <Badge
                      key={field.name}
                      variant={
                        selectedFields.includes(field.name)
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedFields((prev) =>
                          prev.includes(field.name)
                            ? prev.filter((f) => f !== field.name)
                            : [...prev, field.name]
                        );
                      }}
                    >
                      {field.label}
                    </Badge>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>3. Add Filters</CardTitle>
              <CardDescription>
                Define conditions for your search
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filters.map((filter, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2"
                  >
                    <Select
                      value={filter.field}
                      onValueChange={(value) => {
                        const newFilters = [...filters];
                        newFilters[index].field = value;
                        setFilters(newFilters);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Field" />
                      </SelectTrigger>
                      <SelectContent>
                        {tables[
                          selectedTable as keyof typeof tables
                        ].fields.map((field) => (
                          <SelectItem key={field.name} value={field.name}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={filter.operator}
                      onValueChange={(value) => {
                        const newFilters = [...filters];
                        newFilters[index].operator = value;
                        setFilters(newFilters);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Operator" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">Equals</SelectItem>
                        <SelectItem value="contains">Contains</SelectItem>
                        <SelectItem value="greater">Greater than</SelectItem>
                        <SelectItem value="less">Less than</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setFilters(filters.filter((_, i) => i !== index));
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ))}

                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters([
                      ...filters,
                      { field: "", operator: "", value: "" },
                    ]);
                  }}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Add Filter
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sort Options */}
          <Card>
            <CardHeader>
              <CardTitle>4. Sort Results</CardTitle>
              <CardDescription>
                Define the order of your results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sorts.map((sort, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2"
                  >
                    <Select
                      value={sort.field}
                      onValueChange={(value) => {
                        const newSorts = [...sorts];
                        newSorts[index].field = value;
                        setSorts(newSorts);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Field" />
                      </SelectTrigger>
                      <SelectContent>
                        {tables[
                          selectedTable as keyof typeof tables
                        ].fields.map((field) => (
                          <SelectItem key={field.name} value={field.name}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={sort.direction}
                      onValueChange={(value: "asc" | "desc") => {
                        const newSorts = [...sorts];
                        newSorts[index].direction = value;
                        setSorts(newSorts);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Direction" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">Ascending</SelectItem>
                        <SelectItem value="desc">Descending</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSorts(sorts.filter((_, i) => i !== index));
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ))}

                <Button
                  variant="outline"
                  onClick={() => {
                    setSorts([...sorts, { field: "", direction: "asc" }]);
                  }}
                >
                  <TableIcon className="h-4 w-4 mr-2" />
                  Add Sort
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Search Button */}
          <div className="flex gap-4">
            <Button
              className="w-full"
              onClick={handleSearch}
              disabled={loading || selectedFields.length === 0}
            >
              {loading ? (
                <span className="animate-spin mr-2">⏳</span>
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Search
            </Button>

            {results.length > 0 && (
              <Button variant="outline" onClick={exportToExcel}>
                <Download className="h-4 w-4 mr-2" />
                Export to Excel
              </Button>
            )}
          </div>

          {/* Results Table */}
          {results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Results</CardTitle>
                <CardDescription>
                  Found {results.length} records
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {selectedFields.map((field) => (
                          <TableHead key={field}>
                            {
                              tables[
                                selectedTable as keyof typeof tables
                              ].fields.find((f) => f.name === field)?.label
                            }
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((row, i) => (
                        <TableRow key={i}>
                          {selectedFields.map((field) => (
                            <TableCell key={field}>
                              {formatCellValue(row[field as keyof typeof row])}
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
        </>
      )}

      {/* Add error display */}
      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
}

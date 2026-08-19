"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import MunicipiosList from "./MunicipiosList"
import USNGList from "./USNGList"
import PropertySearch from "./PropertySearch"
import CuencasList from "./CuencasList"
import { Layers } from "lucide-react"

export default function Sidebar({
  onUSNGSelect,
  onMunicipioSelect,
  onCuencaSelect,
}: {
  onUSNGSelect: (coords: number[], zoom: number) => void
  onMunicipioSelect: (coords: number[], zoom: number) => void
  onCuencaSelect: (cuenca: any) => void
}) {
  return (
    <aside className="flex w-80 shrink-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
            <Layers className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Map Explorer</p>
            <p className="text-xs text-muted-foreground">Browse geographic layers</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <Tabs defaultValue="municipios">
          <TabsList className="mb-4 grid h-9 w-full grid-cols-3 bg-muted/60 p-1">
            <TabsTrigger
              value="municipios"
              className="text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              Municipalities
            </TabsTrigger>
            <TabsTrigger
              value="usng"
              className="text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              USNG
            </TabsTrigger>
            <TabsTrigger
              value="cuencas"
              className="text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              Watersheds
            </TabsTrigger>
          </TabsList>
          <TabsContent value="municipios" className="mt-0">
            <MunicipiosList onMunicipioSelect={onMunicipioSelect} />
          </TabsContent>
          <TabsContent value="usng" className="mt-0">
            <USNGList onUSNGSelect={onUSNGSelect} />
          </TabsContent>
          <TabsContent value="cuencas" className="mt-0">
            <CuencasList onCuencaSelect={onCuencaSelect} />
          </TabsContent>
          <TabsContent value="properties" className="mt-0">
            <PropertySearch />
          </TabsContent>
        </Tabs>
      </div>
    </aside>
  )
}

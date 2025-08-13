"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import MunicipiosList from "./MunicipiosList"
import USNGList from "./USNGList"
import PropertySearch from "./PropertySearch"
import CuencasList from "./CuencasList"

export default function Sidebar({ 
  onUSNGSelect, 
  onMunicipioSelect,
  onCuencaSelect
}: { 
  onUSNGSelect: (coords: number[], zoom: number) => void,
  onMunicipioSelect: (coords: number[], zoom: number) => void,
  onCuencaSelect: (cuenca: any) => void
}) {
  return (
    <div className="w-80 bg-white shadow-md p-4 overflow-y-auto">
      <Tabs defaultValue="municipios">
        <TabsList className="w-full">
          <TabsTrigger value="municipios">Municipalities</TabsTrigger>
          <TabsTrigger value="usng">USNG</TabsTrigger>
          <TabsTrigger value="cuencas">Watersheds</TabsTrigger>
        </TabsList>
        <TabsContent value="municipios">
          <MunicipiosList onMunicipioSelect={onMunicipioSelect} />
        </TabsContent>
        <TabsContent value="usng">
          <USNGList onUSNGSelect={onUSNGSelect} />
        </TabsContent>
        <TabsContent value="cuencas">
          <CuencasList onCuencaSelect={onCuencaSelect} />
        </TabsContent>
        <TabsContent value="properties">
          <PropertySearch />
        </TabsContent>
      </Tabs>
    </div>
  )
}


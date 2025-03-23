import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const municipios = [
    { nombre: "Adjuntas", latitud: 18.1627, longitud: -66.7222, codigo_municipio: "001" },
    { nombre: "Aguada", latitud: 18.3788, longitud: -67.1882, codigo_municipio: "002" },
    { nombre: "Aguadilla", latitud: 18.4277, longitud: -67.1542, codigo_municipio: "003" },
    { nombre: "Aguas Buenas", latitud: 18.2569, longitud: -66.1019, codigo_municipio: "004" },
    { nombre: "Aibonito", latitud: 18.1400, longitud: -66.2663, codigo_municipio: "005" },
    { nombre: "Añasco", latitud: 18.2827, longitud: -67.1396, codigo_municipio: "006" },
    { nombre: "Arecibo", latitud: 18.4725, longitud: -66.7156, codigo_municipio: "007" },
    { nombre: "Arroyo", latitud: 17.9666, longitud: -66.0616, codigo_municipio: "008" },
    { nombre: "Barceloneta", latitud: 18.4505, longitud: -66.5385, codigo_municipio: "009" },
    { nombre: "Barranquitas", latitud: 18.1866, longitud: -66.3063, codigo_municipio: "010" },
    { nombre: "Bayamón", latitud: 18.3985, longitud: -66.1553, codigo_municipio: "011" },
    { nombre: "Cabo Rojo", latitud: 18.0866, longitud: -67.1457, codigo_municipio: "012" },
    { nombre: "Caguas", latitud: 18.2341, longitud: -66.0485, codigo_municipio: "013" },
    { nombre: "Camuy", latitud: 18.4838, longitud: -66.8843, codigo_municipio: "014" },
    { nombre: "Canóvanas", latitud: 18.3790, longitud: -65.9016, codigo_municipio: "015" },
    { nombre: "Carolina", latitud: 18.3805, longitud: -65.9572, codigo_municipio: "016" },
    { nombre: "Cataño", latitud: 18.4388, longitud: -66.1172, codigo_municipio: "017" },
    { nombre: "Cayey", latitud: 18.1119, longitud: -66.1646, codigo_municipio: "018" },
    { nombre: "Ceiba", latitud: 18.2627, longitud: -65.6486, codigo_municipio: "019" },
    { nombre: "Ciales", latitud: 18.3366, longitud: -66.4688, codigo_municipio: "020" },
    { nombre: "Cidra", latitud: 18.1760, longitud: -66.1616, codigo_municipio: "021" },
    { nombre: "Coamo", latitud: 18.0808, longitud: -66.3577, codigo_municipio: "022" },
    { nombre: "Comerío", latitud: 18.2177, longitud: -66.2261, codigo_municipio: "023" },
    { nombre: "Corozal", latitud: 18.3419, longitud: -66.3172, codigo_municipio: "024" },
    { nombre: "Culebra", latitud: 18.3030, longitud: -65.3010, codigo_municipio: "025" },
    { nombre: "Dorado", latitud: 18.4588, longitud: -66.2677, codigo_municipio: "026" },
    { nombre: "Fajardo", latitud: 18.3258, longitud: -65.6525, codigo_municipio: "027" },
    { nombre: "Florida", latitud: 18.3630, longitud: -66.5716, codigo_municipio: "028" },
    { nombre: "Guánica", latitud: 17.9711, longitud: -66.9080, codigo_municipio: "029" },
    { nombre: "Guayama", latitud: 17.9841, longitud: -66.1138, codigo_municipio: "030" },
    { nombre: "Guayanilla", latitud: 18.0191, longitud: -66.7927, codigo_municipio: "031" },
    { nombre: "Guaynabo", latitud: 18.3566, longitud: -66.1123, codigo_municipio: "032" },
    { nombre: "Gurabo", latitud: 18.2752, longitud: -65.9719, codigo_municipio: "033" },
    { nombre: "Hatillo", latitud: 18.4863, longitud: -66.8254, codigo_municipio: "034" },
    { nombre: "Hormigueros", latitud: 18.1397, longitud: -67.1277, codigo_municipio: "035" },
    { nombre: "Humacao", latitud: 18.1497, longitud: -65.8197, codigo_municipio: "036" },
    { nombre: "Isabela", latitud: 18.5005, longitud: -67.0244, codigo_municipio: "037" },
    { nombre: "Jayuya", latitud: 18.2191, longitud: -66.5916, codigo_municipio: "038" },
    { nombre: "Juana Díaz", latitud: 18.0527, longitud: -66.5066, codigo_municipio: "039" },
    { nombre: "Juncos", latitud: 18.2277, longitud: -65.9211, codigo_municipio: "040" },
    { nombre: "Lajas", latitud: 18.0505, longitud: -67.0597, codigo_municipio: "041" },
    { nombre: "Lares", latitud: 18.2947, longitud: -66.8777, codigo_municipio: "042" },
    { nombre: "Las Marías", latitud: 18.2519, longitud: -66.9925, codigo_municipio: "043" },
    { nombre: "Las Piedras", latitud: 18.1780, longitud: -65.8722, codigo_municipio: "044" },
    { nombre: "Loíza", latitud: 18.4313, longitud: -65.8780, codigo_municipio: "045" },
    { nombre: "Luquillo", latitud: 18.3738, longitud: -65.7163, codigo_municipio: "046" },
    { nombre: "Manatí", latitud: 18.4283, longitud: -66.4919, codigo_municipio: "047" },
    { nombre: "Maricao", latitud: 18.1808, longitud: -66.9797, codigo_municipio: "048" },
    { nombre: "Maunabo", latitud: 18.0072, longitud: -65.8991, codigo_municipio: "049" },
    { nombre: "Mayagüez", latitud: 18.2011, longitud: -67.1397, codigo_municipio: "050" },
    { nombre: "Moca", latitud: 18.3947, longitud: -67.1127, codigo_municipio: "051" },
    { nombre: "Morovis", latitud: 18.3252, longitud: -66.4066, codigo_municipio: "052" },
    { nombre: "Naguabo", latitud: 18.2119, longitud: -65.7366, codigo_municipio: "053" },
    { nombre: "Naranjito", latitud: 18.3016, longitud: -66.2444, codigo_municipio: "054" },
    { nombre: "Orocovis", latitud: 18.2277, longitud: -66.3897, codigo_municipio: "055" },
    { nombre: "Patillas", latitud: 18.0063, longitud: -66.0133, codigo_municipio: "056" },
    { nombre: "Peñuelas", latitud: 18.0558, longitud: -66.7213, codigo_municipio: "057" },
    { nombre: "Ponce", latitud: 18.0111, longitud: -66.6141, codigo_municipio: "058" },
    { nombre: "Quebradillas", latitud: 18.4727, longitud: -66.9388, codigo_municipio: "059" },
    { nombre: "Rincón", latitud: 18.3402, longitud: -67.2502, codigo_municipio: "060" },
    { nombre: "Río Grande", latitud: 18.3802, longitud: -65.8305, codigo_municipio: "061" },
    { nombre: "Sabana Grande", latitud: 18.0777, longitud: -66.9613, codigo_municipio: "062" },
    { nombre: "Salinas", latitud: 17.9761, longitud: -66.2977, codigo_municipio: "063" },
    { nombre: "San Germán", latitud: 18.0816, longitud: -67.0352, codigo_municipio: "064" },
    { nombre: "San Juan", latitud: 18.4655, longitud: -66.1057, codigo_municipio: "065" },
    { nombre: "San Lorenzo", latitud: 18.1877, longitud: -65.9602, codigo_municipio: "066" },
    { nombre: "San Sebastián", latitud: 18.3355, longitud: -66.9902, codigo_municipio: "067" },
    { nombre: "Santa Isabel", latitud: 17.9658, longitud: -66.4049, codigo_municipio: "068" },
    { nombre: "Toa Alta", latitud: 18.3883, longitud: -66.2477, codigo_municipio: "069" },
    { nombre: "Toa Baja", latitud: 18.4433, longitud: -66.2616, codigo_municipio: "070" },
    { nombre: "Trujillo Alto", latitud: 18.3549, longitud: -66.0075, codigo_municipio: "071" },
    { nombre: "Utuado", latitud: 18.2655, longitud: -66.7008, codigo_municipio: "072" },
    { nombre: "Vega Alta", latitud: 18.4122, longitud: -66.3313, codigo_municipio: "073" },
    { nombre: "Vega Baja", latitud: 18.4444, longitud: -66.3877, codigo_municipio: "074" },
    { nombre: "Vieques", latitud: 18.1263, longitud: -65.4402, codigo_municipio: "075" },
    { nombre: "Villalba", latitud: 18.1277, longitud: -66.4922, codigo_municipio: "076" },
    { nombre: "Yabucoa", latitud: 18.0505, longitud: -65.8797, codigo_municipio: "077" },
    { nombre: "Yauco", latitud: 18.0355, longitud: -66.8580, codigo_municipio: "078" }
]

async function main() {
  console.log('Starting to seed municipios...')
  
  try {
    for (const municipio of municipios) {
      await prisma.municipio.upsert({
        where: { codigo_municipio: municipio.codigo_municipio },
        update: municipio,
        create: municipio,
      })
      console.log(`Upserted municipio: ${municipio.nombre}`)
    }
    
    console.log('Seeding municipios completed!')
  } catch (error) {
    console.error('Error seeding municipios:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 
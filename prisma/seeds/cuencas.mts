import { PrismaClient } from '@prisma/client'
import { fileURLToPath } from 'url'
import * as url from 'url'

const prisma = new PrismaClient()

const cuencaTypes = [
  "Río Principal",
  "Afluente",
  "Quebrada",
  "Riachuelo"
]

async function seedCuencas() {
  try {
    console.log('Starting cuencas seeding...')

    const usngSquares = await prisma.uSNGSquare.findMany()
    console.log(`Found ${usngSquares.length} USNG squares`)
    
    for (const grid of usngSquares) {
      const numCuencas = Math.floor(Math.random() * 3) // 0-2 cuencas per grid
      
      for (let i = 0; i < numCuencas; i++) {
        try {
          const cuencaData = {
            nombre: `Cuenca ${grid.usng}-${i + 1}`,
            codigo_cuenca: `CUE-${grid.usng}-${i + 1}`,
            geometria: {
              type: "LineString",
              coordinates: [
                [parseFloat(grid.longitudes.split(',')[0]), parseFloat(grid.latitudes.split(',')[0])],
                [parseFloat(grid.longitudes.split(',')[1]), parseFloat(grid.latitudes.split(',')[1])]
              ]
            },
            gridId: grid.id  // This is correct - using USNGSquare id
          }

          await prisma.cuenca.create({
            data: cuencaData
          })
        } catch (error) {
          console.error(`Error creating cuenca for grid ${grid.usng}:`, error)
          continue
        }
      }
    }

    console.log('Cuencas seeding completed')
  } catch (error) {
    console.error('Error seeding cuencas:', error)
    throw error
  }
}

async function main() {
  try {
    await seedCuencas()
  } catch (error) {
    console.error('Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (import.meta.url === url.pathToFileURL(process.argv[1]).href) {
  main()
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
}

export { seedCuencas } 
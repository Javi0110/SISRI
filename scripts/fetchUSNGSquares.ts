import { PrismaClient } from '@prisma/client'
import { EsriJSON } from 'ol/format.js'
import proj4 from 'proj4'
import fetch from 'node-fetch'

const prisma = new PrismaClient()
const format = new EsriJSON()

// Rest of your code remains the same... 
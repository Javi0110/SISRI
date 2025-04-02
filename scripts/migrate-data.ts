import { PrismaClient as SQLitePrisma } from '@prisma/client';
import { PrismaClient as PostgresPrisma } from '@prisma/client';

async function main() {
  // Connect to SQLite
  const sqlitePrisma = new SQLitePrisma({
    datasources: {
      db: {
        url: "file:./prisma/db.sqlite"
      }
    }
  });

  // Connect to PostgreSQL
  const postgresPrisma = new PostgresPrisma({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  try {
    // Migrate Municipios
    const municipios = await sqlitePrisma.municipio.findMany();
    for (const municipio of municipios) {
      await postgresPrisma.municipio.create({
        data: municipio
      });
    }

    // Migrate Barrios
    const barrios = await sqlitePrisma.barrio.findMany();
    for (const barrio of barrios) {
      await postgresPrisma.barrio.create({
        data: barrio
      });
    }

    // Migrate Sectors
    const sectors = await sqlitePrisma.sector.findMany();
    for (const sector of sectors) {
      await postgresPrisma.sector.create({
        data: sector
      });
    }

    // Migrate USNGSquares
    const usngSquares = await sqlitePrisma.uSNGSquare.findMany();
    for (const square of usngSquares) {
      await postgresPrisma.uSNGSquare.create({
        data: square
      });
    }

    // Migrate Cuencas
    const cuencas = await sqlitePrisma.cuenca.findMany();
    for (const cuenca of cuencas) {
      await postgresPrisma.cuenca.create({
        data: cuenca
      });
    }

    // Migrate Properties
    const properties = await sqlitePrisma.propiedades_Existentes.findMany();
    for (const property of properties) {
      await postgresPrisma.propiedades_Existentes.create({
        data: property
      });
    }

    // Migrate Events and related data
    const events = await sqlitePrisma.eventos.findMany({
      include: {
        incidentes: true,
        propiedades_afectadas: true
      }
    });

    for (const event of events) {
      await postgresPrisma.eventos.create({
        data: {
          ...event,
          incidentes: {
            create: event.incidentes
          },
          propiedades_afectadas: {
            create: event.propiedades_afectadas
          }
        }
      });
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sqlitePrisma.$disconnect();
    await postgresPrisma.$disconnect();
  }
}

main(); 
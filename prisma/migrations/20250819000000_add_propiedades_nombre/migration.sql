-- Adds the nombre column expected by Prisma schema and property creation flows.
ALTER TABLE sisri.propiedades_existentes
ADD COLUMN IF NOT EXISTS nombre VARCHAR(255);

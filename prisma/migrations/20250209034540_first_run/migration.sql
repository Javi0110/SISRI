-- CreateTable
CREATE TABLE "Municipio" (
    "id_municipio" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "latitud" REAL NOT NULL,
    "longitud" REAL NOT NULL,
    "codigo_municipio" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Barrio" (
    "id_barrio" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "codigo_barrio" TEXT NOT NULL,
    "id_municipio" INTEGER NOT NULL,
    CONSTRAINT "Barrio_id_municipio_fkey" FOREIGN KEY ("id_municipio") REFERENCES "Municipio" ("id_municipio") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sector" (
    "id_sector" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "codigo_sector" TEXT NOT NULL,
    "id_barrio" INTEGER NOT NULL,
    CONSTRAINT "Sector_id_barrio_fkey" FOREIGN KEY ("id_barrio") REFERENCES "Barrio" ("id_barrio") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Propiedades_Existentes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "valor" REAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "id_municipio" INTEGER NOT NULL,
    "id_barrio" INTEGER NOT NULL,
    "id_sector" INTEGER NOT NULL,
    "gridId" INTEGER NOT NULL,
    "geometria" JSONB NOT NULL,
    CONSTRAINT "Propiedades_Existentes_id_municipio_fkey" FOREIGN KEY ("id_municipio") REFERENCES "Municipio" ("id_municipio") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Propiedades_Existentes_id_barrio_fkey" FOREIGN KEY ("id_barrio") REFERENCES "Barrio" ("id_barrio") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Propiedades_Existentes_id_sector_fkey" FOREIGN KEY ("id_sector") REFERENCES "Sector" ("id_sector") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Propiedades_Existentes_gridId_fkey" FOREIGN KEY ("gridId") REFERENCES "KilometerGrid" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KilometerGrid" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usngCode" TEXT NOT NULL,
    "geometria" JSONB NOT NULL
);

-- CreateTable
CREATE TABLE "Cuenca" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "geometria" JSONB NOT NULL,
    "gridId" INTEGER NOT NULL,
    CONSTRAINT "Cuenca_gridId_fkey" FOREIGN KEY ("gridId") REFERENCES "KilometerGrid" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Eventos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "notificacionId" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "gridId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Eventos_notificacionId_fkey" FOREIGN KEY ("notificacionId") REFERENCES "Notificacion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Eventos_gridId_fkey" FOREIGN KEY ("gridId") REFERENCES "KilometerGrid" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Incidentes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "eventoId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cuencaId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Incidentes_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Eventos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Incidentes_cuencaId_fkey" FOREIGN KEY ("cuencaId") REFERENCES "Cuenca" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EventosPropiedades" (
    "eventoId" INTEGER NOT NULL,
    "propiedadId" INTEGER NOT NULL,
    "daños" TEXT,

    PRIMARY KEY ("eventoId", "propiedadId"),
    CONSTRAINT "EventosPropiedades_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "Eventos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EventosPropiedades_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedades_Existentes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_IncidentesToPropiedades_Existentes" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_IncidentesToPropiedades_Existentes_A_fkey" FOREIGN KEY ("A") REFERENCES "Incidentes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_IncidentesToPropiedades_Existentes_B_fkey" FOREIGN KEY ("B") REFERENCES "Propiedades_Existentes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "KilometerGrid_usngCode_key" ON "KilometerGrid"("usngCode");

-- CreateIndex
CREATE UNIQUE INDEX "_IncidentesToPropiedades_Existentes_AB_unique" ON "_IncidentesToPropiedades_Existentes"("A", "B");

-- CreateIndex
CREATE INDEX "_IncidentesToPropiedades_Existentes_B_index" ON "_IncidentesToPropiedades_Existentes"("B");

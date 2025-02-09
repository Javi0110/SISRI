/*
  Warnings:

  - A unique constraint covering the columns `[codigo_municipio]` on the table `Municipio` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Municipio_codigo_municipio_key" ON "Municipio"("codigo_municipio");

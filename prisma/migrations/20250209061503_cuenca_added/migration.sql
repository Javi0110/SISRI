/*
  Warnings:

  - Added the required column `codigo_cuenca` to the `Cuenca` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Cuenca" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "codigo_cuenca" TEXT NOT NULL,
    "gridId" INTEGER NOT NULL,
    "geometria" JSONB NOT NULL,
    CONSTRAINT "Cuenca_gridId_fkey" FOREIGN KEY ("gridId") REFERENCES "KilometerGrid" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Cuenca" ("geometria", "gridId", "id", "nombre") SELECT "geometria", "gridId", "id", "nombre" FROM "Cuenca";
DROP TABLE "Cuenca";
ALTER TABLE "new_Cuenca" RENAME TO "Cuenca";
CREATE UNIQUE INDEX "Cuenca_codigo_cuenca_key" ON "Cuenca"("codigo_cuenca");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

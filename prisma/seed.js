"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var mgrs_1 = require("mgrs");
var prisma = new client_1.PrismaClient();
var municipios = [
    {
        nombre: "Adjuntas",
        latitud: 18.1627,
        longitud: -66.7222,
        codigo_municipio: "001"
    },
    {
        nombre: "Aguada",
        latitud: 18.3788,
        longitud: -67.1883,
        codigo_municipio: "003"
    },
    {
        nombre: "Aguadilla",
        latitud: 18.4277,
        longitud: -67.1547,
        codigo_municipio: "005"
    },
    {
        nombre: "Aguas Buenas",
        latitud: 18.2569,
        longitud: -66.1019,
        codigo_municipio: "007"
    },
    {
        nombre: "Aibonito",
        latitud: 18.1400,
        longitud: -66.2663,
        codigo_municipio: "009"
    },
    {
        nombre: "Añasco",
        latitud: 18.2827,
        longitud: -67.1396,
        codigo_municipio: "011"
    },
    {
        nombre: "Arecibo",
        latitud: 18.4725,
        longitud: -66.7156,
        codigo_municipio: "013"
    },
    {
        nombre: "Arroyo",
        latitud: 17.9666,
        longitud: -66.0613,
        codigo_municipio: "015"
    },
    // ... Add all other municipalities
];
var property_types = ["Residential", "Commercial", "Industrial", "Agricultural"];
// Configuration for seeding control
var SEED_CONFIG = {
    TABLES: {
        KILOMETER_GRID: false, // Set to true to populate KilometerGrid
        MUNICIPIOS: false, // Set to true to populate Municipios
        PROPERTIES: false, // Set to true to populate Properties
        CUENCAS: true, // Set to true to populate Cuencas
    },
    CLEAR_BEFORE_SEED: {
        PROPERTIES: false, // Set to true to clear properties before seeding
        CUENCAS: false, // Set to true to clear cuencas before seeding
    },
    LIMITS: {
        MAX_TOTAL_PROPERTIES: 200,
        PROPERTIES_PER_GRID: 2,
        MAX_CUENCAS_PER_GRID: 3
    },
    PROPERTY_TYPES: ["Residential", "Commercial", "Industrial", "Agricultural"]
};
var cuencaNames = [
    "Río Grande de Loíza",
    "Río de la Plata",
    "Río Cibuco",
    "Río Guajataca",
    "Río Grande de Arecibo",
    "Río Bayamón",
    "Río Humacao",
    "Río Añasco",
    "Río Guanajibo",
    "Río Portugués"
];
// Function to convert lat/lon to USNG with 1000m precision
function convertLatLngToUSNG(lat, lon) {
    try {
        var usng1000m = mgrs_1.default.forward([lon, lat], 4); // 4-digit precision for 1000m grid
        return usng1000m.replace(/\s/g, ''); // Remove spaces
    }
    catch (error) {
        console.error("Error converting coordinates (".concat(lat, ", ").concat(lon, ") to USNG:"), error);
        throw error;
    }
}
// Function to calculate centroid and USNG code
function calculateCentroidAndUSNG(rings) {
    try {
        var firstRing = rings[0];
        var sumX_1 = 0;
        var sumY_1 = 0;
        firstRing.forEach(function (point) {
            sumX_1 += point[0];
            sumY_1 += point[1];
        });
        var centerLon = sumX_1 / firstRing.length;
        var centerLat = sumY_1 / firstRing.length;
        return {
            centroid: {
                type: "Point",
                coordinates: [centerLon, centerLat]
            },
            usngCode: convertLatLngToUSNG(centerLat, centerLon)
        };
    }
    catch (error) {
        console.error('Error calculating centroid and USNG:', error);
        throw error;
    }
}
// Function to fetch USNG grid features with pagination and retry logic
function fetchUSNGFeatures() {
    return __awaiter(this, arguments, void 0, function (offset, retryCount) {
        var url, response, error_1;
        if (offset === void 0) { offset = 0; }
        if (retryCount === void 0) { retryCount = 3; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = 'https://services2.arcgis.com/FiaPA4ga0iQKduv3/ArcGIS/rest/services/US_National_Grid_HFL_V/FeatureServer/3/query?' +
                        'f=json&' +
                        'returnGeometry=true&' +
                        'spatialRel=esriSpatialRelIntersects&' +
                        'where=1=1&' +
                        'outFields=USNG&' +
                        'outSR=4326&' +
                        'inSR=102100&' +
                        'resultOffset=' + offset + '&' +
                        'resultRecordCount=2000&' +
                        'geometry=' + encodeURIComponent(JSON.stringify({
                        xmin: -7526593.264043136,
                        ymin: 1941281.9702659545,
                        xmax: -7250000.369888829,
                        ymax: 2213831.9532818417,
                        spatialReference: { wkid: 3857 }
                    }));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 7]);
                    return [4 /*yield*/, fetch(url)];
                case 2:
                    response = _a.sent();
                    if (!response.ok) {
                        throw new Error("HTTP error! status: ".concat(response.status));
                    }
                    return [4 /*yield*/, response.json()];
                case 3: return [2 /*return*/, _a.sent()];
                case 4:
                    error_1 = _a.sent();
                    if (!(retryCount > 0)) return [3 /*break*/, 6];
                    console.warn("Retrying fetch (".concat(retryCount, " attempts remaining)..."));
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1000); })]; // Wait 1 second before retry
                case 5:
                    _a.sent(); // Wait 1 second before retry
                    return [2 /*return*/, fetchUSNGFeatures(offset, retryCount - 1)];
                case 6:
                    console.error('Error fetching USNG features:', error_1);
                    throw error_1;
                case 7: return [2 /*return*/];
            }
        });
    });
}
function createBarriosAndSectores(municipioId) {
    return __awaiter(this, void 0, void 0, function () {
        var barrio;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma.barrio.create({
                        data: {
                            nombre: "Barrio ".concat(municipioId, "-1"),
                            codigo_barrio: "".concat(municipioId, "01"),
                            id_municipio: municipioId,
                            sectores: {
                                create: {
                                    nombre: "Sector ".concat(municipioId, "-1"),
                                    codigo_sector: "".concat(municipioId, "01")
                                }
                            }
                        },
                        include: {
                            sectores: true
                        }
                    })];
                case 1:
                    barrio = _a.sent();
                    return [2 /*return*/, {
                            barrioId: barrio.id_barrio,
                            sectorId: barrio.sectores[0].id_sector
                        }];
            }
        });
    });
}
function generateRandomProperties(gridId, municipioId, barrioId, sectorId) {
    var numProperties = Math.floor(Math.random() * 5) + 1;
    var properties = [];
    for (var i = 0; i < numProperties; i++) {
        properties.push({
            valor: Math.floor(Math.random() * 450000) + 50000,
            tipo: property_types[Math.floor(Math.random() * property_types.length)],
            id_municipio: municipioId,
            id_barrio: barrioId,
            id_sector: sectorId,
            gridId: gridId,
            geometria: {
                type: "Point",
                coordinates: [0, 0]
            }
        });
    }
    return properties;
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var offset, totalFeatures, hasMoreFeatures, processedUSNG, data, _i, _a, feature, _b, centroid, usngCode, error_2, properties, updatedProperties, _c, properties_1, property, geom, _d, lon, lat, usngCode, grid, error_3, _e, _f, grid, numCuencas, i, randomCuencaName, coordinates, error_4, error_5;
        var _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    console.log('Starting seed process...');
                    _h.label = 1;
                case 1:
                    _h.trys.push([1, 38, 39, 41]);
                    // First clear all dependent tables
                    console.log('Clearing existing data...');
                    // Clear Cuencas first
                    return [4 /*yield*/, prisma.cuenca.deleteMany()
                        // Clear Properties next
                    ];
                case 2:
                    // Clear Cuencas first
                    _h.sent();
                    // Clear Properties next
                    return [4 /*yield*/, prisma.propiedades_Existentes.updateMany({
                            data: {
                                gridId: undefined
                            }
                        })];
                case 3:
                    // Clear Properties next
                    _h.sent();
                    return [4 /*yield*/, prisma.propiedades_Existentes.deleteMany()
                        // Finally clear KilometerGrid
                    ];
                case 4:
                    _h.sent();
                    // Finally clear KilometerGrid
                    return [4 /*yield*/, prisma.kilometerGrid.deleteMany()];
                case 5:
                    // Finally clear KilometerGrid
                    _h.sent();
                    console.log('Successfully cleared existing data');
                    // Fetch and populate USNG grid data
                    console.log('Fetching USNG grid data...');
                    offset = 0;
                    totalFeatures = 0;
                    hasMoreFeatures = true;
                    processedUSNG = new Set();
                    _h.label = 6;
                case 6:
                    if (!hasMoreFeatures) return [3 /*break*/, 16];
                    return [4 /*yield*/, fetchUSNGFeatures(offset)];
                case 7:
                    data = _h.sent();
                    if (!(data.features && data.features.length > 0)) return [3 /*break*/, 14];
                    console.log("Processing batch of ".concat(data.features.length, " features..."));
                    _i = 0, _a = data.features;
                    _h.label = 8;
                case 8:
                    if (!(_i < _a.length)) return [3 /*break*/, 13];
                    feature = _a[_i];
                    _h.label = 9;
                case 9:
                    _h.trys.push([9, 11, , 12]);
                    _b = calculateCentroidAndUSNG(feature.geometry.rings), centroid = _b.centroid, usngCode = _b.usngCode;
                    // Skip if we've already processed this USNG code
                    if (processedUSNG.has(usngCode)) {
                        console.warn("Duplicate USNG code found: ".concat(usngCode));
                        return [3 /*break*/, 12];
                    }
                    return [4 /*yield*/, prisma.kilometerGrid.create({
                            data: {
                                usngCode: usngCode,
                                geometria: centroid
                            }
                        })];
                case 10:
                    _h.sent();
                    processedUSNG.add(usngCode);
                    totalFeatures++;
                    if (totalFeatures % 100 === 0) {
                        console.log("Processed ".concat(totalFeatures, " features..."));
                    }
                    return [3 /*break*/, 12];
                case 11:
                    error_2 = _h.sent();
                    console.error("Error processing feature:", error_2);
                    return [3 /*break*/, 12];
                case 12:
                    _i++;
                    return [3 /*break*/, 8];
                case 13:
                    if (data.exceededTransferLimit) {
                        offset += data.features.length;
                    }
                    else {
                        hasMoreFeatures = false;
                    }
                    return [3 /*break*/, 15];
                case 14:
                    hasMoreFeatures = false;
                    _h.label = 15;
                case 15: return [3 /*break*/, 6];
                case 16:
                    console.log("Successfully populated KilometerGrid with ".concat(totalFeatures, " USNG grid cells"));
                    // Update existing properties with new grid references
                    console.log('Updating property references...');
                    return [4 /*yield*/, prisma.propiedades_Existentes.findMany({
                            select: {
                                id: true,
                                geometria: true
                            }
                        })];
                case 17:
                    properties = _h.sent();
                    updatedProperties = 0;
                    _c = 0, properties_1 = properties;
                    _h.label = 18;
                case 18:
                    if (!(_c < properties_1.length)) return [3 /*break*/, 25];
                    property = properties_1[_c];
                    _h.label = 19;
                case 19:
                    _h.trys.push([19, 23, , 24]);
                    geom = property.geometria;
                    if (!(geom === null || geom === void 0 ? void 0 : geom.coordinates)) return [3 /*break*/, 22];
                    _d = geom.coordinates, lon = _d[0], lat = _d[1];
                    usngCode = convertLatLngToUSNG(lat, lon);
                    return [4 /*yield*/, prisma.kilometerGrid.findFirst({
                            where: { usngCode: usngCode }
                        })];
                case 20:
                    grid = _h.sent();
                    if (!grid) return [3 /*break*/, 22];
                    return [4 /*yield*/, prisma.propiedades_Existentes.update({
                            where: { id: property.id },
                            data: { gridId: grid.id }
                        })];
                case 21:
                    _h.sent();
                    updatedProperties++;
                    _h.label = 22;
                case 22: return [3 /*break*/, 24];
                case 23:
                    error_3 = _h.sent();
                    console.error("Error updating property ".concat(property.id, ":"), error_3);
                    return [3 /*break*/, 24];
                case 24:
                    _c++;
                    return [3 /*break*/, 18];
                case 25:
                    console.log("Updated ".concat(updatedProperties, " properties with grid references"));
                    if (!SEED_CONFIG.TABLES.CUENCAS) return [3 /*break*/, 37];
                    if (!SEED_CONFIG.CLEAR_BEFORE_SEED.CUENCAS) return [3 /*break*/, 27];
                    console.log('Clearing existing cuencas...');
                    return [4 /*yield*/, prisma.cuenca.deleteMany({})];
                case 26:
                    _h.sent();
                    _h.label = 27;
                case 27:
                    console.log('Start seeding cuencas...');
                    _e = 0;
                    return [4 /*yield*/, prisma.kilometerGrid.findMany()];
                case 28:
                    _f = _h.sent();
                    _h.label = 29;
                case 29:
                    if (!(_e < _f.length)) return [3 /*break*/, 36];
                    grid = _f[_e];
                    numCuencas = Math.floor(Math.random() * SEED_CONFIG.LIMITS.MAX_CUENCAS_PER_GRID) + 1;
                    i = 0;
                    _h.label = 30;
                case 30:
                    if (!(i < numCuencas)) return [3 /*break*/, 35];
                    randomCuencaName = cuencaNames[Math.floor(Math.random() * cuencaNames.length)];
                    _h.label = 31;
                case 31:
                    _h.trys.push([31, 33, , 34]);
                    coordinates = (_g = grid.geometria.coordinates) !== null && _g !== void 0 ? _g : [0, 0];
                    return [4 /*yield*/, prisma.cuenca.create({
                            data: {
                                nombre: randomCuencaName,
                                codigo_cuenca: "CUE-".concat(grid.usngCode, "-").concat(i + 1),
                                gridId: grid.id,
                                geometria: {
                                    type: "Point",
                                    coordinates: [
                                        Number(coordinates[0]),
                                        Number(coordinates[1])
                                    ]
                                }
                            }
                        })];
                case 32:
                    _h.sent();
                    return [3 /*break*/, 34];
                case 33:
                    error_4 = _h.sent();
                    console.error("Error creating cuenca for grid ".concat(grid.usngCode, ":"), error_4);
                    return [3 /*break*/, 34];
                case 34:
                    i++;
                    return [3 /*break*/, 30];
                case 35:
                    _e++;
                    return [3 /*break*/, 29];
                case 36:
                    console.log('Cuencas seeding completed');
                    _h.label = 37;
                case 37:
                    console.log('Seeding process completed successfully');
                    return [3 /*break*/, 41];
                case 38:
                    error_5 = _h.sent();
                    console.error('Error in main:', error_5);
                    throw error_5;
                case 39: return [4 /*yield*/, prisma.$disconnect()];
                case 40:
                    _h.sent();
                    return [7 /*endfinally*/];
                case 41: return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error(e);
    process.exit(1);
});

# SISRI API Documentation

## Overview
The SISRI API is built using Next.js API routes and provides endpoints for managing incidents, properties, residents, and geospatial data. All endpoints are RESTful and return JSON responses.

## Base URL
```
/api
```

## Authentication
All API endpoints require authentication. Include the authentication token in the request header:
```
Authorization: Bearer <token>
```

## Endpoints

### Events Management

#### Get All Events
```
GET /api/events
```
Response:
```json
{
  "events": [
    {
      "id": 1,
      "titulo": "string",
      "descripcion": "string",
      "fecha": "datetime",
      "tipo": "string",
      "estado": "string",
      "usngId": "number",
      "cuencaId": "number",
      "createdAt": "datetime",
      "updatedAt": "datetime"
    }
  ]
}
```

#### Create Event
```
POST /api/events
```
Request Body:
```json
{
  "titulo": "string",
  "descripcion": "string",
  "tipo": "string",
  "usngId": "number",
  "cuencaId": "number"
}
```

#### Update Event
```
PUT /api/events/:id
```
Request Body:
```json
{
  "titulo": "string",
  "descripcion": "string",
  "tipo": "string",
  "estado": "string",
  "usngId": "number",
  "cuencaId": "number"
}
```

#### Delete Event
```
DELETE /api/events/:id
```

### Properties Management

#### Get All Properties
```
GET /api/properties
```
Response:
```json
{
  "properties": [
    {
      "id": 1,
      "tipo": "string",
      "gridId": "number",
      "geometria": "string",
      "usngId": "number",
      "id_municipio": "number",
      "id_barrio": "number",
      "id_sector": "number"
    }
  ]
}
```

#### Create Property
```
POST /api/properties
```
Request Body:
```json
{
  "tipo": "string",
  "gridId": "number",
  "geometria": "string",
  "usngId": "number",
  "id_municipio": "number",
  "id_barrio": "number",
  "id_sector": "number"
}
```

### Residents Management

#### Get All Residents
```
GET /api/residents
```
Response:
```json
{
  "residents": [
    {
      "id": 1,
      "nombre": "string",
      "categoria": "string",
      "rol": "string",
      "edad": "number",
      "limitacion": "string",
      "condicion": "string",
      "disposicion": "string",
      "propiedad_id": "number",
      "id_municipio": "number",
      "id_barrio": "number",
      "id_sector": "number",
      "usngId": "number"
    }
  ]
}
```

#### Create Resident
```
POST /api/residents
```
Request Body:
```json
{
  "nombre": "string",
  "categoria": "string",
  "rol": "string",
  "edad": "number",
  "limitacion": "string",
  "condicion": "string",
  "disposicion": "string",
  "propiedad_id": "number",
  "id_municipio": "number",
  "id_barrio": "number",
  "id_sector": "number",
  "usngId": "number"
}
```

### Geospatial Data

#### Get USNG Grid Data
```
GET /api/geospatial/usng/:id
```
Response:
```json
{
  "id": 1,
  "usng": "string",
  "geometry": "string",
  "latitudes": "string",
  "longitudes": "string"
}
```

#### Get Watershed Data
```
GET /api/geospatial/watersheds
```
Response:
```json
{
  "watersheds": [
    {
      "id": 1,
      "nombre": "string",
      "codigo_cuenca": "string",
      "geometria": "string",
      "id_municipio": "number",
      "id_barrio": "number",
      "id_sector": "number",
      "usngId": "number"
    }
  ]
}
```

### Notifications

#### Get Event Notifications
```
GET /api/notifications/event/:eventId
```
Response:
```json
{
  "notifications": [
    {
      "id": 1,
      "eventoId": "number",
      "tipo": "string",
      "mensaje": "string",
      "fecha_creacion": "datetime",
      "estado": "string"
    }
  ]
}
```

#### Create Notification
```
POST /api/notifications
```
Request Body:
```json
{
  "eventoId": "number",
  "tipo": "string",
  "mensaje": "string"
}
```

## Error Handling

All API endpoints follow a consistent error response format:

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": "object"
  }
}
```

Common error codes:
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

## Rate Limiting

API requests are limited to:
- 100 requests per minute for authenticated users
- 20 requests per minute for unauthenticated users

## Data Validation

All request bodies are validated using Zod schemas. Invalid data will return a 400 Bad Request response with validation details.

## Pagination

List endpoints support pagination using the following query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

Response includes pagination metadata:
```json
{
  "data": [],
  "pagination": {
    "total": "number",
    "page": "number",
    "limit": "number",
    "pages": "number"
  }
}
```

## Versioning

The API is versioned through the URL path:
```
/api/v1/...
```

Current version: v1 
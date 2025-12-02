# Documentación API - Plataforma Inmobiliaria

---

## Tabla de Contenidos

- [Autenticación](#autenticación)
- [Citas (Appointments)](#citas-appointments)
- [Subastas (Auctions)](#subastas-auctions)
- [Agendamientos Grupales](#agendamientos-grupales)
- [Propiedades](#propiedades)

---

## Autenticación

La mayoría de los endpoints necesitan un token JWT para funcionar.

**Header necesario:**
```
Authorization: Bearer <tu-token-jwt>
```

**Roles:**
- **Usuario normal**: Puede ver y comprar propiedades
- **Admin**: Tiene permisos extra para gestionar el sistema

---

## Citas (Appointments)

### 1. Validar una Cita

Actualiza el estado de una cita después de ser procesada por otro grupo.

**Endpoint:** `POST /appointments/validate`

**Body:**
```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "deposit_token": "abc123token",
  "status": "ACCEPTED",
  "reason": "Validación exitosa",
  "timestamp": "2025-12-01T10:30:00Z"
}
```

**Estados válidos:**
- `ACCEPTED` - Cita aceptada
- `REJECTED` - Cita rechazada
- `error` - Hubo un error
- `OK` - Todo bien

**Respuesta:**
```json
{
  "message": "Visita Actualizada",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "new_status": "ACCEPTED"
}
```

---

### 2. Crear Solicitud de Cita (desde otro grupo)

Registra una solicitud de cita que viene de otro grupo.

**Endpoint:** `POST /appointments/requests`

**Body:**
```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "deposit_token": "abc123token",
  "group_id": "04",
  "url": "https://example.com/property/123",
  "timestamp": "2025-12-01T10:30:00Z"
}
```

**Respuesta:**
```json
{
  "message": "Reserva Creada",
  "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### 3. Ver Mis Citas

Muestra todas las citas del usuario conectado.

**Endpoint:** `GET /appointments`

**Headers:**
```
Authorization: Bearer <tu-token>
```

**Respuesta:**
```json
[
  {
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "property_url": "https://example.com/property/123",
    "status": "ACCEPTED",
    "reason": "APPOINTMENT",
    "created_at": "2025-12-01T10:30:00Z"
  }
]
```

---

### 4. Ver Todas las Citas (Solo Admin)

Muestra todas las citas del sistema.

**Endpoint:** `GET /appointments/all`

**Headers:**
```
Authorization: Bearer <token-admin>
```

---

### 5. Ver Estado de una Cita

Consulta el estado de una cita específica.

**Endpoint:** `GET /appointments/status/:request_id`

**Ejemplo:** `GET /appointments/status/550e8400-e29b-41d4-a716-446655440000`

**Respuesta:**
```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "ACCEPTED",
  "reason": "APPOINTMENT"
}
```

---

### 6. Comprar una Cita

Inicia el proceso de compra de una cita para visitar una propiedad.

**Endpoint:** `POST /appointments/buy`

**Headers:**
```
Authorization: Bearer <tu-token>
```

**Body:**
```json
{
  "property_id": "prop-123-abc"
}
```

**Respuesta:**
```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PENDING",
  "deposit_token": "webpay-token-xyz",
  "url": "https://webpay.transbank.cl/..."
}
```

**¿Qué hace?**
- Elimina citas pendientes anteriores
- Calcula el 10% del precio como depósito
- Crea una transacción en Webpay
- Te devuelve la URL para pagar

---

### 7. Validar Pago de Cita

Confirma el pago realizado a través de Webpay.

**Endpoint:** `POST /appointments/validatebuy`

**Body:**
```json
{
  "ws_token": "webpay-token-xyz"
}
```

**Respuesta exitosa:**
```json
{
  "message": "Transacción aceptada y cita confirmada",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "property": "https://example.com/property/123",
  "pdf_url": "https://s3.amazonaws.com/confirmations/abc123.pdf"
}
```

**Si fue rechazado:**
```json
{
  "message": "Transacción rechazada",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "property": "https://example.com/property/123"
}
```

**¿Qué hace?**
- Confirma el pago con Webpay
- Envía email de confirmación
- Genera un PDF con los detalles
- Actualiza la disponibilidad de la propiedad

---

### 8. Comprar Cita de Grupo

Compra una cita de las que están disponibles en agendamiento grupal (más baratas).

**Endpoint:** `POST /appointments/group/buy`

**Body:**
```json
{
  "property_id": "prop-123-abc"
}
```

**Respuesta:**
```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PENDING",
  "deposit_token": "webpay-token-xyz",
  "url": "https://webpay.transbank.cl/...",
  "price_paid": 45000
}
```

**Nota:** Si hay descuento, se aplica automáticamente al precio.

---

### 9. Marcar Cita como Publicada

Marca una cita como publicada en el sistema.

**Endpoint:** `PATCH /appointments/:request_id`

**Ejemplo:** `PATCH /appointments/550e8400-e29b-41d4-a716-446655440000`

**Respuesta:**
```json
{
  "message": "Cita marcada como publicada",
  "request_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### 10. Eliminar una Cita

Borra una cita del sistema.

**Endpoint:** `DELETE /appointments/:request_id`

**Ejemplo:** `DELETE /appointments/550e8400-e29b-41d4-a716-446655440000`

**Respuesta:**
```json
{
  "message": "Appointment Deleted"
}
```

---

## Subastas (Auctions)

### 1. Ver Todas las Subastas

Lista todas las subastas registradas.

**Endpoint:** `GET /auctions`

**Respuesta:**
```json
[
  {
    "auction_id": "auction-123",
    "proposal_id": "prop-456",
    "url": "https://example.com/property/789",
    "timestamp": "2025-12-01T10:30:00Z",
    "quantity": 5,
    "group_id": "04",
    "operation": "offer",
    "published": true
  }
]
```

---

### 2. Crear/Procesar Subasta (Endpoint Público)

Recibe ofertas, propuestas, aceptaciones y rechazos de otros grupos.

**Endpoint:** `POST /auctions`

**Body para OFERTA:**
```json
{
  "auction_id": "auction-123",
  "url": "https://example.com/property/789",
  "timestamp": "2025-12-01T10:30:00Z",
  "quantity": 5,
  "group_id": "04",
  "operation": "offer"
}
```

**Body para PROPUESTA:**
```json
{
  "auction_id": "auction-123",
  "proposal_id": "prop-456",
  "url": "https://example.com/property/999",
  "timestamp": "2025-12-01T10:30:00Z",
  "quantity": 3,
  "group_id": "05",
  "operation": "proposal"
}
```

**Body para ACEPTACIÓN:**
```json
{
  "auction_id": "auction-123",
  "proposal_id": "prop-456",
  "url": "https://example.com/property/999",
  "timestamp": "2025-12-01T10:30:00Z",
  "quantity": 3,
  "group_id": "05",
  "operation": "acceptance"
}
```

**Body para RECHAZO:**
```json
{
  "auction_id": "auction-123",
  "proposal_id": "prop-456",
  "url": "https://example.com/property/999",
  "timestamp": "2025-12-01T10:30:00Z",
  "quantity": 3,
  "group_id": "05",
  "operation": "rejection"
}
```

**¿Cómo funciona?**
1. **offer**: Otro grupo ofrece intercambiar citas
2. **proposal**: Tú propones qué darles a cambio
3. **acceptance**: Ellos aceptan tu propuesta (se hace el intercambio)
4. **rejection**: Ellos rechazan tu propuesta

---

### 3. Crear Subasta (Solo Admin)

Crea una nueva subasta con validaciones extras.

**Endpoint:** `POST /auctions/admin`

**Headers:**
```
Authorization: Bearer <token-admin>
```

**Body:**
```json
{
  "auction_id": "auction-123",
  "url": "https://example.com/property/789",
  "timestamp": "2025-12-01T10:30:00Z",
  "quantity": 5,
  "group_id": "04",
  "operation": "offer"
}
```

**Validaciones extra para Admin:**
- No puede haber otra oferta con la misma URL del grupo 4
- Para propuestas, verifica que tengas suficiente inventario
- Para aceptaciones, hace el intercambio de inventarios automáticamente

---

### 4. Marcar Subasta como Publicada

**Endpoint:** `PATCH /auctions/:auction_id`

**Ejemplo:** `PATCH /auctions/auction-123`

---

### 5. Eliminar Oferta (Solo Admin)

Elimina una oferta del grupo 4.

**Endpoint:** `DELETE /auctions/admin/:auction_id`

**Headers:**
```
Authorization: Bearer <token-admin>
```

---

## Agendamientos Grupales

### 1. Ver Agendamientos Grupales

Lista todos los agendamientos grupales disponibles.

**Endpoint:** `GET /groupappointments`

**Respuesta:**
```json
[
  {
    "id": "group-123",
    "property_id": "prop-456",
    "quantity": 10,
    "discount": 0.05,
    "price": 50000,
    "created_at": "2025-12-01T10:30:00Z"
  }
]
```

**Explicación:**
- `quantity`: Cuántas citas grupales quedan disponibles
- `discount`: Descuento aplicado (0.05 = 5%)
- `price`: Precio por cita

---

### 2. Comprar Agendamiento Grupal (Solo Admin)

Compra varias citas al mismo tiempo para revender más barato.

**Endpoint:** `POST /groupappointments/buy`

**Headers:**
```
Authorization: Bearer <token-admin>
```

**Body:**
```json
{
  "property_id": "prop-456",
  "quantity": 10
}
```

---

### 3. Validar Compra Grupal (Solo Admin)

Confirma el pago de una compra grupal.

**Endpoint:** `POST /groupappointments/validatebuy`

**Headers:**
```
Authorization: Bearer <token-admin>
```

**Body:**
```json
{
  "ws_token": "webpay-token-xyz"
}
```

---

### 4. Aplicar Descuento (Solo Admin)

Aplica un descuento a las citas de un agendamiento grupal.

**Endpoint:** `POST /groupappointments/:propertyId/discount`

**Headers:**
```
Authorization: Bearer <token-admin>
```

**Body:**
```json
{
  "discount": 0.08
}
```

**Nota:** El descuento máximo es 10% (0.10)

**Respuesta:**
```json
{
  "id": "group-123",
  "property_id": "prop-456",
  "quantity": 10,
  "discount": 0.08,
  "price": 50000,
  "created_at": "2025-12-01T10:30:00Z"
}
```

---

## Propiedades

### 1. Ver Todas las Propiedades

Lista las propiedades con filtros opcionales.

**Endpoint:** `GET /properties`

**Parámetros opcionales:**
- `page` - Número de página (default: 1)
- `limit` - Resultados por página (default: 25)
- `price` - Precio máximo
- `location` - Buscar por ubicación
- `date` - Buscar por fecha
- `url` - Buscar por URL

**Ejemplo:**
```
GET /properties?page=1&limit=10&price=500000&location=Santiago
```

**Respuesta:**
```json
{
  "total": 100,
  "page": 1,
  "limit": 10,
  "results": [
    {
      "id": "prop-123",
      "name": "Departamento en Las Condes",
      "price": 450000,
      "currency": "CLP",
      "bedrooms": 3,
      "bathrooms": 2,
      "m2": 85,
      "location": "Las Condes, Santiago",
      "img": "https://example.com/img.jpg",
      "url": "https://example.com/property/123",
      "is_project": false,
      "timestamp": "2025-12-01T10:30:00Z",
      "reservations": 3
    }
  ]
}
```

---

### 2. Ver una Propiedad

Obtiene los detalles de una propiedad específica.

**Endpoint:** `GET /properties/:id`

**Ejemplo:** `GET /properties/prop-123`

---

### 3. Crear/Actualizar Propiedad

Crea una nueva propiedad o suma 1 a las reservaciones si ya existe.

**Endpoint:** `POST /properties`

**Body:**
```json
{
  "name": "Departamento en Las Condes",
  "price": 450000,
  "currency": "CLP",
  "bedrooms": 3,
  "bathrooms": 2,
  "m2": 85,
  "location": "Las Condes, Santiago",
  "img": "https://example.com/img.jpg",
  "url": "https://example.com/property/123",
  "is_project": false,
  "timestamp": "2025-12-01T10:30:00Z"
}
```

---

### 4. Procesar Subastas de Propiedades (Solo Admin)

Procesa operaciones de subasta.

**Endpoint:** `POST /properties/auctions`

**Headers:**
```
Authorization: Bearer <token-admin>
```

**Body:**
```json
{
  "operation": "offer"
}
```

**Operaciones válidas:** `offer`, `proposal`, `acceptance`, `rejection`
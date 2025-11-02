# Documentación Webpay - Integración

## Descripción General

Sistema de pago para reservar propiedades mediante Webpay. El usuario inicia la compra, es redirigido a Webpay, completa el pago y retorna para validar la transacción.

---

## Backend - Endpoints

### POST `/appointments/buywebpay`
**Archivo:** `api/src/routes/appointments.js` (líneas 187-299)  
**Autenticación:** JWT requerido

**Request:**
```json
{ "property_id": 123 }
```

**Proceso:**
1. Valida usuario y propiedad
2. Convierte UF a CLP si es necesario (API mindicador.cl)
3. Calcula 10% del precio como costo de reserva
4. Crea `Appointment` con estado `PENDING`
5. Genera transacción en Webpay

**Response:**
```json
{
  "request_id": "uuid",
  "status": "PENDING",
  "deposit_token": "token",
  "url": "https://webpay..."
}
```

---

### POST `/appointments/validatewebpay`
**Archivo:** `api/src/routes/appointments.js` (líneas 302-389)  
**Autenticación:** No requerida

**Request:**
```json
{ "ws_token": "token" }
```

**Proceso:**
1. Confirma transacción con Webpay
2. Si `response_code === 0` (aprobada):
   - Actualiza estado a `ACCEPTED`
   - Genera PDF de boleta
   - Decrementa contador de reservas
3. Si `response_code !== 0` (rechazada):
   - Actualiza estado a `REJECTED`

**Response (aprobada):**
```json
{
  "message": "Transacción aceptada y cita confirmada",
  "request_id": "uuid",
  "property": "url",
  "pdf_url": "url"
}
```

---

## Frontend - Componentes

### API: `transaction.ts`
**Ubicación:** `src/api/transaction.ts`

```typescript
// Inicia compra
buyProperty(propertyId: number)

// Valida transacción
commitTransaction({ token: string })
```

---

### Hook: `useWebpayPurchase`
**Ubicación:** `src/hooks/useWebpayPurchase.ts`

Maneja el flujo completo de compra:

```typescript
const {
  isWebpayModalOpen,  // Estado del modal
  paymentData,        // {url, deposit_token, request_id}
  isPending,          // Loading state
  handleBuyWebpay,    // Iniciar compra
  closeWebpayModal    // Cerrar modal
} = useWebpayPurchase();
```

---

### Componentes Principales

#### 1. `PropertyCard`
**Ubicación:** `src/components/Property/PropertyCard.tsx`

Muestra botón de compra:
```tsx
<Button onClick={(e) => handleBuyWebpay(property.id, e)}>
  Solicitar reserva con Webpay
</Button>
```

#### 2. `ConfirmPurchaseWebpay`
**Ubicación:** `src/components/Property/ConfirmPurchaseWebpay.tsx`

Modal que redirige a Webpay:
```tsx
<form action={data.url} method="POST" target="_blank">
  <input type="hidden" name="token_ws" value={data.deposit_token} />
  <button type="submit">Ir a Webpay</button>
</form>
```

#### 3. `PurchaseCompleted`
**Ubicación:** `src/pages/PurchaseCompleted.tsx`

Página de retorno que:
- Extrae `token_ws` de la URL
- Llama automáticamente a `commitTransaction`
- Muestra resultado (éxito/rechazo/cancelación)
- Ofrece descargar PDF si fue exitosa

```tsx
const token = searchParams.get("token_ws");

const { data } = useQuery({
  queryKey: ["completed-purchase", token],
  queryFn: () => commitTransaction({ token: token || "" }),
  enabled: !!token
});
```

#### 4. `BuyRequestCard`
**Ubicación:** `src/components/BuyRequest/BuyRequestCard.tsx`

Muestra solicitudes de reserva con opción de reintentar pago si fue rechazado.

---

## Flujo de Integración

```
1. Usuario → Click "Solicitar reserva"
2. Frontend → POST /buywebpay → Backend
3. Backend → Crea transacción → Webpay
4. Backend → Retorna {url, token}
5. Frontend → Muestra modal de confirmación
6. Usuario → Confirma y es redirigido a Webpay
7. Usuario → Completa pago en Webpay
8. Webpay → Redirige a /completed-purchase?token_ws=xxx
9. Frontend → POST /validatewebpay → Backend
10. Backend → Confirma con Webpay → Genera PDF
11. Frontend → Muestra resultado + botón descargar PDF
```



## Variables de Entorno

**Backend:**
```env
REDIRECT_URL=http://localhost:5173/completed-purchase / https://g4market.tech/completed-purchase
PDF_GENERATE_URL=https://abmuzxwsn4.execute-api.us-east-2.amazonaws.com/generate-pdf
```

**Frontend:**
```env
VITE_BACKEND_URL=http://localhost:3000 / https://api.iic2174grupo4.tech
```

---

## Modelo de Datos

```javascript
Appointment {
  request_id: String,      // UUID
  deposit_token: String,   // Token Webpay
  user_id: Number,
  group_id: String,        // "04"
  property_url: String,
  status: String,          // PENDING | ACCEPTED | REJECTED
  reason: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Estados de Transacción

```
PENDING → ACCEPTED (response_code === 0)
       └→ REJECTED (response_code !== 0)
```

---

## Notas Importantes

- **Costo de reserva:** 10% del precio de la propiedad
- **Conversión UF:** Usa API mindicador.cl (fallback: 39,500 CLP)
- **Token único:** UUID v4, truncado a 26 caracteres para Webpay
- **Redirección:** Abre Webpay en nueva pestaña (`target="_blank"`)
- **Validación automática:** Al retornar, se valida automáticamente con React Query

---

## Testing - Webpay Integración

**Tarjeta de prueba con transaccion aprobada:**
- Número: 4051 8856 0044 6623
- CVV: 123
- Fecha: Cualquier fecha futura
- Rut: 11.111.111-1
- Contrasena: 123

**Resultado:** Transacción aprobada

**Tarjeta de prueba con transaccion rechazada:**
- Número: 5186 0595 5959 0568
- CVV: 123
- Fecha: Cualquier fecha futura
- Rut: 11.111.111-1
- Contrasena: 123

**Resultado:** Transacción rechazada

---

## Como probar la integración

1. Iniciar sesión con un usuario
2. Buscar una propiedad
3. Hacer clic en "Solicitar reserva con Webpay"
4. Hacer click en "Ir a webpay"
5. LLenar los datos con una tarjeta de prueba
6. Pagar


## Referencias

- Documentación Transbank: https://www.transbankdevelopers.cl/documentacion/webpay-plus
- Tarjetas de prueba: https://www.transbankdevelopers.cl/documentacion/como_empezar#tarjetas-de-prueba

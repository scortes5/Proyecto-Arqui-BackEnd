# G4 Market Frontend

Como correr el frontend en local para testeo

## Requisitos
- Node.js 18+ y npm
- Backend accesible y configuración de Auth0

## Variables de Entorno
Crea un archivo `.env` en la raíz con:

```env
VITE_BACKEND_URL=http://localhost:8000 (local) o https://api.iic2173grupo4.tech (produccion)
VITE_AUTH0_DOMAIN=dev-y7xu4w0h31qkrz6s.us.auth0.com
VITE_AUTH0_CLIENT_ID=p7nHaZdfApjdE24yUFJpHyiwo0pkZhgV
VITE_AUTH0_AUDIENCE=https://api.iic2173grupo4.tech
```

Notas:
- `VITE_BACKEND_URL`: base del backend (e.g. local o produccion).
- `VITE_AUTH0_*`: credenciales de tenant y API en Auth0.

## Instalación

```bash
npm install
```

## Ejecutar en Desarrollo

```bash
npm run dev
```

Abre el navegador en la URL que indica Vite (por defecto `http://localhost:5173`).

## Build de Producción

```bash
npm run build
```

## Scripts
- `dev`: servidor de desarrollo con HMR
- `build`: compila TypeScript y genera el build


## Rutas Principales
- `/` → Landing
- (Protegidas por Auth0):
  - `/properties` → Listado de propiedades con filtros y paginación
  - `/buyrequests` → Solicitudes de compra del usuario

## Autenticación
- Usamos `@auth0/auth0-react`.
- Las rutas protegidas están envueltas por `ProtectedRoute` (`src/pages/ProtectedRoute.tsx`).
- Los tokens se obtienen con `getAccessTokenSilently` usando el `audience` de la API.

## Integración con Backend
- Hooks como `useApiResource` (`src/hooks/useApiResource.ts`) añaden el header `Authorization: Bearer <token>` cuando corresponde.
- Endpoints consumidos:
  - `GET /properties` con filtros por query string.
  - `POST /appointments/buy` para solicitar compra/reserva.
  - `GET /appointments` para listar solicitudes del usuario.
  - `GET/POST /wallet` para balance y topups/spend.

## Problemas Comunes
- Pantalla en blanco o 401/403:
  - Verifica variables de entorno y el `audience` de Auth0.
  - Reinicia `npm run dev` tras cambiar `.env`.
- CORS:
  - Asegúrate que el backend permita el origen de Vite.

## Estructura Relevante
- `src/pages/` → páginas (`LandingPage.tsx`, `Properties.tsx`, `BuyRequests.tsx`, `ProtectedRoute.tsx`)
- `src/components/` → UI y modales (`PropertyCard`, `BuyRequestOption`, `Navbar`, etc.)
- `src/hooks/` → lógica de datos (`useProperties`, `useWallet`, `useApiResource`)
- `src/types/` → tipos (`Property`, `Appointment`, `Wallet`)

---

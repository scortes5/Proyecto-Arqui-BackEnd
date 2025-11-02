# Documentación CI/CD Pipeline - Backend

## Tabla de Contenidos

1. [Comentarios Generales](#comentarios-generales)
2. [Arquitectura del Pipeline](#arquitectura-del-pipeline)
3. [Componentes del Sistema](#componentes-del-sistema)
4. [Flujo de Deployment](#flujo-de-deployment)
5. [Scripts de Deployment](#scripts-de-deployment)
6. [Troubleshooting](#troubleshooting)
7. [Referencias](#referencias)

## Comentarios Generales

El workflow tiene un .env que considera la region (us-east-2) y image-TAG basado en el SHA del commit.

La acumulación de Images en Docker la arreglamos incluyendo el comando:

docker image prune -af --filter "label!=com.docker.compose.service=db"

El cual borra todas las imágenes sin TAG o con TAG distinto de latest que no se relacionan con la base de datos. El problema de eliminar las imágenes de postgres es la lentitud de la descarga de esta, aparte es el único contenedor que no se actualiza con cada Deploy.

Con el comando (ls) en la instancia pueden ver los directorios disponibles: Proyecto-Arqui-BackEnd corresponde al antiguo, el cual tiene clonado el respositorio, mientras que app es el nuevo (/home/ubuntu/app). En app se encuentra solo configurado el .env, docker-compose.prod.yml, los scripts y el back-up de la base de datos. Antes de hacer un deploy por primera vez, es necesario configurar el .env y docker-compose.prod.yml dado que los scripts solo se encargan de actualizar los contenedores API y MQTT services.

Mediante paths ignore se evita que se gatillen deploys cuando se hace push a master de archivos .md o archivos en el directorio /docs.

Finalmente se incorporó .dockerignore para evitar que se suban archivos innecesarios en el contexto.

## Arquitectura del Pipeline

```
┌─────────────────┐
│   Git Push      │
│   to master     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│   GitHub Actions            │
│   ┌─────────────────────┐   │
│   │  1. Test            │   │
│   │  2. Build Images    │   │
│   │  3. Push to ECR     │   │
│   │  4. Create Package  │   │
│   │  5. Upload to S3    │   │
│   │  6. Trigger Deploy  │   │
│   └─────────────────────┘   │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│   AWS CodeDeploy            │
│   ┌─────────────────────┐   │
│   │  1. Download from S3│   │
│   │  2. Stop old        │   │
│   │  3. Install new     │   │
│   │  4. Start services  │   │
│   │  5. Validate        │   │
│   └─────────────────────┘   │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│   EC2 Instance              │
│   ┌──────────┐              │
│   │ postgres │ (persistente)│
│   └──────────┘              │
│   ┌──────────┐              │
│   │   API    │ (actualizado)│
│   └──────────┘              │
│   ┌──────────┐              │
│   │   MQTT   │ (actualizado)│
│   └──────────┘              │
└─────────────────────────────┘
```

---

## Componentes del Sistema

### 1. GitHub Actions Workflow

**Ubicación:** `.github/workflows/ci-cd.yml`

**Jobs:**

#### Job 1: Test
- Ejecuta las pruebas unitarias de API y MQTT (por ahora no tenemos ninguna por lo que informa que no se han implementado)
- Se ejecuta en: `ubuntu-latest`
- Duración estimada: 1 minuto máximo

#### Job 2: Build and Push
- Construye las imágenes Docker de API y MQTT
- Las sube a AWS ECR Public
- Etiqueta las imágenes con el SHA del commit
- Se ejecuta en: `ubuntu-latest`
- Duración estimada: 2 minutos máximo

#### Job 3: Deploy
- Crea el paquete de deployment
- Lo sube a S3
- Crea un deployment en CodeDeploy
- Espera a que el deployment termine
- Se ejecuta en: `ubuntu-latest`
- Duración estimada: 2 minutos máximo

### 2. AWS ECR (Elastic Container Registry)

**Tipo:** Público (no requiere autenticación para pull). Nos generó varios problemas en el script hasta que nos dimos cuenta que no era necesario incluir el login.

**Repositorios:**
- `public.ecr.aws/l6q0d4z8/grupo-04-api`
- `public.ecr.aws/l6q0d4z8/grupo-04-mqtt`

**Tags:**
- `latest`: Última versión estable
- `master-<commit-sha>`: Versión específica de cada commit

### 3. AWS S3

**Bucket:** `deploy-bucket-arquisis`

**Estructura:**
```
deploy-bucket-arquisis/
└── grupo-XX-backend/
    ├── deployment-<sha1>.zip
    ├── deployment-<sha2>.zip
    └── ...
```

**Contenido del ZIP:**
```
deployment-<sha>.zip
├── appspec.yml
├── docker-compose.prod.yml
├── .env.images (contiene la información )
└── scripts/
    ├── stop_application.sh
    ├── before_install.sh
    ├── start_application.sh
    └── validate_service.sh
```

### 4. AWS CodeDeploy

**Application Name:** `grupo-04-backend`

**Deployment Group:** `production`

**Compute Platform:** EC2/On-Premises

**Deployment Type:** In-place

**Lifecycle Events:**
1. **ApplicationStop** → `stop_application.sh`
2. **BeforeInstall** → `before_install.sh`
3. **Install** → (automático, copia archivos)
4. **ApplicationStart** → `start_application.sh`
5. **ValidateService** → `validate_service.sh`

## Flujo de Deployment

### Paso a Paso

#### 1. Developer hace push a master

```bash
git add .
git commit -m "feat: nueva funcionalidad"
git push origin master
```

#### 2. GitHub Actions se activa automáticamente

**Test Job:**

**Build and Push Job:**
```
✓ Checkout code
✓ Build API image
✓ Tag API image (master-<sha> y latest)
✓ Push API image
✓ Build MQTT image
✓ Tag MQTT image (master-<sha> y latest)
✓ Push MQTT image
```

**Deploy Job:**
```
✓ Checkout code
✓ Configure AWS credentials
✓ Create deployment package
  - Copia scripts/
  - Copia appspec.yml
  - Copia docker-compose.prod.yml
  - Crea .env.images con las URIs de las imágenes
  - Comprime todo en un ZIP
✓ Upload to S3
✓ Create CodeDeploy deployment
✓ Wait for deployment (polling cada 15s, max 20 min)
✓ Get deployment status
```

#### 3. CodeDeploy ejecuta el deployment (appspec.yml)

**ApplicationStop:**
```bash
# Ejecuta: scripts/stop_application.sh
- Detiene contenedores de API y MQTT
- Elimina contenedores viejos
- Elimina Imágenes viejas y en desuso
- NO toca la base de datos
```

**BeforeInstall:**
```bash
# Ejecuta: scripts/before_install.sh
- Verifica si docker-compose está instalado, lo instala de ser necesario
```

**ApplicationStart:**
```bash
# Ejecuta: scripts/start_application.sh
- Carga variables de .env (DB, JWT, etc.)
- Carga variables de .env.images (URIs de imágenes)
- Pull de nuevas imágenes desde ECR
- Inicia contenedores de API y MQTT
```

**ValidateService:**
```bash
# Ejecuta: scripts/validate_service.sh
- Verifica que los contenedores estén corriendo
- Hace health check a la API
- Confirma que el deployment fue exitoso
```


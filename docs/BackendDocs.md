# 2025-2 / IIC2173 - E0 | Properties Market Async

***Fecha de entrega:** 01/09/2025 - 3 Semanas*

## Levantar el backend en Local

Funciona de la misma manera que en la instancia en EC2, ejecutar el siguiente comando dentro de la carpeta del proyecto:

```
docker compose up --build
```

## Conexion a la instancia

Conexion via ssh:
```
chmod 400 ~/IIC2173GRUPO4.pem         #restringir permisos
ssh -i "IIC2173GRUPO4.pem" ubuntu@ec2-3-15-84-119.us-east-2.compute.amazonaws.com
```

Notar que en este ejemplo el archivo .pem se encuentra en la carpeta raiz, modificar la ruta de ser necesario

Una vez dentro de la instancia ingresar al proyecto con:

```
cd Proyecto-Arqui-BackEnd
```
## Docker 

Cada servicio esta corriendo en su propio contendor y las configuraciones relevantes se pueden revisar en las rutas:

* `/docker-compose.yml`
* `/api/Dockerfile`
* `/mttt/Dockerfile`
* `/.env`



Antes de entregar el proyecto quedo todo ejecutando en EC2 con el siguiente comando (no ejecutar):

```
docker compose up -d
```
Comandos utiles para la correccion:
```
docker compose logs -f # sigue los logs en tiempo real
# para seguir los logs de un contenedor:
docker compose logs -f api
docker compose logs -f mqtt
docker compose logs -f db
docker compose ps # verificar que esten arriba los contenedores
docker compose down # detener los contenedores
```
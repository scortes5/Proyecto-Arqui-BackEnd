# 2025-2 / IIC2173 - E0 | Properties Market Async

***Fecha de entrega:** 01/09/2025 - 3 Semanas*

## Consideraciones

* Se logragron todas las funcionalidades pedidas en el enunciado.
* Para la parte optativa se realizo la encriptacion HTTPS. 
* Como lenguaje se utilizo Javascript y la api se levanto con Koa (Motivo: reutilizar codigo de Web 😅 ).
* Se utilizo un dominio .tech, ya que no me dejo validar mi estatus de estudiante en namecheap. El dominio es mayafzt.tech

## Instancia EC2

Conexion via ssh:
```
chmod 400 ~/IIC2173.pem         #restringir permisos
ssh -i ~/IIC2173.pem ubuntu@ec2-18-116-39-34.us-east-2.compute.amazonaws.com
```

Notar que en este ejemplo el archivo .pem se encuentra en la carpeta raiz, modificar la ruta de ser necesario

Una vez dentro de la instancia ingresar al proyecto con:

```
cd e0-mayafzt
```
## Docker 

Cada servicio esta corriendo en su propio contendor y las configuraciones relevantes se pueden revisar en las rutas:

* `/docker-compose.yml`
* `/api/Dockerfile`
* `/mttt/Dockerfile`
* `/.env`



Antes de entregar el proyecto deje todo ejecutando en EC2 con el siguiente comando (no ejecutar):

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


### Requisitos funcionales (10p)

* **RF1: (3p)** ***Esencial*** Debe poder ofrecer en una **API** la lista de las distintas propiedades que se han encontrado en el broker a medida que se vayan recibiendo junto con su cantidad de reservas de visitas disponibles, de forma que muestren el detalle y cuando fue su última actualización. Asuman que es solo una reserva de visita disponible por cada vez que les llega la propiedad. Esta lista debe ser accedida a través de HTTP en la URI: *`{url}/properties`*. Esta vista general puede mostrar solo los detalles más importantes de la propiedad.

* **RF2: (1p)** ***Esencial*** Debe ofrecer un endpoint para mostrar el detalle  de cada propiedad recibida desde el broker con todas sus reservas de visitas. La URI debe ser: *`{url}/properties/{:id}`*

* **RF3: (2p)** ***Esencial*** La lista de propiedades debe estar paginada por default para que muestre cada 25 viviendas y poder cambiar de pagina cambiando un *queryParam*. Es decir: *`{url}/properties?page=2&limit=25`*. Queda a criterio de ustedes si permiten traer más valores mediante otro número del `limit` en *queryParams*.
* **RF4: (4p) *Esencial*** El endpoint *`{url}/properties`* debe permitir filtrar las propiedades por precio menor al indicado, comuna y fecha de publicación (exacta): *`{url}/properties?price=1000&location=maipu&date=2025-08-08`*. Acá *date* es la fecha de publicación según el campo `timestamp` que recibirían y *location* debe permitir búsquedas parciales, es decir que si la dirección es *ABC 123, Maipú, RM*, el buscar solo *maipu* debería obtenerla.
    
Logrado los cuatro puntos. Se pueden revisar la implementacion de los endpoints en la ruta: `api/src/routes/properties.js` y en el dominio `mayafzt.tech/api/properties`. Esta implementada la paginacion junto con un limite por defecto de 25, se puede cambiar a preferencia como lo muestra el enunciado. El resto de filtros tambien se utilizan como lo muestra el enunciado

### Requisitos no funcionales (20p)

* **RNF1: (5p)** ***Esencial*** Debe poder conectarse al broker mediante el protocolo MQTT usando un proceso que corra de **forma constante e independiente de la aplicación web** (que corra como otro programa), los eventos recibidos deben ser persistidos con su sistema para que estos puedan ser mostrados (existen diferentes opciones). Para esto debe usar las credenciales dentro del repositorio y conectarse al canal **properties/info**.

La implementacion de la conexion MQTT se puede revisar en la ruta `mqtt/src/index.js`

* **RNF2: (3p)** Debe haber un proxy inverso apuntando a su aplicación web (como Nginx o Traefik). *Todo lo que es Nginx es mejor configurarlo directamente en la instancia EC2 y no necesariamente con Docker.*

El proxy inverso se puede revisar en la ruta `/mayafzt.tech` y tambien dentro de la instancia ejecutando:

```
sudo nano /etc/nginx/sites-available/mayafzt.tech
```
* **RNF3: (2p)** El servidor debe tener un nombre de dominio de primer nivel (tech, me, tk, ml, ga, com, cl, etc)

El nombre del dominio es `mayafzt.tech`
* **RNF4: (2p)** ***Esencial*** El servidor debe estar corriendo en EC2.

Los contenedores quedaron activos 

* **RNF5: (4p)** Debe haber una base de datos Postgres o Mongo externa asociada a la aplicación para guardar eventos y consultarlos.

Se utilizo postgres para la base de datos, revisar el archivo `.env` para ver las configuraciones

* **RNF6: (4p)** ***Esencial*** El servicio (API Web) debe estar dentro de un container Docker.

Cada servicio tiene su propio contenedor

#### Docker-Compose (15p)

Componer servicios es esencial para obtener entornos de prueba confiables, especialmente en las máquinas de los desarrolladores. Además, esta herramienta será necesaria durante el resto del desarrollo del proyecto para orquestar sus contenedores y servicios.

* **RNF1: (5p)** Lanzar su app web desde docker compose
* **RNF2: (5p)** Integrar su DB desde docker compose (Es decir la base de datos es un contenedor).
* **RNF3: (5p)** Lanzar su receptor MQTT desde docker compose y conectarlo al contenedor de la app web (o base de datos si lo usara).

Todo logrado, revisar las rutas especificadas.
## Variable
    
Deben elegir al menos uno de los dos grupos de requisitos siguientes.
    
#### HTTPS (25%) (15p)

La seguridad es esencial para sus usuarios, por ello los datos que viajan en su aplicación web deben encriptarse con los protocolos correspondientes.

* **RNF1: (7p)** El dominio debe estar asegurado por SSL con Let’s Encrypt.
* **RNF2: (3p)** Debe poder redireccionar HTTP a HTTPS.
* **RNF3: (5p)** Se debe ejecutar el chequeo de expiración del certificado SSL de forma automática 2 veces al día (solo se actualiza realmente si está llegando a la fecha de expiración).

Todo logrado, se puede revisar la implementacion de HTTPS en local en la ruta `/mayafzt.tech` o revisando la configuracion de NGINX ejecutando:
```
sudo nano /etc/nginx/sites-available/mayafzt.tech
```
y para revisar el chequeo de certificados revisar las ultimas dos lineas del archivo luego de ejecutar:
```
crontab -e
```



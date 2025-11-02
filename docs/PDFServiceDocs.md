# Construcción y despliegue de servicio de generación de boletas

Se instalan las dependencias necesarias:
```
npm install -g serverless
serverless
npm install aws-sdk
npm install pdfkit
npm install stream-buffers
```

Se crea en AWS un bucket S3 con acceso público.

Se crea un archivo `handler.js` que define la función lambda y llama a `pdfgenerator.js` cuando recibe el evento HTTP para generar la boleta. Una vez generada, sube el documento y retorna el url de acceso.

En `pdfgenerator.js` se construye el documento utilizando la librería `pdfkit` y `stream-buffers` para almacenarlo temporalmente sin necesidad de guardarlo en disco.

Se configuran las credenciales de AWS con ```aws configure``` y se edita el archivo `serverless.yml`. Se indica `frameworkVersion: '3'` para evitar el login y la integración con el dashboard de Serverless. Se definen como proveedor aws, versión de node a utilizar y la región. Se define nombre del bucket S3 y los permisos que necesita la función lambda para interactuar con el mismo.  Se declara el nombre de la función, el handler y la ruta a la que se llamará.

Se ejecuta ```serverless deploy``` para crear la función lambda en AWS y obtener el endpoint que utiliza el backend para llamar a generar la boleta.

Se definen como secrets del repositorio las variables `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY`.

En `.github/workflows/deploy.yml` se definen los pasos para el despliegue automatizado del servicio cuando se hace un push a la rama main. Se definen las versiones de ubuntu y node a utilizar, se instalan las dependencias con `npm ci`, se configuran las variables definidas anteriormente y se ejecuta `npx serverless@3 deploy` para el despliegue.







# Pipeline CI/CD del Frontend
En el repositorio del frontend, se definen en `.github/workflows/deploy.yml` los pasos para automatizar la compilación del proyecto, publicación en un bucket S3 y distribución a través de CloudFront, utilizando Github Actions.

En cada push a la rama `main`, se selecciona la última versión de ubuntu y se establecen las variables `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_BACKEND_URL` y `VITE_AUTH0_AUDIENCE`, definidas previamente como secrets del repositorio.

Se descarga el código más reciente del proyecto y se selecciona la versión de node. 

Se instalan las dependencias en el `package.json` ejecutando `npm ci`.

Se exportan las variables de entorno cargadas anteriormente para construir el build y se ejecuta `npm run build` para generar la versión del proyecto que pasará a producción en `/dist`.

Se configuran las credenciales de AWS `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY`, también definidas como secrets del repositorio y necesarias para el despliegue.

Sube los archivos construidos al bucket S3 correspondiente y elimina versiones antiguas.

Finalmente, fuerza la actualización del contenido distribuido en CloudFront para garantizar que los usuarios accedan a la última versión.





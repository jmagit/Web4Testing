# Web4Testing

Versión NodeJS del servidor de pruebas para cursos de FrontEnd y con un sitio web de ejemplo donde aplicar casos de prueba WebDriver.

* Sitio web
* Servicios RestFul para probar las conexiones AJAX
* Servicio de Autenticación JWT
* Autorespondedor de formularios.
* Servidor de ficheros

## Instalación

1. Descargar o clonar el repositorio
2. Ejecutar `npm install` para descargar las dependencias.
3. Ejecutar `npm start` o `node server` para levantar el servidor.
4. Navegar a http://localhost:8181/ para comprobar el correcto funcionamiento de los servicios.

**Nota:** *Se puede configurar el puerto en el entorno con `SET PORT=3000` antes de levantar el servidor.*

## Sitio web

El sitio web cuenta con un juego de páginas donde se exponen diferentes escenarios de pruebas navegación, interacción con páginas, trabajo con formularios, arrastrar y soltar, autenticación, SPA y AJAX.
Las páginas disponibles son:

* **Inicio**: Pagina muy larga que incorpora animaciones, textos e imagenes
* **Calculadora**: La calculadora, al disponer de múltiples botones, es ideal para realizar las pruebas de interacciones con el UI y validar los resultados que se van obteniendo.
* **Carrito de la compra**: El carrito de la compra es un entorno dinámico que permite añadir y quitar productos, comprobar totales e importes filtrar la lista de productos, arrastrar el producto de la lista y soltar en el carrito. Si el producto ya está en la lista, se incrementa la cantidad.
* **Contactos**: Sistema CRUD completo que permite las pruebas de acceso a datos, paginación, trabajo con formularios y validaciones. Las consultas se pueden realizar sin estar autenticado, pero para añadir, modificar y borrar es necesaria la autenticación.
* **Alertas**: Entorno de pruebas para los tres tipos nativos de mensajes emergentes ofrecidos por JavaScript: alertas, prompts y confirmaciones, así como los cuadros modales y modeless.
* **Ficheros**: Entorno de sencillo de pruebas para subir ficheros a un servidor. Permite eliminar los ficheros subidos.
* **API Rest**: Conjunto de servicios REST completos para servir de back-end y mock de las pruebas de las conexiones AJAX de las aplicaciones front-end. Permite la autenticación JWT.
* **Atenticación**: Permite el registro de nuevos usuarios a través de formularios emergentes, la autenticación y la edición de los datos de usuario autenticado.

## Servicios RestFul

Para no crear dependencias de bases de datos los servicios utilizan ficheros como `data/personas.json`. El fichero se lee completo y se graba completo, no se ha optimizado el proceso. Los resultados de las peticiones se vuelcan a consola para facilitar las comprobaciones.
  
La estructura de datos del servicio personas:
* id: number
* nombre: string
* apellidos: string
* edad: number

**Nota:** *En algunos casos es necesario marcar en la cabecera de la petición el **Content-Type** como **application/json**.*
### Filtrado, paginación y ordenación
Se han incorporado una serie de parámetros (querystring) para ampliar el control de los resultados del GET:

* ***propiedad=valor*:** Selecciona solo aquellos que el valor de la propiedad dada coincida con el valor proporcionado. Se pueden utilizar varios pares propiedad=valor, en cuyo caso deben cumplirse todos.
* **_search=*valor*:** Selecciona todos aquellos que en alguna de sus propiedades contenga el valor proporcionado. Invalida las búsquedas por propiedades individuales.
* **_projection=*propiedades*:** Devuelve solo aquellas propiedades de la lista suministrada, los nombres de las propiedades deben ir separadas por comas.
* **_sort=*propiedades*:** Indica las propiedades por las que se ordenaran los resultados, en caso de omitirse se utilizará la propiedad que actúa como primary key. Si el nombre de la propiedad está precedido por un guion (signo negativo) la ordenación será descendente, las propiedades se separan con comas.
* **_page=*número*:** Número de página empezando en 0 (primera página). Si se omite pero aparece el parámetro *_rows* tomara el valor 0 por defecto.
* **_page=count:** Devuelve el número de páginas y filas de la fuente de datos. Si se omite el Número de filas por página tomara 20 por defecto. Ej:  
`{  
  "pages": 10,
  "rows": 99
}`
* **_rows=*número*:** Número de filas por página, por defecto 20 si se omite pero aparece el parámetro *_page*.

### Para añadir nuevos servicios

1. En el subdirectorio `/data`, añadir un fichero .json con el array de objetos con los valores iniciales del resource. Para generar el fichero se pueden utilizar herramientas de generación automatizada de juegos de datos como <http://www.generatedata.com/?lang=es> o <https://www.mockaroo.com/>.
2. Dar de alta el servicio añadiendo una entrada en el array lstServicio:
    * url: dirección del servicio
    * pk: propiedad del objeto que actúa como primary key
    * fich: referencia al fichero que actúa de contenedor
    * readonly: true cuando requiera autenticación para los métodos de escritura (POST, PUT, DELETE)
3. Rearrancar el servidor.
4. Probar: http://localhost:8181/api/nuevoservicio

### Seguridad

Para evitar conflictos con los navegadores se han habilitado las siguientes cabeceras CORS:
* Access-Control-Allow-Origin: _dominio-origen-de-la-petición_
* Access-Control-Allow-Headers: Origin, Content-Type, Accept, Authorization, X-Requested-With, X-SRF-TOKEN
* Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS'
* Access-Control-Allow-Credentials: true

### ECO

El servicio ECO se puede usar para probar los clientes REST, hacer llamadas API de muestra y comprobar la información recibida por el servidor.

Por ejemplo: <http://localhost:8181/eco/personas/1?_page=1&_rows=10>

    {
        "url": "/eco/personas/1?_page=1&_rows=10",
        "method": "PATCH",
        "headers": {
            "content-type": "application/json",
            "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c3IiOiJhZG1pbiIsIm5hbWUiOiJBZG1pbmlzdHJhZG9yIiwicm9sZXMiOlsiVXN1YXJpb3MiLCJBZG1pbmlzdHJhZG9yZXMiXSwiaWF0IjoxNjQ4NTc4NTYxLCJleHAiOjE2NDg1ODIxNjF9.WF-z8UHEOtqh0NSttxkV4VSp8evKEKLvW1fIh4CwEJ0",
            "user-agent": "PostmanRuntime/7.18.0",
            "accept": "*/*",
            "cache-control": "no-cache",
            "postman-token": "d97b65ed-8407-4838-9f18-def0f51599d0",
            "host": "localhost:4321",
            "accept-encoding": "gzip, deflate",
            "content-length": "14",
            "cookie": "XSRF-TOKEN=123456790ABCDEF",
            "connection": "keep-alive"
        },
        "autentication": {
            "isAutenticated": true,
            "usr": "admin",
            "name": "Administrador",
            "roles": [
                "Usuarios",
                "Administradores"
            ]
        },
        "cookies": {
            "XSRF-TOKEN": "123456790ABCDEF"
        },
        "params": {
            "0": "/personas/1",
            "1": "personas/1"
        },
        "query": {
            "_page": "1",
            "_rows": "10"
        },
        "body": {
            "edad": 10
        }
    }

## Autenticación
Para simular la autenticación con token JWT de cabecera está disponible el servicio `http://localhost:8181/api/login` con el método POST.
* **Formularios**
    * action="http://localhost:8181/api/login"
    * method="post"
    * body="name=admin&password=P@$$w0rd"
* **API**
    * POST http://localhost:8181/api/login
    * Content-Type: application/json
    * body: { "name": "admin", "password": "P@$$w0rd" }

#### Respuesta JSON:

    {
        "success": true,
        "token": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c3IiOiJhZG1pbiIsIm5hbWUiOiJBZG1pbmlzdHJhZG9yIiwicm9sZXMiOlsiVXN1YXJpb3MiLCJBZG1pbmlzdHJhZG9yZXMiXSwiaWF0IjoxNjQ4NTc4NTYxLCJleHAiOjE2NDg1ODIxNjF9.WF-z8UHEOtqh0NSttxkV4VSp8evKEKLvW1fIh4CwEJ0",
        "name": "admin",
        "roles": [
            "Usuarios",
            "Administradores"
        ]
    }

#### Envío del token en la cabecera:

Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c3IiOiJhZG1pbiIsIm5hbWUiOiJBZG1pbmlzdHJhZG9yIiwicm9sZXMiOlsiVXN1YXJpb3MiLCJBZG1pbmlzdHJhZG9yZXMiXSwiaWF0IjoxNjQ4NTc4NTYxLCJleHAiOjE2NDg1ODIxNjF9.WF-z8UHEOtqh0NSttxkV4VSp8evKEKLvW1fIh4CwEJ0


### Cookies
* Para otros escenarios que requiera autenticación por cookies se puede añadir el parámetro `cookie=true` para que envíe la cookie `Authorization` con una validez de una hora: <http://localhost:8181/api/login?cookie=true>
* Para borrar la cookie: <http://localhost:8181/api/logout>
* Para obtener la informacion de la autenticación: <http://localhost:8181/api/auth>

### Gestión de usuarios
En el fichero data/usuarios.json se mantiene la estructura básica de los usuarios registrados que se puede ampliar.

Mediante peticiones AJAX a <http://localhost:8181/api/register> se pueden:
* Registrar usuario (POST).
* Modificar usuario autenticado (PUT)
* Consultar usuario autenticado (GET)

## Servidor de Ficheros
Se ha habilitado el subdirectorio `/public` para los ficheros que se deben servir directamente. Está mapeado a la raíz del servidor.
### Subir ficheros
Se pueden subir ficheros al servidor, mediante peticiones POST AJAX a http://localhost:8181/fileupload, requieren la cabecera **'Content-Type':'multipart/form-data'**.

Los ficheros se almacenan en el subdirectorio `/uploads` y son accesibles mediante la ruta http://localhost:8181/files.

Las peticiones GET a http://localhost:8181/fileupload mostrarán un formulario para subir ficheros.


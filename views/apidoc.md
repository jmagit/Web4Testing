## Servicios RestFul

Para no crear dependencias de bases de datos los servicios utilizan ficheros como `data/contactos.json`. El fichero se lee completo y se graba completo, no se ha optimizado el proceso salvo la cache de lecturas.
  
**Nota:** *En algunos casos es necesario marcar en la cabecera de la petición el **Content-Type** como **application/json**.*

### OpenApi (Swagger)

Se genera automáticamente la documentación de los servicios disponibles y está disponible el cliente **swagger-ui** para su consulta y pruebas. Si se asocian esquemas de los modelos de datos en la configuración de servicios ser realizará la validación tanto de las entradas como de las salidas.

La documentación está disponible en formato HTML, YAML y JSOM:

* <http://localhost:8181/api-docs>
* <http://localhost:8181/api-docs/v1/openapi.yaml>
* <http://localhost:8181/api-docs/v1/openapi.json>

### Para añadir nuevos servicios

1. En el subdirectorio `/data`, añadir un fichero .json con el array de objetos con los valores iniciales del resource. Para generar el fichero se pueden utilizar herramientas de generación automatizada de juegos de datos como <http://www.generatedata.com/?lang=es> o <https://www.mockaroo.com/>.
2. Dar de alta el servicio añadiendo una entrada en el fichero de configuración de servicios `data/__servicios.json` indicando:
   | Propiedad             | Tipo                  | Descripción                               |
   | --------------------- | --------------------- | ----------------------------------------- |
   | *endpoint* | string | Nombre en minúsculas del recurso para crear la url con la dirección del servicio *(Obligatoria)* |
   | tag | string | Permite agrupar las operaciones de varios servicios en la documentación (OpenApi), por defecto usara el endpoint pero se pueden definir explícitamente y compartirlas en varios endpoint |
   | summary | string |  Descripción corta del servicio (OpenApi) |
   | description | string | Descripción larga del servicio (OpenApi)  |
   | *model* | string | Nombre de la entidad mantenida por el servicio *(Obligatoria)* |
   | models | string |  Nombre plural de la entidad, por defecto usara el endpoint |
   | *pk* | string |  Propiedad del objeto que actúa como primary key *(Obligatoria)* |
   | *fichero* | string |  Referencia al fichero que actúa de contenedor *(Obligatoria)* |
   | readonly | boolean | `true` cuando requiera autenticación para los métodos de escritura (POST, PUT, DELETE, PATCH) |Obl
   | operations | array[string] |  Lista de operaciones `["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]` disponibles para el servicio, si está vacía, estarán todas disponibles |
   | security | boolean o string | `true` para indicar que el usuario debe estar autenticado para acceder al servicio. Acepta una cadena con los roles, separados por comas, a los que se autoriza el acceso (requiere autenticación). |
   | schema | string | Esquema OpenApi para la validación y definición de la documentación |
3. Rearrancar el servidor.
4. Probar: <http://localhost:8181/api/nuevoservicio>

### Filtrado, paginación y ordenación

Se han incorporado una serie de parámetros (querystring) para ampliar el control de los resultados del GET:

* ***propiedad=valor*:** Selecciona solo aquellos que el valor de la propiedad dada coincida con el valor proporcionado. Se pueden utilizar varios pares propiedad=valor, en cuyo caso deben cumplirse todos.
* **_search=*valor*:** Selecciona todos aquellos que en alguna de sus propiedades contenga el valor proporcionado. Invalida las búsquedas por propiedades individuales.
* **_sort=*propiedad*:** Indica la lista de propiedades (separadas por comas) por la que se ordenaran los resultados, en caso de omitirse se utilizará la propiedad que actúa como primary key. Si el nombre de la propiedad está precedido por un guion (signo negativo) la ordenación será descendente.
* **_projection=*propiedades*:** Devuelve solo aquellas propiedades de la lista suministrada, los nombres de las propiedades deben ir separadas por comas.
* **_page=*número*:** Número de página empezando en 0 (primera página). Si se omite, pero aparece el parámetro *_rows*, tomara el valor 0 por defecto. La estructura devuelta es:  
    | Propiedad             | Tipo                  | Descripción                               |
    | --------------------- | --------------------- | ----------------------------------------- |
    | content               | array                 | Listado de elementos                      |
    | totalElements         | integer($int64)       | Número total de elementos                 |
    | totalPages            | integer($int32)       | Número total de páginas                   |
    | number                | integer($int32)       | Número de página actual                   |
    | size                  | integer($int32)       | Tamaño de página en elementos             |
    | numberOfElements      | integer($int32)       | Número total de elementos en la página    |
    | empty                 | boolean               | Si la página está vacía                   |
    | first                 | boolean               | Si la página es la primera                |
    | last                  | boolean               | Si la página es la última                 |
* **_page=count:** Devuelve el número de páginas y filas de la fuente de datos. Si se omite el Número de filas por página tomara 20 por defecto. Ej:  
`{  
  "pages": 10,
  "rows": 99
}`
* **_rows=*número*:** Número de filas por página, por defecto 20, si se omite pero aparece el parámetro *_page*.

### Respuestas de error

Las respuesta de error implementan el estándar *Problem Details for HTTP APIs* ([RFC 7807](https://datatracker.ietf.org/doc/html/rfc7807)).

Los detalles del problema puede tener las siguientes propiedades:

* **"type"** (cadena): URI que identifica el tipo de problema y proporciona documentación legible por humanos para el tipo de problema. El valor "about:blank" (predeterminado) indica que el problema no tiene semántica adicional a la del código de estado HTTP.
* **"title"** (cadena): Breve resumen legible por humanos del problema escribe. No cambia de una ocurrencia a otra del mismo problema. Con "type": "about:blank", coincide con la versión textual del status.
* **"status"** (número): Código de estado HTTP (por conveniencia, coincide con el código de estado de la respuesta).
* **"detail"** (cadena): Explicación legible por humanos específica de la ocurrencia concreta del problema.
* **"instance"** (cadena): URI de referencia que identifica el origen de la ocurrencia del problema.
* **"errors"** (array): Lista de errores de validación en pares propiedad/literal de la restricción incumplida.
* **"source"** (cadena): En modo depuración, información complementaria sobre el origen del error.

### Cross-Origin Resource Sharing

Para evitar conflictos con los navegadores se han habilitado las siguientes cabeceras CORS:

* Access-Control-Allow-Origin: _dominio-origen-de-la-petición_
* Access-Control-Allow-Headers: Origin, Content-Type, Accept, Authorization, X-Requested-With, X-SRF-TOKEN
* Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
* Access-Control-Allow-Credentials: true

### ECO

El servicio ECO se puede usar para probar los clientes REST, hacer llamadas API de muestra y comprobar la información recibida por el servidor.

Por ejemplo: <http://localhost:8181/eco/personas/1?_page=1&_rows=10>

    {
        "url": "/eco/personas/1?_page=1&_rows=10",
        "method": "GET",
        "headers": {
            "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c3IiOiJhZG1pbiIsIm5hbWUiOiJBZG1pbmlzdHJhZG9yIiwicm9sZXMiOlsiVXN1YXJpb3MiLCJBZG1pbmlzdHJhZG9yZXMiXSwiaWF0IjoxNjU3NzA1MDA1LCJleHAiOjE2NTc3MDg2MDV9.XoILsNhjT8sr8-rM30urR5hZsj6Kg19cwoczLb3tM7E",
            "user-agent": "PostmanRuntime/7.29.0",
            "accept": "*/*",
            "cache-control": "no-cache",
            "postman-token": "5487649e-23a6-4db8-9c12-e8d1c86c2143",
            "host": "localhost:8181",
            "accept-encoding": "gzip, deflate, br",
            "connection": "keep-alive",
            "cookie": "XSRF-TOKEN=5TW6CW/Yimdgr3gqB5C3w+m4hN6kb8DLURthY8uE4DM="
        },
        "authentication": {
            "isAuthenticated": true,
            "usr": "adm@example.com",
            "name": "Administrador",
            "roles": [
                "Usuarios",
                "Administradores"
            ]
        },
        "XSRF-TOKEN": "5TW6CW/Yimdgr3gqB5C3w+m4hN6kb8DLURthY8uE4DM=",
        "cookies": {
            "XSRF-TOKEN": "5TW6CW/Yimdgr3gqB5C3w+m4hN6kb8DLURthY8uE4DM="
        },
        "params": {
            "0": "/personas/1",
            "1": "personas/1"
        },
        "query": {
            "_page": "1",
            "_rows": "10"
        },
        "body": {},
        "path": {
            "root": "",
            "dir": "",
            "base": "..",
            "ext": "",
            "name": ".."
        }
    }

## Seguridad

### Autenticación

Para simular la autenticación con token JWT de cabecera está disponible el servicio `http://localhost:4321/login` con el método POST.

* **Formularios**
  * action="http://localhost:4321/login"
  * method="post"
  * body="username=admin&password=P@$$w0rd"
* **API**
  * Content-Type: application/json
  * body: { "username": "admin", "password": "P@$$w0rd" }

#### Respuesta JSON:

    {
        "success": true,
        "token": "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c3IiOiJhZG1AZXhhbXBsZS5jb20iLCJuYW1lIjoiQWRtaW5pc3RyYWRvciIsInJvbGVzIjpbIlVzdWFyaW9zIiwiQWRtaW5pc3RyYWRvcmVzIl0sImlhdCI6MTY3MDM0MjE3MiwiZXhwIjoxNjcwMzQyNDcyLCJhdWQiOiJhdXRob3JpemF0aW9uIiwiaXNzIjoiTWljcm9zZXJ2aWNpb3NKV1QifQ.dlt-d1K6wGoe-VBsPtE6SYx25wPgR0k7RwVdkdzMRKoZxYjVjUCAl9P1o4yd4pemG2B2jVu5cq4birz5EqBRy4cgVeNxD86E9f89QwOimNDr3dKGxbVbiS40RyJ1cm9qJ5_aEiBA-LZunByWp5OOtPf1Eq6Hs-AJoDWxidS0kgdjSZmeojzzzcZiE_sb8AoFhKiWC_UXpJr880YQ1jceqQ-qQmD_WCf6JICDqN-cv9Z4uMtdBCFWuMtc_6RCEd38iURtiDYS1a_oSKEZyQTf7cc3etA-4MuckdIItCRqDLiuUyJcuaJV1ODw0dI40MDU2a6Ju0LVB8QPQyNTNLKQvQ",
        "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c3IiOiJhZG1AZXhhbXBsZS5jb20iLCJpYXQiOjE2NzAzNDIxNzIsIm5iZiI6MTY3MDM0MjQ3MiwiZXhwIjoxNjcwMzQzMzcyLCJhdWQiOiJhdXRob3JpemF0aW9uIiwiaXNzIjoiTWljcm9zZXJ2aWNpb3NKV1QifQ.8q1Nwd9E6ZgpMyOPGUTFrv7EGRwvk_6J-J6Uzvk4o_A",
        "name": "Administrador",
        "roles": [
            "Usuarios",
            "Administradores"
        ],
        "expires_in": 300
    }

Se obtiene un token de acceso (RS256), un token de refresco (HMAC256) y la expiración del token de acceso en segundos. El token de refresco no se activa hasta que expire el token de acceso.

#### Envío del token de acceso en la cabecera:

    GET http://localhost:4321/auth
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c3IiOiJhZG1pbiIsIm5hbWUiOiJBZG1pbmlzdHJhZG9yIiwicm9sZXMiOlsiVXN1YXJpb3MiLCJBZG1pbmlzdHJhZG9yZXMiXSwiaWF0IjoxNjQ4NTc4NTYxLCJleHAiOjE2NDg1ODIxNjF9.WF-z8UHEOtqh0NSttxkV4VSp8evKEKLvW1fIh4CwEJ0

#### Envío del token de refresco:

    POST http://localhost:4321/login/refresh

    {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c3IiOiJhZG1AZXhhbXBsZS5jb20iLCJpYXQiOjE2NzAzNDIxNzIsIm5iZiI6MTY3MDM0MjQ3MiwiZXhwIjoxNjcwMzQzMzcyLCJhdWQiOiJhdXRob3JpemF0aW9uIiwiaXNzIjoiTWljcm9zZXJ2aWNpb3NKV1QifQ.8q1Nwd9E6ZgpMyOPGUTFrv7EGRwvk_6J-J6Uzvk4o_A"
    }

#### Obtener la clave publica para validar el token JWT (text/plain)

    GET http://localhost:4321/login/signature

### Gestión de usuarios

En el fichero data/usuarios.json se mantiene la estructura básica de los usuarios registrados que se puede ampliar.

Mediante peticiones AJAX a <http://localhost:4321/register> se pueden:

* Registrar usuario (POST).
* Modificar usuario autenticado (PUT)
* Consultar usuario autenticado (GET)

Las modificaciones y consultas están restringidas al propio usuario autenticado. Los usuarios tienen asociados, a través de la propiedad roles, un array de cadenas con los diferentes grupos a los que pertenecen, permitiendo la autorización por membresía. El servicio de registro no permite a un usuario modificar sus roles.

#### Webhooks

Al registrar un usuario, el usuario queda pendiente de que confirme el correo electrónico a través de webhooks antes de activarse y poder acceder.

    HTTP/1.1 202 Accepted

    {
        "statusGetUri": "http://localhost:4321/register/status?instance=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
        "confirmGetUri": "http://localhost:4321/register/confirm?instance=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
        "rejectGetUri": "http://localhost:4321/register/reject?instance=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    }

Con peticiones get a la url statusGetUri se obtiene el estado actual. Devuelve un 202 mientras esté pendiente de confirmación:

    HTTP/1.1 202 Accepted

    {
        "status": "pending"
    }

Se obtiene un 200 cuando el estado pase complete o canceled (dispone de un día antes de que se cancele), el resultado puede ser confirm, reject, canceled o timeout:

    HTTP/1.1 200 OK

    {
        "status": "complete",
        "result": "reject"
    }

Los webhooks confirmGetUri y rejectGetUri se invocan con peticiones get para poder ser invocados desde correos electrónicos. Ambos devuelven un 204 cuando se completan.

#### Contraseñas
La contraseñas sigue el patrón /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{8,}$/ (al menos 8 caracteres con minúsculas, mayúsculas, dígitos y símbolos). Para el encriptado de contraseñas en la persistencia se utiliza bcrypt (función de hashing de contraseñas basada en el cifrado Blowfish), utilizado al Registrar usuario y se ignora la contraseña en el resto de los casos. Para cambiar la contraseña se ha habilitado el método PUT <http://localhost:4321/register/password> que requiere el usuario autenticado y la contraseña anterior como medida de seguridad:

    PUT http://localhost:4321/register/password
    Content-Type: application/json
    Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c3IiOiJhZG1pbiIsIm5hbWUiOiJBZG1pbmlzdHJhZG9yIiwicm9sZXMiOlsiVXN1YXJpb3MiLCJBZG1pbmlzdHJhZG9yZXMiXSwiaWF0IjoxNjQ5MzM5MDgwLCJleHAiOjE2NDkzNDI2ODB9.1XAvQTzCSgEjs6NVhA0rgFt5NeEb_DMMVIn4DfNOjvg

    {
        "oldPassword": "P@$$w0rd",
        "newPassword": "Pa$$w0rd"
    }

### Cookies

* Para otros escenarios que requiera autenticación por cookies se puede añadir el parámetro `cookie=true` para que envíe la cookie `Authorization` con una validez de una hora: <http://localhost:4321/login?cookie=true>
* Para borrar la cookie: <http://localhost:4321/logout>
* Para obtener la información de la autenticación: <http://localhost:4321/auth>

### Cross-Site Request Forgery (XSRF o CSRF)

La **falsificación de solicitud entre sitios** (XSRF) es una técnica de ataque mediante la cual un sitio web malicioso puede engañar a un usuario autenticado en otro dominio para que, sin saberlo, se ejecuten acciones en el otro sitio web, explotando la confianza del servidor en la cookie de un usuario.

La protección puede establecerse a nivel de formulario y requerir solo intervención del servidor, enviando un token al cliente en el formulario que se verifica al recibir la devolución del formulario:

    <input type="hidden" name="xsrftoken" value="5TW6CW/Yimdgr3gqB5C3w+m4hN6kb8DLURthY8uE4DM=">

El mecanismo **“Cookie-to-Header Token”** para prevenir ataques XSRF consiste en:

* El servidor establece un token en una cookie de sesión legible en JavaScript, llamada XSRF-TOKEN, en la carga de la página o en la primera solicitud GET.
* En las solicitudes posteriores, el cliente debe incluir el encabezado HTTP X-XSRF-TOKEN con el valor recibido en la cookie.
* El servidor verifica que el valor en la cookie coincide con el del encabezado HTTP, que un valor valido y, por lo tanto, que sólo el código que se ejecutó en su dominio pudo haber enviado la solicitud.

Para habilitar la protección:

    node server --xsrf

El token está basado en la IP remota para ser único para cada usuario y es verificado por el servidor. Las verificaciones solo se aplican a las peticiones  POST, PUT, DELETE y PATCH. El mecanismo *“Cookie-to-Header Token”* solo puede utilizase cuando el front-end se aloje en el propio servidor (ver sección *Servidor de web*).

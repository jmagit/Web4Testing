const express = require('express');
const router = express.Router();

function render(req, res, view, title, options = {}) {
  res.render(view, { title, baseUrl: req.path, auth: res.locals.isAuthenticated, ...options });
}

/* GET home page. */
router.get('/', function(req, res) {
  const nuevas = true
  let contenido =  [
    { titulo: 'Calculadora', descripcion: 'La calculadora, al disponer de múltiples botones, es ideal para realizar las pruebas de interacciones con el UI y validar los resultados que se van obteniendo.', imagen: nuevas ? 'https://picsum.photos/640/480?random=1' : 'https://placeimg.com/640/480/tech', enlace: '/calculadora', boton: 'Hacer cálculos' },
    { titulo: 'Carrito de la compra', descripcion: 'El carrito de la compra es un entorno dinámico que permite añadir y quitar productos, comprobar totales e importes filtrar la lista de productos, arrastrar (el producto de la lista) y soltar (en el carrito). Si el producto ya está en la lista, se incrementa la cantidad.', imagen: nuevas ? 'https://picsum.photos/640/480?random=2' : 'https://placeimg.com/640/480/people', enlace: '/compras', boton: 'Ir ahora' },
    { titulo: 'APIs del Navegador', descripcion: 'Entorno de pruebas de las APIs del navegador: los tres tipos nativos de mensajes emergentes ofrecidos por JavaScript (alertas, prompts y confirmaciones), los cuadros modales y modeless por CSS, los temporizadores y la geolocalización.', imagen: nuevas ? 'https://picsum.photos/640/480?random=6' : 'https://placeimg.com/640/480/animals', enlace: '/navegador', boton: 'Mostrar' },
    { titulo: 'Contactos', descripcion: 'Sistema CRUD completo que permite las pruebas de acceso a datos, paginación, trabajo con formularios y validaciones.', imagen: nuevas ? 'https://picsum.photos/640/480?random=3' : 'https://placeimg.com/640/480/nature', enlace: '/contactos', boton: 'Mostrar' },
    { titulo: 'Ficheros', descripcion: 'Entorno de sencillo de pruebas para subir ficheros a un servidor.  Permite eliminar los ficheros subidos.', imagen: nuevas ? 'https://picsum.photos/640/480?random=5' : 'https://placeimg.com/640/480/tech/sepia', enlace: '/fileupload', boton: 'Subir ficheros' },
    { titulo: 'API Rest', descripcion: 'Conjunto de servicios REST completos para servir de back-end y mock de las pruebas de las conexiones AJAX de las aplicaciones front-end. Permite la autenticación JWT.', imagen: nuevas ? 'https://picsum.photos/640/480?random=4' : 'https://placeimg.com/640/480/arch', enlace: '/api', boton: 'Mostrar galería' },
  ]
  if(res.locals.isAuthenticated) {
    contenido.push({ titulo: 'Biblioteca (solo autenticados)', descripcion: 'Sistema CRUD completo que permite las pruebas de acceso a datos, paginación, trabajo con formularios y validaciones. Las consultas se pueden realizar sin estar autenticado, pero para añadir, modificar y borrar es necesaria la autenticación.', imagen: nuevas ? 'https://picsum.photos/640/480?random=7' : 'https://placeimg.com/640/480/nature', enlace: '/biblioteca', boton: '' })
  }
  render(req, res, 'index', 'Entorno de pruebas Web4Testing', { contenido, carrusel: [contenido[0],contenido[1],contenido[5]] });
});

router.get('/calculadora', function (req, res) {
  render(req, res, 'calculadora', 'Calculadora')
});
router.get('/compras', function (req, res) {
  render(req, res, 'carrito', 'Carrito de la compra')
});

router.get('/biblioteca', function (req, res) {
  render(req, res, 'biblioteca', 'Biblioteca');
});

router.get('/contactos', function (req, res) {
  render(req, res, 'contactos', 'Contactos');
});

router.get('/navegador', function (req, res) {
  render(req, res, 'navegador', 'APIs del Navegador')
});

router.get('/documentacion', function (req, res) {
  render(req, res, 'documentacion', 'Documentación', { fichero: '../readme.md'})
});

router.get('/privacy', function (req, res) {
  render(req, res, 'documentacion', 'Política de Privacidad', { fichero: 'privacy.md'})
});

router.get('/terms', function (req, res) {
  render(req, res, 'documentacion', 'Términos y Condiciones', { fichero: 'terms.md'})
});

router.get('/api', function (req, res) {
  render(req, res, 'api', 'API REST', { 
    baseUrl: `${req.protocol}://${req.headers.host}`, 
    base: `${req.protocol}://${req.headers.host}${req.baseUrl}`, 
    servicios: [] 
  })
});


module.exports = router;

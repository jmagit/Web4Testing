const express = require('express');
const router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  const nuevas = true
  res.render('index', { title: 'Entorno de pruebas Web4Testing', baseUrl: req.path, contenido:  [
    { titulo: 'Calculadora', descripcion: 'La calculadora, al disponer de múltiples botones, es ideal para realizar las pruebas de interacciones con el UI y validar los resultados que se van obteniendo.', imagen: nuevas ? 'https://picsum.photos/640/480?random=1' : 'https://placeimg.com/640/480/tech', enlace: '/calculadora', boton: 'Hacer cálculos' },
    { titulo: 'Carrito de la compra', descripcion: 'El carrito de la compra es un entorno dinámico que permite añadir y quitar productos, comprobar totales e importes filtrar la lista de productos, arrastrar el producto de la lista y soltar en el carrito. Si el producto ya está en la lista, se incrementa la cantidad.', imagen: nuevas ? 'https://picsum.photos/640/480?random=2' : 'https://placeimg.com/640/480/people', enlace: '/compras', boton: 'Ir ahora' },
    { titulo: 'Contactos', descripcion: 'Sistema CRUD completo que permite las pruebas de acceso a datos, paginación, trabajo con formularios y validaciones. Las consultas se pueden realizar sin estar autenticado, pero para añadir, modificar y borrar es necesaria la autenticación.', imagen: nuevas ? 'https://picsum.photos/640/480?random=3' : 'https://placeimg.com/640/480/nature', enlace: '/biblioteca', boton: '' },
    { titulo: 'API Rest', descripcion: 'Conjunto de servicios REST completos para servir de back-end y mock de las pruebas de las conexiones AJAX de las aplicaciones front-end. Permite la autenticación JWT.', imagen: nuevas ? 'https://picsum.photos/640/480?random=4' : 'https://placeimg.com/640/480/arch', enlace: '/api', boton: 'Mostrar galería' },
    { titulo: 'Ficheros', descripcion: 'Entorno de sencillo de pruebas para subir ficheros a un servidor.  Permite eliminar los ficheros subidos.', imagen: nuevas ? 'https://picsum.photos/640/480?random=5' : 'https://placeimg.com/640/480/tech/sepia', enlace: '/fileupload', boton: '' },
    { titulo: 'Alertas', descripcion: 'Entorno de pruebas para los tres tipos nativos de mensajes emergentes ofrecidos por JavaScript: alertas, prompts y confirmaciones, así como los cuadros modales y modeless.', imagen: nuevas ? 'https://picsum.photos/640/480?random=6' : 'https://placeimg.com/640/480/animals', enlace: '/alertas', boton: '' },
  ]});
});

router.get('/calculadora', function (req, res) {
  res.render('calculadora', { title: 'Calculadora', baseUrl: req.path });
});
router.get('/compras', function (req, res) {
  res.render('carrito', { title: 'Carrito de la compra', baseUrl: req.path });
});

router.get('/biblioteca', function (req, res) {
  res.render('biblioteca', { title: 'Biblioteca', baseUrl: req.path });
});

router.get('/contactos', function (req, res) {
  res.render('contactos', { title: 'Contactos', baseUrl: req.path });
});

router.get('/alertas', function (req, res) {
  res.render('alertas', { title: 'Alertas', baseUrl: req.path });
});

router.get('/documentacion', function (req, res) {
  res.render('documentacion', { title: 'Documentación', baseUrl: req.path });
});
router.get('/api', function (req, res) {
  res.render('api', { 
    title: 'API REST', 
    baseUrl: `${req.protocol}://${req.headers.host}`, 
    base: `${req.protocol}://${req.headers.host}${req.baseUrl}`, 
    servicios: [] 
  });
});


module.exports = router;

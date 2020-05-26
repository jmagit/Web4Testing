const express = require('express');
const router = express.Router();

router.get('/calculadora', function (req, res, next) {
    res.render('calculadora', { title: 'Calculadora', baseUrl: req.path });
});
router.get('/compras', function (req, res, next) {
    res.render('carrito', { title: 'Carrito de la compra', baseUrl: req.path });
});

router.get('/biblioteca', function (req, res, next) {
    res.render('biblioteca', { title: 'Biblioteca', baseUrl: req.path });
});

router.get('/alertas', function (req, res, next) {
    res.render('alertas', { title: 'Alertas', baseUrl: req.path });
});

module.exports = router; 

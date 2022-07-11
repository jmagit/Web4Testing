function LineaPedido(idProducto, nombreProducto, cantidad, precio) {
    this.id = 0;
    this.idProducto = idProducto;
    this.producto = nombreProducto;
    this.cantidad = cantidad;
    this.precio = precio;
    this.importe = cantidad * precio;
}

const carrito = new (function () {
    let obj = this;
    obj.lineas = [];
    if (localStorage && localStorage['CarritoCompra'])
        obj.lineas = JSON.parse(localStorage['CarritoCompra']);

    function guardaCarrito() {
        if (localStorage)
            localStorage['CarritoCompra'] = JSON.stringify(obj.lineas);
    }
    /**
     * 
     */
    obj.add = function (idProducto, nombreProducto, precio) {
        let ln = new LineaPedido(idProducto, nombreProducto, 1, precio);
        if (obj.lineas.length == 0) {
            ln.id = 1;
        } else {
            let old = obj.lineas.find(function (item) { return item.idProducto == idProducto; });
            if (old) {
                old.cantidad += 1;
                old.precio = precio;
                old.importe = old.cantidad * old.precio;
                guardaCarrito();
                return;
            }
            ln.id = obj.lineas[obj.lineas.length - 1].id + 1;
        }
        obj.lineas.push(ln);
        guardaCarrito();
    };
    obj.remove = function (id) {
        let ind = obj.lineas.findIndex(function (item) { return item.id == id; });
        if (ind !== -1) {
            obj.lineas.splice(ind, 1);
            guardaCarrito();
        } else
            console.warn('Elemento no encontrado');
    };
    obj.vaciar = function () {
        obj.lineas = [];
        if (localStorage)
            localStorage.removeItem('CarritoCompra');
    };
})();

function CarritoManager() {
    let obj = this;
    let listaProductos;

    function PintaProductos(lst) {
        let tmpl = $('#tmplListadoProducto').html();
        let rslt = Mustache.render(tmpl, { filas: lst });
        $('#filtroResult').html(rslt);
    }
    function PintaCarrito() {
        let tmpl = $('#tmplListadoCarrito').html();
        // let rslt = Mustache.render(tmpl, { filas: carrito.lineas, total: carrito.lineas.reduce(function(sum, f) {return sum + f.importe;})});
        let rslt = Mustache.render(tmpl, {
            filas: carrito.lineas, total: carrito.lineas.length === 0 ? 0 :
                carrito.lineas.map(function (f) { return f.importe; }).reduce(function (sum, f) { return sum + f; })
        });
        $('#listadoCarrito').html(rslt);
    }

    obj.Refresca = function () {
        PintaCarrito();
    };
    obj.ListarProductos = function () {
        if (listaProductos)
            PintaProductos(listaProductos);
        else
            fetch('api/peliculas?_sort=titulo').then(function (response) {
                if (response.ok) {
                    response.json().then(function (data) {
                        listaProductos = data;
                        PintaProductos(listaProductos);
                    }).catch(function (error) {
                        obj.PonError('Error en los datos recibidos: ' + error.message);
                    });
                } else {
                    obj.PonError('Error ' + response.status + ': ' + response.statusText);
                }
            }).catch(function (error) {
                obj.PonError('Hubo un problema con la petición Fetch:' + error.message);
            });
    };

    obj.drag = function (ev, id) {
        ev.dataTransfer.setData("id_producto", id);
    };

    obj.allowDrop = function (ev) {
        ev.preventDefault();
    };

    obj.drop = function (ev) {
        ev.preventDefault();
        let id = ev.dataTransfer.getData("id_producto");
        let prod = listaProductos.find(function (item) { return item.id == id; });
        if (prod) {
            carrito.add(prod.id, prod.titulo, prod.precio);
            mng.Refresca();
        }
    };

    obj.Filtra = function (texto) {
        if (!listaProductos) return;
        if (!texto || texto == "") {
            PintaProductos(listaProductos);
            return;
        }
        let rslt = listaProductos.filter(function (item) {
            return item.titulo.toUpperCase().indexOf(texto.toUpperCase()) >= 0;
        });
        PintaProductos(rslt);
    };

    obj.PonError = function (msg) {
        console.error(msg);
    };
}
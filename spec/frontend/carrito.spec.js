/* eslint-disable n/no-unsupported-features/node-builtins */
const flush = () => new Promise(resolve => setImmediate(resolve));

const crearLocalStorage = (inicial = {}) => {
    const store = { ...inicial };
    return {
        ...store,
        removeItem: jest.fn((key) => {
            delete store[key];
            delete this[key];
        }),
    };
};

const crearEntorno = () => {
    const dom = {
        '#tmplListadoProducto': { htmlContent: '<ul>{{filas.length}}</ul>' },
        '#tmplListadoCarrito': { htmlContent: '<table>{{total}}</table>' },
        '#filtroResult': { htmlContent: '' },
        '#listadoCarrito': { htmlContent: '' },
    };

    const $ = (selector) => {
        if (!dom[selector]) throw new Error(`Selector no soportado en test: ${selector}`);
        return {
            html(value) {
                if (typeof value !== 'undefined') {
                    dom[selector].htmlContent = value;
                    return this;
                }
                return dom[selector].htmlContent;
            },
        };
    };

    return { $, dom };
};

const cargarModulo = ({ localStorage, fetchMock } = {}) => {
    const env = crearEntorno();
    jest.resetModules();
    global.localStorage = localStorage || crearLocalStorage();
    global.fetch = fetchMock || jest.fn();
    global.$ = env.$;
    global.Mustache = {
        render: jest.fn((template, data) => JSON.stringify({ template, data })),
    };

    const mod = require('../../public/javascripts/carrito');
    return { ...mod, env };
};

describe('Frontend: carrito', () => {
    afterEach(() => {
        delete global.localStorage;
        delete global.fetch;
        delete global.$;
        delete global.Mustache;
        jest.restoreAllMocks();
        jest.resetModules();
    });

    describe('LineaPedido y carrito', () => {
        it('LineaPedido calcula el importe', () => {
            const { LineaPedido } = cargarModulo();
            const linea = new LineaPedido(7, 'Producto', 3, 4.5);

            expect(linea.idProducto).toBe(7);
            expect(linea.producto).toBe('Producto');
            expect(linea.importe).toBe(13.5);
        });

        it('carga el carrito desde localStorage', () => {
            const localStorage = crearLocalStorage({
                CarritoCompra: JSON.stringify([{ id: 1, idProducto: 9, producto: 'Precargado', cantidad: 2, precio: 3, importe: 6 }]),
            });
            const { carrito } = cargarModulo({ localStorage });

            expect(carrito.lineas).toHaveLength(1);
            expect(carrito.lineas[0].producto).toBe('Precargado');
        });

        it('add inserta la primera línea y la persiste', () => {
            const localStorage = crearLocalStorage();
            const { carrito } = cargarModulo({ localStorage });

            carrito.add(1, 'Película', 9.95);

            expect(carrito.lineas).toHaveLength(1);
            expect(carrito.lineas[0]).toEqual(expect.objectContaining({
                id: 1,
                idProducto: 1,
                producto: 'Película',
                cantidad: 1,
                precio: 9.95,
                importe: 9.95,
            }));
            expect(localStorage.CarritoCompra).toContain('"Película"');
        });

        it('add incrementa una línea existente sin duplicarla', () => {
            const localStorage = crearLocalStorage();
            const { carrito } = cargarModulo({ localStorage });
            carrito.add(1, 'Película', 10);

            carrito.add(1, 'Película', 12);

            expect(carrito.lineas).toHaveLength(1);
            expect(carrito.lineas[0].cantidad).toBe(2);
            expect(carrito.lineas[0].precio).toBe(12);
            expect(carrito.lineas[0].importe).toBe(24);
        });

        it('add asigna ids consecutivos a líneas nuevas', () => {
            const { carrito } = cargarModulo();
            carrito.add(1, 'Uno', 5);
            carrito.add(2, 'Dos', 7);

            expect(carrito.lineas[1].id).toBe(2);
        });

        it('remove elimina por id y avisa si no existe', () => {
            const out = jest.spyOn(console, 'warn').mockImplementation(() => {});
            const { carrito } = cargarModulo();
            carrito.add(1, 'Uno', 5);
            carrito.add(2, 'Dos', 7);

            carrito.remove(1);
            carrito.remove(999);

            expect(carrito.lineas).toHaveLength(1);
            expect(carrito.lineas[0].idProducto).toBe(2);
            expect(out).toHaveBeenCalledWith('Elemento no encontrado');
        });

        it('vaciar borra líneas y limpia localStorage', () => {
            const localStorage = crearLocalStorage();
            const { carrito } = cargarModulo({ localStorage });
            carrito.add(1, 'Uno', 5);

            carrito.vaciar();

            expect(carrito.lineas).toEqual([]);
            expect(localStorage.removeItem).toHaveBeenCalledWith('CarritoCompra');
        });
    });

    describe('CarritoManager', () => {
        it('Refresca pinta el carrito con el total', () => {
            const { carrito, CarritoManager, env } = cargarModulo();
            carrito.add(1, 'Uno', 5);
            carrito.add(2, 'Dos', 7);
            const manager = new CarritoManager();

            manager.Refresca();

            const llamada = global.Mustache.render.mock.calls[0][1];
            expect(llamada.total).toBe(12);
            expect(env.dom['#listadoCarrito'].htmlContent).toContain('"total":12');
        });

        it('ListarProductos obtiene datos, los pinta y usa caché', async () => {
            const productos = [{ id: 1, titulo: 'Matrix', precio: 10 }];
            const fetchMock = jest.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(productos),
            });
            const { CarritoManager, env } = cargarModulo({ fetchMock });
            const manager = new CarritoManager();

            manager.ListarProductos();
            await flush();
            await flush();
            manager.ListarProductos();

            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(fetchMock).toHaveBeenCalledWith('api/peliculas?_sort=titulo');
            expect(env.dom['#filtroResult'].htmlContent).toContain('"titulo":"Matrix"');
        });

        it('ListarProductos informa errores HTTP, de datos y de red', async () => {
            const fetchMock = jest.fn()
                .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' })
                .mockResolvedValueOnce({ ok: true, json: () => Promise.reject(new Error('JSON roto')) })
                .mockRejectedValueOnce(new Error('sin red'));
            const { CarritoManager } = cargarModulo({ fetchMock });
            const manager = new CarritoManager();
            const out = jest.spyOn(manager, 'PonError').mockImplementation(() => {});

            manager.ListarProductos();
            await flush();
            manager.ListarProductos();
            await flush();
            await flush();
            manager.ListarProductos();
            await flush();

            expect(out).toHaveBeenNthCalledWith(1, 'Error 500: Server Error');
            expect(out).toHaveBeenNthCalledWith(2, 'Error en los datos recibidos: JSON roto');
            expect(out).toHaveBeenNthCalledWith(3, 'Hubo un problema con la petición Fetch:sin red');
        });

        it('drag y allowDrop delegan en dataTransfer y preventDefault', () => {
            const { CarritoManager } = cargarModulo();
            const manager = new CarritoManager();
            const dataTransfer = { setData: jest.fn() };
            const evDrag = { dataTransfer };
            const evDrop = { preventDefault: jest.fn() };

            manager.drag(evDrag, 77);
            manager.allowDrop(evDrop);

            expect(dataTransfer.setData).toHaveBeenCalledWith('id_producto', 77);
            expect(evDrop.preventDefault).toHaveBeenCalled();
        });

        it('drop añade el producto encontrado y refresca', async () => {
            const productos = [{ id: 3, titulo: 'Origen', precio: 8 }];
            const fetchMock = jest.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(productos),
            });
            const { carrito, CarritoManager } = cargarModulo({ fetchMock });
            const manager = new CarritoManager();
            const spy = jest.spyOn(manager, 'Refresca');

            manager.ListarProductos();
            await flush();
            await flush();

            manager.drop({
                preventDefault: jest.fn(),
                dataTransfer: { getData: jest.fn(() => 3) },
            });

            expect(carrito.lineas).toHaveLength(1);
            expect(carrito.lineas[0].producto).toBe('Origen');
            expect(spy).toHaveBeenCalled();
        });

        it('drop ignora ids inexistentes', async () => {
            const fetchMock = jest.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve([{ id: 3, titulo: 'Origen', precio: 8 }]),
            });
            const { carrito, CarritoManager } = cargarModulo({ fetchMock });
            const manager = new CarritoManager();

            manager.ListarProductos();
            await flush();
            await flush();
            manager.drop({
                preventDefault: jest.fn(),
                dataTransfer: { getData: jest.fn(() => 999) },
            });

            expect(carrito.lineas).toEqual([]);
        });

        it('Filtra pinta todo, filtra texto y no hace nada sin catálogo', async () => {
            const fetchMock = jest.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve([
                    { id: 1, titulo: 'Matrix', precio: 10 },
                    { id: 2, titulo: 'Origen', precio: 8 },
                ]),
            });
            const { CarritoManager, env } = cargarModulo({ fetchMock });
            const manager = new CarritoManager();

            manager.Filtra('algo');
            expect(env.dom['#filtroResult'].htmlContent).toBe('');

            manager.ListarProductos();
            await flush();
            await flush();
            manager.Filtra('mat');
            expect(env.dom['#filtroResult'].htmlContent).toContain('"titulo":"Matrix"');
            manager.Filtra('');
            expect(env.dom['#filtroResult'].htmlContent).toContain('"titulo":"Origen"');
        });

        it('PonError escribe en consola', () => {
            const out = jest.spyOn(console, 'error').mockImplementation(() => {});
            const { CarritoManager } = cargarModulo();
            const manager = new CarritoManager();

            manager.PonError('fallo controlado');

            expect(out).toHaveBeenCalledWith('fallo controlado');
        });
    });
});

class FakeField {
    constructor({ name, value = '', type = 'text', checked = false, validacion = '', title = '' } = {}) {
        this.name = name;
        this.value = value;
        this.defaultValue = value;
        this.type = type;
        this.checked = checked;
        this.defaultChecked = checked;
        this.title = title;
        this.validationMessage = '';
        this.dataset = { validacion };
        this.container = { classes: new Set() };
    }

    setCustomValidity(message) {
        this.validationMessage = message;
    }

    reset() {
        this.value = this.defaultValue;
        this.checked = this.defaultChecked;
        this.validationMessage = '';
    }
}

const crearEntorno = () => {
    const errors = {};
    const fieldsByName = {};
    const form = {
        visible: true,
        serializeData: [],
        reset: jest.fn(() => {
            Object.values(fieldsByName).flat().forEach(item => item.reset());
        }),
    };
    const listado = { visible: true, htmlContent: '', appended: [] };
    const content = { htmlContent: '' };
    const pageSelection = { config: null, pageHandler: null, triggerCalls: [] };
    const btnEnviar = { handlers: {}, disabled: false };
    const txtError = { textContent: '' };
    const alertError = { visible: false };
    const templates = {
        '#tmplListado': '<ul>{{filas.length}}</ul>',
        '#tmplDetalle': '<article>{{item.nombre}}</article>',
    };

    const wrapFields = (items, _selector) => ({
        length: items.length,
        each(fn) {
            items.forEach((item, index) => fn.call(item, index, item));
            return this;
        },
        val(value) {
            if (typeof value !== 'undefined') {
                items.forEach(item => {
                    item.value = value;
                });
                return this;
            }
            return items[0] ? items[0].value : undefined;
        },
        after(html) {
            const id = html.match(/id="([^"]+)"/)?.[1];
            if (id) {
                errors[id] = {
                    text: html.replace(/^.*msg-error">/, '').replace(/<\/div>$/, ''),
                    removed: false,
                };
            }
            return this;
        },
        parent() {
            return {
                parent() {
                    return {
                        addClass(name) {
                            items.forEach(item => item.container.classes.add(name));
                            return this;
                        },
                        removeClass(name) {
                            items.forEach(item => item.container.classes.delete(name));
                            return this;
                        },
                    };
                },
            };
        },
    });

    const wrapError = (id) => ({
        length: errors[id] && !errors[id].removed ? 1 : 0,
        text(value) {
            if (errors[id]) errors[id].text = value;
            return this;
        },
        remove() {
            if (errors[id]) errors[id].removed = true;
            return this;
        },
    });

    const $ = (selector) => {
        if (selector instanceof FakeField) {
            return wrapFields([selector], '[field]');
        }
        const byName = selector.match(/^\[name="([^"]+)"\]?$/);
        if (byName) {
            return wrapFields(fieldsByName[byName[1]] || [], selector);
        }
        const err = selector.match(/^#err_(.+)$/);
        if (err) {
            return wrapError(`err_${err[1]}`);
        }
        if (selector === '.msg-error') {
            return {
                remove() {
                    Object.values(errors).forEach(item => {
                        item.removed = true;
                    });
                    return this;
                },
            };
        }
        if (selector === '#frmPrincipal') {
            return {
                serializeArray() {
                    return form.serializeData;
                },
                show() {
                    form.visible = true;
                    return this;
                },
                hide() {
                    form.visible = false;
                    return this;
                },
                each(fn) {
                    fn.call(form, 0, form);
                    return this;
                },
            };
        }
        if (selector === '#listado') {
            return {
                empty() {
                    listado.htmlContent = '';
                    listado.appended = [];
                    return this;
                },
                append(value) {
                    listado.appended.push(value.__html || value);
                    return this;
                },
                html(value) {
                    if (typeof value !== 'undefined') {
                        listado.htmlContent = value;
                        return this;
                    }
                    return listado.htmlContent;
                },
                hide() {
                    listado.visible = false;
                    return this;
                },
                show() {
                    listado.visible = true;
                    return this;
                },
            };
        }
        if (selector === '#content') {
            return {
                empty() {
                    content.htmlContent = '';
                    return this;
                },
                html(value) {
                    if (typeof value !== 'undefined') {
                        content.htmlContent = value;
                        return this;
                    }
                    return content.htmlContent;
                },
            };
        }
        if (selector === '#page-selection') {
            return {
                twbsPagination(config) {
                    pageSelection.config = config;
                    return this;
                },
                on(event, handler) {
                    if (event === 'page') pageSelection.pageHandler = handler;
                    return this;
                },
                trigger(event, page) {
                    pageSelection.triggerCalls.push({ event, page });
                    return this;
                },
            };
        }
        if (selector === '#btnEnviar') {
            return {
                on(event, handler) {
                    btnEnviar.handlers[event] = handler;
                    return this;
                },
                off(event) {
                    delete btnEnviar.handlers[event];
                    return this;
                },
                prop(name, value) {
                    if (name === 'disabled') btnEnviar.disabled = value;
                    return this;
                },
            };
        }
        if (selector === '#txtError') {
            return {
                text(value) {
                    txtError.textContent = value;
                    return this;
                },
            };
        }
        if (selector === '#alertError') {
            return {
                show() {
                    alertError.visible = true;
                    return this;
                },
            };
        }
        if (selector === '#tmplListado' || selector === '#tmplDetalle') {
            return {
                html() {
                    return templates[selector];
                },
            };
        }
        if (selector.startsWith('<')) {
            return { __html: selector };
        }
        throw new Error(`Selector no soportado en test: ${selector}`);
    };

    return {
        $,
        form,
        listado,
        content,
        pageSelection,
        btnEnviar,
        txtError,
        alertError,
        errors,
        fieldsByName,
    };
};

const okJson = (payload) => ({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve(payload),
});

const koJson = (status, title, detail = undefined) => ({
    ok: false,
    status,
    statusText: title,
    headers: { get: () => 'application/json; charset=utf-8' },
    json: () => Promise.resolve({ title, detail }),
});

const koText = (status, statusText) => ({
    ok: false,
    status,
    statusText,
    headers: { get: () => 'text/plain' },
});

const flush = () => new Promise(resolve => setImmediate(resolve));

const cargarModulo = (fetchMock = jest.fn()) => {
    const env = crearEntorno();
    jest.resetModules();
    global.fetch = fetchMock;
    global.$ = env.$;
    global.jQuery = { Event: jest.fn((name) => ({ type: name })) };
    global.Mustache = {
        render: jest.fn((template, data) => JSON.stringify({ template, data })),
    };
    global.Web4Testing = {
        AuthService: {
            getHeaders: jest.fn(() => ({ Authorization: 'Bearer test' })),
        },
    };
    global.window = {
        confirm: jest.fn(() => true),
    };

    const Contactos = require('../../public/javascripts/contactos');
    return { Contactos, env, fetchMock };
};

describe('Frontend: contactos', () => {
    afterEach(() => {
        delete global.fetch;
        delete global.$;
        delete global.jQuery;
        delete global.Mustache;
        delete global.Web4Testing;
        delete global.window;
        jest.resetModules();
        jest.clearAllMocks();
    });

    describe('Listado', () => {
        it('get consulta el API paginado', async () => {
            const fetchMock = jest.fn().mockResolvedValue(okJson({ totalPages: 1, content: [] }));
            const { Contactos } = cargarModulo(fetchMock);

            const result = await Contactos.get();

            expect(result.totalPages).toBe(1);
            expect(fetchMock).toHaveBeenCalledWith('/api/contactos?_sort=nombre,apellidos&_projection=id,tratamiento,nombre,apellidos,avatar,telefono,email&_page=0&_rows=7', expect.objectContaining({
                method: 'GET',
            }));
        });

        it('get rechaza y muestra error cuando falla', async () => {
            const fetchMock = jest.fn().mockResolvedValue(koJson(500, 'Server Error', 'Fallo listando'));
            const { Contactos, env } = cargarModulo(fetchMock);

            await expect(Contactos.get()).rejects.toEqual(expect.objectContaining({ ok: false }));
            await flush();

            expect(env.txtError.textContent).toBe('ERROR: 500: Fallo listando');
            expect(env.alertError.visible).toBeTruthy();
        });

        it('listar pinta contenido y configura paginación', async () => {
            const datos = { totalPages: 3, content: [{ id: 1, nombre: 'Ada' }] };
            const fetchMock = jest.fn().mockResolvedValue(okJson(datos));
            const { Contactos, env } = cargarModulo(fetchMock);

            Contactos.listar();
            await flush();
            await flush();

            expect(global.Mustache.render).toHaveBeenCalled();
            expect(env.listado.appended).toEqual(['<div id="content"></div>', '<nav id="page-selection"></nav>']);
            expect(env.pageSelection.config.totalPages).toBe(3);
            expect(env.content.htmlContent).toContain('"filas":[{"id":1,"nombre":"Ada"}]');
        });

        it('la paginación cambia de página y relanza el listado', async () => {
            const fetchMock = jest.fn()
                .mockResolvedValue(okJson({ totalPages: 2, content: [] }))
                .mockResolvedValue(okJson({ totalPages: 2, content: [] }));
            const { Contactos, env } = cargarModulo(fetchMock);
            const spy = jest.spyOn(Contactos, 'listar');

            Contactos.listar();
            await flush();
            env.pageSelection.pageHandler({}, 2);

            expect(Contactos.currentPage).toBe(2);
            expect(spy).toHaveBeenCalledTimes(2);
        });
    });

    describe('Formulario y validación', () => {
        it('añadir oculta el listado, resetea el formulario y registra el envío', () => {
            const { Contactos, env } = cargarModulo();

            Contactos.añadir();

            expect(env.listado.visible).toBeFalsy();
            expect(env.form.reset).toHaveBeenCalled();
            expect(typeof env.btnEnviar.handlers.click).toBe('function');
        });

        it('validar detecta mayúsculas y minúsculas', () => {
            const { Contactos, env } = cargarModulo();
            env.fieldsByName.codigo = [new FakeField({ name: 'codigo', value: 'abc', validacion: 'mayusculas' })];
            env.fieldsByName.alias = [new FakeField({ name: 'alias', value: 'ABC', validacion: 'minusculas', title: 'solo texto' })];

            expect(Contactos.validar('codigo')).toBeFalsy();
            expect(Contactos.validar('alias')).toBeFalsy();
            expect(env.errors.err_codigo.text).toContain('mayúsculas');
            expect(env.errors.err_alias.text).toContain('minúsculas');
            expect(env.btnEnviar.disabled).toBeTruthy();
        });

        it('validar limpia el error cuando el campo es correcto', () => {
            const { Contactos, env } = cargarModulo();
            env.fieldsByName.codigo = [new FakeField({ name: 'codigo', value: 'ABC', validacion: 'mayusculas' })];
            env.errors.err_codigo = { text: 'viejo', removed: false };

            const result = Contactos.validar('codigo');

            expect(result).toBeTruthy();
            expect(env.errors.err_codigo.removed).toBeTruthy();
            expect(env.btnEnviar.disabled).toBeFalsy();
        });

        it('validar actualiza el texto si el error ya existe', () => {
            const { Contactos, env } = cargarModulo();
            env.fieldsByName.codigo = [new FakeField({ name: 'codigo', value: 'abc', validacion: 'mayusculas' })];
            env.errors.err_codigo = { text: 'anterior', removed: false };

            const result = Contactos.validar('codigo');

            expect(result).toBeFalsy();
            expect(env.errors.err_codigo.text).toBe('Tiene que estar en mayúsculas');
        });
    });

    describe('Detalle y edición', () => {
        it('editar carga los datos y rellena distintos tipos de campo', async () => {
            const fetchMock = jest.fn().mockResolvedValue(okJson({
                nombre: 'Ada',
                tratamiento: 'Sra',
                conflictivo: true,
            }));
            const { Contactos, env } = cargarModulo(fetchMock);
            env.fieldsByName.nombre = [new FakeField({ name: 'nombre', value: '' })];
            env.fieldsByName.tratamiento = [
                new FakeField({ name: 'tratamiento', value: 'Sr', type: 'radio' }),
                new FakeField({ name: 'tratamiento', value: 'Sra', type: 'radio' }),
            ];
            env.fieldsByName.conflictivo = [new FakeField({ name: 'conflictivo', type: 'checkbox' })];

            Contactos.editar(7);
            await flush();
            await flush();

            expect(fetchMock).toHaveBeenCalledWith('/api/contactos/7', expect.objectContaining({ method: 'GET' }));
            expect(env.fieldsByName.nombre[0].value).toBe('Ada');
            expect(env.fieldsByName.tratamiento[1].checked).toBeTruthy();
            expect(env.fieldsByName.conflictivo[0].checked).toBeTruthy();
            expect(env.listado.visible).toBeFalsy();
            expect(typeof env.btnEnviar.handlers.click).toBe('function');
        });

        it('editar muestra error si falla la carga', async () => {
            const fetchMock = jest.fn().mockResolvedValue(koText(404, 'Not Found'));
            const { Contactos, env } = cargarModulo(fetchMock);

            Contactos.editar(8);
            await flush();

            expect(env.txtError.textContent).toBe('ERROR: 404: Not Found');
        });

        it('ver muestra el detalle formateando la fecha', async () => {
            const fetchMock = jest.fn().mockResolvedValue(okJson({
                nombre: 'Ada',
                nacimiento: '2001-02-03',
            }));
            const { Contactos, env } = cargarModulo(fetchMock);

            Contactos.ver(3);
            await flush();
            await flush();

            const llamada = global.Mustache.render.mock.calls[0][1];
            expect(llamada.item.fnacimiento()).toBe('03/02/2001');
            expect(env.listado.htmlContent).toContain('"nombre":"Ada"');
        });
    });

    describe('Borrado y guardado', () => {
        it('borrar se cancela si el usuario no confirma', () => {
            const fetchMock = jest.fn();
            const { Contactos } = cargarModulo(fetchMock);
            global.window.confirm.mockReturnValue(false);

            Contactos.borrar(5);

            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('borrar llama al API y vuelve al listado', async () => {
            const fetchMock = jest.fn()
                .mockResolvedValueOnce(okJson({}))
                .mockResolvedValueOnce(okJson({ totalPages: 1, content: [] }));
            const { Contactos, env } = cargarModulo(fetchMock);

            Contactos.borrar(5);
            await flush();
            await flush();

            expect(fetchMock).toHaveBeenCalledWith('/api/contactos/5', expect.objectContaining({ method: 'DELETE' }));
            expect(env.listado.visible).toBeTruthy();
            expect(env.form.visible).toBeFalsy();
        });

        it('enviarNuevo muestra error si los datos son inválidos', () => {
            const { Contactos, env } = cargarModulo();
            env.form.serializeData = [{ name: 'codigo', value: 'abc' }];
            env.fieldsByName.codigo = [new FakeField({ name: 'codigo', value: 'abc', validacion: 'mayusculas' })];

            Contactos.enviarNuevo();

            expect(env.txtError.textContent).toBe('Datos inválidos');
        });

        it('enviarNuevo hace POST con el cuerpo capturado', async () => {
            const fetchMock = jest.fn().mockResolvedValue(okJson({}));
            const { Contactos, env } = cargarModulo(fetchMock);
            env.form.serializeData = [
                { name: 'id', value: '12' },
                { name: 'nombre', value: 'Ada' },
                { name: 'conflictivo', value: 'true' },
            ];
            env.fieldsByName.id = [new FakeField({ name: 'id', value: '12' })];
            env.fieldsByName.nombre = [new FakeField({ name: 'nombre', value: 'Ada' })];
            env.fieldsByName.conflictivo = [new FakeField({ name: 'conflictivo', value: 'true' })];

            Contactos.enviarNuevo();
            await flush();
            await flush();

            expect(fetchMock).toHaveBeenCalledWith('/api/contactos', expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ id: 12, nombre: 'Ada', conflictivo: true }),
            }));
        });

        it('enviarNuevo muestra error si el API responde KO', async () => {
            const fetchMock = jest.fn().mockResolvedValue(koText(409, 'Conflict'));
            const { Contactos, env } = cargarModulo(fetchMock);
            env.form.serializeData = [{ name: 'nombre', value: 'Ada' }];
            env.fieldsByName.nombre = [new FakeField({ name: 'nombre', value: 'Ada' })];

            Contactos.enviarNuevo();
            await flush();
            await flush();

            expect(env.txtError.textContent).toBe('ERROR: 409: Conflict');
        });

        it('enviarModificado hace PUT usando el id editado', async () => {
            const fetchMock = jest.fn()
                .mockResolvedValueOnce(okJson({ nombre: 'Ada' }))
                .mockResolvedValueOnce(okJson({}))
                .mockResolvedValueOnce(okJson({ totalPages: 1, content: [] }));
            const { Contactos, env } = cargarModulo(fetchMock);
            env.fieldsByName.nombre = [new FakeField({ name: 'nombre', value: '' })];

            Contactos.editar(9);
            await flush();
            await flush();

            env.form.serializeData = [{ name: 'nombre', value: 'Ada Lovelace' }];
            env.fieldsByName.nombre[0].value = 'Ada Lovelace';

            Contactos.enviarModificado();
            await flush();
            await flush();

            expect(fetchMock).toHaveBeenCalledWith('/api/contactos/9', expect.objectContaining({
                method: 'PUT',
                body: JSON.stringify({ nombre: 'Ada Lovelace', id: NaN, conflictivo: false }),
            }));
        });

        it('enviarModificado muestra error si los datos son inválidos', async () => {
            const { Contactos, env } = cargarModulo();
            env.form.serializeData = [{ name: 'codigo', value: 'abc' }];
            env.fieldsByName.codigo = [new FakeField({ name: 'codigo', value: 'abc', validacion: 'mayusculas' })];

            Contactos.enviarModificado();

            expect(env.txtError.textContent).toBe('Datos inválidos');
        });

        it('ponError actualiza el mensaje visible', () => {
            const { Contactos, env } = cargarModulo();

            Contactos.ponError('Error controlado');

            expect(env.txtError.textContent).toBe('Error controlado');
            expect(env.alertError.visible).toBeTruthy();
        });

        it('muestra error textual del servidor en ver/borrar', async () => {
            const fetchMock = jest.fn()
                .mockResolvedValueOnce(koText(404, 'Not Found'))
                .mockResolvedValueOnce(koText(409, 'Conflict'));
            const { Contactos, env } = cargarModulo(fetchMock);

            Contactos.ver(1);
            await flush();
            Contactos.borrar(2);
            await flush();

            expect(env.txtError.textContent).toBe('ERROR: 409: Conflict');
        });
    });
});

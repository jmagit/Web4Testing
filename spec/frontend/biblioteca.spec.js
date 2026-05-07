class FakeField {
    constructor({ name, value = '', type = 'text', checked = false, validacion = '' } = {}) {
        this.name = name;
        this.value = value;
        this.defaultValue = value;
        this.type = type;
        this.checked = checked;
        this.defaultChecked = checked;
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
    };

    const wrapFields = (items) => ({
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
        if (selector instanceof FakeField) return wrapFields([selector]);
        const byName = selector.match(/^\[name="([^"]+)"\]?$/);
        if (byName) return wrapFields(fieldsByName[byName[1]] || []);
        const err = selector.match(/^#err_(.+)$/);
        if (err) return wrapError(`err_${err[1]}`);
        if (selector === '.msg-error') {
            return {
                remove() {
                    Object.values(errors).forEach(item => { item.removed = true; });
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
        if (selector === '#tmplListado') {
            return {
                html() {
                    return templates[selector];
                },
            };
        }
        if (selector.startsWith('<')) return { __html: selector };
        throw new Error(`Selector no soportado en test: ${selector}`);
    };

    return { $, form, listado, content, pageSelection, btnEnviar, txtError, alertError, errors, fieldsByName };
};

const okJson = (payload) => ({
    ok: true,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve(payload),
});

const koJson = (status, title) => ({
    ok: false,
    status,
    statusText: title,
    headers: { get: () => 'application/json; charset=utf-8' },
    json: () => Promise.resolve({ title }),
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
    global.window = { confirm: jest.fn(() => true) };

    const Biblioteca = require('../../public/javascripts/biblioteca');
    return { Biblioteca, env, fetchMock };
};

describe('Frontend: biblioteca', () => {
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
            const { Biblioteca } = cargarModulo(fetchMock);

            const result = await Biblioteca.get();

            expect(result.totalPages).toBe(1);
            expect(fetchMock).toHaveBeenCalledWith('/api/biblioteca?_sort=titulo&_page=0&_rows=10', expect.objectContaining({
                method: 'GET',
            }));
        });

        it('get rechaza y muestra error JSON', async () => {
            const fetchMock = jest.fn().mockResolvedValue(koJson(500, 'Server Error'));
            const { Biblioteca, env } = cargarModulo(fetchMock);

            await expect(Biblioteca.get()).rejects.toEqual(expect.objectContaining({ ok: false }));
            await flush();

            expect(env.txtError.textContent).toBe('ERROR: 500: Server Error');
            expect(env.alertError.visible).toBeTruthy();
        });

        it('listar pinta contenido y configura la paginación', async () => {
            const datos = { totalPages: 4, content: [{ id: 1, titulo: 'Libro' }] };
            const fetchMock = jest.fn().mockResolvedValue(okJson(datos));
            const { Biblioteca, env } = cargarModulo(fetchMock);

            Biblioteca.listar();
            await flush();
            await flush();

            expect(global.Mustache.render).toHaveBeenCalled();
            expect(env.listado.appended).toEqual(['<div id="content"></div>', '<nav id="page-selection"></nav>']);
            expect(env.pageSelection.config.totalPages).toBe(4);
            expect(env.content.htmlContent).toContain('"titulo":"Libro"');
        });

        it('la paginación cambia la página actual y relanza el listado', async () => {
            const fetchMock = jest.fn().mockResolvedValue(okJson({ totalPages: 2, content: [] }));
            const { Biblioteca, env } = cargarModulo(fetchMock);
            const spy = jest.spyOn(Biblioteca, 'listar');

            Biblioteca.listar();
            await flush();
            env.pageSelection.pageHandler({}, 2);

            expect(Biblioteca.currentPage).toBe(2);
            expect(spy).toHaveBeenCalledTimes(2);
        });
    });

    describe('Formulario y validación', () => {
        it('añadir oculta el listado, resetea y registra el envío', () => {
            const { Biblioteca, env } = cargarModulo();

            Biblioteca.añadir();

            expect(env.listado.visible).toBeFalsy();
            expect(env.form.reset).toHaveBeenCalled();
            expect(typeof env.btnEnviar.handlers.click).toBe('function');
        });

        it('validar detecta mayúsculas y minúsculas', () => {
            const { Biblioteca, env } = cargarModulo();
            env.fieldsByName.codigo = [new FakeField({ name: 'codigo', value: 'abc', validacion: 'mayusculas' })];
            env.fieldsByName.alias = [new FakeField({ name: 'alias', value: 'ABC', validacion: 'minusculas' })];

            expect(Biblioteca.validar('codigo')).toBeFalsy();
            expect(Biblioteca.validar('alias')).toBeFalsy();
            expect(env.errors.err_codigo.text).toContain('mayúsculas');
            expect(env.errors.err_alias.text).toContain('minúsculas');
            expect(env.btnEnviar.disabled).toBeTruthy();
        });

        it('validar limpia un error existente cuando el campo es correcto', () => {
            const { Biblioteca, env } = cargarModulo();
            env.fieldsByName.codigo = [new FakeField({ name: 'codigo', value: 'ABC', validacion: 'mayusculas' })];
            env.errors.err_codigo = { text: 'viejo', removed: false };

            const result = Biblioteca.validar('codigo');

            expect(result).toBeTruthy();
            expect(env.errors.err_codigo.removed).toBeTruthy();
            expect(env.btnEnviar.disabled).toBeFalsy();
        });

        it('validar actualiza el texto si el error ya existe', () => {
            const { Biblioteca, env } = cargarModulo();
            env.fieldsByName.alias = [new FakeField({ name: 'alias', value: 'ABC', validacion: 'minusculas' })];
            env.errors.err_alias = { text: 'anterior', removed: false };

            const result = Biblioteca.validar('alias');

            expect(result).toBeFalsy();
            expect(env.errors.err_alias.text).toBe('Tiene que estar en minúsculas');
        });
    });

    describe('Detalle y edición', () => {
        it('editar carga los datos y rellena campos', async () => {
            const fetchMock = jest.fn().mockResolvedValue(okJson({
                titulo: 'Libro',
                id: 7,
                numPag: 320,
                disponible: true,
                categoria: 'novela',
            }));
            const { Biblioteca, env } = cargarModulo(fetchMock);
            env.fieldsByName.titulo = [new FakeField({ name: 'titulo', value: '' })];
            env.fieldsByName.id = [new FakeField({ name: 'id', value: '' })];
            env.fieldsByName.numPag = [new FakeField({ name: 'numPag', value: '' })];
            env.fieldsByName.disponible = [new FakeField({ name: 'disponible', type: 'checkbox' })];
            env.fieldsByName.categoria = [
                new FakeField({ name: 'categoria', type: 'radio', value: 'ensayo' }),
                new FakeField({ name: 'categoria', type: 'radio', value: 'novela' }),
            ];

            Biblioteca.editar(7);
            await flush();
            await flush();

            expect(env.fieldsByName.titulo[0].value).toBe('Libro');
            expect(env.fieldsByName.id[0].value).toBe(7);
            expect(env.fieldsByName.numPag[0].value).toBe(320);
            expect(env.fieldsByName.disponible[0].checked).toBeTruthy();
            expect(env.fieldsByName.categoria[1].checked).toBeTruthy();
            expect(env.listado.visible).toBeFalsy();
            expect(typeof env.btnEnviar.handlers.click).toBe('function');
        });

        it('editar muestra error si falla la carga', async () => {
            const fetchMock = jest.fn().mockResolvedValue(koText(404, 'Not Found'));
            const { Biblioteca, env } = cargarModulo(fetchMock);

            Biblioteca.editar(8);
            await flush();

            expect(env.txtError.textContent).toBe('ERROR: 404: Not Found');
        });

        it('ver muestra el detalle en HTML simple', async () => {
            const fetchMock = jest.fn().mockResolvedValue(okJson({
                id: 2,
                titulo: 'Libro',
                autor: 'Autor',
                numPag: 123,
            }));
            const { Biblioteca, env } = cargarModulo(fetchMock);

            Biblioteca.ver(2);
            await flush();
            await flush();

            expect(env.listado.htmlContent).toContain('<b>Código:</b> 2');
            expect(env.listado.htmlContent).toContain('<b>Título:</b> Libro');
            expect(env.listado.htmlContent).toContain('Biblioteca.volver()');
        });
    });

    describe('Borrado y guardado', () => {
        it('borrar se cancela si el usuario no confirma', () => {
            const fetchMock = jest.fn();
            const { Biblioteca } = cargarModulo(fetchMock);
            global.window.confirm.mockReturnValue(false);

            Biblioteca.borrar(5);

            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('borrar llama al API y vuelve al listado', async () => {
            const fetchMock = jest.fn()
                .mockResolvedValueOnce(okJson({}))
                .mockResolvedValueOnce(okJson({ totalPages: 1, content: [] }));
            const { Biblioteca, env } = cargarModulo(fetchMock);

            Biblioteca.borrar(5);
            await flush();
            await flush();

            expect(fetchMock).toHaveBeenCalledWith('/api/biblioteca/5', expect.objectContaining({ method: 'DELETE' }));
            expect(env.listado.visible).toBeTruthy();
            expect(env.form.visible).toBeFalsy();
        });

        it('borrar muestra error si el API responde KO', async () => {
            const fetchMock = jest.fn().mockResolvedValue(koText(409, 'Conflict'));
            const { Biblioteca, env } = cargarModulo(fetchMock);

            Biblioteca.borrar(5);
            await flush();

            expect(env.txtError.textContent).toBe('ERROR: 409: Conflict');
        });

        it('enviarNuevo muestra error si los datos son inválidos', () => {
            const { Biblioteca, env } = cargarModulo();
            env.form.serializeData = [{ name: 'codigo', value: 'abc' }];
            env.fieldsByName.codigo = [new FakeField({ name: 'codigo', value: 'abc', validacion: 'mayusculas' })];

            Biblioteca.enviarNuevo();

            expect(env.txtError.textContent).toBe('Datos inválidos');
        });

        it('enviarNuevo hace POST con el cuerpo capturado', async () => {
            const fetchMock = jest.fn().mockResolvedValue(okJson({}));
            const { Biblioteca, env } = cargarModulo(fetchMock);
            env.form.serializeData = [
                { name: 'id', value: '12' },
                { name: 'titulo', value: 'Libro' },
                { name: 'numPag', value: '450' },
            ];
            env.fieldsByName.id = [new FakeField({ name: 'id', value: '12' })];
            env.fieldsByName.titulo = [new FakeField({ name: 'titulo', value: 'Libro' })];
            env.fieldsByName.numPag = [new FakeField({ name: 'numPag', value: '450' })];

            Biblioteca.enviarNuevo();
            await flush();
            await flush();

            expect(fetchMock).toHaveBeenCalledWith('/api/biblioteca', expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ id: 12, titulo: 'Libro', numPag: 450 }),
            }));
        });

        it('enviarModificado hace PUT usando el id editado', async () => {
            const fetchMock = jest.fn()
                .mockResolvedValueOnce(okJson({ titulo: 'Libro' }))
                .mockResolvedValueOnce(okJson({}))
                .mockResolvedValueOnce(okJson({ totalPages: 1, content: [] }));
            const { Biblioteca, env } = cargarModulo(fetchMock);
            env.fieldsByName.titulo = [new FakeField({ name: 'titulo', value: '' })];

            Biblioteca.editar(9);
            await flush();
            await flush();

            env.form.serializeData = [
                { name: 'titulo', value: 'Libro editado' },
                { name: 'numPag', value: '222' },
            ];
            env.fieldsByName.titulo[0].value = 'Libro editado';
            env.fieldsByName.numPag = [new FakeField({ name: 'numPag', value: '222' })];

            Biblioteca.enviarModificado();
            await flush();
            await flush();

            expect(fetchMock).toHaveBeenCalledWith('/api/biblioteca/9', expect.objectContaining({
                method: 'PUT',
                body: JSON.stringify({ titulo: 'Libro editado', numPag: 222, id: NaN }),
            }));
        });

        it('enviarModificado muestra error si los datos son inválidos', () => {
            const { Biblioteca, env } = cargarModulo();
            env.form.serializeData = [{ name: 'codigo', value: 'abc' }];
            env.fieldsByName.codigo = [new FakeField({ name: 'codigo', value: 'abc', validacion: 'mayusculas' })];

            Biblioteca.enviarModificado();

            expect(env.txtError.textContent).toBe('Datos inválidos');
        });

        it('enviarModificado muestra error cuando el API responde KO', async () => {
            const fetchMock = jest.fn()
                .mockResolvedValueOnce(okJson({ titulo: 'Libro' }))
                .mockResolvedValueOnce(koText(500, 'Server Error'));
            const { Biblioteca, env } = cargarModulo(fetchMock);
            env.fieldsByName.titulo = [new FakeField({ name: 'titulo', value: '' })];

            Biblioteca.editar(3);
            await flush();
            await flush();

            env.form.serializeData = [{ name: 'titulo', value: 'Libro KO' }];
            env.fieldsByName.titulo[0].value = 'Libro KO';

            Biblioteca.enviarModificado();
            await flush();
            await flush();

            expect(env.txtError.textContent).toBe('ERROR: 500: Server Error');
        });

        it('volver muestra el listado y oculta el formulario', async () => {
            const fetchMock = jest.fn().mockResolvedValue(okJson({ totalPages: 1, content: [] }));
            const { Biblioteca, env } = cargarModulo(fetchMock);
            env.listado.visible = false;
            env.form.visible = true;

            Biblioteca.volver();
            await flush();
            await flush();

            expect(env.listado.visible).toBeTruthy();
            expect(env.form.visible).toBeFalsy();
        });

        it('muestra error textual del servidor en ver y enviarNuevo', async () => {
            const fetchMock = jest.fn()
                .mockResolvedValueOnce(koText(404, 'Not Found'))
                .mockResolvedValueOnce(koText(409, 'Conflict'));
            const { Biblioteca, env } = cargarModulo(fetchMock);

            Biblioteca.ver(1);
            await flush();

            env.form.serializeData = [{ name: 'titulo', value: 'Libro' }];
            env.fieldsByName.titulo = [new FakeField({ name: 'titulo', value: 'Libro' })];
            Biblioteca.enviarNuevo();
            await flush();
            await flush();

            expect(env.txtError.textContent).toBe('ERROR: 409: Conflict');
        });

        it('ponError actualiza el mensaje visible', () => {
            const { Biblioteca, env } = cargarModulo();

            Biblioteca.ponError('Error controlado');

            expect(env.txtError.textContent).toBe('Error controlado');
            expect(env.alertError.visible).toBeTruthy();
        });
    });
});

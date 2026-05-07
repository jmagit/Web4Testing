class FakeHeaders {
    constructor() {
        this.values = new Map();
    }

    append(key, value) {
        this.values.set(key, value);
    }

    get(key) {
        return this.values.get(key);
    }
}

class FakeField {
    constructor({ name, value = '', validacion = '', origen = '', validationMessage = '', title = '' } = {}) {
        this.name = name;
        this.value = value;
        this.type = 'text';
        this.title = title;
        this.validationMessage = validationMessage;
        this.dataset = {
            validacion,
            origen,
        };
        this.parentNode = {
            parentNode: {
                classes: new Set(),
                addClass: jest.fn((name) => this.parentNode.parentNode.classes.add(name)),
                removeClass: jest.fn((name) => this.parentNode.parentNode.classes.delete(name)),
            },
        };
    }

    setCustomValidity(message) {
        this.validationMessage = message;
    }
}

const crearEntornoJQuery = () => {
    const forms = {};
    const fields = {};
    const errors = {};

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
            const text = html.match(/msg-error">(.+)<\/div>/)?.[1];
            if (id) {
                errors[id.replace(/^err_/, '')] = {
                    text,
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
                            items.forEach(item => item.parentNode.parentNode.addClass(name));
                            return this;
                        },
                        removeClass(name) {
                            items.forEach(item => item.parentNode.parentNode.removeClass(name));
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
        const formFieldMatch = selector.match(/^#([^ ]+) \[name="([^"]+)"/);
        if (formFieldMatch) {
            const [, formId, fieldName] = formFieldMatch;
            return wrapFields((forms[formId]?.fields || []).filter(item => item.name === fieldName));
        }

        const errorMatch = selector.match(/^#err_(.+)$/);
        if (errorMatch) {
            return wrapError(errorMatch[1]);
        }

        const formMatch = selector.match(/^#([^ ]+)$/);
        if (formMatch) {
            const [, formId] = formMatch;
            return {
                serializeArray() {
                    return forms[formId]?.serialize || [];
                },
            };
        }

        return wrapFields(fields[selector] || []);
    };

    return {
        $,
        forms,
        fields,
        errors,
    };
};

const crearLocalStorage = (inicial = {}) => {
    const data = { ...inicial };
    return {
        ...data,
        removeItem: jest.fn((key) => {
            delete data[key];
            delete this[key];
        }),
    };
};

const cargarCore = (opciones = {}) => {
    const jquery = crearEntornoJQuery();
    const fetchMock = opciones.fetchMock || jest.fn();
    const alertMock = jest.fn();
    const localStorage = opciones.localStorage || crearLocalStorage();
    jest.resetModules();
    global.fetch = fetchMock;
    global.alert = alertMock;
    // eslint-disable-next-line n/no-unsupported-features/node-builtins
    global.localStorage = localStorage;
    global.document = { cookie: opciones.cookie || '' };
    global.Headers = FakeHeaders;
    global.$ = jquery.$;
    global.decodeURIComponent = decodeURIComponent;

    const Web4Testing = require('../../public/javascripts/core');

    return {
        Web4Testing,
        fetchMock,
        alertMock,
        localStorage,
        jquery,
    };
};

const okJson = (payload) => ({
    ok: true,
    status: 200,
    statusText: 'OK',
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

describe('Frontend: core', () => {
    afterEach(() => {
        delete global.fetch;
        delete global.alert;
        // eslint-disable-next-line n/no-unsupported-features/node-builtins
        delete global.localStorage;
        delete global.document;
        delete global.Headers;
        delete global.$;
        jest.resetModules();
        jest.clearAllMocks();
    });

    describe('AuthService', () => {
        it('recupera el estado desde localStorage al cargar', () => {
            const localStorage = crearLocalStorage({
                AuthService: JSON.stringify({
                    isAuth: true,
                    authToken: 'Bearer precargado',
                    name: 'Admin',
                    roles: ['Usuarios'],
                }),
            });

            const { Web4Testing } = cargarCore({ localStorage });

            expect(Web4Testing.AuthService.isAuth).toBeTruthy();
            expect(Web4Testing.AuthService.authToken).toBe('Bearer precargado');
            expect(Web4Testing.AuthService.name).toBe('Admin');
            expect(Web4Testing.AuthService.roles).toEqual(['Usuarios']);
        });

        it('getHeaders añade XSRF y Authorization cuando existen', () => {
            const { Web4Testing } = cargarCore({
                cookie: 'otro=1; XSRF-TOKEN=abc%20123; final=ok',
            });
            Web4Testing.AuthService.isAuth = true;
            Web4Testing.AuthService.authToken = 'Bearer xyz';

            const headers = Web4Testing.AuthService.getHeaders();

            expect(headers.get('Content-Type')).toBe('application/json');
            expect(headers.get('X-Requested-With')).toBe('XMLHttpRequest');
            expect(headers.get('X-XSRF-TOKEN')).toBe('abc 123');
            expect(headers.get('Authorization')).toBe('Bearer xyz');
        });

        it('login correcto guarda estado y cachea en localStorage', async () => {
            const fetchMock = jest.fn().mockResolvedValue(okJson({
                success: true,
                token: 'Bearer token',
                name: 'QA',
                roles: ['Administradores'],
            }));
            const localStorage = crearLocalStorage();
            const { Web4Testing } = cargarCore({ fetchMock, localStorage });

            const result = await Web4Testing.AuthService.login('qa@example.com', 'P@ss');

            expect(result.name).toBe('QA');
            expect(Web4Testing.AuthService.isAuth).toBeTruthy();
            expect(Web4Testing.AuthService.authToken).toBe('Bearer token');
            expect(localStorage.AuthService).toContain('"name":"QA"');
            expect(fetchMock).toHaveBeenCalledWith('/api/login?cookie=true', expect.objectContaining({
                method: 'POST',
            }));
        });

        it('login rechaza cuando success es false', async () => {
            const { Web4Testing } = cargarCore({
                fetchMock: jest.fn().mockResolvedValue(okJson({ success: false })),
            });

            await expect(Web4Testing.AuthService.login('qa@example.com', 'mal')).rejects.toBe('Usuario o contraseña incorrectos.');
        });

        it('login rechaza con error JSON del servidor', async () => {
            const { Web4Testing } = cargarCore({
                fetchMock: jest.fn().mockResolvedValue(koJson(401, 'Unauthorized')),
            });

            await expect(Web4Testing.AuthService.login('qa@example.com', 'mal')).rejects.toBe('ERROR: 401: Unauthorized');
        });

        it('login rechaza con error textual del servidor', async () => {
            const { Web4Testing } = cargarCore({
                fetchMock: jest.fn().mockResolvedValue(koText(403, 'Forbidden')),
            });

            await expect(Web4Testing.AuthService.login('qa@example.com', 'mal')).rejects.toBe('ERROR: 403: Forbidden');
        });

        it('login rechaza por error de red', async () => {
            const { Web4Testing } = cargarCore({
                fetchMock: jest.fn().mockRejectedValue({ status: 0, statusText: 'Network Error' }),
            });

            await expect(Web4Testing.AuthService.login('qa@example.com', 'mal')).rejects.toBe('Error de red: 0 Network Error');
        });

        it('getUser rechaza si no está autenticado', async () => {
            const { Web4Testing } = cargarCore();

            await expect(Web4Testing.AuthService.getUser()).rejects.toBe('No esta autenticado.');
        });

        it('getUser devuelve el usuario autenticado', async () => {
            const fetchMock = jest.fn().mockResolvedValue(okJson({ idUsuario: 'qa@example.com' }));
            const { Web4Testing } = cargarCore({ fetchMock });
            Web4Testing.AuthService.isAuth = true;
            Web4Testing.AuthService.authToken = 'Bearer token';

            const result = await Web4Testing.AuthService.getUser();

            expect(result.idUsuario).toBe('qa@example.com');
            expect(fetchMock).toHaveBeenCalledWith('/api/register', expect.objectContaining({
                method: 'GET',
            }));
        });

        it('getUser rechaza con error JSON del servidor', async () => {
            const { Web4Testing } = cargarCore({
                fetchMock: jest.fn().mockResolvedValue(koJson(404, 'Not Found')),
            });
            Web4Testing.AuthService.isAuth = true;

            await expect(Web4Testing.AuthService.getUser()).rejects.toBe('ERROR: 404: Not Found');
        });

        it('getUser rechaza con error textual y por red', async () => {
            const { Web4Testing } = cargarCore({
                fetchMock: jest.fn()
                    .mockResolvedValueOnce(koText(500, 'Server Error'))
                    .mockRejectedValueOnce({ status: 0, statusText: 'Network Error' }),
            });
            Web4Testing.AuthService.isAuth = true;

            await expect(Web4Testing.AuthService.getUser()).rejects.toBe('ERROR: 500: Server Error');
            await expect(Web4Testing.AuthService.getUser()).rejects.toBe('Error de red: 0 Network Error');
        });

        it('logout limpia estado y llama al API REST', async () => {
            const fetchMock = jest.fn().mockResolvedValue(okJson({}));
            const localStorage = crearLocalStorage({
                AuthService: '{"isAuth":true}',
            });
            const { Web4Testing } = cargarCore({ fetchMock, localStorage });
            Web4Testing.AuthService.isAuth = true;
            Web4Testing.AuthService.authToken = 'Bearer token';
            Web4Testing.AuthService.name = 'QA';

            Web4Testing.AuthService.logout();

            expect(Web4Testing.AuthService.isAuth).toBeFalsy();
            expect(Web4Testing.AuthService.authToken).toBe('');
            expect(Web4Testing.AuthService.name).toBe('');
            expect(localStorage.removeItem).toHaveBeenCalledWith('AuthService');
            expect(fetchMock).toHaveBeenCalledWith('/api/logout', expect.objectContaining({
                method: 'GET',
            }));
        });
    });

    describe('Validación y formularios', () => {
        it('validar detecta equalTo, uppercase y lowercase', () => {
            const { Web4Testing, jquery } = cargarCore();
            jquery.forms.frm = {
                fields: [
                    new FakeField({ name: '_usr_password', value: 'Secret1!' }),
                    new FakeField({ name: '_usr_repeat', value: 'NoCoincide', validacion: 'equalTo', origen: '_usr_password' }),
                    new FakeField({ name: 'codigo', value: 'abc', validacion: 'uppercase' }),
                    new FakeField({ name: 'alias', value: 'ABC', validacion: 'lowercase' }),
                ],
                serialize: [],
            };

            expect(Web4Testing.AuthService.validar('frm', '_usr_repeat')).toBeFalsy();
            expect(Web4Testing.AuthService.validar('frm', 'codigo')).toBeFalsy();
            expect(Web4Testing.AuthService.validar('frm', 'alias')).toBeFalsy();
            expect(jquery.errors.frm__usr_repeat.text).toContain('No es igual');
            expect(jquery.errors.frm_codigo.text).toContain('mayúsculas');
            expect(jquery.errors.frm_alias.text).toContain('minúsculas');
        });

        it('validar elimina el error cuando el campo queda correcto', () => {
            const { Web4Testing, jquery } = cargarCore();
            const campo = new FakeField({ name: 'codigo', value: 'ABC', validacion: 'uppercase' });
            jquery.forms.frm = {
                fields: [campo],
                serialize: [],
            };
            jquery.errors.frm_codigo = { text: 'Tiene que estar en mayúsculas', removed: false };

            const result = Web4Testing.AuthService.validar('frm', 'codigo');

            expect(result).toBeTruthy();
            expect(jquery.errors.frm_codigo.removed).toBeTruthy();
        });

        it('validar actualiza el texto de un error ya existente', () => {
            const { Web4Testing, jquery } = cargarCore();
            const campo = new FakeField({ name: 'codigo', value: 'abc', validacion: 'uppercase' });
            jquery.forms.frm = {
                fields: [campo],
                serialize: [],
            };
            jquery.errors.frm_codigo = { text: 'Viejo', removed: false };

            const result = Web4Testing.AuthService.validar('frm', 'codigo');

            expect(result).toBeFalsy();
            expect(jquery.errors.frm_codigo.text).toBe('Tiene que estar en mayúsculas');
        });

        it('enviarRegistroNuevo no llama al API si el formulario es inválido', () => {
            const fetchMock = jest.fn();
            const { Web4Testing, jquery } = cargarCore({ fetchMock });
            jquery.forms.frmAlta = {
                fields: [new FakeField({ name: '_usr_password', value: 'mala', validacion: 'uppercase' })],
                serialize: [{ name: '_usr_password', value: 'mala' }],
            };

            Web4Testing.AuthService.enviarRegistroNuevo('frmAlta', jest.fn());

            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('enviarRegistroNuevo envía el alta y notifica al usuario', async () => {
            const fetchMock = jest.fn().mockResolvedValue(okJson({}));
            const cierraModal = jest.fn();
            const { Web4Testing, alertMock, jquery } = cargarCore({ fetchMock });
            jquery.forms.frmAlta = {
                fields: [
                    new FakeField({ name: '_usr_nombre', value: 'Ada' }),
                    new FakeField({ name: '_usr_email', value: 'ada@example.com' }),
                ],
                serialize: [
                    { name: '_usr_nombre', value: 'Ada' },
                    { name: '_usr_email', value: 'ada@example.com' },
                    { name: '__interno', value: 'ignorado' },
                ],
            };

            Web4Testing.AuthService.enviarRegistroNuevo('frmAlta', cierraModal);
            await Promise.resolve();

            expect(fetchMock).toHaveBeenCalledWith('/api/register', expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ nombre: 'Ada', email: 'ada@example.com' }),
            }));
            expect(cierraModal).toHaveBeenCalled();
            expect(alertMock).toHaveBeenCalledWith('Usuario registrado. Ya puede iniciar sesión.');
        });

        it('enviarRegistroModificado actualiza el nombre y cachea', async () => {
            const fetchMock = jest.fn().mockResolvedValue(okJson({}));
            const cierraModal = jest.fn();
            const localStorage = crearLocalStorage();
            const { Web4Testing, jquery } = cargarCore({ fetchMock, localStorage });
            Web4Testing.AuthService.isAuth = true;
            Web4Testing.AuthService.authToken = 'Bearer token';
            jquery.forms.frmEdit = {
                fields: [new FakeField({ name: '_usr_nombre', value: 'Grace' })],
                serialize: [{ name: '_usr_nombre', value: 'Grace' }],
            };

            Web4Testing.AuthService.enviarRegistroModificado('frmEdit', cierraModal);
            await Promise.resolve();

            expect(Web4Testing.AuthService.name).toBe('Grace');
            expect(localStorage.AuthService).toContain('"name":"Grace"');
            expect(cierraModal).toHaveBeenCalled();
        });

        it('enviarRegistroPassword notifica el cambio correcto', async () => {
            const fetchMock = jest.fn().mockResolvedValue(okJson({}));
            const cierraModal = jest.fn();
            const { Web4Testing, alertMock, jquery } = cargarCore({ fetchMock });
            jquery.forms.frmPwd = {
                fields: [new FakeField({ name: '_usr_password', value: 'P@ssw0rd' })],
                serialize: [{ name: '_usr_password', value: 'P@ssw0rd' }],
            };

            Web4Testing.AuthService.enviarRegistroPassword('frmPwd', cierraModal);
            await Promise.resolve();

            expect(fetchMock).toHaveBeenCalledWith('/api/register/password', expect.objectContaining({
                method: 'PUT',
            }));
            expect(cierraModal).toHaveBeenCalled();
            expect(alertMock).toHaveBeenCalledWith('Contraseña modificada.');
        });

        it('muestra error cuando falla enviarRegistroModificado', async () => {
            const fetchMock = jest.fn().mockResolvedValue(koText(500, 'Server Error'));
            const { Web4Testing, alertMock, jquery } = cargarCore({ fetchMock });
            jquery.forms.frmEdit = {
                fields: [new FakeField({ name: '_usr_nombre', value: 'Grace' })],
                serialize: [{ name: '_usr_nombre', value: 'Grace' }],
            };

            Web4Testing.AuthService.enviarRegistroModificado('frmEdit', jest.fn());
            await Promise.resolve();

            expect(alertMock).toHaveBeenCalledWith('ERROR: 500: Server Error');
        });

        it('muestra error JSON cuando falla enviarRegistroNuevo', async () => {
            const fetchMock = jest.fn().mockResolvedValue(koJson(409, 'Conflict', 'Duplicado'));
            const { Web4Testing, alertMock, jquery } = cargarCore({ fetchMock });
            jquery.forms.frmAlta = {
                fields: [new FakeField({ name: '_usr_email', value: 'ada@example.com' })],
                serialize: [{ name: '_usr_email', value: 'ada@example.com' }],
            };

            Web4Testing.AuthService.enviarRegistroNuevo('frmAlta', jest.fn());
            await Promise.resolve();
            await Promise.resolve();

            expect(alertMock).toHaveBeenCalledWith('ERROR: 409: Duplicado');
        });

        it('muestra error textual cuando falla enviarRegistroPassword', async () => {
            const fetchMock = jest.fn().mockResolvedValue(koText(500, 'Server Error'));
            const { Web4Testing, alertMock, jquery } = cargarCore({ fetchMock });
            jquery.forms.frmPwd = {
                fields: [new FakeField({ name: '_usr_password', value: 'P@ssw0rd' })],
                serialize: [{ name: '_usr_password', value: 'P@ssw0rd' }],
            };

            Web4Testing.AuthService.enviarRegistroPassword('frmPwd', jest.fn());
            await Promise.resolve();

            expect(alertMock).toHaveBeenCalledWith('ERROR: 500: Server Error');
        });
    });
});

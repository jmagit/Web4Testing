class FakeElement {
    constructor(tagName = 'div', id = '') {
        this.tagName = tagName.toUpperCase();
        this.id = id;
        this.children = [];
        this.listeners = {};
        this.className = '';
        this.type = '';
        this.checked = false;
        this.value = '';
        this.textContent = '';
        this._innerHTML = '';
    }

    appendChild(child) {
        this.children.push(child);
        return child;
    }

    addEventListener(event, handler) {
        this.listeners[event] = handler;
    }

    async trigger(event, payload = {}) {
        if (!this.listeners[event]) return;
        return this.listeners[event](payload);
    }

    set innerHTML(value) {
        this._innerHTML = value;
        this.children = [];
    }

    get innerHTML() {
        return this._innerHTML;
    }
}

const crearDocumento = () => {
    const elementos = {
        taskInput: new FakeElement('input', 'taskInput'),
        addBtn: new FakeElement('button', 'addBtn'),
        taskList: new FakeElement('ul', 'taskList'),
    };

    return {
        getElementById(id) {
            return elementos[id];
        },
        createElement(tagName) {
            return new FakeElement(tagName);
        },
        elementos,
    };
};

const flushPromises = () => new Promise(resolve => setImmediate(resolve));

describe('Pruebas del gestor de tareas', () => {
    let documentMock;
    let fetchMock;

    const cargarScript = async (mock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ([]),
    })) => {
        jest.resetModules();
        documentMock = crearDocumento();
        fetchMock = mock;
        global.document = documentMock;
        global.fetch = fetchMock;

        jest.isolateModules(() => {
            require('../../public/javascripts/todo');
        });

        await flushPromises();
        return documentMock.elementos;
    };

    afterEach(() => {
        delete global.document;
        delete global.fetch;
        jest.clearAllMocks();
    });

    describe('Carga inicial', () => {
        it('obtiene y renderiza las tareas en orden inverso', async () => {
            fetchMock = jest.fn().mockResolvedValue({
                ok: true,
                json: async () => ([
                    { id: 1, todo: 'Primera', completed: false },
                    { id: 2, todo: 'Segunda', completed: true },
                ]),
            });
            global.fetch = fetchMock;
            documentMock = crearDocumento();
            global.document = documentMock;

            jest.resetModules();
            jest.isolateModules(() => {
                require('../../public/javascripts/todo');
            });
            await flushPromises();

            const { taskList } = documentMock.elementos;

            expect(fetchMock).toHaveBeenCalledWith('/api/todo', {
                headers: { 'Content-Type': 'application/json' },
            });
            expect(taskList.children).toHaveLength(2);
            expect(taskList.children[0].children[0].children[1].textContent).toBe('Segunda');
            expect(taskList.children[0].children[0].children[0].checked).toBeTruthy();
            expect(taskList.children[1].className).toContain('list-group-item-info');
        });
    });

    describe('Alta de tareas', () => {
        it('crea una tarea al pulsar el botón y vuelve a renderizar', async () => {
            const mock = jest.fn()
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ([]),
                })
                .mockResolvedValueOnce({
                    ok: true,
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ([{ id: 9, todo: 'Nueva tarea', completed: false }]),
                });
            await cargarScript(mock);

            const { taskInput, addBtn, taskList } = documentMock.elementos;
            taskInput.value = '  Nueva tarea  ';

            await addBtn.trigger('click');
            await flushPromises();

            expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/todo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: 0, todo: 'Nueva tarea', completed: false }),
            });
            expect(taskInput.value).toBe('');
            expect(taskList.children).toHaveLength(1);
            expect(taskList.children[0].children[0].children[1].textContent).toBe('Nueva tarea');
        });

        it('crea una tarea al pulsar Enter', async () => {
            const mock = jest.fn()
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ([]),
                })
                .mockResolvedValueOnce({
                    ok: true,
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ([{ id: 3, todo: 'Con Enter', completed: false }]),
                });
            const { taskInput } = await cargarScript(mock);

            taskInput.value = 'Con Enter';
            await taskInput.trigger('keyup', { key: 'Enter' });
            await flushPromises();

            expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/todo', expect.objectContaining({
                method: 'POST',
            }));
        });

        it('ignora valores en blanco y no llama al API de alta', async () => {
            const mock = jest.fn().mockResolvedValue({
                ok: true,
                json: async () => ([]),
            });
            await cargarScript(mock);

            const { taskInput, addBtn } = documentMock.elementos;
            taskInput.value = '   ';

            await addBtn.trigger('click');
            await flushPromises();

            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        it('lanza error si falla la creación', async () => {
            const mock = jest.fn()
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ([]),
                })
                .mockResolvedValueOnce({
                    ok: false,
                });
            await cargarScript(mock);

            const { taskInput, addBtn } = documentMock.elementos;
            taskInput.value = 'Fallida';

            await expect(addBtn.trigger('click')).rejects.toThrow('Error al crear tarea');
        });
    });

    describe('Acciones sobre tareas', () => {
        it('actualiza el estado al cambiar el checkbox y repinta', async () => {
            const mock = jest.fn()
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ([{ id: 7, todo: 'Pendiente', completed: false }]),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ id: 7, todo: 'Pendiente', completed: true }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ([{ id: 7, todo: 'Pendiente', completed: true }]),
                });
            await cargarScript(mock);

            const checkbox = documentMock.elementos.taskList.children[0].children[0].children[0];
            await checkbox.trigger('change');
            await flushPromises();

            expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/todo/7', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: true }),
            });
            expect(documentMock.elementos.taskList.children[0].children[0].children[0].checked).toBeTruthy();
        });

        it('elimina una tarea y vuelve a consultar el listado', async () => {
            const mock = jest.fn()
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ([{ id: 5, todo: 'Borrar', completed: false }]),
                })
                .mockResolvedValueOnce({
                    ok: true,
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ([]),
                });
            await cargarScript(mock);

            const delBtn = documentMock.elementos.taskList.children[0].children[0].children[2];
            await delBtn.trigger('click');
            await flushPromises();

            expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/todo/5', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            });
            expect(documentMock.elementos.taskList.children).toHaveLength(0);
        });

        it('lanza error si falla el cambio de estado', async () => {
            const mock = jest.fn()
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ([{ id: 2, todo: 'Patch KO', completed: false }]),
                })
                .mockResolvedValueOnce({
                    ok: false,
                });
            await cargarScript(mock);

            const checkbox = documentMock.elementos.taskList.children[0].children[0].children[0];

            await expect(checkbox.trigger('change')).rejects.toThrow('Error al actualizar estado');
        });

        it('lanza error si falla el borrado', async () => {
            const mock = jest.fn()
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ([{ id: 4, todo: 'Delete KO', completed: false }]),
                })
                .mockResolvedValueOnce({
                    ok: false,
                });
            await cargarScript(mock);

            const delBtn = documentMock.elementos.taskList.children[0].children[0].children[2];

            await expect(delBtn.trigger('click')).rejects.toThrow('Error al eliminar tarea');
        });
    });
});

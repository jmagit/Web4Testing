// Elementos del DOM
const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');

/* API_BASE y encabezados comunes (ajustado a localhost) */
const API_BASE = '/api';
const headers = {
    'Content-Type': 'application/json',
};

/* Obtener todas las tareas */
async function obtenerTareas() {
    const res = await fetch(`${API_BASE}/todo`, { headers });
    if (!res.ok) throw new Error('Error al obtener tareas');
    return await res.json();   // devuelve array de objetos “Todo” según el OpenAPI [1]
}

/* Añadir una nueva tarea */
async function crearTarea(titulo) {
    const res = await fetch(`${API_BASE}/todo`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ id: 0, todo: titulo, completed: false })
    });
    if (!res.ok) throw new Error('Error al crear tarea');
    return;
}

/* Marcar/Desmarcar como completada */
async function toggleCompletado(id, estado) {
    const res = await fetch(`${API_BASE}/todo/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ completed: estado })
    });
    if (!res.ok) throw new Error('Error al actualizar estado');
    return await res.json();
}

/* Eliminar tarea */
async function eliminarTarea(id) {
    const res = await fetch(`${API_BASE}/todo/${id}`, {
        method: 'DELETE',
        headers
    });
    if (!res.ok) throw new Error('Error al eliminar tarea');
    return res.ok;
}

/* Renderizado simple y eventos */
async function renderTareas() {
    const tareas = await obtenerTareas();
    taskList.innerHTML = '';
    tareas.reverse().forEach((t, index) => {
        /* Crear los nodos */
        const li = document.createElement('li');
        const checkboxGroup = document.createElement('div');
        const checkbox = document.createElement('input');
        const label = document.createElement('label');
        const delBtn = document.createElement('button');

        li.className = 'list-group-item'
        if(index % 2) li.className += ' list-group-item-info'

        checkboxGroup.className = 'form-check'

        /* Configurar el checkbox */
        checkbox.type = 'checkbox';
        checkbox.className = 'form-check-input';
        if (t.completed) checkbox.checked = true
        checkbox.addEventListener('change', async () => {
            await toggleCompletado(t.id, !t.completed);
            renderTareas();
        });

        /* Texto de la tarea */
        label.textContent = t.todo;
        label.className = 'form-check-label';

        /* Botón eliminar */
        delBtn.textContent = 'X';
        delBtn.className = 'btn btn-danger btn-sm float-right'
        delBtn.addEventListener('click', async () => {
            await eliminarTarea(t.id);
            renderTareas();
        });

        /* Construir la estructura */
        checkboxGroup.appendChild(checkbox);
        checkboxGroup.appendChild(label);
         checkboxGroup.appendChild(delBtn);
       li.appendChild(checkboxGroup);
        // li.appendChild(delBtn);
        taskList.appendChild(li);
    });
}

async function addTask() {
    if (taskInput.value.trim()) {
        await crearTarea(taskInput.value.trim());
        taskInput.value = '';
        renderTareas();
    }
}

addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keyup', e => {
    if (e.key === 'Enter') addTask();
});

/* Inicializar */
renderTareas();

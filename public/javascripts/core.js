const Web4Testing = new Object();

Web4Testing.AuthService = new (function () {
    let obj = this;
    obj.isAuth = false;
    obj.authToken = '';
    obj.name = '';
    obj.roles = [];

    const hasLocalStorage = () => typeof localStorage !== 'undefined' && localStorage;
    const isJsonResponse = (response) => response.headers.get('content-type').includes('application/json');
    const getFieldSelector = (idForm, name) => '#' + idForm + ' [name="' + name + '"';
    const getErrorSelector = (idForm, name) => '#err_' + idForm + '_' + name;

    const updateAuthState = (state = {}) => {
        obj.isAuth = state.isAuth ?? false;
        obj.authToken = state.authToken ?? '';
        obj.name = state.name ?? '';
        obj.roles = state.roles ?? [];
    };

    const cacheaEnLocalStorage = () => {
        if (!hasLocalStorage()) return;
        localStorage.AuthService = JSON.stringify({
            isAuth: obj.isAuth,
            authToken: obj.authToken,
            name: obj.name,
            roles: obj.roles,
        });
    };

    const inicializaDesdeLocalStorage = () => {
        if (!hasLocalStorage() || !localStorage.AuthService) return;
        updateAuthState(JSON.parse(localStorage.AuthService));
    };

    const rejectWithResponseError = async (response) => {
        if (!isJsonResponse(response)) {
            return Promise.reject('ERROR: ' + response.status + ': ' + response.statusText);
        }
        const err = await response.json();
        return Promise.reject('ERROR: ' + response.status + ': ' + (err.title || response.statusText));
    };

    const decodeError = async (response) => {
        if (!isJsonResponse(response)) {
            alert('ERROR: ' + response.status + ': ' + response.statusText);
            return;
        }
        const err = await response.json();
        alert('ERROR: ' + response.status + ': ' + (err.detail || err.title || response.statusText));
    };

    const requestJson = async (url, options) => {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                await rejectWithResponseError(response);
            }
            return response.json();
        } catch (error) {
            if (typeof error === 'string') return Promise.reject(error);
            return Promise.reject('Error de red: ' + error.status + ' ' + error.statusText);
        }
    };

    const getControl = (idForm, name) => $(getFieldSelector(idForm, name));
    const getValidationError = (idForm, name) => $(getErrorSelector(idForm, name));

    const setValidationMessage = (idForm, control, item) => {
        switch (item.dataset.validacion) {
            case 'equalTo':
                item.setCustomValidity($(getFieldSelector(idForm, item.dataset.origen)).val() != control.val() ? 'No es igual' : '');
                break;
            case 'uppercase':
                item.setCustomValidity(control.val() != control.val().toUpperCase() ? 'Tiene que estar en mayúsculas' : '');
                break;
            case 'lowercase':
                item.setCustomValidity(control.val() !== control.val().toLowerCase() ? 'Tiene que estar en minúsculas' : '');
                break;
        }
    };

    const showFieldError = (idForm, name, control, message) => {
        const error = getValidationError(idForm, name);
        if (error.length) {
            error.text(message);
            return;
        }
        control.after('<div id="err_' + idForm + '_' + name + '" class="text-danger msg-error">' + message + '</div>');
        control.parent().parent().addClass('has-error');
    };

    const clearFieldError = (idForm, name, control) => {
        control.parent().parent().removeClass('has-error');
        getValidationError(idForm, name).remove();
    };

    const capturaFrom = (idForm) => {
        const datos = $('#' + idForm).serializeArray();
        let esValido = true;
        let envio = {};

        datos.forEach((item) => {
            if (!obj.validar(idForm, item.name)) {
                esValido = false;
                return;
            }
            if (!item.name.startsWith('__')) {
                envio[item.name.replace('_usr_', '')] = item.value;
            }
        });

        return esValido ? envio : null;
    };

    const enviarRegistro = (url, method, idForm, onSuccess) => {
        let envio = capturaFrom(idForm);
        if (!envio) return;

        fetch(url, {
            method,
            headers: obj.getHeaders(),
            body: JSON.stringify(envio)
        }).then((response) => {
            if (response.ok) {
                onSuccess(envio);
            } else {
                decodeError(response);
            }
        });
    };

    inicializaDesdeLocalStorage();

    obj.getHeaders = () => {
        let headers = new Headers();
        headers.append('Content-Type', 'application/json');
        headers.append('X-Requested-With', 'XMLHttpRequest');
        let matches = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
        if (matches) {
            headers.append('X-XSRF-TOKEN', decodeURIComponent(matches[1]));
        }
        if (obj.isAuth && obj.authToken) {
            headers.append('Authorization', obj.authToken);
        }
        return headers;
    };

    obj.login = async (usr, pwd) => {
        const resp = await requestJson('/api/login?cookie=true', {
            method: 'POST',
            headers: obj.getHeaders(),
            body: JSON.stringify({ username: usr, password: pwd })
        });

        if (!resp.success) {
            return Promise.reject('Usuario o contraseña incorrectos.');
        }

        updateAuthState({
            isAuth: true,
            authToken: resp.token,
            name: resp.name,
            roles: resp.roles,
        });
        cacheaEnLocalStorage();
        return resp;
    };

    obj.logout = () => {
        updateAuthState();
        if (hasLocalStorage()) {
            localStorage.removeItem('AuthService');
        }
        fetch('/api/logout', {
            method: 'GET',
            headers: obj.getHeaders()
        }).then();
    };

    obj.getUser = async () => {
        if (!obj.isAuth) {
            return Promise.reject('No esta autenticado.');
        }
        return requestJson('/api/register', {
            method: 'GET',
            headers: obj.getHeaders()
        });
    };

    obj.validar = (idForm, name) => {
        let control = getControl(idForm, name);
        let esValido = true;

        control.each((_i, item) => {
            setValidationMessage(idForm, control, item);
            if (item.validationMessage) {
                showFieldError(idForm, name, control, item.validationMessage);
                esValido = false;
            } else {
                clearFieldError(idForm, name, control);
            }
        });

        return esValido;
    };

    obj.enviarRegistroNuevo = (idForm, cierraModal) => {
        enviarRegistro('/api/register', 'POST', idForm, () => {
            cierraModal();
            alert('Usuario registrado. Ya puede iniciar sesión.');
        });
    };

    obj.enviarRegistroModificado = (idForm, cierraModal) => {
        enviarRegistro('/api/register', 'PUT', idForm, (envio) => {
            obj.name = envio.nombre;
            cacheaEnLocalStorage();
            cierraModal();
        });
    };

    obj.enviarRegistroPassword = (idForm, cierraModal) => {
        enviarRegistro('/api/register/password', 'PUT', idForm, () => {
            cierraModal();
            alert('Contraseña modificada.');
        });
    };
})();


if (typeof module !== 'undefined') module.exports = Web4Testing;

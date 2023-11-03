// if (!Web4Testing)
const Web4Testing = new Object();

Web4Testing.AuthService = new function () {
    let obj = this;
    obj.isAuth = false;
    obj.authToken = '';
    obj.name = '';
    obj.roles = [];

    if (localStorage && localStorage.AuthService) {
        let rslt = JSON.parse(localStorage.AuthService);
        obj.isAuth = rslt.isAuth;
        obj.authToken = rslt.authToken;
        obj.name = rslt.name;
        obj.roles = rslt.roles;
    }
    function cacheaEnLocalStorage() {
        if (localStorage) {
            localStorage.AuthService = JSON.stringify({ isAuth: obj.isAuth, authToken: obj.authToken, name: obj.name, roles: obj.roles });
        }
    }
    const decodeError = response => {
        if (response.headers.get('content-type').includes('application/json'))
            response.json().then(err => {
                alert('ERROR: ' + response.status + ': ' + (err.detail || err.title || response.statusText))
            })
        else {
            alert('ERROR: ' + response.status + ': ' + response.statusText)
        }
    }
    obj.getHeaders = function () {
        let headers = new Headers()
        headers.append('Content-Type', 'application/json');
        headers.append('X-Requested-With', 'XMLHttpRequest');
        let matches = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
        if (matches) {
            headers.append('X-XSRF-TOKEN', decodeURIComponent(matches[1]));
        }
        if (obj.isAuth && obj.authToken) {
            headers.append('Authorization', obj.authToken)
        }
        return headers
    }
    obj.login = function (usr, pwd) {
        return new Promise(function (resolve, reject) {
            fetch('/api/login?cookie=true', {
                method: 'POST',
                headers: obj.getHeaders(),
                body: JSON.stringify({ username: usr, "password": pwd })
            }).then((response) => {
                if (response.ok) {
                    response.json().then(function (resp) {
                        if (!resp.success) {
                            reject("Usuario o contraseña incorrectos.");
                            return;
                        }
                        obj.isAuth = true;
                        obj.authToken = resp.token;
                        obj.name = resp.name;
                        obj.roles = resp.roles;
                        cacheaEnLocalStorage();
                        resolve(resp);
                    })
                } else {
                    if (response.headers.get('content-type').includes('application/json'))
                        response.json().then(err => {
                            reject('ERROR: ' + response.status + ': ' + (err.title || response.statusText))
                        })
                    else {
                        reject('ERROR: ' + response.status + ': ' + response.statusText)
                    }
                }
            }).catch(
                function (error) {
                    reject("Error de red: " + error.status + " " + error.statusText);
                }
            )
        })
    }
    obj.logout = function () {
        obj.isAuth = false;
        obj.authToken = '';
        obj.name = '';
        if (localStorage) {
            localStorage.removeItem('AuthService');
        }
        fetch('/api/logout', {
            method: 'GET',
            headers: obj.getHeaders()
        }).then()
    }
    obj.getUser = function () {
        return new Promise(function (resolve, reject) {
            if (!obj.isAuth) {
                reject("No esta autenticado.");
                return;
            }
            fetch('/api/register', {
                method: 'GET',
                headers: obj.getHeaders()
            }).then((response) => {
                if (response.ok) {
                    response.json().then(function (resp) {
                        resolve(resp);
                    })
                } else {
                    if (response.headers.get('content-type').includes('application/json'))
                        response.json().then(err => {
                            reject('ERROR: ' + response.status + ': ' + (err.title || response.statusText))
                        })
                    else {
                        reject('ERROR: ' + response.status + ': ' + response.statusText)
                    }
                }
            }).catch(
                function (error) {
                    reject("Error de red: " + error.status + " " + error.statusText);
                }
            )
        })
    }
    obj.validar = function (idForm, name) {
        let cntr = $('#' + idForm + ' [name="' + name + '"');
        let esValido = true;
        cntr.each(function (_i, item) {
            switch (item.dataset.validacion) {
                case 'equalTo':
                    item.setCustomValidity($('#' + idForm + ' [name="' + item.dataset.origen + '"').val() != cntr.val() ? 'No es igual' : '');
                    break;
            }
            if (item.validationMessage) {
                if ($('#err_' + idForm + '_' + name).length) {
                    $('#err_' + idForm + '_' + name).text(item.validationMessage);
                } else {
                    cntr.after('<div id="err_' + idForm + '_' + name + '" class="text-danger msg-error">' + item.validationMessage + '</div>');
                    cntr.parent().parent().addClass('has-error');
                }
                esValido = false;
            } else {
                cntr.parent().parent().removeClass('has-error');
                $('#err_' + idForm + '_' + name).remove();
            }
        });
        return esValido;
    };

    function capturaFrom(idForm) {
        let datos = $('#' + idForm).serializeArray();
        let esValido = true;
        let envio = {};
        datos.forEach(function (item) {
            if (!obj.validar(idForm, item.name)) {
                esValido = false;
                return;
            }
            if (!item.name.startsWith('__'))
                envio[item.name.replace('_usr_', '')] = item.value;
        });
        return esValido ? envio : null
    }

    obj.enviarRegistroNuevo = function (idForm, cierraModal) {
        let envio = capturaFrom(idForm);
        if (!envio) return;

        fetch('/api/register', {
            method: 'POST',
            headers: obj.getHeaders(),
            body: JSON.stringify(envio)
        }).then((response) => {
            if (response.ok) {
                cierraModal();
                alert('Usuario registrado. Ya puede iniciar sesión.');
            } else decodeError(response)
        })
    };

    obj.enviarRegistroModificado = function (idForm, cierraModal) {
        let envio = capturaFrom(idForm);
        if (!envio) return;

        fetch('/api/register', {
            method: 'PUT',
            headers: obj.getHeaders(),
            body: JSON.stringify(envio)
        }).then((response) => {
            if (response.ok) {
                obj.name = envio.nombre;
                cacheaEnLocalStorage();
                cierraModal();
            } else decodeError(response)
        })
    };

    obj.enviarRegistroPassword = function (idForm, cierraModal) {
        let envio = capturaFrom(idForm);
        if (!envio) return;

        fetch('/api/register/password', {
            method: 'PUT',
            headers: obj.getHeaders(),
            body: JSON.stringify(envio)
        }).then((response) => {
            if (response.ok) {
                cierraModal();
                alert('Contraseña modificada.');
            } else decodeError(response)
        })
    };
}
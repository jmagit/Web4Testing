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
    obj.getXSRFHeader = function () {
        let matches = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
        return matches ? { 'X-XSRF-TOKEN': decodeURIComponent(matches[1]) } : {};
    }
    obj.login = function (usr, pwd) {
        return new Promise(function (resolve, reject) {
            $.ajax({
                url: '/api/login?cookie=true',
                method: 'POST',
                headers: obj.getXSRFHeader(),
                dataType: 'json',
                data: { name: usr, "password": pwd }
            }).then(
                function (resp) {
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
                },
                function (jqXHR, _textStatus, _errorThrown) {
                    reject("Error de red: " + jqXHR.status + " " + jqXHR.statusText);
                }
            );
        });
    }
    obj.logout = function () {
        obj.isAuth = false;
        obj.authToken = '';
        obj.name = '';
        if (localStorage) {
            localStorage.removeItem('AuthService');
        }
        $.get('/api/logout').then()
    }
    obj.getUser = function () {
        return new Promise(function (resolve, reject) {
            if (!obj.isAuth) {
                reject("No esta autenticado.");
                return;
            }
            $.ajax({
                url: '/api/register',
                method: 'GET',
                dataType: 'json',
                headers: { Authorization: obj.authToken }
            }).then(
                function (resp) {
                    resolve(resp);
                },
                function (jqXHR, _textStatus, _errorThrown) {
                    reject("Error de red: " + jqXHR.status + " " + jqXHR.statusText);
                }
            );
        });
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

        $.ajax({
            url: '/api/register',
            method: 'POST',
            headers: obj.getXSRFHeader(),
            dataType: 'json',
            data: envio
        }).then(
            function () {
                cierraModal();
                alert('Usuario registrado. Ya puede iniciar sesión.');
            },
            function (jqXHR, _textStatus, _errorThrown) {
                if (jqXHR.status < 400) {
                    cierraModal();
                    alert('Usuario registrado. Ya puede iniciar sesión.');
                } else
                    alert('ERROR: ' + jqXHR.status + ': ' + jqXHR.statusText);
            }
        );
    };

    obj.enviarRegistroModificado = function (idForm, cierraModal) {
        let envio = capturaFrom(idForm);
        if (!envio) return;

        $.ajax({
            url: '/api/register',
            method: 'PUT',
            headers: obj.getXSRFHeader(),
            dataType: 'json',
            data: envio
        }).then(
            function () {
                obj.name = envio.nombre;
                cacheaEnLocalStorage();
                cierraModal();
            },
            function (jqXHR, _textStatus, _errorThrown) {
                if (jqXHR.status < 400) {
                    obj.name = envio.nombre;
                    cacheaEnLocalStorage();
                    cierraModal();
                } else
                    alert('ERROR: ' + jqXHR.status + ': ' + jqXHR.statusText);
            }
        );
    };
}
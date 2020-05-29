// if (!Web4Testing)
Web4Testing = new Object();

Web4Testing.AuthService = new function () {
    var obj = this;
    obj.isAuth = false;
    obj.authToken = '';
    obj.name = '';

    if (localStorage && localStorage.AuthService) {
        var rslt = JSON.parse(localStorage.AuthService);
        obj.isAuth = rslt.isAuth;
        obj.authToken = rslt.authToken;
        obj.name = rslt.name;
    }
    function cacheaEnLocalStorage() {
        if (localStorage) {
            localStorage.AuthService = JSON.stringify({ isAuth: obj.isAuth, authToken: obj.authToken, name: obj.name });
        }
    }

    obj.login = function (usr, pwd) {
        return new Promise(function (resolve, reject) {
            $.ajax({
                url: '/api/login?cookie=true',
                method: 'POST',
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
                    cacheaEnLocalStorage();
                    resolve(resp);
                },
                function (jqXHR, textStatus, errorThrown) {
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
                function (jqXHR, textStatus, errorThrown) {
                    reject("Error de red: " + jqXHR.status + " " + jqXHR.statusText);
                }
            );
        });
    }
    obj.validar = function (idForm, name) {
        var cntr = $('#' + idForm + ' [name="' + name + '"');
        var esValido = true;
        cntr.each(function (i, item) {
            switch (item.dataset.validacion) {
                case 'equalTo':
                    if ($('#' + idForm + ' [name="' + item.dataset.origen + '"').val() != cntr.val())
                        item.setCustomValidity('No es igual');
                    else
                        item.setCustomValidity('');
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
    obj.enviarRegistroNuevo = function (idForm, cierraModal) {
        var datos = $('#' + idForm).serializeArray();
        var envio = {};
        var esValido = true;
        datos.forEach(function (item) {
            if (!obj.validar(idForm, item.name)) {
                esValido = false;
                return;
            }
            if (!item.name.startsWith('__'))
                envio[item.name.replace('_usr_', '')] = item.value;
        });
        if (!esValido)
            return;
        $.ajax({
            url: '/api/register',
            method: 'POST',
            dataType: 'json',
            data: envio
        }).then(
            function () {
                cierraModal();
                alert('Usuario registrado. Ya puede iniciar sesion.');
            },
            function (jqXHR, textStatus, errorThrown) {
                if (jqXHR.status < 400) {
                    cierraModal();
                    alert('Usuario registrado. Ya puede iniciar sesion.');
                } else
                    alert('ERROR: ' + jqXHR.status + ': ' + jqXHR.statusText);
            }
        );
    };

    obj.enviarRegistroModificado = function (idForm, cierraModal) {
        var datos = $('#' + idForm).serializeArray();
        var envio = {};
        var esValido = true;
        datos.forEach(function (item) {
            if (!obj.validar(idForm, item.name)) {
                esValido = false;
                return;
            }
            if (!item.name.startsWith('__'))
                envio[item.name.replace('_usr_', '')] = item.value;
        });
        if (!esValido)
            return;
        $.ajax({
            url: '/api/register',
            method: 'PUT',
            dataType: 'json',
            data: envio
        }).then(
            function () {
                obj.name = envio.nombre;
                cacheaEnLocalStorage();
                cierraModal();
            },
            function (jqXHR, textStatus, errorThrown) {
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
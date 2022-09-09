const Contactos = new (
    function () {
        let obj = this;
        obj.currentPage = 1;
        const FxP = 7;
        let idOriginal = null
        let configPage = {
            totalPages: 0,
            visiblePages: 10,
            startPage: obj.currentPage,
            first: '<i class="fas fa-angle-double-left"></i><span hidden>inicio</span>',
            prev: '<i class="fas fa-angle-left"></i><span hidden>anterior</span>',
            next: '<i class="fas fa-angle-right"></i><span hidden>siguiente</span>',
            last: '<i class="fas fa-angle-double-right"></i><span hidden>último</span>',
            paginationClass: 'pagination justify-content-end',
        }
        const decodeError = response => {
            if (response.headers.get('content-type').includes('application/json'))
                response.json().then(err => {
                    obj.ponError('ERROR: ' + response.status + ': ' + (err.title || response.statusText))
                })
            else {
                obj.ponError('ERROR: ' + response.status + ': ' + response.statusText)
            }
        }
        const getData = () => {
            let datos = $('#frmPrincipal').serializeArray();
            if (datos.length == 0) return
            let envio = {};
            let esValido = true;
            datos.forEach(function (item) {
                if (!obj.validar(item.name)) {
                    esValido = false;
                    return;
                }
                if (item.value)
                    envio[item.name] = item.value;
            });
            envio.id = +envio.id;
            envio.conflictivo = envio.conflictivo === "true"
            if (!esValido)
                return;
            return envio
        }
        obj.resetForm = function () {
            $('.msg-error').remove();
            $('#frmPrincipal').show().each(function (_i, _item) {
                this.reset();
            });
        };
        obj.get = function () {
            return new Promise(function (resolve, reject) {
                fetch('/api/contactos?_sort=nombre,apellidos&_projection=id,tratamiento,nombre,apellidos,avatar,telefono,email' +
                    '&_page=' + (obj.currentPage - 1) + '&_rows=' + FxP, {
                    method: 'GET',
                    headers: Web4Testing.AuthService.getHeaders(),
                }).then(response => {
                    if (response.ok) {
                        response.json().then(data => resolve(data))
                    } else {
                        decodeError(response)
                        reject(response);
                    }
                });
            });
        };

        obj.listar = function () {
            obj.get().then(function (envios) {
                if (configPage.totalPages !== envios.totalPages)
                    configPage.totalPages = envios.totalPages;
                configPage.startPage = obj.currentPage;
                $('#listado').empty()
                    .append($('<div id="content"></div>'))
                    .append($('<nav id="page-selection"></nav>'));
                $("#content").empty().html(Mustache.render($('#tmplListado').html(), { filas: envios.content }));
                $('#page-selection').twbsPagination(configPage).on('page', function (_event, page) {
                    obj.currentPage = page;
                    obj.listar()
                });
            });
        };
        $('#page-selection').trigger(jQuery.Event("page"), obj.currentPage);

        obj.añadir = function () {
            $('#listado').hide();
            obj.resetForm();
            $('#btnEnviar').on('click', obj.enviarNuevo);
        };

        obj.editar = function (id) {
            fetch('/api/contactos/' + id, {
                method: 'GET',
                headers: Web4Testing.AuthService.getHeaders(),
            }).then((response) => {
                if (response.ok) {
                    response.json().then(function (resp) {
                        idOriginal = id
                        obj.resetForm();
                        for (let name in resp) {
                            $('[name="' + name + '"]').each(function () {
                                switch (this.type) {
                                    case 'radio': this.checked = (this.value === resp[name]); break;
                                    case 'checkbox': if (resp[name]) this.checked = true; break;
                                    default: $(this).val(resp[name]); break;
                                }
                            });
                        }
                        $('#listado').hide();
                        $('#btnEnviar').on('click', obj.enviarModificado);
                    })
                } else decodeError(response)
            })
        };

        obj.borrar = function (id) {
            if (!window.confirm("¿Estas seguro?")) return;

            fetch('/api/contactos/' + id, {
                method: 'DELETE',
                headers: Web4Testing.AuthService.getHeaders(),
            }).then((response) => {
                if (response.ok) {
                    obj.volver();
                } else decodeError(response)
            })
        };

        obj.ver = function (id) {
            fetch('/api/contactos/' + id, {
                method: 'GET',
                headers: Web4Testing.AuthService.getHeaders(),
            }).then((response) => {
                if (response.ok) {
                    response.json().then(function (resp) {
                        resp.fnacimiento = function () {
                            return resp.nacimiento ? (resp.nacimiento.slice(-2) + '/' + resp.nacimiento.slice(5, 7) + '/' + resp.nacimiento.slice(0, 4)) : ''
                        };
                        $("#listado").empty().html(Mustache.render($('#tmplDetalle').html(), { item: resp }));
                    })
                } else decodeError(response)
            })
        };

        obj.validar = function (name) {
            let cntr = $('[name="' + name + '"');
            let esValido = true;
            cntr.each(function (_i, item) {
                switch (item.dataset.validacion) {
                    case 'mayusculas':
                        item.setCustomValidity(cntr.val().toUpperCase() != cntr.val() ? 'Tiene que estar en mayúsculas' : '');
                        break;
                    case 'minusculas':
                        item.setCustomValidity(cntr.val().toLowerCase() != cntr.val() ? 'Tiene que estar en minúsculas' : '');
                        break;
                }
                if (item.validationMessage) {
                    if ($('#err_' + name).length) {
                        $('#err_' + name).text(item.validationMessage);
                    } else {
                        cntr.after('<div id="err_' + name + '" class="text-danger msg-error">' + item.validationMessage + '</div>');
                        cntr.parent().parent().addClass('has-error');
                    }
                    esValido = false;
                } else {
                    cntr.parent().parent().removeClass('has-error');
                    $('#err_' + name).remove();
                }
            });
            $('#btnEnviar').prop("disabled", !esValido);
            return esValido;
        };
        let procesaEnvio = (response) => {
            if (response.ok) {
                $('#btnEnviar').off('click', obj.enviarNuevo);
                obj.volver();
            } else decodeError(response)
        }

        obj.enviarNuevo = function () {
            let envio = getData();
            if (!envio) {
                obj.ponError('Datos inválidos')
                return
            }
            fetch('/api/contactos', {
                method: 'POST',
                headers: Web4Testing.AuthService.getHeaders(),
                body: JSON.stringify(envio)
            }).then(procesaEnvio)
        };

        obj.enviarModificado = function () {
            let envio = getData();
            if (!envio) {
                obj.ponError('Datos inválidos')
                return
            }
            fetch('/api/contactos/' + idOriginal, {
                method: 'PUT',
                headers: Web4Testing.AuthService.getHeaders(),
                body: JSON.stringify(envio)
            }).then(procesaEnvio)
        };

        obj.volver = function () {
            idOriginal = null
            obj.listar();
            $('#listado').show();
            $('#frmPrincipal').hide();
        };

        obj.ponError = function (msg) {
            $('#txtError').text(msg);
            $('#alertError').show();
        };
    }
)();

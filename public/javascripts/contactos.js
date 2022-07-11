const Contactos = new (
    function () {
        let obj = this;
        obj.currentPage = 1;
        obj.resetForm = function () {
            $('.msg-error').remove();
            $('#frmPrincipal').show().each(function (_i, _item) {
                this.reset();
            });
        };
        obj.get = function () {
            return new Promise(function (resolve, reject) {
                $.ajax({
                    url: '/api/contactos?_sort=nombre,apellidos&_projection=id,tratamiento,nombre,apellidos,avatar,telefono,email',
                    dataType: 'json',
                }).then(
                    function (resp) {
                        resolve(resp);
                    },
                    function (jqXHR, textStatus, errorThrown) {
                        reject(jqXHR, textStatus, errorThrown);
                    }
                );
            });
        };

        obj.listar = function () {
            obj.get().then(function (envios) {
                let FxP = 6;
                $('#listado').empty()
                    .append($('<div id="content"></div>'))
                    .append($('<nav id="page-selection"></nav>'));
                $('#page-selection').twbsPagination({
                    totalPages: Math.ceil(envios.length / FxP),
                    visiblePages: 10,
                    startPage: obj.currentPage,
                    first: '<i class="fas fa-angle-double-left"></i><span hidden>inicio</span>',
                    prev: '<i class="fas fa-angle-left"></i><span hidden>anterior</span>',
                    next: '<i class="fas fa-angle-right"></i><span hidden>siguiente</span>',
                    last: '<i class="fas fa-angle-double-right"></i><span hidden>último</span>',
                    paginationClass: 'pagination justify-content-end',
                }).on('page', function (_event, page) {
                    obj.currentPage = page;
                    let numPag = page - 1;
                    let lst = envios.filter(function (_element, index) { return (numPag * FxP) <= index && index < (numPag * FxP + FxP); })
                    $("#content").empty().html(Mustache.render($('#tmplListado').html(), { filas: lst }));
                });
                $('#page-selection').trigger(jQuery.Event("page"), obj.currentPage);
            });
        };
        obj.añadir = function () {
            $('#listado').hide();
            obj.resetForm();
            $('#btnEnviar').on('click', obj.enviarNuevo);
        };
        obj.editar = function (id) {
            $.ajax({
                url: '/api/contactos/' + id,
                dataType: 'json',
            }).then(
                function (resp) {
                    obj.resetForm();
                    for (let name in resp) {
                        $('[name="' + name + '"]').each(function () {
                            switch(this.type){
                                case 'radio': this.checked = (this.value === resp[name]); break;
                                case 'checkbox': if (resp[name]) this.checked = true; break;
                                default: $(this).val(resp[name]); break;
                            }
                        });
                    }
                    $('#listado').hide();
                    $('#btnEnviar').on('click', obj.enviarModificado);
                }
            );
        };

        obj.borrar = function (id) {
            if (!window.confirm("¿Estas seguro?")) return;

            $.ajax({
                url: '/api/contactos/' + id,
                method: 'DELETE',
                dataType: 'json',
            }).then(
                function (_resp) {
                    obj.volver();
                },
                function (jqXHR, _textStatus, _errorThrown) {
                    obj.ponError('ERROR: ' + jqXHR.status + ': ' + jqXHR.statusText);
                }
            );
        };

        obj.ver = function (id) {
            $.ajax({
                url: '/api/contactos/' + id,
                dataType: 'json',
            }).then(
                function (resp) {
                    resp.fnacimiento = function () {
                        return resp.nacimiento.slice(-2) + '/' + resp.nacimiento.slice(5, 7) + '/' + resp.nacimiento.slice(0, 4)
                     };
                    $("#listado").empty().html(Mustache.render($('#tmplDetalle').html(), { item: resp }));
                }
            );
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
            return esValido;
        };

        obj.enviarNuevo = function () {
            let datos = $('#frmPrincipal').serializeArray();
            let envio = {};
            let esValido = true;
            datos.forEach(function (item) {
                if (!obj.validar(item.name)) {
                    esValido = false;
                    return;
                }
                envio[item.name] = item.value;
            });
            if (!esValido)
                return;
            $.ajax({
                url: '/api/contactos',
                method: 'POST',
                dataType: 'json',
                data: envio
            }).then(
                function () {
                    $('#btnEnviar').off('click', obj.enviarNuevo);
                    obj.volver();
                },
                function (jqXHR, _textStatus, _errorThrown) {
                    obj.ponError('ERROR: ' + jqXHR.status + ': ' + jqXHR.statusText);
                }
            );
        };

        obj.enviarModificado = function () {
            $('#frmPrincipal').each(function (_i, _item) {
                // if(!item.checkValidity()) {
                //     alert("Error en el formulario.");
                // } else {
                let datos = $('#frmPrincipal').serializeArray();
                let envio = {};
                let esValido = true;
                datos.forEach(function (item) {
                    if (!obj.validar(item.name)) {
                        esValido = false;
                        return;
                    }
                    envio[item.name] = item.value;
                });
                if (!esValido)
                    return;
                $.ajax({
                    url: '/api/contactos',
                    method: 'PUT',
                    dataType: 'json',
                    data: envio
                }).then(
                    function () {
                        $('#btnEnviar').off('click', obj.enviarModificado);
                        obj.volver();
                    },
                    function (jqXHR, _textStatus, _errorThrown) {
                        obj.ponError('ERROR: ' + jqXHR.status + ': ' + jqXHR.statusText);
                    }
                );
                // }
            });
        };

        obj.volver = function () {
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

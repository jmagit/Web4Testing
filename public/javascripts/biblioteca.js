var Biblioteca = new (
    function () {
        var obj = this;
        obj.currentPage = 1;
        obj.get = function () {
            return new Promise(function (resolve, reject) {
                $.ajax({
                    url: '/api/biblioteca?_sort=titulo',
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
                var FxP = 10;
                $('#listado').empty()
                    .append($('<div id="content"></div>'))
                    .append($('<nav id="page-selection"></nav>'));
                $('#page-selection').twbsPagination({
                    totalPages: Math.ceil(envios.length / FxP),
                    visiblePages: 5,
                    startPage: obj.currentPage,
                    first: '<i class="fas fa-angle-double-left"></i>',
                    prev: '<i class="fas fa-angle-left"></i>',
                    next: '<i class="fas fa-angle-right"></i>',
                    last: '<i class="fas fa-angle-double-right"></i>',
                    paginationClass: 'pagination justify-content-end',
                }).on('page', function (event, page) {
                    obj.currentPage = page;
                    var numPag = page - 1;
                    var lst = envios.filter(function(element, index) { return (numPag * FxP) <= index && index < (numPag * FxP + FxP); })
                    $("#content").empty().html(Mustache.render($('#tmplListado').html(), { filas: lst }));
                    // var rslt = $('<table class="table table-striped table-hover"><tr class="info"><th>Título</th><th class="text-right"><input type="button" class="btn btn-success" value="Añadir" onclick="Biblioteca.añadir()"></th></tr></table>');
                    // $("#content").empty().html(rslt);
                    // for (var i = numPag * FxP; i < envios.length && i < (numPag * FxP + FxP); ++i) {
                    //     var tr = $('<tr/>');
                    //     tr.append($('<td><input type="button" class="btn btn-link" value="' + envios[i].titulo + '" onclick="Biblioteca.ver(' + envios[i].id + ');"></td>'));
                    //     var td = $('<td class="float-right"/>');
                    //     td.addClass('btn-group');
                    //     td.append($('<input type="button" class="btn btn-info" value="Ver" onclick="Biblioteca.ver(' + envios[i].id + ');">'));
                    //     td.append($('<button class="btn btn-success" onclick="Biblioteca.editar(' + envios[i].id + ');"><i class="fas fa-pen"></i></button>'));
                    //     td.append($('<button class="btn btn-danger" onclick="Biblioteca.borrar(' + envios[i].id + ');"><i class="far fa-trash-alt"></i></button>'));
                    //     tr.append(td);
                    //     rslt.append(tr);
                    // }
                });
                $('#page-selection').trigger(jQuery.Event("page"), obj.currentPage);
            });
        };
        obj.añadir = function () {
            $('#listado').hide();
            $('#frmPrincipal').show().each(function (i, item) {
                item.reset();
            });
            document.getElementById('frmPrincipal').reset();
            $('#btnEnviar').on('click', obj.enviarNuevo);
        };
        obj.editar = function (id) {
            $.ajax({
                url: '/api/biblioteca/' + id,
                dataType: 'json',
            }).then(
                function (resp) {
                    for (var name in resp) {
                        $('[name="' + name + '"]').val(resp[name]);
                    }
                    $('#listado').hide();
                    $('#frmPrincipal').show();
                    $('#btnEnviar').on('click', obj.enviarModificado);
                }
            );
        };

        obj.borrar = function (id) {
            if (!window.confirm("¿Estas seguro?")) return;

            $.ajax({
                    url: '/api/biblioteca/' + id,
                    method: 'DELETE',
                    dataType: 'json',
            }).then(
                function (resp) {
                    obj.volver();
                },
                function (jqXHR, textStatus, errorThrown) {
                    $('errorMsg').html(
                        '<p class="error">ERROR: ' + jqXHR.status + ': ' + jqXHR.statusText + '</p>');
                }
            );
        };

        obj.ver = function (id) {
            $.ajax({
                url: '/api/biblioteca/' + id,
                dataType: 'json',
            }).then(
                function (resp) {
                    var rslt = '<p>';
                    rslt += '<b>Código:</b> ' + resp.id + '<br>' +
                        '<b>Título:</b> ' + resp.titulo + '<br>' +
                        '<b>Autor:</b> ' + resp.autor + '<br>' +
                        '<b>Nº Páginas:</b> ' + resp.numPag;
                    rslt += '</p>';
                    rslt += '<input type="button" value="Volver" onclick="Biblioteca.volver()">';

                    $('#listado').html(rslt);
                }
            );
        };

        obj.validar = function (name) {
            var cntr = $('[name="' + name + '"');
            var esValido = true;
            cntr.each(function (i, item) {
                switch (item.dataset.validacion) {
                    case 'mayusculas':
                        if (cntr.val().toUpperCase() != cntr.val())
                            item.setCustomValidity('Tiene que estar en mayusculas');
                        else
                            item.setCustomValidity('');
                        break;
                    case 'minusculas':
                        if (cntr.val().toLowerCase() != cntr.val())
                            item.setCustomValidity('Tiene que estar en minusculas');
                        else
                            item.setCustomValidity('');
                        break;
                }
                // switch (name) {
                //     case 'titulo':
                //         if (cntr.val().toUpperCase() != cntr.val())
                //             item.setCustomValidity('Tiene que estar en mayusculas');
                //         else
                //             item.setCustomValidity('');
                //         break;
                // }
                if (item.validationMessage) {
                    if ($('#err_' + name).length) {
                        $('#err_' + name).text(item.validationMessage);
                    } else {
                        cntr.after('<div id="err_' + name + '" class="text-danger">' + item.validationMessage + '</div>');
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
            var datos = $('#frmPrincipal').serializeArray();
            var envio = {};
            var esValido = true;
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
                url: '/api/biblioteca',
                method: 'POST',
                dataType: 'json',
                data: envio
            }).then(
                function () {
                    $('#btnEnviar').off('click', obj.enviarNuevo);
                    obj.volver();
                },
                function (jqXHR, textStatus, errorThrown) {
                    $('errorMsg').html(
                        '<p class="error">ERROR: ' + jqXHR.status + ': ' + jqXHR.statusText + '</p>');
                }
            );
        };

        obj.enviarModificado = function () {
            $('#frmPrincipal').each(function (i, item) {
                // if(!item.checkValidity()) {
                //     alert("Error en el formulario.");
                // } else {
                var datos = $('#frmPrincipal').serializeArray();
                var envio = {};
                var esValido = true;
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
                    url: '/api/biblioteca',
                    method: 'PUT',
                    dataType: 'json',
                    data: envio
                }).then(
                    function () {
                        $('#btnEnviar').off('click', obj.enviarModificado);
                        obj.volver();
                    },
                    function (jqXHR, textStatus, errorThrown) {
                        $('errorMsg').html(
                            '<p class="error">ERROR: ' + jqXHR.status + ': ' + jqXHR.statusText + '</p>');
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
    }
)();

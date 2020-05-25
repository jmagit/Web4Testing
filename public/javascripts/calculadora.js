// "use strict";
function Calculadora(laPantalla, elResumen){
	var ref = this;
	var acumulado = 0;
	var operador = '+';
	var limpiar = true;
	var idPantalla = document.getElementById(laPantalla);
	var idResumen = document.getElementById(elResumen);
	// var idPantalla = $('#' + laPantalla);
	// var idResumen = $('#' + elResumen);
	
	ref.pantalla = "0";
	ref.resumen = "";

	function pintaPantalla() {
		if(idPantalla)
			idPantalla.textContent = ref.pantalla.replace('.',',');
	}
	function pintaResumen() {
		if(idResumen)
			idResumen.textContent = ref.resumen.replace('.',',');
	}
	
	ref.inicia = function() {
		acumulado = 0;
		operador = '+';
		ref.pantalla = "0";
		ref.resumen = "";
		limpiar = true;
		pintaPantalla();
		pintaResumen();
	};
	ref.ponDijito = function(value) {
		if (typeof(value)!=="string")
			value = value.toString();
		if(value.length != 1 && (value < "0" || value > "9"))
			return;
		if (limpiar || ref.pantalla == "0") {
			ref.pantalla = value;
			limpiar = false;
		} else
			ref.pantalla += value;
		pintaPantalla();
	};
	ref.ponOperando = function(value) {
		if(!Number.isNaN(parseInt(value))) {
			ref.pantalla = value;
			pintaPantalla();
		}
	};
	ref.ponComa = function() {
		if (limpiar) {
			ref.pantalla = "0.";
			limpiar = false;
		} else if (ref.pantalla.indexOf(".") === -1)
			ref.pantalla += '.';
		else
			console.warn('Ya está la coma');
		pintaPantalla();
	};
	ref.borrar = function() {
		if (limpiar || ref.pantalla.length == 1) {
			ref.pantalla = "0";
			limpiar = true;
		} else
			ref.pantalla = ref.pantalla.substr(0,
					ref.pantalla.length - 1);
		pintaPantalla();
	};
	ref.cambiaSigno = function() {
		ref.pantalla = (-ref.pantalla).toString();
		if(limpiar) {
			acumulado = -acumulado;
		}
		pintaPantalla();
	};
	ref.calcula = function(value) {
		if("+-*/=".indexOf(value) == -1) return;
		
		var operando = parseFloat(ref.pantalla);
		switch (operador) {
		case '+':
			acumulado += operando;
			break;
		case '-':
			acumulado -= operando;
			break;
		case '*':
			acumulado *= operando;
			break;
		case '/':
			acumulado /= operando;
			break;
		case '=':
			break;
		}
		// Con eval()
		// acumulado = eval (acumulado + operador + ref.pantalla);
		ref.resumen = value == "=" ? "" : (ref.resumen + ref.pantalla + value);
		ref.pantalla = acumulado.toString();
		pintaPantalla();
		pintaResumen();
		operador = value;
		limpiar = true;
	};
}

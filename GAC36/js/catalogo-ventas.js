// js/catalogo-ventas.js
document.addEventListener("DOMContentLoaded", () => {
    let platilloSeleccionadoId = null;

    const formPlatillo = document.getElementById("form-platillo");
    const formReceta = document.getElementById("form-agregar-insumo-receta");
    const selectInsumos = document.getElementById("receta-insumo-id");
    const etiquetaCantidad = document.getElementById("etiqueta-cantidad-inteligente");

    formPlatillo.addEventListener("submit", (e) => {
        e.preventDefault();
        const nombre = document.getElementById("pla-nombre").value.trim();
        const precio = parseFloat(document.getElementById("pla-precio").value) || 0;

        const nuevoCodigo = generarCorrelativo('platillos', 'PLA');
        const nuevoPlatillo = {
            codigo: nuevoCodigo,
            nombre: nombre,
            precio: precio,
            estado: "Activo"
        };

        database.platillos.push(nuevoPlatillo);
        guardarDatabase();
        formPlatillo.reset();
        listarPlatillos();
    });

    // Cambiar la ayuda en pantalla según el insumo seleccionado en caliente
    if (selectInsumos) {
        selectInsumos.addEventListener("change", () => {
            actualizarAyudaEtiqueta();
        });
    }

    function actualizarAyudaEtiqueta() {
        if (!selectInsumos || !etiquetaCantidad) return;
        const insumoId = selectInsumos.value;
        const insumo = database.insumos.find(i => i.codigo === insumoId);
        
        if (!insumo) {
            etiquetaCantidad.innerText = "Cantidad requerida (1 porción):";
            return;
        }

        // Le avisamos explícitamente en qué unidad debe escribir para guiarlo
        if (insumo.unidad === "Kg") {
            etiquetaCantidad.innerHTML = 'Cantidad requerida para 1 plato (Escriba directamente en <b>Gramos [g]</b>)';
        } else if (insumo.unidad === "Litros") {
            etiquetaCantidad.innerHTML = 'Cantidad requerida para 1 plato (Escriba directamente en <b>Mililitros [ml]</b>)';
        } else {
            etiquetaCantidad.innerHTML = 'Cantidad requerida para 1 plato (Escriba en <b>Unidades [Und]</b>)';
        }
    }

    formReceta.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!platilloSeleccionadoId) return;

        const insumoId = selectInsumos.value;
        let cantidadDigitada = parseFloat(document.getElementById("receta-cantidad").value) || 0;

        if (cantidadDigitada <= 0) return;

        const insumo = database.insumos.find(i => i.codigo === insumoId);
        if (!insumo) return;

        // DIVISIÓN AUTOMÁTICA EN SEGUNDO PLANO SEGÚN EL INSUMO SELECCIONADO
        if (insumo.unidad === "Kg" || insumo.unidad === "Litros") {
            cantidadDigitada = cantidadDigitada / 1000; // Pasa gramos/ml a la unidad base del inventario (Kilos/Litros)
        }

        database.recetas = database.recetas.filter(r => !(r.platilloId === platilloSeleccionadoId && r.insumoId === insumoId));

        database.recetas.push({
            platilloId: platilloSeleccionadoId,
            insumoId: insumoId,
            cantidad: cantidadDigitada
        });

        guardarDatabase();
        formReceta.reset();
        document.getElementById("receta-cantidad").value = "0";
        cargarDetalleReceta(platilloSeleccionadoId);
        actualizarAyudaEtiqueta();
        listarPlatillos();
    });

    window.seleccionarPlatillo = function(codigo, nombre) {
        platilloSeleccionadoId = codigo;
        document.getElementById("seccion-receta").style.display = "block";
        document.getElementById("receta-platillo-nombre").innerText = nombre;
        
        if (selectInsumos) {
            selectInsumos.innerHTML = "";
            database.insumos.forEach(ins => {
                selectInsumos.innerHTML += `<option value="${ins.codigo}">${ins.nombre} (${ins.unidad})</option>`;
            });
            actualizarAyudaEtiqueta();
        }
        cargarDetalleReceta(codigo);
    };

    window.eliminarItemReceta = function(insumoId) {
        database.recetas = database.recetas.filter(r => !(r.platilloId === platilloSeleccionadoId && r.insumoId === insumoId));
        guardarDatabase();
        cargarDetalleReceta(platilloSeleccionadoId);
        listarPlatillos();
    };

    function cargarDetalleReceta(platilloId) {
        const tbody = document.getElementById("tabla-receta-items");
        if (!tbody) return;
        tbody.innerHTML = "";
        
        const items = database.recetas.filter(r => r.platilloId === platilloId);
        let costoProduccionTotal = 0;

        items.forEach(item => {
            const insumo = database.insumos.find(i => i.codigo === item.insumoId);
            if (!insumo) return;

            if (typeof actualizarInventarioYCostos === "function") {
                actualizarInventarioYCostos(insumo.codigo);
            }

            const costoPromedio = insumo.costoPromedio || 0;
            const subtotal = item.cantidad * costoPromedio;
            costoProduccionTotal += subtotal;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${insumo.nombre}</td>
                <td><b>${item.cantidad.toFixed(3)}</b> ${insumo.unidad}</td>
                <td>S/. ${costoPromedio.toFixed(2)}</td>
                <td>S/. ${subtotal.toFixed(2)}</td>
                <td><button class="btn btn-danger" onclick="eliminarItemReceta('${insumo.codigo}')" style="padding:2px 8px; font-size:11px;">X</button></td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById("receta-costo-produccion").innerText = `S/. ${costoProduccionTotal.toFixed(2)}`;
    }

    function calcularCostoProduccionPlatillo(platilloId) {
        const items = database.recetas.filter(r => r.platilloId === platilloId);
        return items.reduce((acc, item) => {
            const insumo = database.insumos.find(i => i.codigo === item.insumoId);
            if (insumo && typeof actualizarInventarioYCostos === "function") {
                actualizarInventarioYCostos(insumo.codigo);
            }
            const costoProm = insumo ? (insumo.costoPromedio || 0) : 0;
            return acc + (item.cantidad * costoProm);
        }, 0);
    }

    function listarPlatillos() {
        const tbody = document.getElementById("tabla-platillos");
        if (!tbody) return;
        tbody.innerHTML = "";
        
        database.platillos.forEach(p => {
            const costoProd = calcularCostoProduccionPlatillo(p.codigo);
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><b>${p.codigo}</b></td>
                <td>${p.nombre}</td>
                <td>S/. ${p.precio.toFixed(2)}</td>
                <td style="color:#D32F2F; font-weight:600;">S/. ${costoProd.toFixed(2)}</td>
                <td><button class="btn btn-primary" onclick="seleccionarPlatillo('${p.codigo}', '${p.nombre}')" style="padding:5px 10px; font-size:12px;">Receta</button></td>
            `;
            tbody.appendChild(tr);
        });
    }
    listarPlatillos();
});

// js/compras.js
document.addEventListener("DOMContentLoaded", () => {
    let carritoCompra = [];

    // Colocar fecha de hoy por defecto en el input
    const inputFecha = document.getElementById("compra-fecha");
    if(inputFecha) inputFecha.value = new Date().toISOString().split('T')[0];

    // Llenar combo de insumos
    const selectInsumos = document.getElementById("item-insumo-id");
    if (selectInsumos) {
        database.insumos.forEach(ins => {
            selectInsumos.innerHTML += `<option value="${ins.codigo}">${ins.nombre} (${ins.unidad})</option>`;
        });
    }

    const formItem = document.getElementById("form-item-compra");
    if(formItem) {
        formItem.addEventListener("submit", (e) => {
            e.preventDefault();
            const insumoId = selectInsumos.value;
            const cantidad = parseFloat(document.getElementById("item-cantidad").value) || 0;
            const costoTotal = parseFloat(document.getElementById("item-costo-total").value) || 0;

            if (cantidad <= 0 || costoTotal <= 0) {
                alert("La cantidad y el costo deben ser mayores a cero.");
                return;
            }

            const insumo = database.insumos.find(i => i.codigo === insumoId);
            const itemExistente = carritoCompra.find(c => c.insumoId === insumoId);
            
            if(itemExistente) {
                itemExistente.cantidad += cantidad;
                itemExistente.costoTotal += costoTotal;
                itemExistente.costoUnitario = itemExistente.costoTotal / itemExistente.cantidad;
            } else {
                carritoCompra.push({
                    insumoId: insumoId,
                    nombre: insumo.nombre,
                    unidad: insumo.unidad,
                    cantidad: cantidad,
                    costoUnitario: costoTotal / cantidad,
                    costoTotal: costoTotal
                });
            }

            formItem.reset();
            renderCarrito();
        });
    }

    window.eliminarItemCarrito = function(index) {
        carritoCompra.splice(index, 1);
        renderCarrito();
    };

    function renderCarrito() {
        const tbody = document.getElementById("tabla-temporal-compra");
        if(!tbody) return;
        tbody.innerHTML = "";
        let total = 0;

        carritoCompra.forEach((item, index) => {
            total += item.costoTotal;
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${item.nombre}</td>
                <td>${item.cantidad} ${item.unidad}</td>
                <td>S/. ${item.costoUnitario.toFixed(4)}</td>
                <td>S/. ${item.costoTotal.toFixed(2)}</td>
                <td><button class="btn btn-danger" onclick="eliminarItemCarrito(${index})" style="padding:3px 8px; font-size:11px;">X</button></td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById("compra-total-calculado").innerText = `S/. ${total.toFixed(2)}`;
    }

    const btnGuardar = document.getElementById("btn-guardar-compra");
    if(btnGuardar) {
        btnGuardar.addEventListener("click", () => {
            const proveedor = document.getElementById("compra-proveedor").value.trim() || "Proveedor General";
            const fecha = document.getElementById("compra-fecha").value;
            const documento = document.getElementById("compra-documento").value.trim();

            if (carritoCompra.length === 0) {
                alert("Por favor, añada al menos un insumo antes de procesar.");
                return;
            }

            const nuevoCodigoCompra = generarCorrelativo('compras', 'COM');
            const totalCompra = carritoCompra.reduce((acc, cur) => acc + cur.costoTotal, 0);

            const objetoCompra = {
                codigo: nuevoCodigoCompra,
                proveedor: proveedor,
                fecha: fecha,
                documento: documento,
                items: carritoCompra,
                total: totalCompra
            };

            database.compras.push(objetoCompra);
            guardarDatabase();

            // DISPARADORES AUTOMÁTICOS EN CASCADA HACIA EL KARDEX E INVENTARIO
            carritoCompra.forEach(item => {
                registrarMovimientoAutomatico(
                    'Compra',
                    nuevoCodigoCompra,
                    item.insumoId,
                    item.cantidad,
                    item.costoTotal,
                    `Compra según Comprobante o Registro ${documento || 'S/N'}`
                );
            });

            alert(`Compra guardada correctamente bajo el correlativo: ${nuevoCodigoCompra}`);
            window.location.href = "compras.html";
        });
    }
});

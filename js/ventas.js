// js/ventas.js
document.addEventListener("DOMContentLoaded", () => {
    let carritoVenta = [];
    const selectPlatillos = document.getElementById("venta-platillo-id");
    
    function cargarComboPlatillos() {
        if (!selectPlatillos) return;
        selectPlatillos.innerHTML = "";
        if (database.platillos.length === 0) {
            selectPlatillos.innerHTML = `<option value="">-- No hay platillos --</option>`;
            return;
        }
        database.platillos.forEach(p => {
            selectPlatillos.innerHTML += `<option value="${p.codigo}">${p.nombre} (S/. ${p.precio.toFixed(2)})</option>`;
        });
    }

    const formVenta = document.getElementById("form-item-venta");
    if (formVenta) {
        formVenta.addEventListener("submit", (e) => {
            e.preventDefault();
            const platilloId = selectPlatillos.value;
            const cantidad = parseInt(document.getElementById("venta-cantidad").value) || 0;
            if (!platilloId || cantidad <= 0) return;

            const platillo = database.platillos.find(p => p.codigo === platilloId);
            if (!platillo) return;
            
            const itemExistente = carritoVenta.find(c => c.platilloId === platilloId);
            if (itemExistente) {
                itemExistente.cantidad += cantidad;
                itemExistente.subtotal = itemExistente.cantidad * itemExistente.precio;
            } else {
                carritoVenta.push({
                    platilloId: platilloId,
                    nombre: platillo.nombre,
                    cantidad: cantidad,
                    precio: platillo.precio,
                    subtotal: cantidad * platillo.precio
                });
            }
            document.getElementById("venta-cantidad").value = "1";
            renderCarritoVenta();
        });
    }

    window.quitarItemVenta = function(index) {
        carritoVenta.splice(index, 1);
        renderCarritoVenta();
    };

    function renderCarritoVenta() {
        const tbody = document.getElementById("tabla-temporal-venta");
        if (!tbody) return;
        tbody.innerHTML = "";
        let total = 0;

        if (carritoVenta.length === 0) {
            tbody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>La orden está vacía</td></tr>";
            document.getElementById("venta-total-calculado").innerText = "S/. 0.00";
            return;
        }

        carritoVenta.forEach((item, index) => {
            total += item.subtotal;
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${item.nombre}</td>
                <td>${item.cantidad}</td>
                <td>S/. ${item.precio.toFixed(2)}</td>
                <td>S/. ${item.subtotal.toFixed(2)}</td>
                <td><button class="btn btn-danger" onclick="quitarItemVenta(${index})" style="padding:4px 8px; font-size:11px;">X</button></td>
            `;
            tbody.appendChild(tr);
        });
        document.getElementById("venta-total-calculado").innerText = `S/. ${total.toFixed(2)}`;
    }

    const btnProcesar = document.getElementById("btn-procesar-venta");
    if (btnProcesar) {
        btnProcesar.addEventListener("click", () => {
            if (carritoVenta.length === 0) return;

            let stockInsuficiente = false;
            let mensajeAlerta = "⚠️ ALERTA DE INVENTARIO (FALTAN REGISTRAR INSUMOS):\n\n";

            carritoVenta.forEach(item => {
                const recetasPlatillo = database.recetas.filter(r => r.platilloId === item.platilloId);
                recetasPlatillo.forEach(receta => {
                    const cantDescuento = receta.cantidad * item.cantidad;
                    const insumo = database.insumos.find(i => i.codigo === receta.insumoId);
                    
                    if (insumo && typeof actualizarInventarioYCostos === "function") {
                        actualizarInventarioYCostos(insumo.codigo);
                    }
                    if (!insumo || (insumo.stock || 0) < cantDescuento) {
                        stockInsuficiente = true;
                        const stockActual = insumo ? insumo.stock : 0;
                        mensajeAlerta += `- ${insumo ? insumo.nombre : 'Insumo'}: Requiere ${cantDescuento.toFixed(2)}, pero hay ${stockActual.toFixed(2)}.\n`;
                    }
                });
            });

            if (stockInsuficiente) {
                mensajeAlerta += "\nLa venta se registrará igual para no detener la caja. Regularice las compras luego.";
                alert(mensajeAlerta);
            }

            const nuevoCodigoVenta = generarCorrelativo('ventas', 'VTA');
            const totalVenta = carritoVenta.reduce((acc, cur) => acc + cur.subtotal, 0);

            const objetoVenta = {
                codigo: nuevoCodigoVenta,
                fecha: new Date().toISOString().split('T')[0],
                items: carritoVenta,
                total: totalVenta,
                estado: "Completado"
            };

            carritoVenta.forEach(item => {
                const recetasPlatillo = database.recetas.filter(r => r.platilloId === item.platilloId);
                recetasPlatillo.forEach(receta => {
                    const cantDescuento = receta.cantidad * item.cantidad;
                    const insumo = database.insumos.find(i => i.codigo === receta.insumoId);
                    const costoUnit = insumo && insumo.costoPromedio ? insumo.costoPromedio : 0;
                    
                    const glosa = insumo && (insumo.stock || 0) >= cantDescuento
                        ? `Consumo por venta ${nuevoCodigoVenta} (${item.cantidad} x ${item.nombre})`
                        : `⚠️ VENTA EN HORA PUNTA SIN COMPRA PREVIA - Venta ${nuevoCodigoVenta}`;

                    registrarMovimientoAutomatico('Venta', nuevoCodigoVenta, receta.insumoId, -cantDescuento, cantDescuento * costoUnit, glosa);
                });
            });

            database.ventas.push(objetoVenta);
            guardarDatabase();
            alert(`Venta procesada: ${nuevoCodigoVenta}`);
            carritoVenta = [];
            renderCarritoVenta();
            listarHistorialVentas();
        });
    }

    window.anularVenta = function(codigoVenta) {
        if (!confirm(`¿Anular la venta ${codigoVenta}? El stock regresará al almacén.`)) return;
        const venta = database.ventas.find(v => v.codigo === codigoVenta);
        if (!venta || venta.estado === "Anulado") return;

        venta.estado = "Anulado";
        venta.items.forEach(item => {
            const recetasPlatillo = database.recetas.filter(r => r.platilloId === item.platilloId);
            recetasPlatillo.forEach(receta => {
                const cantReversar = receta.cantidad * item.cantidad;
                const insumo = database.insumos.find(i => i.codigo === receta.insumoId);
                const costoUnit = insumo && insumo.costoPromedio ? insumo.costoPromedio : 0;

                registrarMovimientoAutomatico('Ajuste', codigoVenta, receta.insumoId, cantReversar, cantReversar * costoUnit, `Devolución por Anulación de Venta ${codigoVenta}`);
            });
        });
        guardarDatabase();
        listarHistorialVentas();
    };

    function listarHistorialVentas() {
        const tbody = document.getElementById("tabla-historial-ventas");
        if (!tbody) return;
        tbody.innerHTML = "";

        if (database.ventas.length === 0) {
            tbody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>No se han emitido comandas hoy.</td></tr>";
            return;
        }

        database.ventas.forEach(v => {
            const tr = document.createElement("tr");
            const esAnulado = v.estado === "Anulado";
            tr.innerHTML = `
                <td><b>${v.codigo}</b></td>
                <td>${v.fecha}</td>
                <td>S/. ${v.total.toFixed(2)}</td>
                <td style="color: ${esAnulado ? '#D32F2F' : '#2E7D32'}; font-weight:600;">${v.estado}</td>
                <td>${esAnulado ? '-' : `<button class="btn btn-danger" onclick="anularVenta('${v.codigo}')" style="padding:4px 8px; font-size:12px;">Anular</button>`}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    cargarComboPlatillos();
    renderCarritoVenta();
    listarHistorialVentas();
});

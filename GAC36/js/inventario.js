// js/inventario.js
document.addEventListener("DOMContentLoaded", () => {
    
    function renderInventario() {
        const tbody = document.getElementById("tabla-inventario");
        tbody.innerHTML = "";

        database.insumos.forEach(ins => {
            // Asegura recálculo en tiempo real evitando datos congelados
            actualizarInventarioYCostos(ins.codigo);

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><b>${ins.codigo}</b></td>
                <td>${ins.nombre}</td>
                <td style="font-weight:600;">${(ins.stock || 0).toFixed(2)} ${ins.unidad}</td>
                <td>S/. ${(ins.costoPromedio || 0).toFixed(4)}</td>
                <td><button class="btn btn-dark" onclick="verKardex('${ins.codigo}', '${ins.nombre}')" style="padding:4px 10px; font-size:12px;">Ver Kardex</button></td>
            `;
            tbody.appendChild(tr);
        });
    }

    window.verKardex = function(insumoId, nombreInsumo) {
        document.getElementById("card-kardex").style.display = "block";
        document.getElementById("kardex-titulo-insumo").innerText = nombreInsumo;

        const tbodyKardex = document.getElementById("tabla-kardex");
        tbodyKardex.innerHTML = "";

        const movimientosFiltrados = database.movimientos.filter(m => m.insumoId === insumoId);

        if(movimientosFiltrados.length === 0){
            tbodyKardex.innerHTML = "<tr><td colspan='6' style='text-align:center;'>No existen movimientos para este insumo.</td></tr>";
            return;
        }

        movimientosFiltrados.forEach(mov => {
            const tr = document.createElement("tr");
            const esSalida = mov.tipo === 'Venta' || (mov.tipo === 'Ajuste' && mov.cantidad < 0);
            const estiloColor = esSalida ? "color: #D32F2F; font-weight:600;" : "color: #2E7D32; font-weight:600;";
            
            tr.innerHTML = `
                <td><small>${mov.codigo}</small></td>
                <td>${mov.fecha}</td>
                <td><b>${mov.tipo}</b></td>
                <td style="${estiloColor}">${mov.cantidad > 0 && esSalida ? '-' : ''}${mov.cantidad}</td>
                <td>S/. ${mov.costoTotal.toFixed(2)}</td>
                <td><small>${mov.descripcion}</small></td>
            `;
            tbodyKardex.appendChild(tr);
        });
    };
    renderInventario();
});

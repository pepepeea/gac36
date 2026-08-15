// js/catalogo-insumos.js
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("form-insumo");
    const checkStock = document.getElementById("ins-tiene-stock");
    const seccionStock = document.getElementById("seccion-stock-inicial");

    checkStock.addEventListener("change", () => {
        seccionStock.style.display = checkStock.checked ? "block" : "none";
    });

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const nombre = document.getElementById("ins-nombre").value.trim();
        const unidad = document.getElementById("ins-unidad").value;
        const tieneStock = checkStock.checked;
        
        const nuevoCodigo = generarCorrelativo('insumos', 'INS');
        
        const nuevoInsumo = {
            codigo: nuevoCodigo,
            nombre: nombre,
            unidad: unidad,
            estado: "Activo",
            stock: 0,
            costoPromedio: 0
        };
        
        database.insumos.push(nuevoInsumo);
        guardarDatabase();

        if (tieneStock) {
            const cantidad = parseFloat(document.getElementById("ins-cantidad").value) || 0;
            const costoTotal = parseFloat(document.getElementById("ins-costo-total").value) || 0;
            
            if (cantidad > 0) {
                registrarMovimientoAutomatico(
                    'Stock Inicial',
                    nuevoCodigo,
                    nuevoCodigo,
                    cantidad,
                    costoTotal,
                    'Carga inicial automática de apertura'
                );
            }
        }

        form.reset();
        seccionStock.style.display = "none";
        listarInsumos();
    });

    function listarInsumos() {
        const tbody = document.getElementById("tabla-insumos");
        tbody.innerHTML = "";
        database.insumos.forEach(ins => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><b>${ins.codigo}</b></td>
                <td>${ins.nombre}</td>
                <td>${ins.unidad}</td>
                <td><span style="color:#2E7D32; font-weight:600;">${ins.estado}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }
    listarInsumos();
});

// js/reportes.js
document.addEventListener("DOMContentLoaded", () => {
    
    // Forzar lectura fresca del localStorage
    if (typeof cargarDatabase === "function") cargarDatabase();

    // 1. Renderizar la tabla visual de rentabilidad teórica
    function generarReporteRentabilidad() {
        const tbody = document.getElementById("tabla-reporte-rentabilidad");
        if (!tbody) return;
        tbody.innerHTML = "";

        if (database.platillos.length === 0) {
            tbody.innerHTML = "<tr><td colspan='4' style='text-align:center;'>No hay platillos en el catálogo.</td></tr>";
            return;
        }

        database.platillos.forEach(p => {
            const itemsReceta = database.recetas.filter(r => r.platilloId === p.codigo);
            const costoProd = itemsReceta.reduce((acc, item) => {
                const insumo = database.insumos.find(i => i.codigo === item.insumoId);
                if (insumo && typeof actualizarInventarioYCostos === "function") {
                    actualizarInventarioYCostos(insumo.codigo);
                }
                const costoProm = insumo ? (insumo.costoPromedio || 0) : 0;
                return acc + (item.cantidad * costoProm);
            }, 0);

            const margen = p.precio - costoProd;
            
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><b>${p.nombre}</b></td>
                <td>S/. ${p.precio.toFixed(2)}</td>
                <td style="color:#D32F2F;">S/. ${costoProd.toFixed(2)}</td>
                <td style="color:#2E7D32; font-weight:600;">S/. ${margen.toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // 2. FUNCIÓN MOTOR: Exportador universal a formato de Excel nativo (.csv UTF-8)
    function exportarExcelCSV(cabeceras, filas, nombreArchivo) {
        // Unir cabeceras separadas por comas
        let contenidoCSV = cabeceras.join(",") + "\n";
        
        // Unir filas procesadas limpiando comas internas para que no rompan las celdas
        filas.forEach(f => {
            contenidoCSV += f.map(celda => `"${String(celda).replace(/"/g, '""')}"`).join(",") + "\n";
        });

        // Forzar el BOM UTF-8 (\uFEFF) para que Excel reconozca tildes, eñes y el símbolo de Soles (S/.) correctamente
        const blob = new Blob(["\uFEFF" + contenidoCSV], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", nombreArchivo + "_" + new Date().toISOString().split('T')[0] + ".csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    // --- MANEJADORES DE CLIC PARA EXCEL ---

    // A) EXCEL DE INVENTARIO ACTUAL
    document.getElementById("btn-excel-inventario").addEventListener("click", () => {
        const cabeceras = ["Codigo Insumo", "Nombre Insumo", "Stock Actual", "Unidad de Medida", "Costo Promedio", "Inversion Total"];
        const filas = database.insumos.map(ins => {
            if (typeof actualizarInventarioYCostos === "function") actualizarInventarioYCostos(ins.codigo);
            const stock = ins.stock || 0;
            const costo = ins.costoPromedio || 0;
            return [ins.codigo, ins.nombre, stock.toFixed(2), ins.unidad, costo.toFixed(4), (stock * costo).toFixed(2)];
        });
        exportarExcelCSV(cabeceras, filas, "Reporte_Inventario");
    });

    // B) EXCEL DE HISTORIAL DE COMPRAS
    document.getElementById("btn-excel-compras").addEventListener("click", () => {
        const cabeceras = ["Codigo Compra", "Fecha", "Proveedor", "Documento Nro", "Monto Total Compra"];
        const filas = database.compras.map(c => [c.codigo, c.fecha, c.proveedor, c.documento || 'S/N', c.total.toFixed(2)]);
        exportarExcelCSV(cabeceras, filas, "Historial_Compras");
    });

    // C) EXCEL DE HISTORIAL DE VENTAS
    document.getElementById("btn-excel-ventas").addEventListener("click", () => {
        const cabeceras = ["Codigo Venta", "Fecha", "Monto Total Cobrado", "Estado Comanda"];
        const filas = database.ventas.map(v => [v.codigo, v.fecha, v.total.toFixed(2), v.estado]);
        exportarExcelCSV(cabeceras, filas, "Historial_Ventas");
    });

    // Inicializar vistas
    generarReporteRentabilidad();
});

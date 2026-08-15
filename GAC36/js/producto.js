let platilloActual = null;
let recetaTemporal = []; // Almacena los insumos de la receta en pantalla

document.addEventListener("DOMContentLoaded", () => {
    configurarTabs();
    obtenerParametrosYPlatillo();
    
    // Eventos para la gestión de insumos dentro de la receta
    document.getElementById("btn-agregar-insumo-receta").addEventListener("click", agregarInsumoAReceta);
    document.getElementById("form-platillo-detalle").addEventListener("submit", guardarCambiosPlatillo);
});

// Cambiar entre Pestaña Información General y Receta
function configurarTabs() {
    const buttons = document.querySelectorAll(".tab-button");
    buttons.forEach(button => {
        button.addEventListener("click", () => {
            buttons.forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
            
            button.classList.add("active");
            document.getElementById(button.dataset.tab).classList.add("active");
        });
    });
}

// Obtener el ID del platillo desde la URL (?id=PLA-000001)
function obtenerParametrosYPlatillo() {
    const urlParams = new URLSearchParams(window.location.search);
    const idPlatillo = urlParams.get('id');
    
    let db = cargarDatabase();
    
    // Si no hay ID, simularemos un platillo de prueba para asegurar que el archivo es funcional
    if (!idPlatillo) {
        if (db.platillos.length === 0) {
            // Crear platillo de muestra si la base de datos está vacía
            db.platillos.push({
                codigo: "PLA-000001",
                nombre: "Lomo Saltado",
                precioVenta: 35.00,
                estado: "Activo"
            });
            guardarDatabase(db);
        }
        platilloActual = db.platillos[0];
    } else {
        platilloActual = db.platillos.find(p => p.codigo === idPlatillo);
    }
    
    if (platilloActual) {
        // Cargar receta del platillo desde el nodo raíz o inicializarla vacía
        recetaTemporal = db.recetas.filter(r => r.platilloCodigo === platilloActual.codigo);
        llenarCamposFormulario();
        cargarComboInsumosDisponibles();
        calcularCostoProduccion();
        renderizarTablaReceta();
    }
}

function llenarCamposFormulario() {
    document.getElementById("txt-codigo").value = platilloActual.codigo;
    document.getElementById("txt-nombre").value = platilloActual.nombre;
    document.getElementById("txt-precio").value = parseFloat(platilloActual.precioVenta).toFixed(2);
    document.getElementById("txt-estado").value = platilloActual.estado || "Activo";
}

function cargarComboInsumosDisponibles() {
    const db = cargarDatabase();
    const select = document.getElementById("receta-insumo-select");
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Seleccione Insumo --</option>';
    
    db.insumos.forEach(insumo => {
        const option = document.createElement("option");
        option.value = insumo.codigo;
        option.textContent = `${insumo.nombre} (${insumo.unidad})`;
        select.appendChild(option);
    });
}

// CÁLCULO EN CASCADA AUTOMÁTICO USANDO EL COSTO PROMEDIO DEL INVENTARIO
function calcularCostoProduccion() {
    const db = cargarDatabase();
    let costoTotalProduccion = 0;
    
    recetaTemporal.forEach(item => {
        const insumoInventario = db.insumos.find(i => i.codigo === item.insumoCodigo);
        // Usar costo promedio actual. Si no existe, es 0.
        const costoPromedioUnitario = insumoInventario && insumoInventario.costoPromedio ? insumoInventario.costoPromedio : 0;
        
        costoTotalProduccion += item.cantidad * costoPromedioUnitario;
    });
    
    document.getElementById("lbl-costo-produccion").textContent = costoTotalProduccion.toFixed(2);
}

function agregarInsumoAReceta() {
    const select = document.getElementById("receta-insumo-select");
    const cantidadInput = document.getElementById("receta-cantidad");
    
    const insumoCodigo = select.value;
    const cantidad = parseFloat(cantidadInput.value) || 0;
    
    if (!insumoCodigo) return alert("Por favor seleccione un insumo válido.");
    if (cantidad <= 0) return alert("La cantidad debe ser mayor a 0.");
    
    // Validar si el insumo ya está agregado en la receta
    if (recetaTemporal.some(r => r.insumoCodigo === insumoCodigo)) {
        return alert("Este insumo ya forma parte de la receta. Elimínelo si desea cambiar la cantidad.");
    }
    
    const db = cargarDatabase();
    const insumo = db.insumos.find(i => i.codigo === insumoCodigo);
    
    const nuevoItemReceta = {
        platilloCodigo: platilloActual.codigo,
        insumoCodigo: insumo.codigo,
        nombreInsumo: insumo.nombre, // Referencial para renderizar fácil
        unidadInsumo: insumo.unidad,
        cantidad: cantidad
    };
    
    recetaTemporal.push(nuevoItemReceta);
    
    // Recalcular y refrescar la UI
    calcularCostoProduccion();
    renderizarTablaReceta();
    
    // Limpiar campos de inserción
    select.value = "";
    cantidadInput.value = "";
}

function renderizarTablaReceta() {
    const tbody = document.getElementById("tbody-receta-insumos");
    tbody.innerHTML = "";
    
    if (recetaTemporal.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="no-data">Este platillo aún no cuenta con ingredientes en su receta.</td></tr>`;
        return;
    }
    
    const db = cargarDatabase();
    
    recetaTemporal.forEach((item, index) => {
        const insumoInventario = db.insumos.find(i => i.codigo === item.insumoCodigo);
        const costoPromedioUnitario = insumoInventario && insumoInventario.costoPromedio ? insumoInventario.costoPromedio : 0;
        const costoSubtotal = item.cantidad * costoPromedioUnitario;
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${item.nombreInsumo || 'Insumo'}</td>
            <td class="text-right">${item.cantidad.toFixed(3)} ${item.unidadInsumo}</td>
            <td class="text-right">S/. ${costoPromedioUnitario.toFixed(4)}</td>
            <td class="text-right">S/. ${costoSubtotal.toFixed(2)}</td>
            <td>
                <button type="button" onclick="eliminarInsumoDeReceta(${index})" style="color:#e74c3c; background:none; border:none; cursor:pointer; font-weight:bold;">Quitar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function eliminarInsumoDeReceta(index) {
    recetaTemporal.splice(index, 1);
    calcularCostoProduccion();
    renderizarTablaReceta();
}

function guardarCambiosPlatillo(e) {
    e.preventDefault();
    
    let db = cargarDatabase();
    
    // 1. Actualizar los datos maestros del Platillo
    let indexPlatillo = db.platillos.findIndex(p => p.codigo === platilloActual.codigo);
    if(indexPlatillo !== -1) {
        db.platillos[indexPlatillo].nombre = document.getElementById("txt-nombre").value.trim();
        db.platillos[indexPlatillo].precioVenta = parseFloat(document.getElementById("txt-precio").value) || 0;
        db.platillos[indexPlatillo].estado = document.getElementById("txt-estado").value;
    }
    
    // 2. Persistir los cambios de la Receta (Sustituir las recetas previas de este platillo)
    // Limpiar registros viejos del platillo en el array global de recetas
    db.recetas = db.recetas.filter(r => r.platilloCodigo !== platilloActual.codigo);
    
    // Insertar la configuración de recetas actualizadas
    db.recetas.push(...recetaTemporal);
    
    // Guardar cambios totales en LocalStorage
    guardarDatabase(db);
    
    alert("Platillo y estructura de receta guardados correctamente.");
    // Redirigir al catálogo de ventas/platillos
    window.location.href = "catalogo-ventas.html";
}

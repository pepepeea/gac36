// js/database.js

let database = {
    correlativos: {
        insumos: 0,
        platillos: 0,
        compras: 0,
        ventas: 0,
        movimientos: 0
    },
    insumos: [],
    platillos: [],
    recetas: [], // Relación: { platilloId, insumoId, cantidad }
    compras: [],
    ventas: [],
    movimientos: [],
    configuracion: {}
};

function guardarDatabase() {
    localStorage.setItem('GastroControl360_DB', JSON.stringify(database));
}

function cargarDatabase() {
    const data = localStorage.getItem('GastroControl360_DB');
    if (data) {
        database = JSON.parse(data);
    } else {
        guardarDatabase(); // Inicializa vacío si no existe
    }
}

// Generadores de Correlativos Automáticos
function generarCorrelativo(tipo, prefijo) {
    database.correlativos[tipo]++;
    const numero = String(database.correlativos[tipo]).padStart(6, '0');
    guardarDatabase();
    return `${prefijo}-${numero}`;
}

// LÓGICA AUTOMÁTICA DE INVENTARIO Y COSTOS (El motor del sistema)
function registrarMovimientoAutomatico(tipoMovimiento, referenciaId, insumoId, cantidad, costoTotal, descripcion) {
    const nuevoCodigo = generarCorrelativo('movimientos', 'MOV');
    
    const movimiento = {
        codigo: nuevoCodigo,
        tipo: tipoMovimiento, // 'Stock Inicial', 'Compra', 'Venta', 'Ajuste'
        referenciaId: referenciaId,
        insumoId: insumoId,
        cantidad: cantidad,
        costoTotal: costoTotal,
        descripcion: descripcion,
        fecha: new Date().toISOString().split('T')[0]
    };
    
    database.movimientos.push(movimiento);
    actualizarInventarioYCostos(insumoId);
    guardarDatabase();
}

function actualizarInventarioYCostos(insumoId) {
    const insumo = database.insumos.find(i => i.codigo === insumoId);
    if (!insumo) return;

    // Filtrar todos los movimientos históricos de este insumo para recalcular desde cero (Evita errores de arrastre)
    const filtrados = database.movimientos.filter(m => m.insumoId === insumoId);
    
    let stockActual = 0;
    let costoPromedioActual = 0;
    let inversionTotal = 0;

    filtrados.forEach(mov => {
        if (mov.tipo === 'Stock Inicial' || mov.tipo === 'Compra' || (mov.tipo === 'Ajuste' && mov.cantidad > 0)) {
            // Entradas: Aumentan stock e influyen en el costo promedio
            let stockAnterior = stockActual;
            stockActual += mov.cantidad;
            
            if (stockActual > 0) {
                // Fórmula de Costo Promedio ponderado
                inversionTotal += mov.costoTotal;
                costoPromedioActual = inversionTotal / stockActual;
            }
        } else if (mov.tipo === 'Venta' || (mov.tipo === 'Ajuste' && mov.cantidad < 0)) {
            // Salidas: Disminuyen stock, mantienen el costo promedio actual de la capa
            stockActual -= Math.abs(mov.cantidad);
            inversionTotal = stockActual * costoPromedioActual;
        }
    });

    insumo.stock = stockActual;
    insumo.costoPromedio = stockActual > 0 ? costoPromedioActual : 0;
}

// Cargar la base de datos inmediatamente al importar el archivo
cargarDatabase();

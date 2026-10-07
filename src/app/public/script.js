// Enum para los tipos de celdas en el laberinto
const TipoCelda = Object.freeze({
  VACIO: 'VACIO',
  PARED: 'PARED',
  CARNET: 'CARNET',
  LLAVE: 'LLAVE',
  PUERTA: 'PUERTA',
  META: 'META'
});

// Función para crear una matriz reactiva que detecta modificaciones (incluso desde la consola de Inspeccionar)
function crearMapaReactivo(matriz) {
  const handlerFila = {
    set(target, prop, value) {
      // Normalizar strings a mayúsculas si coinciden con las claves de TipoCelda
      if (typeof value === 'string') {
        const mayus = value.toUpperCase();
        if (TipoCelda[mayus]) {
          value = TipoCelda[mayus];
        }
      }
      target[prop] = value;
      // Re-renderizar automáticamente la vista del tablero
      if (typeof renderTablero === 'function') {
        renderTablero();
      }
      return true;
    }
  };

  const filasConProxy = matriz.map(fila => new Proxy(fila, handlerFila));

  const handlerMatriz = {
    set(target, prop, value) {
      if (Array.isArray(value)) {
        target[prop] = new Proxy(value, handlerFila);
      } else {
        target[prop] = value;
      }
      if (typeof renderTablero === 'function') {
        renderTablero();
      }
      return true;
    }
  };

  return new Proxy(filasConProxy, handlerMatriz);
}

// Función para crear un objeto de estado reactivo
function crearEstadoReactivo(estadoInicial) {
  return new Proxy(estadoInicial, {
    set(target, prop, value) {
      target[prop] = value;
      if (typeof renderTablero === 'function') {
        renderTablero();
      }
      return true;
    }
  });
}

// Definición reactiva del mundo (6x6) utilizando el enum TipoCelda
let MAPA_BASE = crearMapaReactivo([
  [TipoCelda.VACIO, TipoCelda.VACIO, TipoCelda.PARED, TipoCelda.VACIO, TipoCelda.PARED, TipoCelda.META],
  [TipoCelda.VACIO, TipoCelda.VACIO, TipoCelda.PARED, TipoCelda.VACIO, TipoCelda.PUERTA, TipoCelda.VACIO],
  [TipoCelda.VACIO, TipoCelda.VACIO, TipoCelda.PARED, TipoCelda.VACIO, TipoCelda.PARED, TipoCelda.PARED],
  [TipoCelda.VACIO, TipoCelda.VACIO, TipoCelda.VACIO, TipoCelda.VACIO, TipoCelda.PARED, TipoCelda.VACIO],
  [TipoCelda.PARED, TipoCelda.PARED, TipoCelda.VACIO, TipoCelda.PARED, TipoCelda.PARED, TipoCelda.CARNET],
  [TipoCelda.LLAVE, TipoCelda.VACIO, TipoCelda.VACIO, TipoCelda.VACIO, TipoCelda.VACIO, TipoCelda.VACIO]
]);

const ORIENTACIONES = ['NORTE', 'ESTE', 'SUR', 'OESTE'];
const ICONOS_ROBOT = { NORTE: '🤖⬆️', ESTE: '🤖➡️', SUR: '🤖⬇️', OESTE: '🤖⬅️' };
const ICONOS_COMANDO = {
  AVANZAR: '⬆️',
  GIRAR_IZQ: '↺',
  GIRAR_DER: '↻',
  RECOGER: '🪪',
  RECOGER_LLAVE: '🔑',
  ABRIR_PUERTA: '🚪'
};

// Estado inicial reactivo
let estado = crearEstadoReactivo({
  x: 0,
  y: 0,
  orientacionIndex: 1, // Comienza mirando al ESTE
  tieneCarnet: false,
  tieneLlave: false,
  puertaAbierta: false,
  enEjecucion: false
});

let programa = [];
let pasoActualIndex = 0;
let ejecucionInterval = null;
let errorStepIndex = null;
let draggedIndex = null;

// Elementos del DOM
const gridElement = document.getElementById('grid-tablero');
const listaElement = document.getElementById('lista-instrucciones');
const valOrientacion = document.getElementById('val-orientacion');
const valCarnet = document.getElementById('val-carnet');
const valLlave = document.getElementById('val-llave');
const valPasoActual = document.getElementById('val-paso-actual');
const feedbackText = document.getElementById('feedback-text');
const feedbackIcon = document.getElementById('feedback-icon');
const feedbackPanel = document.getElementById('feedback-panel');

function renderTablero() {
  if (!gridElement) return;
  gridElement.innerHTML = '';
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      const tipo = MAPA_BASE[r][c];

      if (r === estado.y && c === estado.x) {
        cell.classList.add('robot');
        cell.textContent = ICONOS_ROBOT[ORIENTACIONES[estado.orientacionIndex]];
      } else if (tipo === TipoCelda.PARED) {
        cell.classList.add('wall');
        cell.textContent = '🧱';
      } else if (tipo === TipoCelda.CARNET) {
        if (!estado.tieneCarnet) cell.classList.add('item-carnet');
        cell.textContent = estado.tieneCarnet ? '' : '🪪';
      } else if (tipo === TipoCelda.LLAVE) {
        if (!estado.tieneLlave) cell.classList.add('item-llave');
        cell.textContent = estado.tieneLlave ? '' : '🔑';
      } else if (tipo === TipoCelda.PUERTA) {
        cell.classList.add('door');
        if (estado.puertaAbierta) {
          cell.classList.add('open');
          cell.textContent = '🔓';
        } else {
          cell.textContent = '🚪';
        }
      } else if (tipo === TipoCelda.META) {
        cell.classList.add('goal');
        cell.textContent = '🎯';
      }
      gridElement.appendChild(cell);
    }
  }

  if (valOrientacion) valOrientacion.textContent = ORIENTACIONES[estado.orientacionIndex];
  if (valCarnet) {
    valCarnet.textContent = estado.tieneCarnet ? 'Sí' : 'No';
    valCarnet.className = `status-badge ${estado.tieneCarnet}`;
  }
  if (valLlave) {
    valLlave.textContent = estado.tieneLlave ? 'Sí' : 'No';
    valLlave.className = `status-badge ${estado.tieneLlave}`;
  }
  if (valPasoActual) valPasoActual.textContent = `${pasoActualIndex} / ${programa.length}`;
}

function setFeedback(tipo, mensaje) {
  if (!feedbackPanel) return;
  feedbackPanel.className = `feedback-panel ${tipo}`;
  feedbackIcon.textContent = tipo === 'error' ? '❌' : (tipo === 'success' ? '🎉' : '💡');
  feedbackText.textContent = mensaje;
}

function agregarComando(tipo) {
  if (estado.enEjecucion) return;
  errorStepIndex = null;
  programa.push(tipo);
  actualizarListaUI();

  // Desplazar la lista al final para mostrar la instrucción agregada
  requestAnimationFrame(() => {
    listaElement.scrollTop = listaElement.scrollHeight;
  });
}

function limpiarPrograma() {
  if (estado.enEjecucion) return;
  programa = [];
  pasoActualIndex = 0;
  errorStepIndex = null;
  actualizarListaUI();
  reiniciarSimulacion();
}

function moverComando(index, direccion) {
  if (estado.enEjecucion) return;
  const nuevoIndex = index + direccion;
  if (nuevoIndex < 0 || nuevoIndex >= programa.length) return;

  const temp = programa[index];
  programa[index] = programa[nuevoIndex];
  programa[nuevoIndex] = temp;

  errorStepIndex = null;
  if (pasoActualIndex > 0) {
    reiniciarSimulacion();
  } else {
    actualizarListaUI();
  }
}

function eliminarComando(index) {
  if (estado.enEjecucion) return;
  if (index < 0 || index >= programa.length) return;

  programa.splice(index, 1);

  errorStepIndex = null;
  if (pasoActualIndex > 0) {
    reiniciarSimulacion();
  } else {
    actualizarListaUI();
  }
}

function reordenarComando(desdeIndex, hastaIndex) {
  if (estado.enEjecucion) return;
  if (desdeIndex < 0 || desdeIndex >= programa.length) return;
  if (hastaIndex < 0 || hastaIndex >= programa.length) return;
  if (desdeIndex === hastaIndex) return;

  const [elemento] = programa.splice(desdeIndex, 1);
  programa.splice(hastaIndex, 0, elemento);

  errorStepIndex = null;
  if (pasoActualIndex > 0) {
    reiniciarSimulacion();
  } else {
    actualizarListaUI();
  }
}

function actualizarListaUI() {
  if (!listaElement) return;
  listaElement.innerHTML = '';

  if (programa.length === 0) {
    const emptyLi = document.createElement('li');
    emptyLi.className = 'instruction-empty';
    emptyLi.textContent = 'Sin instrucciones añadidas. Selecciona los comandos superiores para armar el programa.';
    listaElement.appendChild(emptyLi);
    if (valPasoActual) valPasoActual.textContent = `0 / 0`;
    return;
  }

  programa.forEach((cmd, idx) => {
    const li = document.createElement('li');
    li.className = 'instruction-item';

    if (idx === errorStepIndex) {
      li.classList.add('error');
    } else if (idx === pasoActualIndex - 1) {
      li.classList.add('activo');
      // Asegurar que el paso en ejecución sea visible con scroll
      requestAnimationFrame(() => {
        li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    }

    // Soporte para Drag & Drop (reordenar arrastrando)
    li.draggable = !estado.enEjecucion;
    li.addEventListener('dragstart', (e) => {
      if (estado.enEjecucion) {
        e.preventDefault();
        return;
      }
      draggedIndex = idx;
      e.dataTransfer.effectAllowed = 'move';
      li.classList.add('dragging');
    });

    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      li.classList.add('drag-over');
    });

    li.addEventListener('dragleave', () => {
      li.classList.remove('drag-over');
    });

    li.addEventListener('drop', (e) => {
      e.preventDefault();
      li.classList.remove('drag-over');
      if (draggedIndex !== null && draggedIndex !== idx) {
        reordenarComando(draggedIndex, idx);
      }
    });

    li.addEventListener('dragend', () => {
      li.classList.remove('dragging');
      draggedIndex = null;
    });

    // Contenido del paso: número, icono y nombre del comando
    const contentDiv = document.createElement('div');
    contentDiv.className = 'instruction-content';

    const numSpan = document.createElement('span');
    numSpan.className = 'step-number';
    numSpan.textContent = `${idx + 1}.`;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'step-icon';
    iconSpan.textContent = ICONOS_COMANDO[cmd] || '🔹';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'step-name';
    nameSpan.textContent = cmd.replace(/_/g, ' ');

    contentDiv.appendChild(numSpan);
    contentDiv.appendChild(iconSpan);
    contentDiv.appendChild(nameSpan);

    // Acciones del paso: Subir (▲), Bajar (▼), Eliminar (✕)
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'instruction-actions';

    const btnUp = document.createElement('button');
    btnUp.type = 'button';
    btnUp.className = 'btn-step-action';
    btnUp.title = 'Subir instrucción en la secuencia';
    btnUp.setAttribute('aria-label', `Subir instrucción ${idx + 1}`);
    btnUp.innerHTML = '▲';
    btnUp.disabled = estado.enEjecucion || idx === 0;
    btnUp.onclick = (e) => {
      e.stopPropagation();
      moverComando(idx, -1);
    };

    const btnDown = document.createElement('button');
    btnDown.type = 'button';
    btnDown.className = 'btn-step-action';
    btnDown.title = 'Bajar instrucción en la secuencia';
    btnDown.setAttribute('aria-label', `Bajar instrucción ${idx + 1}`);
    btnDown.innerHTML = '▼';
    btnDown.disabled = estado.enEjecucion || idx === programa.length - 1;
    btnDown.onclick = (e) => {
      e.stopPropagation();
      moverComando(idx, 1);
    };

    const btnDelete = document.createElement('button');
    btnDelete.type = 'button';
    btnDelete.className = 'btn-step-action btn-delete';
    btnDelete.title = 'Eliminar instrucción';
    btnDelete.setAttribute('aria-label', `Eliminar instrucción ${idx + 1}`);
    btnDelete.innerHTML = '✕';
    btnDelete.disabled = estado.enEjecucion;
    btnDelete.onclick = (e) => {
      e.stopPropagation();
      eliminarComando(idx);
    };

    actionsDiv.appendChild(btnUp);
    actionsDiv.appendChild(btnDown);
    actionsDiv.appendChild(btnDelete);

    li.appendChild(contentDiv);
    li.appendChild(actionsDiv);
    listaElement.appendChild(li);
  });

  if (valPasoActual) valPasoActual.textContent = `${pasoActualIndex} / ${programa.length}`;
}

function reiniciarSimulacion() {
  clearInterval(ejecucionInterval);
  estado.x = 0;
  estado.y = 0;
  estado.orientacionIndex = 1;
  estado.tieneCarnet = false;
  estado.tieneLlave = false;
  estado.puertaAbierta = false;
  estado.enEjecucion = false;

  pasoActualIndex = 0;
  errorStepIndex = null;
  setFeedback('info', 'Tablero reiniciado. Listo para probar la lógica.');
  renderTablero();
  actualizarListaUI();
}

function ejecutarSiguientePaso() {
  if (pasoActualIndex >= programa.length) {
    verificarVictoria();
    return false;
  }

  const comando = programa[pasoActualIndex];
  pasoActualIndex++;
  actualizarListaUI();

  switch (comando) {
    case 'GIRAR_IZQ':
      estado.orientacionIndex = (estado.orientacionIndex + 3) % 4;
      break;
    case 'GIRAR_DER':
      estado.orientacionIndex = (estado.orientacionIndex + 1) % 4;
      break;
    case 'AVANZAR':
      let nextX = estado.x;
      let nextY = estado.y;
      const orientacion = ORIENTACIONES[estado.orientacionIndex];
      
      if (orientacion === 'NORTE') nextY--;
      if (orientacion === 'SUR') nextY++;
      if (orientacion === 'ESTE') nextX++;
      if (orientacion === 'OESTE') nextX--;

      // Validaciones de colisión
      if (nextX < 0 || nextX >= 6 || nextY < 0 || nextY >= 6) {
        marcarFallo('El robot intentó salir de los límites del campus.');
        return false;
      }
      if (MAPA_BASE[nextY][nextX] === TipoCelda.PARED) {
        marcarFallo('¡Colisión! El robot chocó contra una pared. Faltó verificar el camino.');
        return false;
      }
      if (MAPA_BASE[nextY][nextX] === TipoCelda.PUERTA && !estado.puertaAbierta) {
        marcarFallo('La puerta de seguridad está bloqueada. Debes abrirla antes de pasar.');
        return false;
      }

      estado.x = nextX;
      estado.y = nextY;
      break;
    case 'RECOGER':
      if (MAPA_BASE[estado.y][estado.x] === TipoCelda.CARNET) {
        if (estado.tieneCarnet) {
          marcarFallo('El carnet ya ha sido recogido.');
          return false;
        }
        estado.tieneCarnet = true;
        setFeedback('info', 'Carnet recogido con éxito.');
      } else if (MAPA_BASE[estado.y][estado.x] === TipoCelda.LLAVE) {
        if (estado.tieneLlave) {
          marcarFallo('La llave ya ha sido recogida.');
          return false;
        }
        estado.tieneLlave = true;
        setFeedback('info', 'Llave recogida con éxito.');
      } else {
        marcarFallo('Instrucción inválida: En esta casilla no hay ningún objeto para recoger.');
        return false;
      }
      break;
    case 'RECOGER_LLAVE':
      if (MAPA_BASE[estado.y][estado.x] === TipoCelda.LLAVE) {
        if (estado.tieneLlave) {
          marcarFallo('La llave ya ha sido recogida.');
          return false;
        }
        estado.tieneLlave = true;
        setFeedback('info', 'Llave recogida con éxito.');
      } else {
        marcarFallo('Instrucción inválida: En esta casilla no hay ninguna llave.');
        return false;
      }
      break;
    case 'ABRIR_PUERTA':
      // Verifica si está frente a la puerta
      let frontX = estado.x + (ORIENTACIONES[estado.orientacionIndex] === 'ESTE' ? 1 : ORIENTACIONES[estado.orientacionIndex] === 'OESTE' ? -1 : 0);
      let frontY = estado.y + (ORIENTACIONES[estado.orientacionIndex] === 'SUR' ? 1 : ORIENTACIONES[estado.orientacionIndex] === 'NORTE' ? -1 : 0);
      
      if (frontX >= 0 && frontX < 6 && frontY >= 0 && frontY < 6 && MAPA_BASE[frontY][frontX] === TipoCelda.PUERTA) {
        if (!estado.tieneCarnet && !estado.tieneLlave) {
          marcarFallo('Error de validación: Se requiere el carnet y la llave para abrir la puerta.');
          return false;
        }
        if (!estado.tieneCarnet) {
          marcarFallo('Error de validación: Se requiere carnet para desbloquear la puerta.');
          return false;
        }
        if (!estado.tieneLlave) {
          marcarFallo('Error de validación: Se requiere la llave para abrir la puerta.');
          return false;
        }
        estado.puertaAbierta = true;
        setFeedback('info', 'Acceso concedido: La puerta ha sido desbloqueada con el carnet y la llave.');
      } else {
        marcarFallo('No hay ninguna puerta directamente frente al robot.');
        return false;
      }
      break;
  }

  renderTablero();

  if (pasoActualIndex >= programa.length) {
    verificarVictoria();
    return false;
  }
  return true;
}

function marcarFallo(mensaje) {
  clearInterval(ejecucionInterval);
  estado.enEjecucion = false;
  errorStepIndex = pasoActualIndex - 1;
  setFeedback('error', mensaje);
  actualizarListaUI();
}

function verificarVictoria() {
  estado.enEjecucion = false;
  if (MAPA_BASE[estado.y][estado.x] === TipoCelda.META) {
    setFeedback('success', '¡Objetivo cumplido! La solicitud llegó al laboratorio de forma exitosa.');
  } else {
    setFeedback('info', 'El programa finalizó, pero el robot no llegó a la meta.');
  }
  actualizarListaUI();
}

function ejecutarPrograma() {
  if (estado.enEjecucion || programa.length === 0) return;
  reiniciarSimulacion();
  estado.enEjecucion = true;
  actualizarListaUI();
  ejecucionInterval = setInterval(() => {
    const continuar = ejecutarSiguientePaso();
    if (!continuar) {
      clearInterval(ejecucionInterval);
      estado.enEjecucion = false;
      actualizarListaUI();
    }
  }, 600);
}

// Exponer en window para habilitar manipulación interactiva desde la consola de Inspeccionar
window.MAPA_BASE = MAPA_BASE;
window.TipoCelda = TipoCelda;
window.estado = estado;
window.renderTablero = renderTablero;
window.reiniciarSimulacion = reiniciarSimulacion;
window.agregarComando = agregarComando;
window.ejecutarPrograma = ejecutarPrograma;
window.ejecutarSiguientePaso = ejecutarSiguientePaso;
window.limpiarPrograma = limpiarPrograma;
window.moverComando = moverComando;
window.eliminarComando = eliminarComando;

// Render inicial
renderTablero();
actualizarListaUI();
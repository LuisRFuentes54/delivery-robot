// Enum para los tipos de celdas en el laberinto
const TipoCelda = Object.freeze({
  VACIO: 'VACIO',
  PARED: 'PARED',
  CARNET: 'CARNET',
  LLAVE: 'LLAVE',
  PUERTA: 'PUERTA',
  META: 'META'
});

// Definición del mundo (6x6) utilizando el enum TipoCelda
const MAPA_BASE = [
  [TipoCelda.VACIO, TipoCelda.VACIO, TipoCelda.PARED, TipoCelda.VACIO, TipoCelda.PARED, TipoCelda.META],
  [TipoCelda.VACIO, TipoCelda.VACIO, TipoCelda.PARED, TipoCelda.VACIO, TipoCelda.PUERTA, TipoCelda.VACIO],
  [TipoCelda.VACIO, TipoCelda.VACIO, TipoCelda.PARED, TipoCelda.VACIO, TipoCelda.PARED, TipoCelda.PARED],
  [TipoCelda.VACIO, TipoCelda.VACIO, TipoCelda.VACIO, TipoCelda.VACIO, TipoCelda.PARED, TipoCelda.VACIO],
  [TipoCelda.PARED, TipoCelda.PARED, TipoCelda.VACIO, TipoCelda.PARED, TipoCelda.PARED, TipoCelda.CARNET],
  [TipoCelda.LLAVE, TipoCelda.VACIO, TipoCelda.VACIO, TipoCelda.VACIO, TipoCelda.VACIO, TipoCelda.VACIO]
];

const ORIENTACIONES = ['NORTE', 'ESTE', 'SUR', 'OESTE'];
const ICONOS_ROBOT = { NORTE: '🤖⬆️', ESTE: '🤖➡️', SUR: '🤖⬇️', OESTE: '🤖⬅️' };

// Estado inicial
let estado = {
  x: 0,
  y: 0,
  orientacionIndex: 1, // Comienza mirando al ESTE
  tieneCarnet: false,
  tieneLlave: false,
  puertaAbierta: false,
  enEjecucion: false
};

let programa = [];
let pasoActualIndex = 0;
let ejecucionInterval = null;

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
        cell.textContent = estado.tieneCarnet ? '' : '🪪';
      } else if (tipo === TipoCelda.LLAVE) {
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
        cell.textContent = '🎯';
      }
      gridElement.appendChild(cell);
    }
  }

  valOrientacion.textContent = ORIENTACIONES[estado.orientacionIndex];
  valCarnet.textContent = estado.tieneCarnet ? 'Sí' : 'No';
  valCarnet.className = `status-badge ${estado.tieneCarnet}`;
  if (valLlave) {
    valLlave.textContent = estado.tieneLlave ? 'Sí' : 'No';
    valLlave.className = `status-badge ${estado.tieneLlave}`;
  }
  valPasoActual.textContent = `${pasoActualIndex} / ${programa.length}`;
}

function setFeedback(tipo, mensaje) {
  feedbackPanel.className = `feedback-panel ${tipo}`;
  feedbackIcon.textContent = tipo === 'error' ? '❌' : (tipo === 'success' ? '🎉' : '💡');
  feedbackText.textContent = mensaje;
}

function agregarComando(tipo) {
  if (estado.enEjecucion) return;
  programa.push(tipo);
  actualizarListaUI();
}

function limpiarPrograma() {
  if (estado.enEjecucion) return;
  programa = [];
  pasoActualIndex = 0;
  actualizarListaUI();
  reiniciarSimulacion();
}

function actualizarListaUI() {
  listaElement.innerHTML = '';
  programa.forEach((cmd, idx) => {
    const li = document.createElement('li');
    li.classList.add('instruction-item');
    if (idx === pasoActualIndex - 1) li.classList.add('activo');
    li.textContent = cmd.replace(/_/g, ' ');
    listaElement.appendChild(li);
  });
  valPasoActual.textContent = `${pasoActualIndex} / ${programa.length}`;
}

function reiniciarSimulacion() {
  clearInterval(ejecucionInterval);
  estado = {
    x: 0,
    y: 0,
    orientacionIndex: 1,
    tieneCarnet: false,
    tieneLlave: false,
    puertaAbierta: false,
    enEjecucion: false
  };
  pasoActualIndex = 0;
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
  setFeedback('error', mensaje);
  const items = listaElement.getElementsByTagName('li');
  if (items[pasoActualIndex - 1]) {
    items[pasoActualIndex - 1].classList.add('error');
  }
}

function verificarVictoria() {
  estado.enEjecucion = false;
  if (MAPA_BASE[estado.y][estado.x] === TipoCelda.META) {
    setFeedback('success', '¡Objetivo cumplido! La solicitud llegó al laboratorio de forma exitosa.');
  } else {
    setFeedback('info', 'El programa finalizó, pero el robot no llegó a la meta.');
  }
}

function ejecutarPrograma() {
  if (estado.enEjecucion || programa.length === 0) return;
  reiniciarSimulacion();
  estado.enEjecucion = true;
  ejecucionInterval = setInterval(() => {
    const continuar = ejecutarSiguientePaso();
    if (!continuar) {
      clearInterval(ejecucionInterval);
      estado.enEjecucion = false;
    }
  }, 600);
}

// Render inicial
renderTablero();
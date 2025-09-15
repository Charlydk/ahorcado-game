// 🎨 Render y elementos de la interfaz

/**
 * Oculta una sección con una animación de desvanecimiento y subida.
 * @param {HTMLElement} section El elemento de la sección a ocultar.
 * @param {Function} [onComplete] Función a ejecutar una vez que la animación termina.
 */

// --- Elementos HTML de la interfaz (Selección de Modo, Ingreso de Palabra VS, Área de Juego) ---
const seccionBienvenida = document.getElementById("seccionBienvenida");
const seccionModosJuego = document.getElementById("seccionModosJuego");
const seccionIngresarPalabra = document.getElementById("seccionIngresarPalabra");
const seccionJuego = document.getElementById("seccionJuego");

// --- Botones de la Pantalla de Inicio y Selección de Modo ---
const botonInicio = document.getElementById("botonInicio");
const botonSolitario = document.getElementById("botonSolitario");
const botonVersus = document.getElementById("botonVersus");
const botonOnline = document.getElementById("botonOnline");

// --- Elementos de la Sección de Ingreso de Palabra en Modo VS ---
const inputPalabraVersus = document.getElementById("inputPalabraVersus");
const botonEnviarPalabra = document.getElementById("botonEnviarPalabra");
const botonCancelarVersus = document.getElementById("botonCancelarVersus");
const txtIngresarPalabraVersus = document.getElementById("mensajeIngresarPalabraVersus");

// --- Elementos de la Sección Principal del Juego ---
const imagenAhorcado = document.getElementById("imagenAhorcado");
const mensajeJuego = document.getElementById("mensajeJuego");
const inputGuiones = document.getElementById("palabra-guiones");
const inputLetrasOut = document.getElementById("letrasIncorrectasValor");
const inputIngresaLetra = document.getElementById("inputAdivinarLetra");
const botonSubirLetra = document.getElementById("botonSubirLetra");
const botonReiniciar = document.getElementById("reiniciar");
const mensajeTurno = document.getElementById("mensajeTurno");
const letrasIncorrectasSpan = document.getElementById("letrasIncorrectasSpan");
const botonVolverAlMenu = document.getElementById("volverAlMenu");

// --- Elementos para la seccion Online ---
const seccionOnline = document.getElementById("seccionOnline");
const botonCrearPartida = document.getElementById("crearPartida");
const inputIdPartida = document.getElementById("inputIdPartida");
const botonUnirsePartida = document.getElementById("unirsePartida");
const mensajeIdPartida = document.getElementById("mensajeIdPartida");
const botonVolverModosOnline = document.getElementById("volverModosOnline");
const mensajeCarga = document.getElementById("mensajeCarga");
const contenedorGameId = document.getElementById("contenedorGameId");
const displayGameId = document.getElementById("displayGameId");
const botonCopiarId = document.getElementById("botonCopiarId");
const contenedorBotonJuegoOnline = document.getElementById("contenedorBotonJuegoOnline");

function esEscritorio() {
  return window.matchMedia("(pointer: fine)").matches;
}

// --- Variables de Estado del Frontend ---
let currentGameId = null; // Almacenará el ID de la partida activa
let currentMode = null;   // Almacenará el modo actual (solitario, versus, online)
let latestGameData = null; // Almacenará los últimos datos del juego recibidos
let finalizandoJuego = false; // Indica si el juego está en proceso de finalización (para evitar múltiples reinicios)
let juegoTerminadoManualmente = false; // Indica si el juego fue terminado manualmente por el usuario
let aliasJugadorActual = ""; // Almacena el alias del jugador actual



// --- Variables de conexion al backend ---
const CONFIG = {
  // URLs del Backend:
  // Para desarrollo local
  BACKEND_API_URL: "http://localhost:5195/api/",
  BACKEND_HUB_URL: "http://localhost:5195/gamehub",

  // Para producción
  PROD_BACKEND_API_URL: "https://ahorcado-backend.onrender.com/api/",
  PROD_BACKEND_HUB_URL: "https://ahorcado-backend.onrender.com/gamehub",
};

// 🚀 Inicialización y SignalR

// --- Variables y Funciones para Heartbeat ---
// Variable para almacenar el ID del intervalo del heartbeat
let heartbeatIntervalId;
const HEARTBEAT_INTERVAL_MS = 45000;

function startHeartbeat() {
  // Si ya hay un intervalo de heartbeat corriendo, lo limpiamos para evitar duplicados
  if (heartbeatIntervalId) {
    clearInterval(heartbeatIntervalId);
  }

  // Iniciamos un nuevo intervalo
  heartbeatIntervalId = setInterval(() => {
    // Solo enviamos el heartbeat si la conexión está en estado 'Connected'
    if (connection.state === signalR.HubConnectionState.Connected) {

      // Llamamos al método 'SendHeartbeat' en tu GameHub
      connection.invoke("SendHeartbeat")
        .catch(err => console.error("Error al enviar heartbeat:", err));
    } else {

    }
  }, HEARTBEAT_INTERVAL_MS);
}

// Función para detener el envío de heartbeats
function stopHeartbeat() {
  if (heartbeatIntervalId) {
    clearInterval(heartbeatIntervalId);
    heartbeatIntervalId = null; // Reiniciar la variable
  }
}

// inicializacion de ranking horizontal
mostrarRankingHorizontal();

// --- Funcionalidades de utilidad ---

function limpiarEstadoGlobalDeJuego() {
  currentGameId = null;
  currentMode = null;
  latestGameData = null;
  // Ocultar y limpiar mensajes al reiniciar el estado
  ocultarMensajeAlerta(mensajeJuego);
  ocultarMensajeAlerta(mensajeIdPartida);
  ocultarMensajeAlerta(mensajeTurno);
  ocultarMensajeAlerta(txtIngresarPalabraVersus);
  stopHeartbeat();
}


// --- Funciones de Utilidad para Mostrar Mensajes de UI ---

/**
 * Muestra un mensaje en un elemento HTML dado, aplicando estilos de alerta de Bootstrap.
 * @param {HTMLElement} elemento El elemento HTML (ej. mensajeJuego, mensajeIdPartida) donde se mostrará el mensaje.
 * @param {string} mensaje El texto del mensaje a mostrar.
 * @param {'success'|'danger'|'warning'|'info'|'primary'|'secondary'|'light'|'dark'|''} tipo La clase de alerta de Bootstrap (ej. 'success', 'danger', 'info'). Vacío para alerta por defecto.
 * @param {boolean} ocultarDespues Si es true, el mensaje se ocultará automáticamente después de 5 segundos (útil para feedback temporal).
 */
function mostrarMensajeAlerta(elemento, mensaje, tipo = 'info') {
  if (!elemento) {
    console.error("Error: Elemento de mensaje no encontrado para mostrar alerta.");
    return;
  }

  // Limpia todas las clases de alerta previas y d-none
  elemento.className = '';
  elemento.classList.add('alert');

 
  // Esto es un ajuste específico para el h3 de ingresar palabra.
  if (elemento.tagName.toLowerCase() === 'h3') {
    elemento.classList.add('mb-4', 'text-center'); // Clases que ya tiene en el HTML
  } else {
    elemento.classList.add('text-center'); // Por defecto, centramos si no es h3
  }

  if (tipo) {
    elemento.classList.add(`alert-${tipo}`);
  } else {
    // Si no se especifica tipo, usa 'secondary' o un color neutro que no sea de error/éxito
    elemento.classList.add('alert-secondary');
  }

  elemento.textContent = mensaje;
  elemento.classList.remove('d-none'); // Muestra el mensaje

}

/**
 * Oculta un elemento de mensaje y limpia su contenido y clases de alerta.
 * @param {HTMLElement} elemento El elemento HTML a ocultar.
 */
function ocultarMensajeAlerta(elemento) {
  if (elemento) {
    elemento.classList.add('d-none');
    elemento.textContent = '';
    elemento.className = ''; // Limpia todas las clases
    // Vuelve a añadir las clases necesarias si no es una alerta
    if (elemento.tagName.toLowerCase() === 'h3') {
      elemento.classList.add('mb-4', 'text-center'); // Clases que ya tiene en el HTML
    } else {
      elemento.classList.add('text-center'); // Mantiene solo el centrado si es p
    }
  }
}


// --- Funciones de Utilidad para Mostrar/Ocultar Secciones ---
function mostrarSeccion(seccion) {
  if (seccion) {
    // Primero, removemos d-none para asegurar que sea visible
    seccion.classList.remove("d-none");

    // Luego, añadimos la clase de display adecuada.
    if (seccion === seccionBienvenida || seccion === seccionModosJuego || seccion === seccionIngresarPalabra || seccion === seccionJuego || seccion === seccionOnline) {
      seccion.classList.add("d-flex"); // Tus secciones principales usan d-flex
    } else {
      // Para otros elementos que puedan ser "block" por defecto
      seccion.classList.add("d-block");
    }
  }
}

function ocultarSeccion(seccion) {
  if (seccion) {
    // Siempre añadimos d-none para ocultar
    seccion.classList.add("d-none");
    // Y removemos d-flex o d-block para limpiar
    seccion.classList.remove("d-flex", "d-block");
  }
}

function ocultarTodasLasSecciones() {
  // Aquí usamos los nuevos nombres de las constantes para las secciones principales
  const seccionesPrincipales = [
    seccionBienvenida, // Agregado
    seccionModosJuego,
    seccionIngresarPalabra,
    seccionJuego,
    seccionOnline,

  ];

  seccionesPrincipales.forEach(seccion => {
    // Asegúrate de que la sección exista antes de intentar ocultarla
    if (seccion) {
      ocultarSeccion(seccion);
    }
  });

  ocultarSeccion(inputIdPartida);
  ocultarSeccion(botonCrearPartida);
  ocultarSeccion(botonUnirsePartida);
  ocultarSeccion(botonVolverModosOnline);
  ocultarSeccion(mensajeIdPartida);

  let botonContinuar = document.getElementById("botonContinuarOnline");
  if (botonContinuar) ocultarSeccion(botonContinuar);
}


function restaurarSeccionOnlineUI() {
  ocultarTodasLasSecciones();

  // Asegurarse de limpiar la UI de juego antes de mostrar la sección online
  resetearUIJuego(); // Esto limpiará el ahorcado, guiones, etc.
  ocultarMensajeAlerta(mensajeJuego); // Y asegura que el mensaje de juego esté limpio

  mostrarSeccion(seccionOnline);

  // Usa la nueva función, con un mensaje por defecto de información
  mostrarMensajeAlerta(mensajeIdPartida, "Crea una partida o únete a una existente:", 'info');

  inputIdPartida.value = "";
  inputIdPartida.readOnly = false;
  inputIdPartida.disabled = false;
  mostrarSeccion(inputIdPartida);

  botonCrearPartida.disabled = false;
  mostrarSeccion(botonCrearPartida);
  botonUnirsePartida.disabled = false;
  mostrarSeccion(botonUnirsePartida);

  ocultarSeccion(contenedorGameId);
  const botonIrAlJuego = document.getElementById("botonIrAlJuegoOnline");
  if (botonIrAlJuego) ocultarSeccion(botonIrAlJuego);

  mostrarSeccion(botonVolverModosOnline);
}

function capturarAliasGlobal() {
  aliasJugadorActual = document.getElementById("aliasInput").value.trim();
  if (!aliasJugadorActual) {
    alert("Por favor ingresá tu alias para continuar.");
    throw new Error("Alias vacío");
  }
}

// --- Configuración de SignalR ---
const connection = new signalR.HubConnectionBuilder()
  .withUrl(CONFIG.PROD_BACKEND_HUB_URL,

    {
      transport: signalR.HttpTransportType.WebSockets,
      withCredentials: true
    })
  .withAutomaticReconnect({
    nextRetryDelayInMilliseconds: retryContext => {
      // Lógica de reintento
      if (retryContext.elapsedMilliseconds < 60000) { // Menos de 1 minuto
        if (retryContext.retryReason && retryContext.retryReason.message.includes("WebSocket closed with status code: 1006")) {
          console.warn("Reintento debido a cierre inesperado del WebSocket. Intentando de nuevo más rápido.");
          return 2000;
        }
        return [0, 2000, 10000, 30000][retryContext.previousRetryCount] || 5000;
      }
      return null; // Deja de reintentar después de cierto tiempo
    }
  })
  // Opcional: Aumentar el timeout del cliente si no recibe pings del servidor
  .withServerTimeout(45000) // Esperar 45 segundos antes de considerar el servidor desconectado
  .build();


// --- NUEVO: Manejar la desconexión del propio cliente ---
connection.onclose((error) => {
  if (!juegoTerminadoManualmente) {
    console.warn("SignalR se desconectó inesperadamente:", error);
    limpiarEstadoGlobalDeJuego();
    ocultarTodasLasSecciones();
    mostrarSeccion(seccionModosJuego);
  } else {
    console.log("Desconexión luego del final del juego: ignorada.");
  }
});


// Manejar la reconexión automática de SignalR ***
connection.onreconnected(async () => {
  if (currentGameId && alias) {
    try {
      await connection.invoke("ReingresarPartida", currentGameId, aliasJugadorActual);
      console.log("✅ Reconexión lógica completada. Estado solicitado desde el servidor.");
    } catch (err) {
      console.error("❌ Error al reingresar a la partida tras reconexión:", err);
      inicializarUI(); // fallback si no se pudo restaurar
    }
  } else {
    console.warn("⚠️ No hay alias o currentGameId definidos al reconectar.");
  }
});



// Escucha eventos del Hub de SignalR
connection.on("ReceiveGameUpdate", (data) => {
  latestGameData = data;
  if (data.JuegoTerminado) {
    juegoTerminadoManualmente = true;

  }
  // Solo actualiza la UI si la sección de juego está actualmente visible.
  if (seccionJuego.style.display !== 'none') {
    if (data.message?.includes("ha abandonado la partida")) {
      mostrarMensajeAlerta(
        mensajeJuego,
        `${data.message} Esta partida se cerrará automáticamente.`,
        'warning'
      );

      setTimeout(() => {
        inicializarUI();
        mostrarMensajeAlerta(mensajeJuego, "La partida fue cerrada.", 'secondary');
      }, 6000);
    } else {
      // ✅ Solo actualiza la UI si no es un mensaje de abandono
      actualizarUIJuego(data);
    }
  } else {
    console.log("ReceiveGameUpdate recibido, pero seccionJuego no está visible. La UI se actualizará cuando el jugador entre a la sección de juego.");
  }
});


// --- NUEVO: Manejar la desconexión del oponente ---
connection.on("OpponentDisconnected", (gameId) => {
  console.log(`Tu oponente se desconectó de la partida ${gameId}.`);

  if (currentGameId === gameId) {
    // Usa la función de alerta si estás en la sección de juego o sala online
    if (seccionJuego.classList.contains('d-flex') || seccionOnline.classList.contains('d-flex')) {
      mostrarMensajeAlerta(mensajeJuego, "¡Tu oponente se ha desconectado! La partida ha terminado.", 'danger');
    } else {
      // Si no está en ninguna de esas secciones, usa alert() como fallback
      alert("¡Tu oponente se ha desconectado! La partida ha terminado.");
    }

    if (!finalizandoJuego) {
      limpiarEstadoGlobalDeJuego();
      ocultarTodasLasSecciones();
      mostrarSeccion(seccionModosJuego);
    }
  }
});


// Cuando un segundo jugador se une a una partida online
connection.on("PlayerJoined", (gameId, playerConnectionId) => {
  if (gameId === currentGameId) {
    // En lugar de style.color, usa la función de alerta
    mostrarMensajeAlerta(mensajeJuego, "¡Otro jugador se ha unido! Comienza el juego.", 'success', true);

    if (currentMode === "online") {
      ocultarTodasLasSecciones();
      mostrarSeccion(seccionJuego);
      inputIngresaLetra.disabled = false;
      botonSubirLetra.disabled = false;
      mostrarSeccion(inputIngresaLetra);
      mostrarSeccion(botonSubirLetra);
      mensajeTurno.textContent = "Esperando que el juego inicie...";
      mostrarSeccion(mensajeTurno);
    }
  }
});

// Inicia la conexión SignalR
async function startSignalRConnection() {
  try {
    if (connection.state === signalR.HubConnectionState.Disconnected) {
      await connection.start();
      console.log("✅ Conexión SignalR establecida.");
      startHeartbeat();
    } else {
      console.warn("⚠️ SignalR ya estaba conectada o conectándose:", connection.state);
    }
  } catch (err) {
    console.error("Error al iniciar la conexión SignalR:", err);
    setTimeout(startSignalRConnection, 5000);
    stopHeartbeat();
  }
}


// --- Funciones de Lógica de Juego ---

function resetearUIJuego() {
  inputGuiones.textContent = " ";
  inputLetrasOut.textContent = "";

  //imagenAhorcado.src = `img/ahorcadito_${escena}.png`;
  ocultarMensajeAlerta(mensajeJuego);
  inputIngresaLetra.value = "";
  inputIngresaLetra.disabled = false;
  botonSubirLetra.disabled = false;
  mostrarSeccion(inputIngresaLetra);
  mostrarSeccion(botonSubirLetra);
  ocultarMensajeAlerta(mensajeTurno);
}

async function iniciarJuego(modo, palabraVersus = "") {
  try {
    finalizandoJuego = false;

    // 🔐 Captura de alias
    const alias1 = document.getElementById("aliasInput")?.value.trim() || "";
    const alias2 = document.getElementById("aliasInput2")?.value.trim() || "";

    if (modo === "solitario" && !alias1) {
      alert("Por favor, ingresá tu alias para comenzar.");
      return;
    }

    if (modo === "versus" && (!alias1 || !alias2)) {
      alert("Por favor, completá ambos alias para comenzar.");
      return;
    }


    const selectorDificultad = document.getElementById("selectorDificultad");
    const intentosIniciales = parseInt(selectorDificultad?.value || "6");
    // 🎯 Armar el payload dinámico
    const payload = {
      Modo: modo,
      Palabra: palabraVersus,
      AliasJugador1: alias1,
      AliasJugador2: modo === "versus" ? alias2 : null,
      IntentosPermitidos: intentosIniciales
    };

    const response = await fetch(`${CONFIG.PROD_BACKEND_API_URL}juego/iniciar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include"
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error al iniciar el juego: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    // 🧠 Actualizar estado local
    currentGameId = data.gameId;
    currentMode = modo;

    resetearUIJuego();
    ocultarTodasLasSecciones();
    mostrarSeccion(seccionJuego);
    actualizarUIJuego(data);
    if (esEscritorio()) {
      inputIngresaLetra.focus();
    }


  } catch (error) {
    mostrarMensajeAlerta(
      mensajeJuego,
      `Error: ${error.message}. Por favor, reiniciá o intentá de nuevo.`,
      "danger"
    );
  }
}

// --- Función para obtener la escena del ahorcado según el estado del juego ---
function getEscenaAhorcado(intentosRestantes, maxIntentos, juegoTerminado, palabraAdivinada) {
  if (juegoTerminado && palabraAdivinada) return 0; // Imagen de victoria
  if (juegoTerminado && intentosRestantes <= 0) return 9; // Imagen de derrota final

  const errores = maxIntentos - intentosRestantes;
  const escena = Math.min(errores + 1, 8); // Imagen 1 → 8 durante juego
  return escena;
}

// --- Función para actualizar la UI del juego ---
function actualizarUIJuego(data) {
  const intentosRestantesSpan = document.getElementById("intentosRestantes");
  if (intentosRestantesSpan) {
    intentosRestantesSpan.textContent = data.intentosRestantes;
  }

  inputGuiones.innerHTML = data.palabra
    .split('')
    .map(letra => letra === '_'
      ? '_'
      : `<span class="letra-acertada">${letra}</span>`
    )
    .join(' ');
  setTimeout(() => {
    document.querySelectorAll(".letra-acertada").forEach(el => {
      el.classList.remove("letra-acertada");
    });
  }, 1200);
  inputLetrasOut.textContent = Array.isArray(data.letrasIncorrectas) ? data.letrasIncorrectas.join(", ") : data.letrasIncorrectas;

  const cantidadErradasCalculada = 6 - data.intentosRestantes;
  if (!data.juegoTerminado && data.intentosRestantes === 1) {
    sonidoUltimoIntento.currentTime = 0;
    sonidoUltimoIntento.play();
  }

  if (data.juegoTerminado) {
    finalizandoJuego = true;
    ocultarSeccion(botonSubirLetra);
    ocultarSeccion(inputIngresaLetra);
    ocultarMensajeAlerta(mensajeTurno); // Ocultar mensaje de turno al terminar el juego

    const palabraAdivinada = data.palabra === data.palabraSecreta;
    const escena = getEscenaAhorcado(
      data.intentosRestantes,
      data.maxIntentos || 8,
      data.juegoTerminado,
      palabraAdivinada
    );


    if (palabraAdivinada) {
      mostrarMensajeAlerta(mensajeJuego, `¡Felicidades! Has adivinado la palabra: ${data.palabraSecreta}`, 'success');
      efectoTriunfo.currentTime = 0;
      efectoTriunfo.play();
      setTimeout(() => {
        musicaFondoIntro.pause();
      }, 800);

      imagenAhorcado.classList.remove("final-victoria", "final-derrota", "ahorcado-animado", "ahorcado-resplandor");
      void imagenAhorcado.offsetWidth;
      imagenAhorcado.src = `img/ahorcadito_${escena}.png`;
      imagenAhorcado.classList.add("final-victoria");
    } else if (data.intentosRestantes <= 0) {
      efectoDerrota.currentTime = 0;
      efectoDerrota.play();
      setTimeout(() => {
        musicaFondoIntro.pause();
      }, 800);

      mostrarMensajeAlerta(mensajeJuego, `¡GAME OVER! La palabra era: ${data.palabraSecreta}`, 'danger');
      imagenAhorcado.src = `img/ahorcadito_${escena}.png`;
      imagenAhorcado.classList.add("final-derrota");
    } else if (data.message && data.message !== "") {
      mostrarMensajeAlerta(mensajeJuego, data.message, 'danger');
      imagenAhorcado.src = `img/ahorcadito_${escena}.png`;
      imagenAhorcado.classList.add("final-derrota");
    } else {
      mostrarMensajeAlerta(mensajeJuego, "El juego ha terminado.", 'info');
      imagenAhorcado.src = `img/ahorcadito_${escena}.png`;
      imagenAhorcado.classList.add("final-derrota");
    }

    mostrarSeccion(botonReiniciar);
    mostrarSeccion(botonVolverAlMenu);
  }

  else {

    const palabraAdivinada = false;
    const escena = getEscenaAhorcado(
      data.intentosRestantes,
      data.maxIntentos || 8,
      data.juegoTerminado,
      palabraAdivinada
    );

    imagenAhorcado.src = `img/ahorcadito_${escena}.png`;
    mostrarSeccion(inputIngresaLetra);
    mostrarSeccion(botonSubirLetra);
    ocultarSeccion(botonReiniciar);
    mostrarSeccion(botonVolverAlMenu);

    if (data.message && data.message !== "") {
      // Si el mensaje indica una letra ya ingresada, es una ADVERTENCIA (amarillo)
      if (data.message.includes("enviaste") || data.message.includes("anteriormente") || data.message.includes("Intenta con otra")) {
        mostrarMensajeAlerta(mensajeJuego, data.message, 'warning');
        // Si el mensaje indica que la letra es INCORRECTA (rojo)
      } else if (data.message.includes("Incorrecto") || data.message.includes("La letra no está en la palabra")) {
        mostrarMensajeAlerta(mensajeJuego, data.message, 'danger');
        efectoErrorLetra.currentTime = 0;
        efectoErrorLetra.play();

        // Si el mensaje es una letra CORRECTA (verde)
      } else if (data.message.includes("correcta.") || data.message.includes("¡Bien!")) {
        mostrarMensajeAlerta(mensajeJuego, data.message, 'success');
        efectoAciertoLetra.currentTime = 0;
        efectoAciertoLetra.play();

        // Para otros mensajes informativos (azul por defecto)
      } else {
        mostrarMensajeAlerta(mensajeJuego, data.message, 'info');
      }

      if (data.message && data.message !== "") {
        console.log("     Mostrando data.message:", data.message);


      }
      // 🎯 Detectar error para sacudir al ahorcadito

      const letraIncorrecta = (
        data.message?.includes("Incorrecto") ||
        data.message?.includes("no está") ||
        data.message?.includes("fallaste")
      );

      // Solo sacude si no terminó el juego y fue incorrecta
      if (letraIncorrecta && !data.juegoTerminado) {
        imagenAhorcado.classList.remove("ahorcado-impacto", "final-victoria", "final-derrota");
        void imagenAhorcado.offsetWidth;
        imagenAhorcado.classList.add("ahorcado-impacto");
      }

      // 🎯 Aplicar animación según el mensaje
      const input = document.getElementById("inputAdivinarLetra");

      if (data.message.includes("correcta") || data.message.includes("¡Bien!")) {
        input.classList.add("acierto-efecto");
        inputGuiones.classList.add("acierto-efecto");
      } else if (
        data.message.includes("Incorrecto") ||
        data.message.includes("no está") ||
        data.message.includes("enviaste") ||
        data.message.includes("anteriormente") ||
        data.message.includes("Intenta con otra")
      ) {
        input.classList.add("error-efecto");
      }

      setTimeout(() => {
        input.classList.remove("acierto-efecto", "error-efecto");
        inputGuiones.classList.remove("acierto-efecto");
      }, 600);

    } else {
      ocultarMensajeAlerta(mensajeJuego);
    }

    if (currentMode === "online") {
      mostrarSeccion(mensajeTurno); // El mensaje de turno no es una alerta, se muestra directamente

      const myConnectionId = connection.connectionId;
      if (data.turnoActualConnectionId && myConnectionId) {
        if (data.turnoActualConnectionId === myConnectionId) {
          mensajeTurno.textContent = "¡Es tu turno!";
          inputIngresaLetra.disabled = false;
          botonSubirLetra.disabled = false;

        } else {
          mensajeTurno.textContent = "Espera tu turno.";
          inputIngresaLetra.disabled = true;
          botonSubirLetra.disabled = true;

        }
      } else {
        mensajeJuego.textContent = "Esperando a otro jugador..."; // Este sí se queda sin alerta
        inputIngresaLetra.disabled = true;
        botonSubirLetra.disabled = true;

      }
    } else {

      ocultarMensajeAlerta(mensajeTurno); // Ocultar mensaje de turno (no es una alerta)
      inputIngresaLetra.disabled = false;
      botonSubirLetra.disabled = false;
    }
  }

  inputIngresaLetra.value = "";
  if (esEscritorio()) {
    inputIngresaLetra.focus();
  }

  // ✅ Enfocar la imagen del ahorcado en móviles
  if (window.innerWidth < 768) {
    imagenAhorcado.scrollIntoView({ behavior: "smooth", block: "center" });
  }

}
// --- Lógica para Crear Partida Online ---
async function crearNuevaPartidaOnline() {
  try {
    limpiarEstadoGlobalDeJuego();

    const connectionId = connection.connectionId;
    if (!connectionId) {
      mostrarMensajeAlerta(mensajeIdPartida, "Error: Conexión SignalR no establecida. Inténtalo de nuevo.", 'danger');
      return;
    }

    const alias = document.getElementById("aliasInput").value.trim();
    if (!alias) {
      mostrarMensajeAlerta(mensajeIdPartida, "Por favor ingresá un alias para continuar.", 'warning');
      return;
    }

    const dificultadSeleccionada = parseInt(document.getElementById("selectorDificultad")?.value || "6");

    mostrarMensajeAlerta(mensajeIdPartida, "Creando partida online...", 'info');
    ocultarMensajeAlerta(mensajeJuego);

    ocultarSeccion(botonCrearPartida);
    ocultarSeccion(botonUnirsePartida);
    ocultarSeccion(inputIdPartida);
    ocultarSeccion(botonVolverModosOnline);
    ocultarSeccion(contenedorGameId);

    // ✅ Crear la partida online vía SignalR
    const data = await connection.invoke("CreateOnlineGame", dificultadSeleccionada);
    const gameId = data.gameId; // 🔽 CAMBIO: en minúscula
    const codigoSala = data.codigoSala; // 🔽 CAMBIO: en minúscula

    currentGameId = gameId;
    currentMode = "online";


    mostrarMensajeAlerta(mensajeIdPartida, `¡Partida creada! Comparte este código: ${codigoSala}`, 'success');
    displayGameId.textContent = `🔡 Código: ${codigoSala}`;
    mostrarSeccion(contenedorGameId);

    botonCopiarId.onclick = async () => {
      try {
        await navigator.clipboard.writeText(codigoSala);
        mostrarMensajeAlerta(mensajeIdPartida, `📋 Código '${codigoSala}' copiado. ¡Compártelo!`, 'success');
      } catch (err) {

        mostrarMensajeAlerta(mensajeIdPartida, `No se pudo copiar. Copia manualmente: ${codigoSala}`, 'warning');
      }
    };

    let botonIrAlJuego = document.getElementById("botonIrAlJuegoOnline");
    if (!botonIrAlJuego) {
      botonIrAlJuego = document.createElement("button");
      botonIrAlJuego.id = "botonIrAlJuegoOnline";
      botonIrAlJuego.textContent = "Ir al Juego (esperar)";
      botonIrAlJuego.classList.add("btn", "btn-success", "mt-3", "w-100");
      contenedorBotonJuegoOnline.appendChild(botonIrAlJuego);
    }
    mostrarSeccion(botonIrAlJuego);
    mostrarSeccion(botonVolverModosOnline);

    botonIrAlJuego.onclick = async () => {

      ocultarTodasLasSecciones();
      mostrarSeccion(seccionJuego);
      if (latestGameData && latestGameData.gameId === currentGameId) {

        actualizarUIJuego(latestGameData);
      } else {

        mostrarMensajeAlerta(mensajeJuego, "Esperando que otro jugador se una...", 'info');
        inputIngresaLetra.disabled = true;
        botonSubirLetra.disabled = true;
      }
      ocultarSeccion(botonIrAlJuego);
      ocultarSeccion(contenedorGameId);
    };

  } catch (error) {

    mostrarMensajeAlerta(mensajeIdPartida, `Error: ${error.message}`, 'danger');

    const botonIrAlJuego = document.getElementById("botonIrAlJuegoOnline");
    if (botonIrAlJuego) ocultarSeccion(botonIrAlJuego);
    ocultarSeccion(contenedorGameId);

    ocultarTodasLasSecciones();
    mostrarSeccion(seccionOnline);
    mostrarSeccion(botonCrearPartida);
    mostrarSeccion(botonUnirsePartida);
    mostrarSeccion(inputIdPartida);
    inputIdPartida.readOnly = false;
    mostrarSeccion(botonVolverModosOnline);
  }
}

// --- Lógica para Unirse a Partida Online ---

document.getElementById("unirsePartida").addEventListener("click", async () => {
  const input = document.getElementById("inputIdPartida").value.trim().toUpperCase();

  if (!input) {
    mostrarMensajeAlerta(mensajeIdPartida, "Por favor ingresá un código o ID de partida.", "warning");
    return;
  }

  // 🔤 Si parece código corto (ej: 4 letras/números)
  if (input.length === 4 && /^[A-Z0-9]+$/.test(input)) {
    try {
      mostrarMensajeAlerta(mensajeIdPartida, "🔍 Buscando partida...", "info");

      const response = await fetch(`${CONFIG.PROD_BACKEND_API_URL}juego/buscar-por-codigo/${input}`);
      if (!response.ok) throw new Error("No se encontró ninguna partida con ese código.");

      const data = await response.json();
      await unirseAPartidaOnline(data.gameId);
    } catch (error) {
      mostrarMensajeAlerta(mensajeIdPartida, `⚠️ ${error.message}`, "danger");
    }
    return;
  }

  // 🔑 Si es un GameId largo, lo usamos directamente
  await unirseAPartidaOnline(input);
});

async function unirseAPartidaOnline(gameId) {
  try {
    const connectionId = connection.connectionId;
    const alias = document.getElementById("aliasInput").value.trim();

    if (!connectionId) {
      mostrarMensajeAlerta(mensajeIdPartida, "Error: No tienes una conexión activa.", 'danger');
      return;
    }

    if (!alias) {
      mostrarMensajeAlerta(mensajeIdPartida, "Por favor ingresá tu alias antes de unirte.", 'warning');
      return;
    }

    aliasJugadorActual = alias;
    currentGameId = gameId;
    currentMode = "online";

    inputIdPartida.disabled = true;
    botonCrearPartida.disabled = true;
    botonUnirsePartida.disabled = true;
    inputIdPartida.readOnly = true;
    mostrarMensajeAlerta(mensajeIdPartida, "Uniéndose a la partida...", 'info');

    const response = await fetch(`${CONFIG.PROD_BACKEND_API_URL}juego/entrada-inteligente`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId: gameId,
        playerConnectionId: connectionId,
        alias: aliasJugadorActual
      }),
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Error desconocido del servidor." }));
      throw new Error(errorData.message || `Error desconocido: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    mostrarMensajeAlerta(mensajeIdPartida, data.message || "Ingreso exitoso a la partida", 'success', true);
    ocultarTodasLasSecciones();
    mostrarSeccion(seccionJuego);
    actualizarUIJuego(data);

    inputIdPartida.value = "";
    ocultarMensajeAlerta(mensajeIdPartida);

  } catch (error) {

    mostrarMensajeAlerta(mensajeIdPartida, `Error: ${error.message}`, 'danger');
    restaurarSeccionOnlineUI();
    if (esEscritorio()) inputIdPartida.focus();
  }
}

async function manejarEnvioLetra(letra) {

  if (!currentGameId) {
    mostrarMensajeAlerta(mensajeJuego, "Error: No hay una partida activa.", 'danger');
    inputIngresaLetra.disabled = false;
    botonSubirLetra.disabled = false;
    return;
  }

  try {
    if (currentMode === 'solitario' || currentMode === 'versus') {
      let alias1 = "";
      let alias2 = null;

      if (currentMode === "solitario") {
        alias1 = document.getElementById("aliasInput")?.value.trim() || "";
      } else if (currentMode === "versus") {
        alias1 = document.getElementById("aliasInput")?.value.trim() || "";
        alias2 = document.getElementById("aliasInput2")?.value.trim() || "";
      }

      if (!alias1 || (currentMode === "versus" && !alias2)) {
        mostrarMensajeAlerta(mensajeJuego, "Por favor ingresá los alias antes de continuar.", 'danger');
        inputIngresaLetra.disabled = false;
        botonSubirLetra.disabled = false;
        return;
      }

      const response = await fetch(`${CONFIG.PROD_BACKEND_API_URL}juego/adivinarLetraLocal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          GameId: currentGameId,
          Letra: letra,
          AliasJugador1: alias1,
          AliasJugador2: alias2 // será null en modo solitario
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Error desconocido al procesar la letra." }));
        mostrarMensajeAlerta(mensajeJuego, `Error: ${errorData.message || response.statusText}`, 'danger');
        inputIngresaLetra.value = "";

        if (esEscritorio()) {
          inputIngresaLetra.focus();
        }

        inputIngresaLetra.disabled = false;
        botonSubirLetra.disabled = false;
        return;
      }

      const data = await response.json();
      actualizarUIJuego(data);

      // ✅ Enfocar la imagen del ahorcado en móviles
      if (window.innerWidth < 768) {
        imagenAhorcado.scrollIntoView({ behavior: "smooth", block: "center" });
      }

    } else if (currentMode === 'online') {
      if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
        mostrarMensajeAlerta(mensajeJuego, "Error: Conexión SignalR no establecida o no activa.", 'danger');
        inputIngresaLetra.disabled = false;
        botonSubirLetra.disabled = false;
        return;
      }

      const playerConnectionId = connection.connectionId;
      if (!playerConnectionId) {
        mostrarMensajeAlerta(mensajeJuego, "Error: No se pudo obtener el ID de conexión de SignalR.", 'danger');
        inputIngresaLetra.disabled = false;
        botonSubirLetra.disabled = false;
        return;
      }

      await connection.invoke("ProcessLetter", currentGameId, letra);
    } else {
      mostrarMensajeAlerta(mensajeJuego, "Error: Modo de juego no reconocido. No se puede enviar la letra.", 'danger');
      inputIngresaLetra.disabled = false;
      botonSubirLetra.disabled = false;
      return;
    }
  } catch (error) {

    mostrarMensajeAlerta(mensajeJuego, `Error: ${error.message || "Un error inesperado ocurrió."}`, 'danger');
    inputIngresaLetra.disabled = false;
    botonSubirLetra.disabled = false;
  }
}


async function reiniciarJuego() {
  try {
    finalizandoJuego = false;
    if (!currentGameId) {
      console.warn("No hay GameId activo para reiniciar. Volviendo al menú principal.");
      ocultarTodasLasSecciones();
      inicializarUI(); // Volvemos a la UI inicial
      return;
    }
    
    const response = await fetch(`${CONFIG.PROD_BACKEND_API_URL}juego/reiniciar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ GameId: currentGameId }),
      credentials: 'include'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error al reiniciar el juego: ${response.status} - ${errorText}`);
    }

    currentGameId = null;
    currentMode = null;

    ocultarTodasLasSecciones();
    inicializarUI(); // Vuelve a la pantalla de inicio limpia
    resetearUIJuego(); // Para asegurar que la UI del juego esté limpia si se vuelve a jugar
  } catch (error) {

    mensajeJuego.textContent = `Error al reiniciar: ${error.message}`;
  }
}

async function abandonarPartidaOnline() {
  finalizandoJuego = false;
  if (currentMode === 'online' && currentGameId && connection.state === signalR.HubConnectionState.Connected) {
    try {

      await connection.invoke("LeaveGameGroup", currentGameId);


    } catch (error) {
      console.error("Error al intentar abandonar la partida online:", error);
      // No bloqueamos al usuario por este error, ya que lo importante es que abandone localmente.
    }
  }
  // Siempre limpiar el estado local después de intentar notificar al backend
  limpiarEstadoGlobalDeJuego();
}

const modalRanking = document.getElementById("modalRanking");
modalRanking.addEventListener("shown.bs.modal", cargarRankingEnTabla);

async function cargarRankingEnTabla() {
  try {
    const response = await fetch(`${CONFIG.PROD_BACKEND_API_URL}juego/ranking`);
    const data = await response.json();

    const tbody = document.getElementById("tablaRankingBody");
    const tituloRanking = document.querySelector("#modalRanking .modal-title");
    tbody.innerHTML = "";

    const medallas = ["🥇", "🥈", "🥉"];
    const top15 = data.slice(0, 15); // 👈 Limita a los 15 mejores

    top15.forEach((jugador, i) => {
      const icono = medallas[i] || `${i + 1}°`;
      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td>${icono}</td>
                <td>${jugador.alias}</td>
                <td>${jugador.victorias}</td>
                <td>${jugador.derrotas}</td>
                <td>${jugador.winrate}%</td>
                <td>${jugador.total}</td>
              `;
      tbody.appendChild(tr);
    });

    // ✅ Actualiza el título para aclarar el límite
    if (tituloRanking) {
      tituloRanking.innerHTML = `🏆 TOP 15 JUGADORES (de ${data.length}) 🏆`;
    }

  } catch (err) {

    alert("No se pudo cargar el ranking. Intentalo más tarde.");
  }
}

async function mostrarRankingHorizontal() {
  try {
    const response = await fetch(`${CONFIG.PROD_BACKEND_API_URL}juego/ranking`);
    const data = await response.json();

    if (data.length === 0) return;

    const top15 = data.slice(0, 15); // 👈 Limita a los 15 mejores

    const rankingTexto = top15
      .map((j, i) => `${i + 1}° ${j.alias}`)
      .join(" • ");

    const scrollContainer = document.getElementById("scrollRanking");
    const frase = `🏆 TOP 15: ${rankingTexto} 🏆`;
    scrollContainer.innerHTML = `${frase}&nbsp;&nbsp;&nbsp;&nbsp;${frase}`;

    document.getElementById("rankingHorizontal").classList.remove("d-none");
  } catch (err) {

  }
}

// --- Event Listeners de Botones ---

if (botonInicio) {
  botonInicio.addEventListener("click", function (event) {
    event.preventDefault();
    //musicaFondoIntro.play();

    const alias = document.getElementById("aliasInput")?.value.trim();
    const mensajeAlias = document.getElementById("mensajeAlias");
    botonAdmin.classList.add("d-none");

    if (!alias) {
      mensajeAlias.classList.remove("d-none");

      // Ocultar después de 2.5s automáticamente
      setTimeout(() => {
        mensajeAlias.classList.add("d-none");
      }, 2500);
      return;
    }

    // Si hay alias, ocultamos mensaje por si estaba visible antes
    if (!alias) {
      if (mensajeAlias) {
        mensajeAlias.classList.remove("d-none");
        setTimeout(() => {
          mensajeAlias.classList.add("d-none");
        }, 2500);
      }
      return;
    }

    // Ocultamos mensaje si estaba visible
    if (mensajeAlias) {
      mensajeAlias.classList.add("d-none");
    }

    ocultarSeccion(seccionBienvenida);
    mostrarSeccion(seccionModosJuego);

    ocultarSeccion(inputIdPartida);
    ocultarSeccion(botonCrearPartida);
    ocultarSeccion(botonUnirsePartida);
    ocultarSeccion(mensajeIdPartida);
    ocultarSeccion(botonVolverModosOnline);
  });
}

botonSolitario.addEventListener("click", async function (event) {
  event.preventDefault();

  // No necesitamos pasar palabraVersus para solitario
  await iniciarJuego("solitario");
});

botonVersus.addEventListener("click", function (event) {
  event.preventDefault();
  currentMode = 'versus';
  ocultarTodasLasSecciones();
  mostrarSeccion(seccionIngresarPalabra);
  inputPalabraVersus.value = ""; // Limpiar el input al entrar
  txtIngresarPalabraVersus.textContent = "Ingresa una palabra de 4 a 8 letras para tu amigo"; // Resetear mensaje

  if (esEscritorio()) {
    inputPalabraVersus.focus();
  }

});

if (botonOnline) {
  botonOnline.addEventListener("click", () => {
    currentMode = 'online';
    startSignalRConnection();
    restaurarSeccionOnlineUI();
  });
}

const botonVolverAlInicioModos = document.getElementById("volverAlInicioModos");

if (botonVolverAlInicioModos) {
  botonVolverAlInicioModos.addEventListener("click", () => {
    ocultarSeccion(seccionModosJuego);
    mostrarSeccion(seccionBienvenida);
    botonAdmin.classList.remove("d-none");

  });
}

botonCrearPartida.addEventListener("click", async () => {
  try {
    capturarAliasGlobal(); // 👈 Capturamos alias antes de crear
    await crearNuevaPartidaOnline();
  } catch (error) {
    console.warn("No se pudo crear la partida: alias inválido.");
  }
});

botonUnirsePartida.addEventListener("click", async () => {
  try {
    capturarAliasGlobal(); // 👈 Capturamos alias antes de unirse
    currentMode = 'online';
    const gameId = inputIdPartida.value.trim();
    if (gameId) {

      await unirseAPartidaOnline(gameId);
    } else {
      mostrarMensajeAlerta(mensajeIdPartida, "Por favor, ingresa un ID de partida.", 'warning');
    }
  } catch (error) {
    console.warn("No se pudo unir a la partida: alias inválido.");
  }
});

botonVolverModosOnline.addEventListener("click", async () => { // Hacer async para await
  if (currentMode === 'online' && currentGameId) { // Si había una partida activa (incluso si no se unió otro)
    await abandonarPartidaOnline();
  }
  ocultarTodasLasSecciones();
  inicializarUI(); // Vuelve a la pantalla de inicio limpia (secciónModosJuego)
});

document.getElementById("botonEnviarPalabra")?.addEventListener("click", async () => {
  const alias1 = document.getElementById("aliasInput")?.value.trim();
  const alias2 = document.getElementById("aliasInput2")?.value.trim();
  const palabra = document.getElementById("inputPalabraVersus")?.value.trim().toUpperCase();
  const mensajeAliasVersus = document.getElementById("mensajeAliasVersus");
  const mensajePalabra = document.getElementById("mensajeIngresarPalabraVersus");

  if (!alias1 || !alias2) {
    mensajeAliasVersus.classList.remove("d-none");
    setTimeout(() => mensajeAliasVersus.classList.add("d-none"), 2500);
    return;
  }

  mensajeAliasVersus.classList.add("d-none");

  if (palabra.length < 4 || palabra.length > 8 || /[^A-Z]/.test(palabra)) {
    mensajePalabra.textContent = "La palabra debe tener entre 4 y 8 letras sin caracteres especiales.";
    mensajePalabra.classList.remove("d-none", "alert-success");
    mensajePalabra.classList.add("alert-danger");
    return;
  }

  mensajePalabra.classList.add("d-none");

  // 🎮 Iniciar juego modo versus
  await iniciarJuego("versus", palabra);
});

inputPalabraVersus.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    botonEnviarPalabra.click(); // Simula clic en el botón existente
  }
});


botonCancelarVersus.addEventListener("click", function (event) {
  event.preventDefault();
  ocultarTodasLasSecciones();
  inicializarUI();
  inputPalabraVersus.value = "";
  // Reiniciar el mensaje en la pantalla de ingresar palabra
  ocultarMensajeAlerta(txtIngresarPalabraVersus);
});

if (botonSubirLetra) {
  // CLICK (Desktop + Mobile)
  botonSubirLetra.addEventListener("click", async (event) => {
    event.preventDefault();
    document.activeElement.blur();

    const letraIngresada = inputIngresaLetra.value.toUpperCase().trim();

    // Validación: Vacío
    if (letraIngresada.length === 0) {
      mostrarMensajeAlerta(mensajeJuego, "Por favor, ingresa una letra.", 'warning');
      inputIngresaLetra.focus();
      return;
    }

    // Validación: Letra válida
    if (letraIngresada.length !== 1 || !/^[A-ZÑ]$/.test(letraIngresada)) {
      mostrarMensajeAlerta(mensajeJuego, "Ingresa una sola letra válida (A-Z, Ñ).", 'warning');
      inputIngresaLetra.value = "";
      inputIngresaLetra.focus();
      return;
    }

    // Validación: Letra ya ingresada
    const letrasCorrectasEnGuiones = inputGuiones.textContent.replace(/ /g, '');
    const textoLetrasIncorrectas = letrasIncorrectasSpan.textContent;
    let letrasIncorrectasArray = [];
    const match = textoLetrasIncorrectas.match(/:\s*([A-ZÑ,\s]*)$/);
    if (match && match[1]) {
      letrasIncorrectasArray = match[1].replace(/,\s*/g, '').split('');
    }

    const letrasYaIntentadas = new Set();
    letrasCorrectasEnGuiones
      .split('')
      .filter(char => char !== '_')
      .forEach(char => letrasYaIntentadas.add(char));
    letrasIncorrectasArray.forEach(char => letrasYaIntentadas.add(char));

    if (letrasYaIntentadas.has(letraIngresada)) {
      mostrarMensajeAlerta(mensajeJuego, `Ya enviaste la letra ${letraIngresada} anteriormente. Intenta con otra.`, 'warning');
      inputIngresaLetra.value = "";
      inputIngresaLetra.focus();
      return;
    }

    // Enviar letra
    inputIngresaLetra.disabled = true;
    botonSubirLetra.disabled = true;
    await manejarEnvioLetra(letraIngresada);

    // ✅ Scroll a la imagen del ahorcado en móviles
    if (window.innerWidth < 768) {
      imagenAhorcado.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
}

// ENTER en el input
if (inputIngresaLetra) {
  inputIngresaLetra.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      botonSubirLetra.click();
    }
  });
}

// --- Event Listener para el botón Reiniciar Partida ---
if (botonReiniciar) {
  botonReiniciar.addEventListener("click", async () => { // Hacer async para await
    musicaFondoIntro.play();
    if (currentMode === 'online') {
      await abandonarPartidaOnline(); // Notificar si estaba en online ANTES de cambiar la UI
      // La lógica que tienes para mostrar seccionOnline ya está bien para la UI
      restaurarSeccionOnlineUI();
    } else if (currentMode === 'solitario') {
      await iniciarJuego('solitario');
    } else if (currentMode === 'versus') {
      ocultarSeccion(seccionJuego);
      mostrarSeccion(seccionIngresarPalabra);
      inputPalabraVersus.value = "";
      txtIngresarPalabraVersus.textContent = "Ingresa una palabra de 4 a 8 letras para tu amigo";

      if (esEscritorio()) {
        inputPalabraVersus.focus();
      }

    } else {
      console.warn("Modo de juego no definido al reiniciar. Volviendo a selección de modos.");
      mostrarSeccion(seccionModosJuego);
    }
    // Los ocultarSeccion y mostrarSeccion específicos dentro de cada if/else ya manejan la transición visual.
    // Asegúrate de que `ocultarTodasLasSecciones()` se llame al inicio de cada rama si es necesario
    // para una limpieza completa antes de mostrar la nueva sección.
  });
}

inputIngresaLetra.addEventListener("keypress", async function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    // Llama al click del botón para centralizar la lógica de validación
    botonSubirLetra.click();
  }
});

inputIngresaLetra.addEventListener("touchstart", () => {
  setTimeout(() => {
    inputIngresaLetra.focus();
    inputIngresaLetra.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 100); // Espera que el layout se acomode
});


botonVolverAlMenu.addEventListener("click", function () {
  musicaFondoIntro.play();
  Swal.fire({
    title: '¿Abandonar partida?',
    text: "Perderás el progreso actual.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, salir',
    cancelButtonText: 'Cancelar',
    reverseButtons: true
  }).then(async (result) => {
    if (result.isConfirmed) {
      if (currentGameId && currentMode === "online") {
        console.trace("🧃 LeaveGameGroup invocado");
        await connection.invoke("LeaveGameGroup", currentGameId);
      }

      inicializarUI();
      botonAdmin.classList.remove("d-none");

    }
  });
});

// Inicializar la interfaz al cargar la página
function inicializarUI() {
  ocultarTodasLasSecciones(); // Esto ya oculta todas las secciones principales

  // La pantalla de bienvenida es la primera que se muestra al inicio
  mostrarSeccion(seccionBienvenida);
  currentMode = null;

  ocultarMensajeAlerta(mensajeIdPartida);
  ocultarMensajeAlerta(txtIngresarPalabraVersus);
  ocultarMensajeAlerta(mensajeJuego);
  ocultarMensajeAlerta(mensajeTurno);

  // Para la sección online (elementos dentro de ella que no son la sección en sí)
  inputIdPartida.value = "";
  ocultarSeccion(inputIdPartida);
  ocultarSeccion(botonCrearPartida);
  ocultarSeccion(botonUnirsePartida);
  ocultarSeccion(botonVolverModosOnline);
  let botonContinuar = document.getElementById("botonContinuarOnline");
  if (botonContinuar) ocultarSeccion(botonContinuar);
  ocultarSeccion(contenedorGameId);

  // Para la sección de ingreso de palabra
  inputPalabraVersus.value = "";
  // Establecer el texto inicial para esta sección, ya que la alerta la limpiará
  txtIngresarPalabraVersus.textContent = "Ingresa una palabra de 4 a 8 letras para tu amigo";
  
  // Para la sección de juego
  resetearUIJuego();
  ocultarSeccion(inputIngresaLetra);
  ocultarSeccion(botonSubirLetra);
  ocultarSeccion(botonReiniciar);
}

//musica y efectos de sonido

const musicaFondoIntro = new Audio('sounds/musica_fondo_intro.mp3');
const efectoAciertoLetra = new Audio('sounds/acierto_letra.mp3');
const efectoErrorLetra = new Audio('sounds/error_letra.mp3');
const efectoTriunfo = new Audio('sounds/triunfo.mp3');
efectoTriunfo.volume = 0.2; // Volumen más alto para el triunfo
const efectoDerrota = new Audio('sounds/derrota.mp3');
const sonidoUltimoIntento = new Audio('sounds/ultimo_intento.mp3');
sonidoUltimoIntento.volume = 1;
musicaFondoIntro.loop = true;
musicaFondoIntro.volume = 0.3; // Volumen suave para no tapar los efectos

document.addEventListener("DOMContentLoaded", () => {
  // Referencias a elementos de la pantalla de carga
  const pantallaCarga = document.getElementById("pantallaCargaInicial");
  const barraProgreso = pantallaCarga.querySelector(".progreso");
  const mensajeCarga = pantallaCarga.querySelector(".mensaje-carga");

  // Modal de música
  const modalMusica = new bootstrap.Modal(document.getElementById("modalMusica"), {
      backdrop: 'static',
      keyboard: false
  });
  modalMusica.show();

  const btnMusicaSi = document.getElementById("btnMusicaSi");
  const btnMusicaNo = document.getElementById("btnMusicaNo");

  // Función que maneja la lógica de la conexión y la carga
  const iniciarConexionYAnimacion = () => {
    // 1. Obtenemos las referencias a los elementos de la UI
    const pantallaCarga = document.getElementById("pantallaCargaInicial");
    const barraProgreso = pantallaCarga.querySelector(".progreso");
    const mensajeCarga = pantallaCarga.querySelector(".mensaje-carga");

    // 2. Mostramos la pantalla de carga y reiniciamos su estado
    pantallaCarga.style.display = "flex";
    pantallaCarga.classList.remove("fade-out");
    barraProgreso.classList.remove('bg-danger'); // Quitamos el color de error si existía
    barraProgreso.style.transition = 'none';
    barraProgreso.style.width = '0%';

    // 3. Pequeño delay para que el navegador aplique el 0% antes de iniciar la animación
    setTimeout(() => {
        // Iniciamos la animación "optimista" a 95% durante 25 segundos.
        // Esto cubre visualmente el posible "cold start" de Render.
        barraProgreso.style.transition = 'width 25s cubic-bezier(0.2, 1, 0.8, 1)';
        barraProgreso.style.width = '95%';
        mensajeCarga.textContent = "Despertando al guardián del castillo... (Render puede tardar un momento)";
    }, 100);

    // 4. Intentamos establecer la conexión REAL con SignalR
    startSignalRConnection()
        .then(() => {
            // --- ¡ÉXITO! La conexión se estableció ---
            console.log("✅ Conexión real establecida. Finalizando carga.");

            // 5. Forzamos la barra al 100% con una animación rápida y satisfactoria
            barraProgreso.style.transition = 'width 0.5s ease-out';
            barraProgreso.style.width = '100%';
            mensajeCarga.textContent = "¡Conexión establecida! Iniciando juego...";

            // 6. Esperamos un momento para que el usuario vea el mensaje y luego ocultamos la pantalla
            setTimeout(() => {
                pantallaCarga.classList.add("fade-out");
                // Esperamos que la animación de fade-out termine (1s según tu CSS)
                setTimeout(() => {
                    pantallaCarga.style.display = "none";
                    inicializarUI(); // Mostramos la interfaz principal del juego
                }, 1000); 
            }, 500); // Pequeña pausa para leer el mensaje de éxito
        })
        .catch(err => {
            // --- ¡ERROR! La conexión falló ---
            console.error("❌ Error de conexión. La carga se ha detenido.", err);
            
            // 7. Detenemos la animación y mostramos un estado de error
            barraProgreso.style.transition = 'none'; // Detiene cualquier animación en curso
            barraProgreso.classList.add('bg-danger'); // Hacemos la barra roja para indicar error
            mensajeCarga.textContent = "No se pudo conectar con el servidor. Por favor, recarga la página.";
        });
  };


  // Al hacer clic en los botones del modal, iniciamos el proceso
  btnMusicaSi.addEventListener("click", () => {
      musicaFondoIntro.currentTime = 0;
      musicaFondoIntro.volume = 0.3;
      musicaFondoIntro.loop = true;
      musicaFondoIntro.play();
      modalMusica.hide();
      iniciarConexionYAnimacion();
  });

  btnMusicaNo.addEventListener("click", () => {
      modalMusica.hide();
      iniciarConexionYAnimacion();
  });

  // 🛠️ Panel Admin comportamiento
  const botonAdmin = document.getElementById("botonAdmin");
  const modalAdmin = new bootstrap.Modal(document.getElementById("modalValidarAdmin"), {
    backdrop: 'static',
    keyboard: false
  });
  const btnValidarAdmin = document.getElementById("btnValidarAdmin");
  const aliasAdminInput = document.getElementById("aliasAdminInput");
  const adminErrorMsg = document.getElementById("adminErrorMsg");

  const aliasesPermitidos = ["devfab", "portfolio"];
  let adminAliasValidado = false;

  botonAdmin.addEventListener("click", () => {
    modalAdmin.show();
    adminErrorMsg.classList.add("d-none");
    aliasAdminInput.value = "";
    adminAliasValidado = false;
  });

  btnValidarAdmin.addEventListener("click", () => {
    const aliasIngresado = aliasAdminInput.value.trim().toLowerCase();
    if (aliasesPermitidos.includes(aliasIngresado)) {
      adminAliasValidado = true;
      modalAdmin.hide();
      irASeccionAdmin();
    } else {
      adminErrorMsg.classList.remove("d-none");
    }
  });

  document.getElementById("modalValidarAdmin").addEventListener("hidden.bs.modal", () => {
    if (!adminAliasValidado) {
      ocultarSeccion(seccionAdminPalabras);
      mostrarSeccion(seccionBienvenida);
    }
  });

  // 🧭 Mostrar el botón admin en la bienvenida
  botonAdmin.style.display = "inline-block";
});

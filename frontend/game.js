// --- Elementos HTML de la interfaz (Selección de Modo, Ingreso de Palabra VS, Área de Juego) ---
const seccionModosJuego = document.querySelector(".seccion-modos-juego");
const seccionIngresarPalabra = document.querySelector(".seccion-ingresar-palabra");
const seccionJuego = document.querySelector(".seccion-juego");

// --- Botones de la Pantalla de Inicio y Selección de Modo ---
const botonInicio = document.querySelector(".botonInicio");
const botonSolitario = document.querySelector(".botonSolitario");
const botonVersus = document.querySelector(".botonVersus");
const botonOnline = document.querySelector(".botonOnline");

// --- Elementos de la Sección de Ingreso de Palabra en Modo VS ---
const inputPalabraVersus = document.querySelector(".inputPalabraVersus");
const botonEnviarPalabra = document.querySelector(".botonEnviarPalabra");
const botonCancelarVersus = document.querySelector(".botonCancelarVersus");
const txtIngresarPalabraVersus = document.querySelector(".txtIngP");

// --- Elementos de la Sección Principal del Juego ---
const imagenAhorcado = document.getElementById("imagen");
const mensajeJuego = document.querySelector(".mensaje-juego");
const inputGuiones = document.querySelector(".guion");
const inputLetrasOut = document.querySelector(".LetrasOut");
const inputIngresaLetra = document.getElementById("inputAdivinarLetra");
const botonSubirLetra = document.querySelector(".subirLetra");
const botonReiniciar = document.querySelector(".reiniciar");

// --- Elementos para la seccion Online ---
const seccionOnline = document.querySelector(".seccion-online");
const botonCrearPartida = document.querySelector(".boton-crear-partida");
const inputIdPartida = document.querySelector(".input-id-partida");
const botonUnirsePartida = document.querySelector(".boton-unirse-partida");
const mensajeIdPartida = document.querySelector(".mensaje-id-partida");
const botonVolverModosOnline = seccionOnline.querySelector(".volver-modos");

// --- Variables de Estado del Frontend ---
let currentGameId = null; // Almacenará el ID de la partida activa
let currentMode = null;   // Almacenará el modo actual (solitario, versus, online)

// --- Funciones de Utilidad para Mostrar/Ocultar Secciones ---
// ¡Estas funciones deben estar SIEMPRE al principio del script!
function mostrarSeccion(seccion) {
    if (seccion === seccionModosJuego || seccion === seccionIngresarPalabra || seccion === seccionJuego || seccion === seccionOnline) {
        seccion.style.display = "flex";
    } else {
        seccion.style.display = "block";
    }
}

function ocultarSeccion(seccion) {
    seccion.style.display = "none";
}

function ocultarTodasLasSecciones() {
    const secciones = [seccionModosJuego, seccionIngresarPalabra, seccionJuego, seccionOnline];
    secciones.forEach(seccion => {
        seccion.style.display = "none";
    });
}

// --- Configuración de SignalR ---
const connection = new signalR.HubConnectionBuilder()
    .withUrl("http://127.0.0.1:5195/gamehub")
    .withAutomaticReconnect()
    .build();

// Escucha eventos del Hub de SignalR (si tienes eventos definidos)
connection.on("ReceiveGameUpdate", (data) => {
    console.log("Actualización de juego recibida via SignalR:", data);
    // Aquí puedes añadir lógica para actualizar la UI en tiempo real para el otro jugador
    // cuando se implemente la comunicación bidireccional más a fondo.
    // Por ahora, la verificación de letras se hace vía API REST.
    if (data.gameId === currentGameId) { // Solo actualizar si es la partida actual
        actualizarUIJuego(data);
    }
});

// Inicia la conexión SignalR
async function startSignalRConnection() {
    try {
        await connection.start();
        console.log("Conexión SignalR establecida con éxito.");
    } catch (err) {
        console.error("Error al iniciar la conexión SignalR:", err);
        setTimeout(startSignalRConnection, 5000);
    }
}

// --- Funciones de Lógica de Juego ---

function resetearUIJuego() {
    inputGuiones.value = "";
    inputLetrasOut.value = "";
    inputIngresaLetra.value = "";
    imagenAhorcado.src = "img/ahorcadito_1.png"; // Resetear a la primera imagen
    mensajeJuego.textContent = "Ingresa una Letra";
    mostrarSeccion(inputIngresaLetra);
    mostrarSeccion(botonSubirLetra);
}

async function iniciarJuego(modo, palabraVersus = "") {
    try {
        const response = await fetch("http://127.0.0.1:5195/api/juego/iniciar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ Modo: modo, Palabra: palabraVersus }),
            credentials: 'include'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error al iniciar el juego: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log("Respuesta del backend (iniciar):", data);

        currentGameId = data.gameId;
        currentMode = modo;

        resetearUIJuego();
        ocultarTodasLasSecciones();
        mostrarSeccion(seccionJuego);

        inputGuiones.value = data.palabra;

        if (modo === "versus") {
            mensajeJuego.textContent = "¡Adivina la palabra!";
        } else {
            mensajeJuego.textContent = "Ingresa una Letra";
        }

        inputIngresaLetra.focus();
    } catch (error) {
        console.error("Error CATCHED al iniciar el juego:", error);
        mensajeJuego.textContent = `Error: ${error.message}. Por favor, reinicia o inténtalo de nuevo.`;
    }
}

function actualizarUIJuego(data) {
    inputGuiones.value = data.palabra;
    inputLetrasOut.value = data.letrasIncorrectas;

    const cantidadErradasCalculada = 6 - data.intentosRestantes;
    imagenAhorcado.src = `img/ahorcadito_${cantidadErradasCalculada + 1}.png`;

    if (data.juegoTerminado) {
        ocultarSeccion(botonSubirLetra);
        ocultarSeccion(inputIngresaLetra);

        if (data.palabra === data.palabraSecreta) {
            mensajeJuego.textContent = `¡Felicidades! Has adivinado la palabra: ${data.palabraSecreta}`;
            imagenAhorcado.src = `img/ahorcadito_0.png`;
        } else {
            mensajeJuego.textContent = `¡GAME OVER! La palabra era: ${data.palabraSecreta}`;
            imagenAhorcado.src = `img/ahorcadito_7.png`;
        }
    } else {
        mensajeJuego.textContent = `Ingresa una Letra`;
    }

    inputIngresaLetra.value = "";
    inputIngresaLetra.focus();
}

async function crearNuevaPartidaOnline() {
    try {
        const response = await fetch("http://127.0.0.1:5195/api/juego/crear-online", {
            method: "POST",
            credentials: 'include'
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error al crear partida online: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        const gameId = data.gameId;
        mensajeIdPartida.textContent = `Partida creada. ID: ${gameId}. ¡Comparte con un amigo!`;
        mensajeIdPartida.style.color = "green";
        inputIdPartida.value = gameId;

        await unirseAPartidaOnline(gameId);

    } catch (error) {
        console.error("Error CATCHED al crear partida online:", error);
        mensajeIdPartida.textContent = `Error: ${error.message}`;
        mensajeIdPartida.style.color = "red";
    }
}

async function unirseAPartidaOnline(gameId) {
    try {
        await connection.invoke("JoinGame", gameId);
        console.log(`Unido al grupo de SignalR para la partida: ${gameId}`);

        const response = await fetch("http://127.0.0.1:5195/api/juego/unirse-online", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ GameId: gameId }),
            credentials: 'include'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error al unirse a partida online: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log("Respuesta del backend (unirse):", data);

        currentGameId = gameId;
        currentMode = "online";

        resetearUIJuego();
        ocultarTodasLasSecciones();
        mostrarSeccion(seccionJuego);
        inputGuiones.value = data.palabra;

        mensajeJuego.textContent = "Esperando a otro jugador..."; // Por ahora, sigue mostrando este mensaje
        inputIngresaLetra.focus();

    } catch (error) {
        console.error("Error CATCHED al unirse a partida online:", error);
        mensajeIdPartida.textContent = `Error: ${error.message}`;
        mensajeIdPartida.style.color = "red";
    }
}

async function manejarEnvioLetra() {
    const letra = inputIngresaLetra.value.trim().toUpperCase();

    if (letra.length !== 1 || !/^[A-Z]$/.test(letra)) {
        mensajeJuego.textContent = "Por favor, ingresa una sola letra válida (A-Z).";
        inputIngresaLetra.value = "";
        inputIngresaLetra.focus();
        return;
    }

    if (!currentGameId) {
        mensajeJuego.textContent = "Error: No hay una partida activa. Inicia o únete a una.";
        return;
    }

    try {
        const response = await fetch("http://127.0.0.1:5195/api/juego/verificar-letra", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ Letra: letra, GameId: currentGameId }),
            credentials: 'include'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error en la API al verificar letra: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log("Respuesta del backend (verificar-letra):", data);

        actualizarUIJuego(data);

        // Si estamos en modo online, podríamos usar SignalR para notificar al otro jugador
        // if (currentMode === "online") {
        //     await connection.invoke("SendGameUpdate", currentGameId, data);
        // }

    } catch (error) {
        console.error("Error CATCHED al verificar letra:", error);
        mensajeJuego.textContent = `Error: ${error.message}`;
    }
}

async function reiniciarJuego() {
    try {
        if (!currentGameId) {
            console.warn("No hay GameId activo para reiniciar. Volviendo al menú principal.");
            ocultarTodasLasSecciones();
            mostrarSeccion(seccionModosJuego);
            mostrarSeccion(botonInicio);
            ocultarSeccion(botonSolitario);
            ocultarSeccion(botonVersus);
            ocultarSeccion(botonOnline);
            resetearUIJuego();
            return;
        }

        const response = await fetch("http://127.0.0.1:5195/api/juego/reiniciar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ GameId: currentGameId }),
            credentials: 'include'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error al reiniciar el juego: ${response.status} - ${errorText}`);
        }

        console.log("Juego reiniciado en el backend.");

        currentGameId = null;
        currentMode = null;

        ocultarTodasLasSecciones();
        mostrarSeccion(seccionModosJuego);
        mostrarSeccion(botonInicio);
        ocultarSeccion(botonSolitario);
        ocultarSeccion(botonVersus);
        ocultarSeccion(botonOnline);
        resetearUIJuego();
    } catch (error) {
        console.error("Error CATCHED al reiniciar juego:", error);
        mensajeJuego.textContent = `Error al reiniciar: ${error.message}`;
    }
}

// --- Event Listeners de Botones ---

botonInicio.addEventListener("click", function(event) {
    event.preventDefault();
    ocultarSeccion(botonInicio);
    mostrarSeccion(botonSolitario);
    mostrarSeccion(botonVersus);
    mostrarSeccion(botonOnline);
});

botonSolitario.addEventListener("click", async function(event) {
    event.preventDefault();
    await iniciarJuego("solitario");
});

botonVersus.addEventListener("click", function(event) {
    event.preventDefault();
    ocultarTodasLasSecciones();
    mostrarSeccion(seccionIngresarPalabra);
    inputPalabraVersus.focus();
});

if (botonOnline) {
    botonOnline.addEventListener("click", () => {
        ocultarTodasLasSecciones();
        mostrarSeccion(seccionOnline);
    });
}

botonCrearPartida.addEventListener("click", async () => {
    console.log("Creando nueva partida online...");
    await crearNuevaPartidaOnline();
});

botonUnirsePartida.addEventListener("click", async () => {
    const gameId = inputIdPartida.value.trim();
    if (gameId) {
        console.log(`Intentando unirse a la partida: ${gameId}`);
        await unirseAPartidaOnline(gameId);
    } else {
        mensajeIdPartida.textContent = "Por favor, ingresa un ID de partida.";
        mensajeIdPartida.style.color = "red";
    }
});

botonVolverModosOnline.addEventListener("click", () => {
    ocultarTodasLasSecciones();
    mostrarSeccion(seccionModosJuego);
    mostrarSeccion(botonInicio);
    ocultarSeccion(botonSolitario);
    ocultarSeccion(botonVersus);
    ocultarSeccion(botonOnline);
});

botonEnviarPalabra.addEventListener("click", async function(event) {
    event.preventDefault();
    const palabra = inputPalabraVersus.value.toUpperCase().trim();

    if (palabra.length < 4 || palabra.length > 8) {
        txtIngresarPalabraVersus.textContent = "La palabra debe tener entre 4 y 8 letras.";
        inputPalabraVersus.focus();
        return;
    }
    if (!/^[A-Z]+$/.test(palabra)) {
        txtIngresarPalabraVersus.textContent = "Solo se permiten letras.";
        inputPalabraVersus.focus();
        return;
    }

    inputPalabraVersus.value = "";
    await iniciarJuego("versus", palabra);
});

botonCancelarVersus.addEventListener("click", function(event) {
    event.preventDefault();
    ocultarTodasLasSecciones();
    mostrarSeccion(seccionModosJuego);
    mostrarSeccion(botonInicio);
    ocultarSeccion(botonSolitario);
    ocultarSeccion(botonVersus);
    ocultarSeccion(botonOnline);
    inputPalabraVersus.value = "";
    txtIngresarPalabraVersus.textContent = "Ingresa una palabra de 4 a 8 letras para tu amigo";
});

botonSubirLetra.addEventListener("click", async function(event) {
    event.preventDefault();
    await manejarEnvioLetra();
});

botonReiniciar.addEventListener("click", async function(event) {
    event.preventDefault();
    await reiniciarJuego();
});

inputIngresaLetra.addEventListener("keypress", async function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        await manejarEnvioLetra();
    }
});

// Inicializar la interfaz al cargar la página
function inicializarUI() {
    ocultarTodasLasSecciones();
    mostrarSeccion(seccionModosJuego);
    mostrarSeccion(botonInicio);
    ocultarSeccion(botonSolitario);
    ocultarSeccion(botonVersus);
    ocultarSeccion(botonOnline);
}

// Llama a la función de inicialización y SignalR cuando el DOM esté completamente cargado
document.addEventListener("DOMContentLoaded", () => {
    inicializarUI();
    startSignalRConnection();
});
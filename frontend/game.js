// --- Elementos HTML de la interfaz (Selección de Modo, Ingreso de Palabra VS, Área de Juego) ---

const seccionBienvenida = document.getElementById("seccionBienvenida"); // Agregado, ya que la tienes
const seccionModosJuego = document.getElementById("seccionModosJuego"); // Cambiado de clase a ID
const seccionIngresarPalabra = document.getElementById("seccionIngresarPalabra"); // Cambiado de clase a ID
const seccionJuego = document.getElementById("seccionJuego"); // Cambiado de clase a ID

// --- Botones de la Pantalla de Inicio y Selección de Modo ---
const botonInicio = document.getElementById("botonInicio"); // Cambiado de clase a ID
const botonSolitario = document.getElementById("botonSolitario"); // Cambiado de clase a ID
const botonVersus = document.getElementById("botonVersus"); // Cambiado de clase a ID
const botonOnline = document.getElementById("botonOnline"); // Cambiado de clase a ID

// --- Elementos de la Sección de Ingreso de Palabra en Modo VS ---
const inputPalabraVersus = document.getElementById("inputPalabraVersus");
const botonEnviarPalabra = document.getElementById("botonEnviarPalabra");
const botonCancelarVersus = document.getElementById("botonCancelarVersus");
const txtIngresarPalabraVersus = document.getElementById("mensajeIngresarPalabraVersus");

// --- Elementos de la Sección Principal del Juego ---
const imagenAhorcado = document.getElementById("imagen"); // OK - Coincide
const mensajeJuego = document.getElementById("mensajeJuego"); // <- En index.html es <p id="mensajeJuego" ...>
const inputGuiones = document.getElementById("palabra-guiones"); // <- En index.html es <p id="palabra-guiones" ...>
const inputLetrasOut = document.getElementById("letrasIncorrectasValor"); // <- En index.html es <span id="letrasIncorrectasValor">
const inputIngresaLetra = document.getElementById("inputAdivinarLetra"); // OK - Coincide
const botonSubirLetra = document.getElementById("botonSubirLetra"); // <- En index.html es <button id="botonSubirLetra" ...>
const botonReiniciar = document.getElementById("reiniciar"); // <- En index.html es <button id="reiniciar" ...>
const mensajeTurno = document.getElementById("mensajeTurno"); // <- En index.html es <p id="mensajeTurno" ...>
const letrasIncorrectasSpan = document.getElementById("letrasIncorrectasSpan"); // OK - Coincide
const botonVolverAlMenu = document.getElementById("volverAlMenu");

// --- Elementos para la seccion Online ---
const seccionOnline = document.getElementById("seccionOnline"); // Cambiado de clase a ID
const botonCrearPartida = document.getElementById("crearPartida"); // Cambiado de clase a ID
const inputIdPartida = document.getElementById("inputIdPartida"); // Cambiado de clase a ID
const botonUnirsePartida = document.getElementById("unirsePartida"); // Cambiado de clase a ID
const mensajeIdPartida = document.getElementById("mensajeIdPartida"); // Cambiado de clase a ID
const botonVolverModosOnline = document.getElementById("volverModosOnline");
const contenedorGameId = document.getElementById("contenedorGameId");
const displayGameId = document.getElementById("displayGameId");
const botonCopiarId = document.getElementById("botonCopiarId");
const contenedorBotonJuegoOnline = document.getElementById("contenedorBotonJuegoOnline");


// --- Variables de Estado del Frontend ---
let currentGameId = null; // Almacenará el ID de la partida activa
let currentMode = null;   // Almacenará el modo actual (solitario, versus, online)
let latestGameData = null; // Almacenará los últimos datos del juego recibidos

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
            seccion.classList.add("d-block"); // Por ejemplo, si un p o un div dentro de una sección fuera a mostrarse de forma individual
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

// --- Configuración de SignalR ---
const connection = new signalR.HubConnectionBuilder()
    .withUrl("http://127.0.0.1:5195/gamehub")
    .withAutomaticReconnect()
    .build();


// --- NUEVO: Manejar la desconexión del propio cliente ---
connection.onclose(async (error) => {
    console.log("Conexión SignalR cerrada. ", error);

    // Si la conexión se cerró inesperadamente (no por un disconnect intencional del cliente)
    // Esto se dispara si el servidor se cae, el cliente pierde internet, etc.
    if (connection.state === signalR.HubConnectionState.Disconnected) {
        alert("¡Conexión con el servidor perdida! Por favor, verifica tu conexión o el estado del servidor y vuelve a intentarlo.");
        
        // Limpiar cualquier estado de partida online en el cliente
        currentGameId = null;
        currentMode = null;
        latestGameData = null; // Reiniciar data del juego

        // Redirigir al usuario a la pantalla de modos de juego o bienvenida
        ocultarTodasLasSecciones();
        mostrarSeccion(seccionModosJuego); // O seccionBienvenida, según prefieras
    }
});

// Escucha eventos del Hub de SignalR
connection.on("ReceiveGameUpdate", (data) => {
    console.log("ReceiveGameUpdate recibido:", data);
    latestGameData = data; // Siempre almacena la última data recibida

    // Solo actualiza la UI si la sección de juego está actualmente visible.
    // Esto evita intentar actualizar elementos que están ocultos en otras secciones.
    if (seccionJuego.style.display !== 'none') { // Verifica si seccionJuego está visible
        actualizarUIJuego(data);
    } else {
        console.log("ReceiveGameUpdate recibido, pero seccionJuego no está visible. La UI se actualizará cuando el jugador entre a la sección de juego.");
     
    }
});

// --- NUEVO: Manejar la desconexión del oponente ---
connection.on("OpponentDisconnected", (gameId) => {
    console.log(`Tu oponente se desconectó de la partida ${gameId}.`);
    
    // Solo actuamos si la desconexión es de la partida actual
    if (currentGameId === gameId) {
        alert("¡Tu oponente se ha desconectado! La partida ha terminado.");
        
        // Limpiar estado del juego online en el cliente
        currentGameId = null;
        currentMode = null;
        latestGameData = null; // Reiniciar data del juego

        // Redirigir al usuario al menú principal (o modos de juego)
        ocultarTodasLasSecciones();
        mostrarSeccion(seccionModosJuego); 
    }
});


// Cuando un segundo jugador se une a una partida online
connection.on("PlayerJoined", (gameId, playerConnectionId) => {
    console.log(`Jugador ${playerConnectionId} se unió a la partida ${gameId}.`);
    if (gameId === currentGameId) {
        // Asumiendo que el backend envía el estado inicial del juego una vez que los dos jugadores están conectados
        // Opcional: Podrías hacer un fetch al endpoint de /juego/obtenerEstado si lo tienes para asegurarte de que la UI se actualice
        // al unirse el segundo jugador.
        mensajeJuego.textContent = "¡Otro jugador se ha unido! Comienza el juego.";
        mensajeJuego.style.color = "green";
        // Si el jugador creador está esperando, esto lo llevará a la pantalla de juego
        if (currentMode === "online") {
            ocultarTodasLasSecciones();
            mostrarSeccion(seccionJuego);
            // La UI del juego se actualizará automáticamente con el siguiente ReceiveGameUpdate
            // o con un fetch explícito si no hay un update inmediato del backend.
            inputIngresaLetra.disabled = false; // Habilitar input para el jugador que empieza el turno
            botonSubirLetra.disabled = false;
            mostrarSeccion(inputIngresaLetra);
            mostrarSeccion(botonSubirLetra);
            mensajeTurno.textContent = "Esperando que el juego inicie..."; // Será sobrescrito por el turno
            mostrarSeccion(mensajeTurno); // Asegurar que el mensaje de turno sea visible
        }
    }
});

// Inicia la conexión SignalR
async function startSignalRConnection() {
    try {
        await connection.start();
        console.log("Conexión SignalR establecida con éxito.");
        // Opcional: Podrías querer guardar el connectionId en alguna parte del estado si lo necesitas globalmente
        // console.log("Mi ConnectionId:", connection.connectionId);
    } catch (err) {
        console.error("Error al iniciar la conexión SignalR:", err);
        // Intentar reconectar después de un retraso
        setTimeout(startSignalRConnection, 5000);
    }
}

// --- Funciones de Lógica de Juego ---

function resetearUIJuego() {
    inputGuiones.value = " "; // Se inicializa con un espacio, el backend llenará con guiones
    inputLetrasOut.value = ""; // ¡Esto es clave para limpiar las letras incorrectas!
    imagenAhorcado.src = "img/ahorcadito_1.png"; // Imagen inicial del ahorcado
    mensajeJuego.textContent = ""; // Limpiar el mensaje
    inputIngresaLetra.value = ""; // Limpiar el input de letra
    inputIngresaLetra.disabled = false;
    botonSubirLetra.disabled = false;
    mostrarSeccion(inputIngresaLetra);
    mostrarSeccion(botonSubirLetra);
    ocultarSeccion(mensajeTurno); // Ocultar el mensaje de turno por defecto (solo se usa en online)
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

        resetearUIJuego(); // Primero reseteamos la UI
        ocultarTodasLasSecciones(); // Luego ocultamos todo
        mostrarSeccion(seccionJuego); // Y mostramos la sección de juego
        

        actualizarUIJuego(data); // Usamos la función actualizarUIJuego para el estado inicial
        // Con esto, se inicializa el mensajeJuego, guiones y demás.
        inputIngresaLetra.focus();
    } catch (error) {
        console.error("Error CATCHED al iniciar el juego:", error);
        mensajeJuego.textContent = `Error: ${error.message}. Por favor, reinicia o inténtalo de nuevo.`;
        mensajeJuego.style.color = "red"; // Añadir color para que sea más visible
    }
}

function actualizarUIJuego(data) {
    console.log("   Dentro de actualizarUIJuego. currentMode:", currentMode);
    console.log("   Datos recibidos para actualizar UI:", data);

    if (inputGuiones) { // Siempre es buena práctica verificar que el elemento existe
        inputGuiones.textContent = data.palabra.split('').join(' ');
    }
    if (inputLetrasOut) { // Este es el <span> donde se muestran las letras incorrectas
        // Si data.letrasIncorrectas es un array (ej. ["A", "B", "C"]), únelo a un string
        // Si ya es un string (ej. "A, B, C"), simplemente asígnalo
        inputLetrasOut.textContent = Array.isArray(data.letrasIncorrectas) ? data.letrasIncorrectas.join(", ") : data.letrasIncorrectas;
    }
    letrasIncorrectasSpan.textContent = `Letras incorrectas: ${data.letrasIncorrectas}`;

    const cantidadErradasCalculada = 6 - data.intentosRestantes;
    console.log("   cantidad de erradas:", cantidadErradasCalculada);

    imagenAhorcado.src = `img/ahorcadito_${Math.min(cantidadErradasCalculada + 1, 7)}.png`;

    if (data.juegoTerminado) {
        ocultarSeccion(botonSubirLetra);
        ocultarSeccion(inputIngresaLetra);
        ocultarSeccion(mensajeTurno);

        if (data.palabra === data.palabraSecreta) {
            mensajeJuego.textContent = `¡Felicidades! Has adivinado la palabra: ${data.palabraSecreta}`;
            imagenAhorcado.src = `img/ahorcadito_0.png`;
        } else {
            mensajeJuego.textContent = `¡GAME OVER! La palabra era: ${data.palabraSecreta}`;
            imagenAhorcado.src = `img/ahorcadito_7.png`;
        }
        mostrarSeccion(botonReiniciar);
        console.log("   Juego Terminado detectado.");

    } else {
        // Si el juego NO ha terminado:
        mostrarSeccion(inputIngresaLetra);
        mostrarSeccion(botonSubirLetra);
        ocultarSeccion(botonReiniciar);

        if (currentMode === "online") {
            console.log("   Modo online detectado. Evaluando turno.");
            mostrarSeccion(mensajeTurno); // Asegurar que el mensaje de turno sea visible en online

            // *** ESTO ES CLAVE PARA EL JUGADOR 1 (CREADOR) ***
            // Si la partida está lista para empezar (turno asignado)
            // Y la sección de juego NO está visible (porque J1 sigue en la pantalla de ID)
            // Entonces, fuerza la transición a la sección de juego.
            if (data.turnoActualConnectionId && data.turnoActualConnectionId !== "" && seccionJuego.style.display === "none") {
                 console.log("   J1: Partida lista y sección de juego no visible. Transicionando a la sección de juego.");
                 ocultarTodasLasSecciones();
                 mostrarSeccion(seccionJuego);
                 // Importante: Después de la transición, la lógica del turno de abajo se ejecutará para actualizar la UI
            }

            // *** Lógica de mensaje de turno y habilitar/deshabilitar input para modo ONLINE ***
            // ESTE BLOQUE DEBE IR DESPUÉS DE LA TRANSICIÓN DE SECCIÓN (si aplica).
            const myConnectionId = connection.connectionId;
            console.log(`   My connectionId: ${myConnectionId}, Turno actual: ${data.turnoActualConnectionId}`);

            if (data.turnoActualConnectionId && myConnectionId) {
                if (data.turnoActualConnectionId === myConnectionId) {
                    mensajeTurno.textContent = "¡Es tu turno!";
                    mensajeJuego.textContent = "Ingresa una Letra";
                    inputIngresaLetra.disabled = false;
                    botonSubirLetra.disabled = false;
                    console.log("   Es mi turno.");
                } else {
                    mensajeTurno.textContent = "Espera tu turno.";
                    mensajeJuego.textContent = "El otro jugador está adivinando.";
                    inputIngresaLetra.disabled = true;
                    botonSubirLetra.disabled = true;
                    console.log("   Es el turno del otro jugador.");
                }
            } else {
                // Caso inicial en online antes de que ambos jugadores se unan o turno se asigne
                mensajeJuego.textContent = "Esperando a otro jugador...";
                inputIngresaLetra.disabled = true;
                botonSubirLetra.disabled = true;
                console.log("   Modo online: Esperando a otro jugador (turno no asignado).");
            }
        } else {
            // Para modos solitario y versus:
            console.log("   Modo solitario/versus detectado.");
            ocultarSeccion(mensajeTurno);
            mensajeJuego.textContent = "Ingresa una Letra";
            inputIngresaLetra.disabled = false;
            botonSubirLetra.disabled = false;
        }
    }

    inputIngresaLetra.value = "";
    inputIngresaLetra.focus();
}

// --- Lógica para Crear Partida Online ---
async function crearNuevaPartidaOnline() {
    try {
        const connectionId = connection.connectionId;
        if (!connectionId) {
            mensajeIdPartida.textContent = "Error: Conexión SignalR no establecida. Inténtalo de nuevo.";
            mensajeIdPartida.style.color = "red";
            return;
        }

        mensajeIdPartida.textContent = "Creando partida online...";
        mensajeIdPartida.style.color = "blue";
        
        // --- Ocultar elementos de creación/unión ---
        ocultarSeccion(botonCrearPartida);
        ocultarSeccion(botonUnirsePartida);
        ocultarSeccion(inputIdPartida); // Ahora solo se usará para UNIRSE
        ocultarSeccion(botonVolverModosOnline); // Ocultar temporalmente para no confundir
        
        // Asegurarse de que el contenedor del ID esté oculto al inicio de la creación
        ocultarSeccion(contenedorGameId);

        const response = await fetch("http://127.0.0.1:5195/api/juego/crear-online", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ creatorConnectionId: connectionId }),
            credentials: 'include'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error al crear partida online: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        const gameId = data.gameId;

        currentGameId = gameId;
        currentMode = "online";

        console.log("J1: Partida creada. currentGameId:", currentGameId, "currentMode:", currentMode);

        await connection.invoke("JoinGameGroup", gameId);
        console.log(`Creador (${connection.connectionId}) unido al grupo de SignalR para la partida: ${gameId}`);

        // --- Mostrar el Game ID y el botón Copiar ---
        mensajeIdPartida.textContent = "¡Partida creada! Comparte este ID:";
        mensajeIdPartida.style.color = "black"; // Resetear a color normal
        
        displayGameId.textContent = gameId; // Mostrar el ID en el span
        mostrarSeccion(contenedorGameId); // Mostrar el contenedor con el ID y el botón Copiar

        // Listener para el botón Copiar ID
        botonCopiarId.onclick = async () => {
            try {
                await navigator.clipboard.writeText(gameId);
                mensajeIdPartida.textContent = `ID '${gameId}' copiado. ¡Compártelo!`;
                mensajeIdPartida.style.color = "green";
            } catch (err) {
                console.error('Error al copiar el ID:', err);
                mensajeIdPartida.textContent = `No se pudo copiar. Copia manualmente: ${gameId}`;
                mensajeIdPartida.style.color = "orange";
            }
        };

        // --- Crear/obtener y mostrar el botón "Ir al Juego (esperar)" ---
        let botonIrAlJuego = document.getElementById("botonIrAlJuegoOnline"); // Cambiamos el ID para claridad
        if (!botonIrAlJuego) {
            botonIrAlJuego = document.createElement("button");
            botonIrAlJuego.id = "botonIrAlJuegoOnline";
            botonIrAlJuego.textContent = "Ir al Juego (esperar)";
            // Añadir clases de Bootstrap para que se vea como un botón normal
            botonIrAlJuego.classList.add("btn", "btn-success", "mt-3", "w-100"); // Ej: btn-success para verde, mt-3 para margen
            contenedorBotonJuegoOnline.appendChild(botonIrAlJuego); // Insertar en el nuevo contenedor
        }
        mostrarSeccion(botonIrAlJuego);
        mostrarSeccion(botonVolverModosOnline); // Volver a mostrar este botón para que pueda salir si quiere

        botonIrAlJuego.onclick = async () => {
            console.log("J1: Clic en 'Ir al Juego (esperar)'. Navegando a la sección de juego.");
            ocultarTodasLasSecciones();
            mostrarSeccion(seccionJuego);
           // --- LÓGICA CLAVE AQUÍ ---
    // Si ya tenemos datos de la partida (porque J2 se unió y el backend envió la actualización),
    // usamos esos datos para actualizar inmediatamente la UI.
    if (latestGameData && latestGameData.gameId === currentGameId) {
        console.log("J1: Actualizando UI con latestGameData al entrar al juego (J2 ya unido).");
        actualizarUIJuego(latestGameData);
    } else {
        // Si no hay 'latestGameData' o el gameId no coincide (J2 aún no se ha unido),
        // mostramos el mensaje de espera. El ReceiveGameUpdate llegará después.
        console.log("J1: J2 aún no se ha unido. Mostrando mensaje de espera inicial.");
        mensajeJuego.textContent = "Esperando que otro jugador se una...";
        mensajeJuego.style.color = "blue";
        // Asegúrate de que el input y botón de adivinar estén deshabilitados inicialmente
        inputIngresaLetra.disabled = true;
        botonSubirLetra.disabled = true;
    }
    // --- FIN LÓGICA CLAVE ---

            
            // Ocultar el botón "Ir al Juego" y el contenedor del ID una vez que se va al juego
            ocultarSeccion(botonIrAlJuego);
            ocultarSeccion(contenedorGameId);
        };

    } catch (error) {
        console.error("Error CATCHED al crear partida online:", error);
        mensajeIdPartida.textContent = `Error: ${error.message}`;
        mensajeIdPartida.style.color = "red";
        // En caso de error, restaurar la UI de la sala de espera
        // Ocultar el botón "Ir al Juego" si existe
        const botonIrAlJuego = document.getElementById("botonIrAlJuegoOnline");
        if (botonIrAlJuego) ocultarSeccion(botonIrAlJuego);
        ocultarSeccion(contenedorGameId); // Ocultar el display del ID

        // Mostrar los controles principales de la sala
        ocultarTodasLasSecciones(); // Limpia antes de mostrar lo correcto
        mostrarSeccion(seccionOnline);
        mostrarSeccion(botonCrearPartida);
        mostrarSeccion(botonUnirsePartida);
        mostrarSeccion(inputIdPartida);
        inputIdPartida.readOnly = false;
        mostrarSeccion(botonVolverModosOnline);
    }
}

// --- Lógica para Unirse a Partida Online ---
async function unirseAPartidaOnline(gameId) {
    try {
        const connectionId = connection.connectionId;
        if (!connectionId) {
            console.error("Error: Conexión SignalR no establecida para unirse.");
            mensajeIdPartida.textContent = "Error: Conexión SignalR no establecida. Intenta de nuevo.";
            mensajeIdPartida.style.color = "red";
            return;
        }

        console.log(`J2: Intentando unirse a partida ${gameId} con connectionId ${connectionId}`);

        mensajeIdPartida.textContent = "Uniéndose a la partida...";
        mensajeIdPartida.style.color = "blue";
        inputIdPartida.readOnly = true; // Deshabilitar mientras se une

        // Aquí mantenemos el seteo de currentGameId y currentMode
        currentGameId = gameId;
        currentMode = "online";
        console.log(`J2: currentGameId: ${currentGameId}, currentMode: ${currentMode} antes de JoinGameGroup`);

        // Primero nos unimos al grupo de SignalR
        await connection.invoke("JoinGameGroup", gameId);
        console.log(`J2: Jugador 2 (${connection.connectionId}) unido al grupo SignalR: ${gameId}`);

        // Luego de unirse al grupo de SignalR, hacemos la llamada HTTP para registrarse en el GameManager
        const response = await fetch("http://127.0.0.1:5195/api/juego/unirse-online", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gameId: gameId, playerConnectionId: connectionId }),
            credentials: 'include'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error al unirse a partida online: ${response.status} - ${errorText}`);
        }
        const data = await response.json(); // Esto es JuegoEstadoResponse del Jugador 2
        console.log("J2: Respuesta de unirse-online (HTTP):", data);

        // Mensaje de éxito de unión
        mensajeIdPartida.textContent = `¡Te has unido a la partida ${gameId} exitosamente!`;
        mensajeIdPartida.style.color = "green";

        // Cambiar a la sección de juego y dejar que actualizarUIJuego maneje los mensajes de turno
        ocultarTodasLasSecciones();
        mostrarSeccion(seccionJuego);
        actualizarUIJuego(data); // Esto actualizará la UI del Jugador 2 con el estado inicial del juego.

        // Limpiar el input de ID de partida y mensaje, ya que ya estamos en la sección de juego
        inputIdPartida.value = "";
        mensajeIdPartida.textContent = "";

    } catch (error) {
        console.error("Error al unirse a partida online:", error);
        mensajeIdPartida.textContent = `Error al unirse: ${error.message}`;
        mensajeIdPartida.style.color = "red";
        
        // Restaurar la UI de la sala de espera para reintentar
        ocultarTodasLasSecciones();
        mostrarSeccion(seccionOnline);
        
        // Asegúrate de que los botones y el input estén visibles y habilitados para reintentar
        mostrarSeccion(botonCrearPartida);
        mostrarSeccion(botonUnirsePartida);
        mostrarSeccion(inputIdPartida);
        inputIdPartida.readOnly = false; // Habilitar edición nuevamente
        
        // También asegúrate de ocultar los elementos de la sección de creación si estaban visibles
        ocultarSeccion(contenedorGameId);
        const botonIrAlJuego = document.getElementById("botonIrAlJuegoOnline");
        if (botonIrAlJuego) ocultarSeccion(botonIrAlJuego);
    }
}

async function manejarEnvioLetra(letra) { // <--- ¡AQUÍ: ACEPTA 'letra' COMO ARGUMENTO!
    console.log("Enviando letra:", letra); // Para depuración

   
    if (!currentGameId) {
        mensajeJuego.textContent = "Error: No hay una partida activa.";
        inputIngresaLetra.disabled = false; // Asegurarse de re-habilitar en caso de error temprano
        botonSubirLetra.disabled = false;
        return;
    }


    try {
        if (currentMode === 'solitario' || currentMode === 'versus') {
            const response = await fetch("http://127.0.0.1:5195/api/juego/adivinarLetraLocal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    GameId: currentGameId,
                    Letra: letra // Usas la 'letra' que recibes como argumento
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "Error desconocido al procesar la letra." }));
                mensajeJuego.textContent = `Error: ${errorData.message || response.statusText}`;
                mensajeJuego.style.color = "red"; // Asegurar que el error se muestre en rojo
                inputIngresaLetra.value = "";
                inputIngresaLetra.focus();
                inputIngresaLetra.disabled = false; // Re-habilitar
                botonSubirLetra.disabled = false;    // Re-habilitar
                return;
            }

            const data = await response.json();
            actualizarUIJuego(data); // `actualizarUIJuego` debe re-habilitar el input/botón si el juego continúa

        } else if (currentMode === 'online') {
            if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
                mensajeJuego.textContent = "Error: Conexión SignalR no establecida o no activa.";
                mensajeJuego.style.color = "red"; // Asegurar que el error se muestre en rojo
                inputIngresaLetra.disabled = false; // Re-habilitar
                botonSubirLetra.disabled = false;    // Re-habilitar
                return;
            }

            const playerConnectionId = connection.connectionId;
            if (!playerConnectionId) {
                mensajeJuego.textContent = "Error: No se pudo obtener el ID de conexión de SignalR.";
                mensajeJuego.style.color = "red"; // Asegurar que el error se muestre en rojo
                inputIngresaLetra.disabled = false; // Re-habilitar
                botonSubirLetra.disabled = false;    // Re-habilitar
                return;
            }

            await connection.invoke("ProcessLetter", currentGameId, letra); // Usas la 'letra' que recibes
           
            
        } else {
            mensajeJuego.textContent = "Error: Modo de juego no reconocido. No se puede enviar la letra.";
            mensajeJuego.style.color = "red"; // Asegurar que el error se muestre en rojo
            inputIngresaLetra.disabled = false; // Re-habilitar
            botonSubirLetra.disabled = false;    // Re-habilitar
            return;
        }

    } catch (error) {
        console.error("Error CATCHED al enviar letra:", error);
        mensajeJuego.textContent = `Error: ${error.message || "Un error inesperado ocurrió."}`;
        mensajeJuego.style.color = "red";
        inputIngresaLetra.disabled = false; // Re-habilitar
        botonSubirLetra.disabled = false;    // Re-habilitar
    }
}

async function reiniciarJuego() {
    try {
        if (!currentGameId) {
            console.warn("No hay GameId activo para reiniciar. Volviendo al menú principal.");
            ocultarTodasLasSecciones();
            inicializarUI(); // Volvemos a la UI inicial
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
        inicializarUI(); // Vuelve a la pantalla de inicio limpia
        resetearUIJuego(); // Para asegurar que la UI del juego esté limpia si se vuelve a jugar
    } catch (error) {
        console.error("Error CATCHED al reiniciar juego:", error);
        mensajeJuego.textContent = `Error al reiniciar: ${error.message}`;
    }
}

// --- Event Listeners de Botones ---

if (botonInicio) { // Siempre es buena práctica verificar si el elemento existe antes de añadir un listener
    botonInicio.addEventListener("click", function(event) {
        event.preventDefault(); // Previene el comportamiento por defecto del botón (si fuera un submit de formulario, por ejemplo)

        console.log("Clic en Iniciar Juego - Transicionando a Modos de Juego"); // Para depuración

        // 1. Ocultar la SECCIÓN COMPLETA de bienvenida
        ocultarSeccion(seccionBienvenida);

        // 2. Mostrar la SECCIÓN COMPLETA de modos de juego
        mostrarSeccion(seccionModosJuego);

    
        ocultarSeccion(inputIdPartida);
        ocultarSeccion(botonCrearPartida);
        ocultarSeccion(botonUnirsePartida);
        ocultarSeccion(mensajeIdPartida);
        ocultarSeccion(botonVolverModosOnline);
    });
}

botonSolitario.addEventListener("click", async function(event) {
    event.preventDefault();
    // No necesitamos pasar palabraVersus para solitario
    await iniciarJuego("solitario");
});

botonVersus.addEventListener("click", function(event) {
    event.preventDefault();
    currentMode = 'versus';
    ocultarTodasLasSecciones();
    mostrarSeccion(seccionIngresarPalabra);
    inputPalabraVersus.value = ""; // Limpiar el input al entrar
    txtIngresarPalabraVersus.textContent = "Ingresa una palabra de 4 a 8 letras para tu amigo"; // Resetear mensaje
    inputPalabraVersus.focus();
});

if (botonOnline) {
    botonOnline.addEventListener("click", () => {
        console.log("Modo Online seleccionado.");
        currentMode = 'online';
        ocultarSeccion(seccionModosJuego);
        mostrarSeccion(seccionOnline);

        // --- AÑADIR ESTAS LÍNEAS ---
        ocultarSeccion(contenedorGameId); // Ocultar el display del ID al inicio
        const botonIrAlJuego = document.getElementById("botonIrAlJuegoOnline");
        if (botonIrAlJuego) ocultarSeccion(botonIrAlJuego); // Ocultar el botón Ir al Juego
        // --- FIN AÑADIR ESTAS LÍNEAS ---


        // --- Asegurarse de que todos los elementos de online estén visibles y habilitados ---
        mensajeIdPartida.textContent = "Crea una partida o únete a una existente:"; // Resetear mensaje
        mensajeIdPartida.style.color = "black"; // Resetear color
        mostrarSeccion(mensajeIdPartida);
        
        inputIdPartida.value = ""; // Limpiar cualquier ID previo
        inputIdPartida.readOnly = false; // ¡IMPORTANTE! Habilitar para escribir
        inputIdPartida.disabled = false; // ¡IMPORTANTE! Habilitar input
        mostrarSeccion(inputIdPartida);
        
        botonCrearPartida.disabled = false; // ¡IMPORTANTE! Habilitar botón
        mostrarSeccion(botonCrearPartida);
        
        botonUnirsePartida.disabled = false; // ¡IMPORTANTE! Habilitar botón
        mostrarSeccion(botonUnirsePartida);
        
        // Asegúrate de que el botón de continuar esté oculto si existe
        const botonContinuar = document.getElementById("botonContinuarOnline");
        if (botonContinuar) ocultarSeccion(botonContinuar);

        mostrarSeccion(botonVolverModosOnline); // Este botón siempre visible en esta sección
        // --- FIN de aseguramiento de elementos online ---
    });
}

botonCrearPartida.addEventListener("click", async () => {
    console.log("Creando nueva partida online...");
    await crearNuevaPartidaOnline();
});

botonUnirsePartida.addEventListener("click", async () => {
    currentMode = 'online';
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
    ocultarTodasLasSecciones(); // Ocultar todas las secciones (incluida seccionOnline)
    inicializarUI(); // Volver a la pantalla de inicio de los modos de juego
});

botonEnviarPalabra.addEventListener("click", async function(event) {
    event.preventDefault();
    const palabra = inputPalabraVersus.value.toUpperCase().trim();

    if (palabra.length < 4 || palabra.length > 8) {
        txtIngresarPalabraVersus.textContent = "La palabra debe tener entre 4 y 8 letras.";
        inputPalabraVersus.focus();
        return;
    }
    if (!/^[A-ZÑ]+$/.test(palabra)) {
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
    inicializarUI(); // Vuelve a la pantalla de inicio limpia
    inputPalabraVersus.value = "";
    txtIngresarPalabraVersus.textContent = "Ingresa una palabra de 4 a 8 letras para tu amigo";
});

if (botonSubirLetra) {
    botonSubirLetra.addEventListener("click", async (event) => {
        event.preventDefault(); // Previene el comportamiento por defecto del formulario

        const letraIngresada = inputIngresaLetra.value.toUpperCase().trim();
        
        // 1. Validación de Vacío
        if (letraIngresada.length === 0) {
            mensajeJuego.textContent = "Por favor, ingresa una letra.";
            mensajeJuego.style.color = "red";
            inputIngresaLetra.focus();
            return;
        }

        // 2. Validación de una sola letra y solo letras (A-Z, Ñ)
        if (letraIngresada.length !== 1 || !/^[A-ZÑ]$/.test(letraIngresada)) {
            mensajeJuego.textContent = "Ingresa una sola letra válida (A-Z, Ñ).";
            mensajeJuego.style.color = "red";
            inputIngresaLetra.value = "";
            inputIngresaLetra.focus();
            return;
        }

        // 3. Validación de letra YA ADIVINADA
        const letrasCorrectasAdivinadas = inputGuiones.textContent.replace(/ /g, '').split('');
        const letrasIncorrectasAdivinadas = inputLetrasOut.textContent.replace(/, /g, '').split('');
        
        const letrasYaIntentadas = [...letrasCorrectasAdivinadas, ...letrasIncorrectasAdivinadas]
                                    .filter(char => char !== '_' && char !== '');
        
        const setLetrasYaIntentadas = new Set(letrasYaIntentadas);

        if (setLetrasYaIntentadas.has(letraIngresada)) {
            mensajeJuego.textContent = `Ya enviaste la Letra ${letraIngresada} anteriormente. Intenta con otra.`;
            mensajeJuego.style.color = "orange";
            inputIngresaLetra.value = "";
            inputIngresaLetra.focus();
            return;
        }
        
        // Si todas las validaciones pasan, PASAMOS LA LETRA COMO ARGUMENTO
        //mensajeJuego.textContent = "Adivinando...";
        //mensajeJuego.style.color = "black";

        await manejarEnvioLetra(letraIngresada); // <-- ¡AHORA PASA LA LETRA AQUÍ!
        inputIngresaLetra.value = ""; // Limpiar el input después de enviar
    });
}

// --- NUEVO: Manejar el evento 'Enter' en el input de adivinar letra ---
if (inputIngresaLetra) {
    inputIngresaLetra.addEventListener("keydown", (event) => {
        // Verificar si la tecla presionada es 'Enter' (código 13 o 'Enter' por nombre de tecla)
        if (event.key === "Enter" || event.keyCode === 13) {
            event.preventDefault(); // Previene el comportamiento por defecto (ej. submit de formulario, salto de línea)
            
            // Simula un clic en el botón de subir letra
            botonSubirLetra.click(); 
        }
    });
}


// --- Event Listener para el botón Reiniciar Partida ---
if (botonReiniciar) {
    botonReiniciar.addEventListener("click", () => {
        console.log("Clic en 'Reiniciar Partida'. Modo actual:", currentMode);

        ocultarTodasLasSecciones(); // Limpia la UI para la nueva pantalla

        // Reinicia la partida según el modo de juego actual
        if (currentMode === 'solitario') {
            iniciarJuego('solitario'); // Inicia una nueva partida en modo solitario
        } else if (currentMode === 'versus') {
            // Regresa a la pantalla de ingreso de palabra para el modo Versus
            mostrarSeccion(seccionIngresarPalabra);
            inputPalabraVersus.value = ""; // Limpiar el input
            txtIngresarPalabraVersus.textContent = "Ingresa una palabra de 4 a 8 letras para tu amigo"; // Resetear mensaje
            inputPalabraVersus.focus();
        } else if (currentMode === 'online') {
            // --- Reseteo de la sección online para permitir crear/unirse ---
            mostrarSeccion(seccionOnline);
            
            mensajeIdPartida.textContent = "Crea una partida o únete a una existente:";
            mensajeIdPartida.style.color = "black"; // Resetear color
            mostrarSeccion(mensajeIdPartida);
            
            inputIdPartida.value = ""; // Limpiar ID previo
            inputIdPartida.readOnly = false; // Habilitar para escribir
            inputIdPartida.disabled = false; // Habilitar input
            mostrarSeccion(inputIdPartida);
            
            botonCrearPartida.disabled = false; // Habilitar botón
            mostrarSeccion(botonCrearPartida);
            
            botonUnirsePartida.disabled = false; // Habilitar botón
            mostrarSeccion(botonUnirsePartida);

            // Asegúrate de que el botón "Ir al Juego" esté oculto si existe
            const botonContinuar = document.getElementById("botonContinuarOnline");
            if (botonContinuar) ocultarSeccion(botonContinuar);
            
            mostrarSeccion(botonVolverModosOnline);
            // --- FIN del reseteo de la sección online ---
        } else {
            // Fallback por si currentMode no está definido (aunque no debería pasar con los pasos anteriores)
            console.warn("Modo de juego no definido al reiniciar. Volviendo a selección de modos.");
            mostrarSeccion(seccionModosJuego);
        }
    
         // --- AÑADIR ESTAS LÍNEAS (para el reseteo de la sala online) ---
         ocultarSeccion(contenedorGameId); // Ocultar el display del ID al reiniciar
         const botonIrAlJuego = document.getElementById("botonIrAlJuegoOnline");
         if (botonIrAlJuego) ocultarSeccion(botonIrAlJuego); // Ocultar el botón Ir al Juego
         // --- FIN AÑADIR ESTAS LÍNEAS ---
    
    });
}

inputIngresaLetra.addEventListener("keypress", async function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        await manejarEnvioLetra();
    }
});

if (botonVolverAlMenu) {
    botonVolverAlMenu.addEventListener("click", () => {
        console.log("Clic en 'Volver al Menú'.");
        // Reinicia la UI completamente para volver a la pantalla inicial
        // Esto oculta todas las secciones y muestra la bienvenida
        inicializarUI(); 
    });
}


// Inicializar la interfaz al cargar la página
function inicializarUI() {
    ocultarTodasLasSecciones(); // Primero, asegura que todo esté oculto usando la nueva lógica.

    // La pantalla de bienvenida es la primera que se muestra al inicio
    mostrarSeccion(seccionBienvenida); // Ahora mostramos la sección de bienvenida

    currentMode = null;

    // Ocultar todos los elementos de la sección online por defecto
    // (Estos ya están ocultos por ocultarTodasLasSecciones, pero se mantienen para claridad si se necesita un override)
    ocultarSeccion(seccionOnline);
    ocultarSeccion(mensajeIdPartida);
    ocultarSeccion(inputIdPartida);
    ocultarSeccion(botonCrearPartida);
    ocultarSeccion(botonUnirsePartida);
    ocultarSeccion(botonVolverModosOnline);
    let botonContinuar = document.getElementById("botonContinuarOnline");
    if (botonContinuar) ocultarSeccion(botonContinuar);

    // Ocultar la sección de ingreso de palabra
    ocultarSeccion(seccionIngresarPalabra);
    inputPalabraVersus.value = "";
    // Usar el selector correcto para txtIngresarPalabraVersus si lo cambiaste a ID
    txtIngresarPalabraVersus.textContent = "Ingresa una palabra de 4 a 8 letras para tu amigo";

    // Ocultar la sección de juego y sus elementos
    ocultarSeccion(seccionJuego);
    resetearUIJuego();
    ocultarSeccion(inputIngresaLetra);
    ocultarSeccion(botonSubirLetra);
    ocultarSeccion(botonReiniciar);
    ocultarSeccion(mensajeTurno);
}

// Llama a la función de inicialización y SignalR cuando el DOM esté completamente cargado
document.addEventListener("DOMContentLoaded", () => {
    inicializarUI();
    startSignalRConnection();
});
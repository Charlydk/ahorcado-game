// --- Elementos HTML de la interfaz (Selección de Modo, Ingreso de Palabra VS, Área de Juego) ---
const seccionModosJuego = document.querySelector(".seccion-modos-juego");
const seccionIngresarPalabra = document.querySelector(".seccion-ingresar-palabra");
const seccionJuego = document.querySelector(".seccion-juego");
const seccionMenu = document.getElementById("seccionMenu"); // Asegúrate de que este elemento realmente se use o elimínalo si no

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
const mensajeTurno = document.querySelector(".mensaje-turno"); // Mensaje específico para el turno en online
const letrasIncorrectasSpan = document.getElementById("letrasIncorrectasSpan");


// --- Elementos para la seccion Online ---
const seccionOnline = document.querySelector(".seccion-online");
const botonCrearPartida = document.querySelector(".boton-crear-partida");
const inputIdPartida = document.querySelector(".input-id-partida");
const botonUnirsePartida = document.querySelector(".boton-unirse-partida");
const mensajeIdPartida = document.querySelector(".mensaje-id-partida");
const botonVolverModosOnline = seccionOnline.querySelector(".volver-modos"); // Correcto: buscar dentro de seccionOnline

// --- Variables de Estado del Frontend ---
let currentGameId = null; // Almacenará el ID de la partida activa
let currentMode = null;   // Almacenará el modo actual (solitario, versus, online)

// --- Funciones de Utilidad para Mostrar/Ocultar Secciones ---
function mostrarSeccion(seccion) {
    // console.log("Mostrando:", seccion.id || seccion.className || seccion.tagName); // Para depuración
    if (seccion) { // Agregamos esta verificación para evitar errores si el elemento no existe
        if (seccion === seccionModosJuego || seccion === seccionIngresarPalabra || seccion === seccionJuego || seccion === seccionOnline || seccion === seccionMenu) {
            seccion.style.display = "flex";
        } else {
            seccion.style.display = "block";
        }
    }
}

function ocultarSeccion(seccion) {
    // console.log("Ocultando:", seccion.id || seccion.className || seccion.tagName); // Para depuración
    if (seccion) { // Agregamos esta verificación
        seccion.style.display = "none";
    }
}

function ocultarTodasLasSecciones() {
    const secciones = [seccionModosJuego, seccionIngresarPalabra, seccionJuego, seccionOnline, seccionMenu];
    secciones.forEach(seccion => {
        ocultarSeccion(seccion); // Usamos la función ocultarSeccion para manejar el `if (seccion)`
    });
    // Adicionalmente, ocultar elementos que no son secciones completas pero se gestionan su visibilidad
    ocultarSeccion(botonSolitario);
    ocultarSeccion(botonVersus);
    ocultarSeccion(botonOnline);
    ocultarSeccion(botonInicio); // Asegurarse que el botón de inicio también se oculte si se llama desde otros lugares
    ocultarSeccion(inputIdPartida); // Ocultar por defecto en el reset
    ocultarSeccion(botonCrearPartida);
    ocultarSeccion(botonUnirsePartida);
    ocultarSeccion(botonVolverModosOnline);

    let botonContinuar = document.getElementById("botonContinuarOnline");
    if (botonContinuar) ocultarSeccion(botonContinuar); // Asegurar que el botón de continuar online se oculte
}

// --- Configuración de SignalR ---
const connection = new signalR.HubConnectionBuilder()
    .withUrl("http://127.0.0.1:5195/gamehub")
    .withAutomaticReconnect()
    .build();

// Escucha eventos del Hub de SignalR
connection.on("ReceiveGameUpdate", (data) => {
    console.log("Actualización de juego recibida via SignalR:", data);

    console.log("--- ReceiveGameUpdate recibido ---"); // Nuevo log para marcar el inicio
    console.log(`  Source: ${connection.connectionId === data.turnoActualConnectionId ? 'Propio Turno' : 'Otro Jugador'}`); // Interesante para depurar
    console.log(`  Actualización de juego recibida via SignalR (para ${connection.connectionId}):`, data);
    console.log(`  currentGameId local: ${currentGameId}, gameId en data: ${data.gameId}`); // Nuevo log


    if (data.gameId === currentGameId) { // Solo actualizar si es la partida actual
        console.log("  Coincide gameId. Actualizando UI..."); // Nuevo log
        actualizarUIJuego(data);
    } else {
        console.log("  No coincide gameId. Ignorando actualización."); // Nuevo log
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
        // Opcional: mostrar botón de reiniciar o volver a modos
    }
}

function actualizarUIJuego(data) {
    console.log("   Dentro de actualizarUIJuego. currentMode:", currentMode);
    console.log("   Datos recibidos para actualizar UI:", data);

    inputGuiones.value = data.palabra;
    inputLetrasOut.value = data.letrasIncorrectas;
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
        inputIdPartida.value = "";
        ocultarSeccion(botonCrearPartida);
        ocultarSeccion(botonUnirsePartida);
        ocultarSeccion(inputIdPartida); // Ocultar input al crear para no confundir

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

        console.log("J1: Partida creada. currentGameId:", currentGameId, "currentMode:", currentMode); // Nuevo log


        // *** CAMBIO CLAVE AQUI ***
        // Inmediatamente después de crear la partida y obtener el gameId,
        // el creador se une al grupo de SignalR de esa partida.
        await connection.invoke("JoinGame", gameId);
        console.log(`Creador (${connection.connectionId}) unido al grupo de SignalR para la partida: ${gameId}`);
        // *** FIN DEL CAMBIO CLAVE ***

        // Mostrar los elementos específicos de la sección online para mostrar el ID
        mostrarSeccion(seccionOnline); // Asegurarse de que seccionOnline esté visible

        mensajeIdPartida.textContent = `Partida creada. ID: ${gameId}. Copia este ID y compártelo.`;
        mensajeIdPartida.style.color = "green";

        // Mostrar el input con el ID de solo lectura y un botón para ir al juego
        mostrarSeccion(inputIdPartida);
        inputIdPartida.value = gameId;
        inputIdPartida.readOnly = true;

        let botonContinuar = document.getElementById("botonContinuarOnline");
        if (!botonContinuar) {
            botonContinuar = document.createElement("button");
            botonContinuar.id = "botonContinuarOnline";
            botonContinuar.textContent = "Ir al Juego (esperar)";
            botonContinuar.classList.add("botonInicio"); // O cualquier clase de estilo de botón que uses
            // Insertar después del inputIdPartida (o de mensajeIdPartida, según tu diseño)
            seccionOnline.appendChild(botonContinuar); // Añadirlo directamente a seccionOnline
        }
        mostrarSeccion(botonContinuar);

        // Cuando se haga clic en el botón "Continuar", el jugador va a la UI del juego,
        // pero YA ESTÁ UNIDO al grupo de SignalR.
        botonContinuar.onclick = async () => {
            console.log("J1: Clic en 'Ir al Juego (esperar)'. Navegando a la sección de juego."); // Nuevo log

            // Cambiar a la sección de juego
            ocultarTodasLasSecciones(); // Oculta todo
            mostrarSeccion(seccionJuego); // Muestra solo la sección de juego
            
            // *** QUITA O COMENTA ESTAS LÍNEAS ***
            // mensajeJuego.textContent = "Esperando a otro jugador..."; // <-- QUITA ESTO
            // mostrarSeccion(mensajeTurno); // <-- QUITA ESTO
            // inputIngresaLetra.disabled = true; // <-- QUITA ESTO
            // botonSubirLetra.disabled = true; // <-- QUITA ESTO
            // ocultarSeccion(inputIngresaLetra); // <-- QUITA ESTO
            // ocultarSeccion(botonSubirLetra); // <-- QUITA ESTO
            // *** FIN DE LAS LÍNEAS A QUITAR ***

            ocultarSeccion(botonContinuar); // Ocultar el botón de continuar una vez que se va al juego
            
            // La UI será actualizada por el ReceiveGameUpdate que ya se recibió o que llegará.
            // Si el Jugador 2 ya se unió y el ReceiveGameUpdate llegó, la UI ya debería estar correcta.
            // Si el Jugador 2 AÚN NO se unió, entonces el estado inicial que viene del backend
            // (a través de algún ReceiveGameUpdate si lo envías al crear, o simplemente
            // por la inicialización de la UI) deberá ser el de "Esperando".
            // Sin embargo, en el backend, cuando creas la partida, el creador tiene el primer turno
            // (lo vimos en tu GameManager.cs `TurnoActualConnectionId = connectionId;`).
            // Por lo tanto, si el backend te da el turno, la UI debería reflejarlo.
        };

    } catch (error) {
        console.error("Error CATCHED al crear partida online:", error);
        mensajeIdPartida.textContent = `Error: ${error.message}`;
        mensajeIdPartida.style.color = "red";
        // En caso de error, restaurar la UI para permitir reintentar o volver
        ocultarTodasLasSecciones();
        mostrarSeccion(seccionOnline); // Volver a la sección de online
        mostrarSeccion(botonCrearPartida);
        mostrarSeccion(botonUnirsePartida);
        mostrarSeccion(inputIdPartida);
        inputIdPartida.readOnly = false;
        ocultarSeccion(document.getElementById("botonContinuarOnline")); // Ocultar si existía
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

        console.log(`J2: Intentando unirse a partida ${gameId} con connectionId ${connectionId}`); // Nuevo log


        mensajeIdPartida.textContent = "Uniéndose a la partida...";
        mensajeIdPartida.style.color = "blue";
        inputIdPartida.readOnly = true; // Deshabilitar mientras se une



        // *** CAMBIO AQUI PARA JUGADOR 2 ***
        currentGameId = gameId; // Setear currentGameId antes de unirse al grupo SignalR
        currentMode = "online"; // Setear currentMode
        console.log(`J2: currentGameId: ${currentGameId}, currentMode: ${currentMode} antes de JoinGame`);

        await connection.invoke("JoinGame", gameId); // El Jugador 2 también se une al grupo SignalR
        console.log(`J2: Jugador 2 (${connection.connectionId}) unido al grupo SignalR: ${gameId}`);
        // *** FIN DEL CAMBIO ***

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

        // Ahora sí, actualizar la UI del Jugador 2 directamente con la respuesta HTTP
        // (El ReceiveGameUpdate de SignalR podría llegar antes o después, pero la UI debe ser consistente)
        ocultarTodasLasSecciones();
        mostrarSeccion(seccionJuego);
        actualizarUIJuego(data); // Actualiza la UI del Jugador 2 con el estado inicial del juego.

        // Limpiar el input de ID de partida
        inputIdPartida.value = "";
        mensajeIdPartida.textContent = "";

    } catch (error) {
        console.error("Error al unirse a partida online:", error);
        mensajeIdPartida.textContent = `Error al unirse: ${error.message}`;
        mensajeIdPartida.style.color = "red";
        // En caso de error, mostrar los botones originales
        ocultarTodasLasSecciones();
        mostrarSeccion(seccionOnline);
        mostrarSeccion(botonCrearPartida);
        mostrarSeccion(botonUnirsePartida);
        mostrarSeccion(inputIdPartida);
    }
}

async function manejarEnvioLetra() {
    const letra = inputIngresaLetra.value.trim().toUpperCase();

    if (!letra || letra.length !== 1 || !/^[A-Z]$/.test(letra)) {
        mensajeJuego.textContent = "Por favor, ingresa una sola letra válida.";
        inputIngresaLetra.value = "";
        inputIngresaLetra.focus();
        return;
    }

    if (!currentGameId) {
        mensajeJuego.textContent = "Error: No hay una partida activa.";
        return;
    }

    const connectionId = connection.connectionId;
    if (!connectionId) {
        mensajeJuego.textContent = "Error: Conexión SignalR no establecida. Intenta de nuevo.";
        return;
    }

    try {
        // Deshabilitar input y botón para evitar spam de clicks mientras se procesa la letra
        inputIngresaLetra.disabled = true;
        botonSubirLetra.disabled = true;

        const response = await fetch("http://127.0.0.1:5195/api/juego/verificar-letra", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                Letra: letra,
                GameId: currentGameId,
                PlayerConnectionId: connectionId
            }),
            credentials: 'include'
        });

        if (!response.ok) {
            const errorText = await response.text();
            try {
                const errorJson = JSON.parse(errorText);
                mensajeJuego.textContent = `Error: ${errorJson.message || errorText}`;
            } catch (e) {
                mensajeJuego.textContent = `Error: ${errorText}`;
            }
            inputIngresaLetra.value = "";
            inputIngresaLetra.focus();
            // Re-habilitar input y botón si hubo un error del backend que no sea de turno
            if (!errorText.includes("turno")) { // Asumiendo que tu backend envía "No es tu turno" o similar
                inputIngresaLetra.disabled = false;
                botonSubirLetra.disabled = false;
            }
            return;
        }

        const data = await response.json();
        actualizarUIJuego(data); // Se encargará de re-habilitar el input si es necesario

    } catch (error) {
        console.error("Error CATCHED al verificar letra:", error);
        mensajeJuego.textContent = `Error: ${error.message}`;
        inputIngresaLetra.disabled = false; // Re-habilitar en caso de error de red/fetch
        botonSubirLetra.disabled = false;
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

botonInicio.addEventListener("click", function(event) {
    event.preventDefault();
    ocultarSeccion(this); // Ocultar el botón "Iniciar Juego"
    mostrarSeccion(botonSolitario);
    mostrarSeccion(botonVersus);
    mostrarSeccion(botonOnline);
    // Asegurarse de que los elementos de la sección online estén ocultos si el usuario no los elige
    ocultarSeccion(inputIdPartida);
    ocultarSeccion(botonCrearPartida);
    ocultarSeccion(botonUnirsePartida);
    ocultarSeccion(mensajeIdPartida);
    ocultarSeccion(botonVolverModosOnline); // Ocultar el botón "Volver a Modos"
});

botonSolitario.addEventListener("click", async function(event) {
    event.preventDefault();
    // No necesitamos pasar palabraVersus para solitario
    await iniciarJuego("solitario");
});

botonVersus.addEventListener("click", function(event) {
    event.preventDefault();
    ocultarTodasLasSecciones();
    mostrarSeccion(seccionIngresarPalabra);
    inputPalabraVersus.value = ""; // Limpiar el input al entrar
    txtIngresarPalabraVersus.textContent = "Ingresa una palabra de 4 a 8 letras para tu amigo"; // Resetear mensaje
    inputPalabraVersus.focus();
});

if (botonOnline) {
    botonOnline.addEventListener("click", () => {
        ocultarTodasLasSecciones();
        mostrarSeccion(seccionOnline); // Mostrar la sección de online
        // Asegurarse de que los elementos específicos de online estén visibles para empezar
        mostrarSeccion(botonCrearPartida);
        mostrarSeccion(inputIdPartida);
        mostrarSeccion(botonUnirsePartida);
        mostrarSeccion(botonVolverModosOnline); // El botón de volver a modos es parte de esta sección
        mensajeIdPartida.textContent = ""; // Limpiar mensaje de ID
        inputIdPartida.value = ""; // Limpiar input de ID
        inputIdPartida.readOnly = false; // Asegurar que sea editable para unirse
        let botonContinuar = document.getElementById("botonContinuarOnline");
        if (botonContinuar) ocultarSeccion(botonContinuar); // Ocultar el botón "Ir al Juego" si estaba visible
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
    inicializarUI(); // Vuelve a la pantalla de inicio limpia
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
    ocultarTodasLasSecciones(); // Primero, asegura que todo esté oculto.
    mostrarSeccion(seccionModosJuego); // Muestra la sección principal de modos.

    // Configura la visibilidad inicial de los botones dentro de seccionModosJuego
    mostrarSeccion(botonInicio);
    ocultarSeccion(botonSolitario);
    ocultarSeccion(botonVersus);
    ocultarSeccion(botonOnline);

    // Ocultar todos los elementos de la sección online por defecto
    ocultarSeccion(seccionOnline);
    ocultarSeccion(mensajeIdPartida);
    ocultarSeccion(inputIdPartida);
    ocultarSeccion(botonCrearPartida);
    ocultarSeccion(botonUnirsePartida);
    ocultarSeccion(botonVolverModosOnline); // Ocultar este botón por defecto
    // Asegurar que el posible botón "Ir al Juego" también esté oculto
    let botonContinuar = document.getElementById("botonContinuarOnline");
    if (botonContinuar) ocultarSeccion(botonContinuar);

    // Ocultar la sección de ingreso de palabra
    ocultarSeccion(seccionIngresarPalabra);
    inputPalabraVersus.value = ""; // Limpiar al inicio
    txtIngresarPalabraVersus.textContent = "Ingresa una palabra de 4 a 8 letras para tu amigo"; // Resetear mensaje

    // Ocultar la sección de juego y sus elementos
    ocultarSeccion(seccionJuego);
    resetearUIJuego(); // Esto limpia los inputs y la imagen del ahorcado
    ocultarSeccion(inputIngresaLetra); // Ocultar input/botón de adivinar al inicio
    ocultarSeccion(botonSubirLetra);
    ocultarSeccion(botonReiniciar); // Ocultar reiniciar al inicio
    ocultarSeccion(mensajeTurno); // Ocultar el mensaje de turno
}

// Llama a la función de inicialización y SignalR cuando el DOM esté completamente cargado
document.addEventListener("DOMContentLoaded", () => {
    inicializarUI();
    startSignalRConnection();
});
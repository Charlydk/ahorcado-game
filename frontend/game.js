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
    if (data.gameId === currentGameId) { // Solo actualizar si es la partida actual
        actualizarUIJuego(data);
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
    inputGuiones.value = data.palabra;
    inputLetrasOut.value = data.letrasIncorrectas;
    letrasIncorrectasSpan.textContent = `Letras incorrectas: ${data.letrasIncorrectas}`;


    

    const cantidadErradasCalculada = 6 - data.intentosRestantes;

    console.log("cantidad de erradas:", cantidadErradasCalculada);
    //console.log("intentos restantes", data.intentosRestantes);
    // Asegurarse de que la imagen no exceda los límites de tus archivos (ahorcadito_1 a ahorcadito_7)
    imagenAhorcado.src = `img/ahorcadito_${Math.min(cantidadErradasCalculada + 1, 7)}.png`;

    if (data.juegoTerminado) {
        ocultarSeccion(botonSubirLetra);
        ocultarSeccion(inputIngresaLetra);
        ocultarSeccion(mensajeTurno); // Ocultar el mensaje de turno al finalizar

        if (data.palabra === data.palabraSecreta) {
            mensajeJuego.textContent = `¡Felicidades! Has adivinado la palabra: ${data.palabraSecreta}`;
            imagenAhorcado.src = `img/ahorcadito_0.png`; // Imagen de victoria
        } else {
            mensajeJuego.textContent = `¡GAME OVER! La palabra era: ${data.palabraSecreta}`;
            imagenAhorcado.src = `img/ahorcadito_7.png`; // Imagen de derrota
        }
        // El botón Reiniciar siempre debe estar visible cuando el juego termina
        mostrarSeccion(botonReiniciar); // Asegurarse de que el botón reiniciar sea visible

    } else {
        // Si el juego NO ha terminado:
        mostrarSeccion(inputIngresaLetra);
        mostrarSeccion(botonSubirLetra);
        ocultarSeccion(botonReiniciar); // Ocultar reiniciar mientras el juego está activo (opcional, si quieres que solo aparezca al final)


        // Lógica de mensaje de turno y habilitar/deshabilitar input para modo ONLINE
        if (currentMode === "online") {
            mostrarSeccion(mensajeTurno); // Asegurar que el mensaje de turno sea visible en online
            const myConnectionId = connection.connectionId;
            if (data.turnoActualConnectionId && myConnectionId) {
                if (data.turnoActualConnectionId === myConnectionId) {
                    mensajeTurno.textContent = "¡Es tu turno!";
                    mensajeJuego.textContent = "Ingresa una Letra";
                    inputIngresaLetra.disabled = false;
                    botonSubirLetra.disabled = false;
                } else {
                    mensajeTurno.textContent = "Espera tu turno.";
                    mensajeJuego.textContent = "El otro jugador está adivinando.";
                    inputIngresaLetra.disabled = true;
                    botonSubirLetra.disabled = true;
                }
            } else {
                // Caso inicial en online antes de que ambos jugadores se unan o turno se asigne
                mensajeJuego.textContent = "Esperando a otro jugador...";
                inputIngresaLetra.disabled = true;
                botonSubirLetra.disabled = true;
            }
        } else {
            // Para modos solitario y versus:
            ocultarSeccion(mensajeTurno); // Ocultar el mensaje de turno
            mensajeJuego.textContent = "Ingresa una Letra"; // Mensaje por defecto durante el juego
            inputIngresaLetra.disabled = false; // Asegurar que estén habilitados
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

        // Cuando se haga clic en el botón "Continuar", el jugador se une a la partida
        botonContinuar.onclick = async () => {
            await connection.invoke("JoinGame", gameId);
            console.log(`Creador unido al grupo de SignalR para la partida: ${gameId}`);

            // Cambiar a la sección de juego y actualizar el estado inicial de la UI
            currentGameId = gameId;
            currentMode = "online";
            resetearUIJuego(); // Resetea la UI del juego (guiones, img, etc.)
            ocultarTodasLasSecciones(); // Oculta todo
            mostrarSeccion(seccionJuego); // Muestra solo la sección de juego

            // Mensaje inicial de "Esperando"
            mensajeJuego.textContent = "Esperando a otro jugador...";
            mostrarSeccion(mensajeTurno); // Asegurar que el mensaje de turno es visible

            // Deshabilitar/ocultar el input y botón de adivinar hasta que el juego comience con el otro jugador
            inputIngresaLetra.disabled = true;
            botonSubirLetra.disabled = true;
            ocultarSeccion(inputIngresaLetra);
            ocultarSeccion(botonSubirLetra);
            ocultarSeccion(botonContinuar); // Ocultar el botón de continuar una vez que se va al juego
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
            mensajeIdPartida.textContent = "Error: Conexión SignalR no establecida. Intenta de nuevo.";
            mensajeIdPartida.style.color = "red";
            return;
        }

        mensajeIdPartida.textContent = "Uniéndose a la partida...";
        mensajeIdPartida.style.color = "blue";
        inputIdPartida.readOnly = true; // Deshabilitar mientras se une

        await connection.invoke("JoinGame", gameId);
        console.log(`Jugador unido al grupo de SignalR para la partida: ${gameId}`);

        const response = await fetch("http://127.0.0.1:5195/api/juego/unirse-online", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ GameId: gameId, playerConnectionId: connectionId }),
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
        mostrarSeccion(seccionJuego); // Mostrar la sección de juego

        actualizarUIJuego(data); // Actualiza la UI con el estado inicial del juego.

        // En el modo online, el input y botón de adivinar podrían estar deshabilitados
        // hasta que sea el turno del jugador. Esto lo maneja actualizarUIJuego().
        inputIngresaLetra.focus();

    } catch (error) {
        console.error("Error CATCHED al unirse a partida online:", error);
        mensajeIdPartida.textContent = `Error: ${error.message}`;
        mensajeIdPartida.style.color = "red";
        // Restaurar para permitir reintentar
        inputIdPartida.readOnly = false;
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
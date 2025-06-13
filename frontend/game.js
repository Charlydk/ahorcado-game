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
const imagenAhorcado = document.getElementById("imagenAhorcado"); // OK - Coincide
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


// --- Funcionalidades de utilidad ---

function limpiarEstadoGlobalDeJuego() {
    currentGameId = null;
    currentMode = null;
    latestGameData = null;
    // Ocultar y limpiar mensajes al reiniciar el estado
    ocultarMensajeAlerta(mensajeJuego);
    ocultarMensajeAlerta(mensajeIdPartida);
    ocultarMensajeAlerta(mensajeTurno); // También el mensaje de turno
    ocultarMensajeAlerta(txtIngresarPalabraVersus); // Para la pantalla de palabra versus
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
    
    // Si la alerta es un h3, no le quitamos sus clases base de Bootstrap.
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


// --- Configuración de SignalR ---
const connection = new signalR.HubConnectionBuilder()
    .withUrl("http://127.0.0.1:5195/gamehub")
    .withAutomaticReconnect()
    .build();


// --- NUEVO: Manejar la desconexión del propio cliente ---
connection.onclose(async (error) => {
    console.log("Conexión SignalR cerrada. ", error);

    if (connection.state === signalR.HubConnectionState.Disconnected) {
        // De nuevo, puedes intentar mostrarlo en la UI si estás en una sección activa
        if (seccionJuego.classList.contains('d-flex') || seccionModosJuego.classList.contains('d-flex') || seccionOnline.classList.contains('d-flex')) {
            mostrarMensajeAlerta(mensajeJuego, "¡Conexión con el servidor perdida! Por favor, verifica tu conexión o el estado del servidor y vuelve a intentarlo.", 'danger');
        } else {
            alert("¡Conexión con el servidor perdida! Por favor, verifica tu conexión o el estado del servidor y vuelve a intentarlo.");
        }
        
        limpiarEstadoGlobalDeJuego();

        ocultarTodasLasSecciones();
        mostrarSeccion(seccionModosJuego); 
    }
});

// Escucha eventos del Hub de SignalR
connection.on("ReceiveGameUpdate", (data) => {
    console.log("ReceiveGameUpdate recibido:", data);
    latestGameData = data; // Siempre almacena la última data recibida
    console.log("ReceiveGameUpdate recibido. Datos:", data); // Muestra todo el objeto gameData
    console.log("Juego terminado (juegoTerminado):", data.juegoTerminado);
    console.log("Mensaje recibido (gameData.message):", data.message); // Muestra el mensaje específico


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
    
    if (currentGameId === gameId) {
        // Usa la función de alerta si estás en la sección de juego o sala online
        if (seccionJuego.classList.contains('d-flex') || seccionOnline.classList.contains('d-flex')) {
            mostrarMensajeAlerta(mensajeJuego, "¡Tu oponente se ha desconectado! La partida ha terminado.", 'danger');
        } else {
            // Si no está en ninguna de esas secciones, usa alert() como fallback
            alert("¡Tu oponente se ha desconectado! La partida ha terminado.");
        }
        
        limpiarEstadoGlobalDeJuego();

        ocultarTodasLasSecciones();
        mostrarSeccion(seccionModosJuego); 
    }
});


// Cuando un segundo jugador se une a una partida online
connection.on("PlayerJoined", (gameId, playerConnectionId) => {
    console.log(`Jugador ${playerConnectionId} se unió a la partida ${gameId}.`);
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
    inputGuiones.textContent = " ";
    
    // ¡CAMBIO AQUÍ! Ya no uses letrasIncorrectasSpan.textContent = " ";
    // En su lugar, vacía el contenido del span interno:
    inputLetrasOut.textContent = ""; // Esto vaciará solo las letras, dejando "Letras incorrectas: " intacto.
    
    imagenAhorcado.src = "img/ahorcadito_1.png";
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
        // Usa la nueva función para mostrar el error
        mostrarMensajeAlerta(mensajeJuego, `Error: ${error.message}. Por favor, reinicia o inténtalo de nuevo.`, 'danger');
    }
}

function actualizarUIJuego(data) {
    console.log("DEBUG: Datos recibidos en actualizarUIJuego:", data);
    console.log("     Dentro de actualizarUIJuego. currentMode:", currentMode);
    console.log("     Datos recibidos para actualizar UI:", data);
    console.log("     [DEBUG] Mensaje recibido del backend (data.message):", data.message);

    const intentosRestantesSpan = document.getElementById("intentosRestantes"); 
    if (intentosRestantesSpan) {
        intentosRestantesSpan.textContent = data.intentosRestantes;
    }

    inputGuiones.textContent = data.palabra.split('').join(' ');
    inputLetrasOut.textContent = Array.isArray(data.letrasIncorrectas) ? data.letrasIncorrectas.join(", ") : data.letrasIncorrectas;

    const cantidadErradasCalculada = 6 - data.intentosRestantes;
    console.log("     cantidad de erradas:", cantidadErradasCalculada);

    if (data.juegoTerminado) {
        ocultarSeccion(botonSubirLetra);
        ocultarSeccion(inputIngresaLetra);
        ocultarMensajeAlerta(mensajeTurno); // Ocultar mensaje de turno al terminar el juego

        if (data.palabra === data.palabraSecreta) {
            mostrarMensajeAlerta(mensajeJuego, `¡Felicidades! Has adivinado la palabra: ${data.palabraSecreta}`, 'success');
            imagenAhorcado.src = `img/ahorcadito_0.png`; // Imagen de éxito
        } else if (data.intentosRestantes <= 0) {
            mostrarMensajeAlerta(mensajeJuego, `¡GAME OVER! La palabra era: ${data.palabraSecreta}`, 'danger');
            imagenAhorcado.src = `img/ahorcadito_7.png`; // Imagen de derrota
        } else if (data.message && data.message !== "") {
            mostrarMensajeAlerta(mensajeJuego, data.message, 'danger'); // Usamos danger para finalización inesperada
            imagenAhorcado.src = `img/ahorcadito_7.png`; 
        } else {
            mostrarMensajeAlerta(mensajeJuego, "El juego ha terminado.", 'info'); // Mensaje por defecto
            imagenAhorcado.src = `img/ahorcadito_7.png`; 
        }
        
        mostrarSeccion(botonReiniciar);
        mostrarSeccion(botonVolverAlMenu); 
        console.log("     Juego Terminado detectado. Mensaje establecido en UI:", mensajeJuego.textContent);

    } else {
        imagenAhorcado.src = `img/ahorcadito_${Math.min(cantidadErradasCalculada + 1, 7)}.png`;
        
        mostrarSeccion(inputIngresaLetra);
        mostrarSeccion(botonSubirLetra);
        ocultarSeccion(botonReiniciar);
        mostrarSeccion(botonVolverAlMenu);

        if (data.message && data.message !== "") {
            console.log("     Mostrando data.message:", data.message);
            // Si el mensaje indica una letra ya ingresada, es una ADVERTENCIA (amarillo)
            if (data.message.includes("enviaste") || data.message.includes("anteriormente") || data.message.includes("Intenta con otra")) {
                mostrarMensajeAlerta(mensajeJuego, data.message, 'warning');
            // Si el mensaje indica que la letra es INCORRECTA (rojo)
            } else if (data.message.includes("Incorrecto") || data.message.includes("La letra no está en la palabra")) {
                mostrarMensajeAlerta(mensajeJuego, data.message, 'danger'); // <--- ¡CAMBIO AQUÍ: 'danger' para incorrecto!
            // Si el mensaje es una letra CORRECTA (verde)
            } else if (data.message.includes("correcta.") || data.message.includes("¡Bien!")) {
                mostrarMensajeAlerta(mensajeJuego, data.message, 'success'); 
            // Para otros mensajes informativos (azul por defecto)
            } else {
                mostrarMensajeAlerta(mensajeJuego, data.message, 'info'); 
            }
        } else {
            ocultarMensajeAlerta(mensajeJuego); 
        }
        
        if (currentMode === "online") {
            console.log("     Modo online detectado. Evaluando turno.");
            mostrarSeccion(mensajeTurno); // El mensaje de turno no es una alerta, se muestra directamente

            const myConnectionId = connection.connectionId;
            if (data.turnoActualConnectionId && myConnectionId) {
                if (data.turnoActualConnectionId === myConnectionId) {
                    mensajeTurno.textContent = "¡Es tu turno!";
                    inputIngresaLetra.disabled = false;
                    botonSubirLetra.disabled = false;
                    // Ya no necesitas modificar mensajeJuego si data.message está vacío,
                    // la alerta se oculta sola o no se muestra.
                    // if (mensajeJuego.textContent === "") { 
                    //     mensajeJuego.textContent = "Ingresa una Letra";
                    // }
                    console.log("     Es mi turno.");
                } else {
                    mensajeTurno.textContent = "Espera tu turno.";
                    inputIngresaLetra.disabled = true;
                    botonSubirLetra.disabled = true;
                    // if (mensajeJuego.textContent === "") {
                    //      mensajeJuego.textContent = "El otro jugador está adivinando.";
                    // }
                    console.log("     Es el turno del otro jugador.");
                }
            } else {
                mensajeJuego.textContent = "Esperando a otro jugador..."; // Este sí se queda sin alerta
                inputIngresaLetra.disabled = true;
                botonSubirLetra.disabled = true;
                console.log("     Modo online: Esperando a otro jugador (turno no asignado).");
            }
        } else {
            console.log("     Modo solitario/versus detectado.");
            ocultarMensajeAlerta(mensajeTurno); // Ocultar mensaje de turno (no es una alerta)
            inputIngresaLetra.disabled = false;
            botonSubirLetra.disabled = false;
            // if (mensajeJuego.textContent === "") {
            //     mensajeJuego.textContent = "Ingresa una Letra";
            // }
        }
    }

    inputIngresaLetra.value = "";
    inputIngresaLetra.focus();
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
        ocultarMensajeAlerta(mensajeJuego); // Asegurarse de que el mensaje de juego principal esté limpio.

        mostrarMensajeAlerta(mensajeIdPartida, "Creando partida online...", 'info');
        
        ocultarSeccion(botonCrearPartida);
        ocultarSeccion(botonUnirsePartida);
        ocultarSeccion(inputIdPartida); 
        ocultarSeccion(botonVolverModosOnline); 
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

        mostrarMensajeAlerta(mensajeIdPartida, "¡Partida creada! Comparte este ID:", 'success');
        
        displayGameId.textContent = gameId; 
        mostrarSeccion(contenedorGameId); 

        botonCopiarId.onclick = async () => {
            try {
                await navigator.clipboard.writeText(gameId);
                mostrarMensajeAlerta(mensajeIdPartida, `ID '${gameId}' copiado. ¡Compártelo!`, 'success');
            } catch (err) {
                console.error('Error al copiar el ID:', err);
                mostrarMensajeAlerta(mensajeIdPartida, `No se pudo copiar. Copia manualmente: ${gameId}`, 'warning');
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
            console.log("J1: Clic en 'Ir al Juego (esperar)'. Navegando a la sección de juego.");
            ocultarTodasLasSecciones();
            mostrarSeccion(seccionJuego);
            if (latestGameData && latestGameData.gameId === currentGameId) {
                console.log("J1: Actualizando UI con latestGameData al entrar al juego (J2 ya unido).");
                actualizarUIJuego(latestGameData);
            } else {
                console.log("J1: J2 aún no se ha unido. Mostrando mensaje de espera inicial.");
                mostrarMensajeAlerta(mensajeJuego, "Esperando que otro jugador se una...", 'info');
                inputIngresaLetra.disabled = true;
                botonSubirLetra.disabled = true;
            }
            ocultarSeccion(botonIrAlJuego);
            ocultarSeccion(contenedorGameId);
        };

    } catch (error) {
        console.error("Error CATCHED al crear partida online:", error);
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
async function unirseAPartidaOnline(gameId) {
    try {
        const connectionId = connection.connectionId;
        if (!connectionId) {
            console.error("Error: Conexión SignalR no establecida para unirse.");
            mostrarMensajeAlerta(mensajeIdPartida, "Error: Conexión SignalR no establecida. Intenta de nuevo.", 'danger');
            return;
        }

        console.log(`J2: Intentando unirse a partida ${gameId} con connectionId ${connectionId}`);

        inputIdPartida.disabled = true;
        botonCrearPartida.disabled = true;
        botonUnirsePartida.disabled = true;
        mostrarMensajeAlerta(mensajeIdPartida, "Uniéndose a la partida...", 'info');
        inputIdPartida.readOnly = true; 

        currentGameId = gameId;
        currentMode = "online";
        console.log(`J2: currentGameId: ${currentGameId}, currentMode: ${currentMode} antes de JoinGameGroup`);

        await connection.invoke("JoinGameGroup", gameId);
        console.log(`J2: Jugador 2 (${connection.connectionId}) unido al grupo SignalR: ${gameId}`);

        const response = await fetch("http://127.0.0.1:5195/api/juego/unirse-online", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gameId: gameId, playerConnectionId: connectionId }),
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: "Error desconocido del servidor." })); 
            const errorMessage = errorData.message || `Error desconocido: ${response.status} ${response.statusText}`;
            throw new Error(errorMessage);
        }
        
        const data = await response.json(); 
        console.log("J2: Respuesta de unirse-online (HTTP):", data);

        mostrarMensajeAlerta(mensajeIdPartida, `¡Te has unido a la partida ${gameId} exitosamente!`, 'success', true);

        ocultarTodasLasSecciones();
        mostrarSeccion(seccionJuego);
        actualizarUIJuego(data); 

        inputIdPartida.value = "";
        ocultarMensajeAlerta(mensajeIdPartida); // Limpiar y ocultar el mensaje de la sala online

    } catch (error) {
        console.error("Error al unirse a partida online:", error);
        mostrarMensajeAlerta(mensajeIdPartida, `Error al unirse: ${error.message}`, 'danger');
        
        restaurarSeccionOnlineUI(); 
        inputIdPartida.focus(); 
    }
}

// Asegúrate de que tus funciones ocultarTodasLasSecciones, mostrarSeccion, etc. estén correctamente implementadas.
// Y que los IDs de los elementos HTML como "mensajeIdPartida", "inputIdPartida", etc., coincidan.
async function manejarEnvioLetra(letra) { 
    console.log("Enviando letra:", letra); 

    if (!currentGameId) {
        mostrarMensajeAlerta(mensajeJuego, "Error: No hay una partida activa.", 'danger');
        inputIngresaLetra.disabled = false; 
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
                    Letra: letra 
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "Error desconocido al procesar la letra." }));
                mostrarMensajeAlerta(mensajeJuego, `Error: ${errorData.message || response.statusText}`, 'danger');
                inputIngresaLetra.value = "";
                inputIngresaLetra.focus();
                inputIngresaLetra.disabled = false; 
                botonSubirLetra.disabled = false; 
                return;
            }

            const data = await response.json();
            actualizarUIJuego(data); 

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
        console.error("Error CATCHED al enviar letra:", error);
        mostrarMensajeAlerta(mensajeJuego, `Error: ${error.message || "Un error inesperado ocurrió."}`, 'danger');
        inputIngresaLetra.disabled = false; 
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

async function abandonarPartidaOnline() {
    if (currentMode === 'online' && currentGameId && connection.state === signalR.HubConnectionState.Connected) {
        try {
            console.log(`Intentando abandonar partida online ${currentGameId}...`);
            // Llama a un endpoint de tu backend o a un método de SignalR para notificar
            // Opción 1: Llamar a un método de SignalR (más directo para el Hub)
            await connection.invoke("LeaveGameGroup", currentGameId); 
            console.log(`Abandonado el grupo SignalR para la partida: ${currentGameId}`);
            
            // Opción 2 (alternativa, si prefieres un endpoint HTTP para acciones de "abandono"):
            // const response = await fetch("http://127.0.0.1:5195/api/juego/abandonar-partida", {
            //     method: "POST",
            //     headers: { "Content-Type": "application/json" },
            //     body: JSON.stringify({ gameId: currentGameId, connectionId: connection.connectionId }),
            //     credentials: 'include'
            // });
            // if (!response.ok) {
            //     console.warn("Fallo al notificar al backend que se abandonó la partida:", await response.text());
            // }

        } catch (error) {
            console.error("Error al intentar abandonar la partida online:", error);
            // No bloqueamos al usuario por este error, ya que lo importante es que abandone localmente.
        }
    }
    // Siempre limpiar el estado local después de intentar notificar al backend
    limpiarEstadoGlobalDeJuego();
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
        // Simplemente restaura la UI, la función ya establece el mensaje por defecto
        restaurarSeccionOnlineUI(); 
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
        mostrarMensajeAlerta(mensajeIdPartida, "Por favor, ingresa un ID de partida.", 'warning');
    }
});

botonVolverModosOnline.addEventListener("click", async () => { // Hacer async para await
    console.log("Volviendo de la sala Online a Modos de Juego.");
    if (currentMode === 'online' && currentGameId) { // Si había una partida activa (incluso si no se unió otro)
        await abandonarPartidaOnline(); 
    }
    ocultarTodasLasSecciones();
    inicializarUI(); // Vuelve a la pantalla de inicio limpia (secciónModosJuego)
});

botonEnviarPalabra.addEventListener("click", async function(event) {
    event.preventDefault();
    const palabra = inputPalabraVersus.value.toUpperCase().trim();

    if (palabra.length < 4 || palabra.length > 8) {
        mostrarMensajeAlerta(txtIngresarPalabraVersus, "La palabra debe tener entre 4 y 8 letras.", 'warning');
        inputPalabraVersus.focus();
        return;
    }
    if (!/^[A-ZÑ]+$/.test(palabra)) {
        mostrarMensajeAlerta(txtIngresarPalabraVersus, "Solo se permiten letras.", 'warning');
        inputPalabraVersus.focus();
        return;
    }

    inputPalabraVersus.value = "";
    // Ocultar el mensaje después de enviar la palabra si todo está bien
    ocultarMensajeAlerta(txtIngresarPalabraVersus); 
    await iniciarJuego("versus", palabra);
});

botonCancelarVersus.addEventListener("click", function(event) {
    event.preventDefault();
    ocultarTodasLasSecciones();
    inicializarUI(); 
    inputPalabraVersus.value = "";
    // Reiniciar el mensaje en la pantalla de ingresar palabra
    ocultarMensajeAlerta(txtIngresarPalabraVersus); 
    // Puedes poner un mensaje inicial si quieres:
    // txtIngresarPalabraVersus.textContent = "Ingresa una palabra de 4 a 8 letras para tu amigo";
    // mostrarMensajeAlerta(txtIngresarPalabraVersus, "Ingresa una palabra de 4 a 8 letras para tu amigo", 'info');
});

if (botonSubirLetra) {
    botonSubirLetra.addEventListener("click", async (event) => {
        event.preventDefault(); 

        const letraIngresada = inputIngresaLetra.value.toUpperCase().trim();

        // 1. Validación de Vacío
        if (letraIngresada.length === 0) {
            mostrarMensajeAlerta(mensajeJuego, "Por favor, ingresa una letra.", 'warning');
            inputIngresaLetra.focus();
            return;
        }

        // 2. Validación de una sola letra y solo letras (A-Z, Ñ)
        if (letraIngresada.length !== 1 || !/^[A-ZÑ]$/.test(letraIngresada)) {
            mostrarMensajeAlerta(mensajeJuego, "Ingresa una sola letra válida (A-Z, Ñ).", 'warning');
            inputIngresaLetra.value = "";
            inputIngresaLetra.focus();
            return;
        }

        // 3. Validación de letra YA ADIVINADA
        const letrasCorrectasEnGuiones = inputGuiones.textContent.replace(/ /g, ''); 
        
        const textoLetrasIncorrectas = letrasIncorrectasSpan.textContent;
        let letrasIncorrectasArray = [];
        const match = textoLetrasIncorrectas.match(/:\s*([A-ZÑ,\s]*)$/); 
        if (match && match[1]) {
            letrasIncorrectasArray = match[1].replace(/,\s*/g, '').split(''); 
        }

        const letrasYaIntentadas = new Set();
        letrasCorrectasEnGuiones.split('').filter(char => char !== '_').forEach(char => letrasYaIntentadas.add(char));
        letrasIncorrectasArray.forEach(char => letrasYaIntentadas.add(char));

        if (letrasYaIntentadas.has(letraIngresada)) {
            
            mostrarMensajeAlerta(mensajeJuego, `Ya enviaste la letra ${letraIngresada} anteriormente. Intenta con otra.`, 'warning'); 
            inputIngresaLetra.value = "";
            inputIngresaLetra.focus();
            return; 
        }

        // Si todas las validaciones pasan, PASAMOS LA LETRA COMO ARGUMENTO
        // Deshabilitar input y botón para evitar doble envío mientras se espera la respuesta
        inputIngresaLetra.disabled = true;
        botonSubirLetra.disabled = true;
        
        await manejarEnvioLetra(letraIngresada); 
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
    botonReiniciar.addEventListener("click", async () => { // Hacer async para await
        console.log("Clic en 'Reiniciar Partida'. Modo actual:", currentMode);

        if (currentMode === 'online') {
            await abandonarPartidaOnline(); // Notificar si estaba en online ANTES de cambiar la UI
            // La lógica que tienes para mostrar seccionOnline ya está bien para la UI
            restaurarSeccionOnlineUI(); 
        } else if (currentMode === 'solitario') {
            await iniciarJuego('solitario');
        } else if (currentMode === 'versus') {
            mostrarSeccion(seccionIngresarPalabra);
            inputPalabraVersus.value = "";
            txtIngresarPalabraVersus.textContent = "Ingresa una palabra de 4 a 8 letras para tu amigo";
            inputPalabraVersus.focus();
        } else {
            console.warn("Modo de juego no definido al reiniciar. Volviendo a selección de modos.");
            mostrarSeccion(seccionModosJuego);
        }
        // Los ocultarSeccion y mostrarSeccion específicos dentro de cada if/else ya manejan la transición visual.
        // Asegúrate de que `ocultarTodasLasSecciones()` se llame al inicio de cada rama si es necesario
        // para una limpieza completa antes de mostrar la nueva sección.
    });
}

inputIngresaLetra.addEventListener("keypress", async function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        // Llama al click del botón para centralizar la lógica de validación
        botonSubirLetra.click(); 
    }
});

if (botonVolverAlMenu) {
    botonVolverAlMenu.addEventListener("click", async () => { // Hacer async para await
        console.log("Clic en 'Volver al Menú'.");
        if (currentMode === 'online') {
            await abandonarPartidaOnline(); // Notificar si estaba en online
        }
        inicializarUI(); // Reinicia la UI completamente
    });
}


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
    inputIdPartida.value = ""; // Limpiar el input
    ocultarSeccion(inputIdPartida); // Asegurar que el input esté oculto
    ocultarSeccion(botonCrearPartida);
    ocultarSeccion(botonUnirsePartida);
    ocultarSeccion(botonVolverModosOnline);
    let botonContinuar = document.getElementById("botonContinuarOnline");
    if (botonContinuar) ocultarSeccion(botonContinuar);
    ocultarSeccion(contenedorGameId); // Asegurarse de que el contenedor del ID esté oculto

    // Para la sección de ingreso de palabra
    inputPalabraVersus.value = ""; // Limpiar el input
    // Establecer el texto inicial para esta sección, ya que la alerta la limpiará
    txtIngresarPalabraVersus.textContent = "Ingresa una palabra de 4 a 8 letras para tu amigo"; 
    txtIngresarPalabraVersus.classList.add('d-none'); // Asegurar que el h3 esté oculto al inicio

    // Para la sección de juego
    resetearUIJuego(); // Esto ya reinicia muchos elementos de la UI del juego
    // Asegurar que los botones de juego estén ocultos al inicio,
    // ya que solo aparecen cuando se inicia una partida.
    ocultarSeccion(inputIngresaLetra);
    ocultarSeccion(botonSubirLetra);
    ocultarSeccion(botonReiniciar);
}

// Llama a la función de inicialización y SignalR cuando el DOM esté completamente cargado
document.addEventListener("DOMContentLoaded", () => {
    inicializarUI();
    startSignalRConnection();
});
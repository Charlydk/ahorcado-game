// --- Elementos HTML de la interfaz (Selección de Modo, Ingreso de Palabra VS, Área de Juego) ---
const seccionModosJuego = document.querySelector(".seccion-modos-juego");
const seccionIngresarPalabra = document.querySelector(".seccion-ingresar-palabra");
const seccionJuego = document.querySelector(".seccion-juego");

// --- Botones de la Pantalla de Inicio y Selección de Modo ---
const botonInicio = document.querySelector(".botonInicio");
const botonSolitario = document.querySelector(".botonSolitario");
const botonVersus = document.querySelector(".botonVersus");
const botonOnline = document.querySelector(".botonOnline"); // Aunque este no lo implementaremos ahora, ya está listo.

// --- Elementos de la Sección de Ingreso de Palabra en Modo VS ---
const inputPalabraVersus = document.querySelector(".inputPalabraVersus");
const botonEnviarPalabra = document.querySelector(".botonEnviarPalabra");
const botonCancelarVersus = document.querySelector(".botonCancelarVersus");
const txtIngresarPalabraVersus = document.querySelector(".txtIngP"); // El h3 para el mensaje de ingreso de palabra

// --- Elementos de la Sección Principal del Juego ---
const imagenAhorcado = document.getElementById("imagen");
const mensajeJuego = document.querySelector(".mensaje-juego"); // El h3 para el mensaje de juego
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
const botonVolverModosOnline = seccionOnline.querySelector(".volver-modos"); // Usar querySelector en seccionOnline para evitar conflicto



// --- Variables de Estado del Frontend (estas se sincronizan con el backend) ---
let cantidadErradas = 0; // Se actualiza con la respuesta del backend
let letrasIntentadas = []; // Para llevar el registro de letras ya usadas en el frontend

// --- Funciones de Utilidad para Mostrar/Ocultar Secciones ---
function mostrarSeccion(seccion) {
     
    if (seccion === seccionModosJuego || seccion === seccionIngresarPalabra || seccion === seccionJuego) {
        seccion.style.display = "flex";
    } else {
        seccion.style.display = "block";
    }
}

function ocultarTodasLasSecciones(){
    const secciones = [seccionModosJuego, seccionIngresarPalabra, seccionJuego, seccionOnline];
    secciones.forEach(seccion => {
        seccion.style.display = "none";
    });
    
}


// --- Configuración de SignalR ---
const connection = new signalR.HubConnectionBuilder()
    .withUrl("http://127.0.0.1:5195/gamehub") // <--- Asegúrate que esta URL sea correcta (tu backend y el path del Hub)
    .withAutomaticReconnect() // Opcional: intentará reconectar si la conexión se pierde
    .build();

// Inicia la conexión
async function startSignalRConnection() {
    try {
        await connection.start();
        console.log("Conexión SignalR establecida con éxito.");
        // Aquí puedes añadir lógica para, por ejemplo, unirte a un juego existente
        // connection.invoke("JoinGame", "someGameId"); // Ejemplo: el servidor tiene un método JoinGame
    } catch (err) {
        console.error("Error al iniciar la conexión SignalR:", err);
        setTimeout(startSignalRConnection, 5000); // Intenta reconectar cada 5 segundos
    }
}

// Llama a esta función para iniciar la conexión cuando el DOM esté cargado
document.addEventListener("DOMContentLoaded", () => {
    // ... (tu código existente para inicializar UI y event listeners) ...
    startSignalRConnection(); // <--- ¡Añade esto aquí!
});

//#region Funciones para funcionalidad de la UI

function ocultarSeccion(seccion) {
    seccion.style.display = "none";
}

function resetearUIJuego() {
    inputGuiones.value = "";
    inputLetrasOut.value = "";
    inputIngresaLetra.value = "";
    cantidadErradas = 0;
    letrasIntentadas = [];
    imagenAhorcado.src = "img/ahorcadito_1.png";
    mensajeJuego.textContent = "Ingresa una Letra";
    mostrarSeccion(inputIngresaLetra);
    mostrarSeccion(botonSubirLetra);
}

// --- Lógica de Inicio de Juego (Comunicación con Backend) ---
async function iniciarJuego(modo = "solitario", palabraVersus = "") {
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
        console.log("Respuesta del backend (objeto data):", data); // Deja este log (el que tiene el objeto data)

        // Reiniciar y mostrar la interfaz de juego
        resetearUIJuego();
        ocultarSeccion(seccionModosJuego);
        ocultarSeccion(seccionIngresarPalabra);
        mostrarSeccion(seccionJuego);

        inputGuiones.value = data.palabra; // Muestra los guiones iniciales

        // Si es modo versus, ahora le toca al otro jugador
        if (modo === "versus") {
            mensajeJuego.textContent = "¡Adivina la palabra!";
        } else {
            mensajeJuego.textContent = "Ingresa una Letra";
        }

        inputIngresaLetra.focus(); // Enfoca el input para adivinar
    } catch (error) {
        console.error("Error CATCHED al iniciar el juego:", error);
        mensajeJuego.textContent = `Error: ${error.message}. Por favor, reinicia o inténtalo de nuevo.`;
    }
}

// --- Lógica para Verificar Letra (Comunicación con Backend) ---
function actualizarUIJuego(data) {
    inputGuiones.value = data.palabra; // Siempre actualiza los guiones
    inputLetrasOut.value = data.letrasIncorrectas; // Actualiza las letras erradas (viene como string en online)
    cantidadErradas = data.intentosRestantes === undefined ? cantidadErradas : (6 - data.intentosRestantes); // Calcula erradas de intentosRestantes

    // Actualizar imagen del ahorcado
    imagenAhorcado.src = `img/ahorcadito_${cantidadErradas + 1}.png`; // Ajustar para que 0 errores sea ahorcadito_1.png

    // --- Manejo del Estado del Juego ---
    if (data.juegoTerminado) { // Si el backend nos dice que el juego terminó
        ocultarSeccion(botonSubirLetra);
        ocultarSeccion(inputIngresaLetra);

        if (data.palabra === data.palabraSecreta) { // Asumiendo que el backend envía palabraSecreta al ganar
            mensajeJuego.textContent = `¡Felicidades! Has adivinado la palabra: ${data.palabraSecreta}`;
            imagenAhorcado.src = `img/ahorcadito_0.png`; // Imagen de victoria
        } else {
            mensajeJuego.textContent = `GAME OVER!! - La palabra era: ${data.palabraSecreta}`;
            imagenAhorcado.src = `img/ahorcadito_7.png`; // Imagen de derrota (el ahorcado completo)
        }
    } else {
        mensajeJuego.textContent = `Ingresa una Letra`;
    }

    inputIngresaLetra.value = ""; // Limpiar el input después de cada intento
    inputIngresaLetra.focus();
}

// --- Lógica para Verificar Letra (Comunicación con Backend - Modo Solitario/Versus) ---
async function VerificarLetraLocal(letra) { // Renombrado a VerificarLetraLocal para distinguirlo
    try {
        // Validaciones en el frontend antes de enviar al backend
        if (letrasIntentadas.includes(letra)) {
            mensajeJuego.textContent = `¡Ya ingresaste la letra "${letra}"!`;
            inputIngresaLetra.value = "";
            inputIngresaLetra.focus();
            return;
        }

        letrasIntentadas.push(letra); // Agrega la letra a la lista local de intentadas

        const response = await fetch("http://127.0.0.1:5195/api/juego/verificar-letra", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ Letra: letra }),
            credentials: 'include'
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error en la API: ${response.status} - ${errorText}`);
        }

        const resultado = await response.json();
        console.log("Respuesta del backend (local):", resultado);

        // Ahora llamamos a actualizarUIJuego para manejar la visualización
        actualizarUIJuego({
            palabra: resultado.palabraActualizada,
            letrasIncorrectas: resultado.letrasErradas.join(", "),
            intentosRestantes: 6 - resultado.letrasErradas.length, // Convertir erradas a intentos restantes
            juegoTerminado: resultado.estadoJuego === "ganaste" || resultado.estadoJuego === "perdiste",
            palabraSecreta: resultado.palabraSecreta // Asegúrate de que el backend envíe esto
        });

    } catch (error) {
        console.error("Error al verificar letra (local):", error);
        mensajeJuego.textContent = `Error: ${error.message}.`;
    }
}

// --- Lógica para Crear y Unirse a Partidas Online ---
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
        const gameId = data.gameId; // El backend nos devolverá un ID de partida
        mensajeIdPartida.textContent = `Partida creada. ID: ${gameId}. ¡Comparte con un amigo!`;
        mensajeIdPartida.style.color = "green";
        inputIdPartida.value = gameId; // Precargar el ID para facilitar copiar/unirse

        // Una vez creada, el creador se une automáticamente a su partida
        await unirseAPartidaOnline(gameId);

    } catch (error) {
        console.error("Error CATCHED al crear partida online:", error);
        mensajeIdPartida.textContent = `Error: ${error.message}`;
        mensajeIdPartida.style.color = "red";
    }
}

// ---Logica para unirse a una partida online---
async function unirseAPartidaOnline(gameId) {
    // Aquí el cliente SignalR se unirá al grupo de la partida
    // Y luego el frontend cambiará a la interfaz de juego
    try {
        await connection.invoke("JoinGame", gameId); // Llamamos al método JoinGame en el Hub
        console.log(`Unido al grupo de SignalR para la partida: ${gameId}`);

        // Ahora necesitamos informar al backend que nos estamos uniendo a la partida
        // para que pueda manejar el estado de la partida en el servidor
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
        // Mostrar la interfaz de juego
        ocultarTodasLasSecciones();
        mostrarSeccion(seccionJuego);
        inputGuiones.value = data.palabra; // Muestra los guiones iniciales

        mensajeJuego.textContent = "Esperando a otro jugador..."; // Mensaje inicial para partidas online
        inputIngresaLetra.focus();

        // Guardamos el ID de la partida actual en una variable global
        window.currentGameId = gameId; // Podemos usar esto para futuras llamadas a la API o SignalR

    } catch (error) {
        console.error("Error CATCHED al unirse a partida online:", error);
        mensajeIdPartida.textContent = `Error: ${error.message}`;
        mensajeIdPartida.style.color = "red";
    }
}

// --- Lógica para manejar el envío de letras en ambos modos ---
async function manejarEnvioLetra() {
    const letra = inputIngresaLetra.value.trim().toUpperCase();

    if (letra.length !== 1 || !/^[A-Z]$/.test(letra)) {
        mensajeJuego.textContent = "Por favor, ingresa una sola letra válida (A-Z).";
        inputIngresaLetra.value = ""; // Limpiar el input
        inputIngresaLetra.focus();
        return;
    }

    // Lógica para el modo ONLINE (usando window.currentGameId)
    if (window.currentGameId) { // Si hay un gameId global, estamos en modo online
        try {
            const response = await fetch("http://127.0.0.1:5195/api/juego/verificar-letra-online", { // <-- NUEVA RUTA
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ Letra: letra, GameId: window.currentGameId }), // <-- ENVIAR GAMEID
                credentials: 'include'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error en la API al verificar letra online: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            actualizarUIJuego(data); // Reutilizar la función de actualización de UI
            // Aquí en un juego real, SignalR notificaría al otro jugador

        } catch (error) {
            console.error("Error CATCHED al verificar letra online:", error);
            mensajeJuego.textContent = `Error: ${error.message}`;
        }
    } else {
        // Lógica existente para Solitario/Versus (usa la sesión)
        await VerificarLetraLocal(letra); // Llama a la función renombrada
    }
}




//#endregion

//#region  --- Event Listeners de Botones ---

// Botón "Iniciar Juego" (Muestra los botones de selección de modo)
botonInicio.addEventListener("click", function(event) {
    event.preventDefault();
    
    ocultarSeccion(botonInicio);
    mostrarSeccion(botonSolitario);
    mostrarSeccion(botonVersus);
    mostrarSeccion(botonOnline);
});

// Botón "Solitari@"
botonSolitario.addEventListener("click", async function(event) {
    event.preventDefault();
    await iniciarJuego("solitario"); // Llama a iniciarJuego con el modo "solitario"
});

// Botón "VS Amig@"
botonVersus.addEventListener("click", function(event) {
    event.preventDefault();
    ocultarSeccion(seccionModosJuego); // Oculta los botones de selección
    mostrarSeccion(seccionIngresarPalabra); // Muestra la sección para ingresar la palabra
    inputPalabraVersus.focus();
});

// Botón "Online"
if (botonOnline) {
    botonOnline.addEventListener("click", () => {
        ocultarTodasLasSecciones();
        mostrarSeccion(seccionOnline);
    });
}


// sección Online 
botonCrearPartida.addEventListener("click", async () => {
    // Aquí llamaremos a una función para crear la partida en el backend
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
});


// Botón "Enviar Palabra" (para Modo Versus)
botonEnviarPalabra.addEventListener("click", async function(event) {
    event.preventDefault();
    const palabra = inputPalabraVersus.value.toUpperCase().trim();

    if (palabra.length < 4 || palabra.length > 8) {
        txtIngresarPalabraVersus.textContent = "La palabra debe tener entre 4 y 8 letras.";
        inputPalabraVersus.focus();
        return;
    }
    // Opcional: Validar que sean solo letras
    if (!/^[A-Z]+$/.test(palabra)) {
        txtIngresarPalabraVersus.textContent = "Solo se permiten letras.";
        inputPalabraVersus.focus();
        return;
    }

    inputPalabraVersus.value = ""; // Limpiar el input
    await iniciarJuego("versus", palabra); // Inicia el juego en modo versus con la palabra
});

// Botón "Cancelar" (en la sección de ingreso de palabra versus)
botonCancelarVersus.addEventListener("click", function(event) {
    event.preventDefault();
    ocultarSeccion(seccionIngresarPalabra);
    mostrarSeccion(seccionModosJuego); // Vuelve a mostrar los botones de selección de modo
    inputPalabraVersus.value = ""; // Limpia el input por si acaso
    txtIngresarPalabraVersus.textContent = "Ingresa una palabra de 4 a 8 letras para tu amigo"; // Restaura el mensaje
});


// Botón "Enviar Letra" (para ambos modos)
botonSubirLetra.addEventListener("click", async function(event) {
    event.preventDefault();

    let contenido = inputIngresaLetra.value.toUpperCase(); // Usamos .trim() para quitar espacios

   await manejarEnvioLetra(); // Llama a la función que maneja el envío de letras

});

// Botón "Reiniciar" (para ambos modos)
botonReiniciar.addEventListener("click", async function(event) {
    event.preventDefault();
    await fetch("http://127.0.0.1:5195/api/juego/reiniciar", { 
        method: "POST",
        credentials: 'include'
 }),
    // Después de reiniciar el backend, volvemos a la pantalla de selección de modo
    ocultarSeccion(seccionJuego);
    mostrarSeccion(seccionModosJuego);
    mostrarSeccion(botonInicio); // Asegurarse de que el botón de inicio sea visible para volver a empezar
    ocultarSeccion(botonSolitario);
    ocultarSeccion(botonVersus);
    ocultarSeccion(botonOnline);
    resetearUIJuego(); // Limpia la UI del juego
});

// Para que ENTER funcione en el input
inputIngresaLetra.addEventListener("keypress", async function(event) {
    if (event.key === "Enter") {
        event.preventDefault(); // Evita el envío del formulario si existe
        await manejarEnvioLetra();
    }
});

//#endregion

// Inicializar la interfaz al cargar la página (ocultar todo excepto el botón "Iniciar Juego")
function inicializarUI() {
    // Estas secciones deben estar ocultas al inicio
    ocultarSeccion(seccionIngresarPalabra);
    ocultarSeccion(seccionJuego);

    // Esta sección debe estar visible al inicio
    mostrarSeccion(seccionModosJuego); // <--- CAMBIADO: AHORA MUESTRA LA SECCIÓN DE MODOS

    // Dentro de seccionModosJuego:
    mostrarSeccion(botonInicio); // El botón "Iniciar Juego" debe ser visible
    ocultarSeccion(botonSolitario); // Los otros botones deben estar ocultos
    ocultarSeccion(botonVersus);
    ocultarSeccion(botonOnline);
}

// Llama a la función de inicialización cuando el DOM esté completamente cargado
document.addEventListener("DOMContentLoaded", inicializarUI);




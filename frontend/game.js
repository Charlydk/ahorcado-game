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
const inputIngresaLetra = document.querySelector(".ingresaLetra");
const botonSubirLetra = document.querySelector(".subirLetra");
const botonReiniciar = document.querySelector(".reiniciar");

// --- Variables de Estado del Frontend (estas se sincronizan con el backend) ---
let cantidadErradas = 0; // Se actualiza con la respuesta del backend
let letrasIntentadas = []; // Para llevar el registro de letras ya usadas en el frontend

// --- Funciones de Utilidad para Mostrar/Ocultar Secciones ---
function mostrarSeccion(seccion) {
     // Si la sección es una de las principales que usa flexbox en CSS, la mostramos como flex.
    // De lo contrario, usamos 'block' como un valor seguro para elementos individuales o si no sabes el display exacto.
    if (seccion === seccionModosJuego || seccion === seccionIngresarPalabra || seccion === seccionJuego) {
        seccion.style.display = "flex";
    } else {
        seccion.style.display = "block";
    }
}

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
        const response = await fetch("https://localhost:7055/api/juego/iniciar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ Modo: modo, Palabra: palabraVersus })
        });

        if (!response.ok) {
            const errorText = await response.text(); // Intenta leer el mensaje de error del backend
            throw new Error(`Error al iniciar el juego: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log("Respuesta al iniciar juego:", data);

        // Reiniciar y mostrar la interfaz de juego
        resetearUIJuego();
        ocultarSeccion(seccionModosJuego); // Oculta los botones de selección de modo
        ocultarSeccion(seccionIngresarPalabra); // Oculta la sección de ingreso de palabra VS (si estaba visible)
        mostrarSeccion(seccionJuego); // Muestra la sección principal del juego

        inputGuiones.value = data.palabra; // Muestra los guiones iniciales

        // Si es modo versus, ahora le toca al otro jugador
        if (modo === "versus") {
            mensajeJuego.textContent = "¡Adivina la palabra!";
        } else {
            mensajeJuego.textContent = "Ingresa una Letra";
        }

        inputIngresaLetra.focus(); // Enfoca el input para adivinar
    } catch (error) {
        console.error("Error al iniciar el juego:", error);
        mensajeJuego.textContent = `Error: ${error.message}. Por favor, reinicia o inténtalo de nuevo.`;
        // Opcional: mostrar un mensaje de error más amigable en un div específico.
    }
}

// --- Lógica para Verificar Letra (Comunicación con Backend) ---
async function VerificarLetra(letra) {
    try {
        // Validaciones en el frontend antes de enviar al backend
        if (letrasIntentadas.includes(letra)) {
            mensajeJuego.textContent = `¡Ya ingresaste la letra "${letra}"!`;
            inputIngresaLetra.value = "";
            inputIngresaLetra.focus();
            return;
        }

        letrasIntentadas.push(letra); // Agrega la letra a la lista local de intentadas

        const response = await fetch("https://localhost:7055/api/juego/verificar-letra", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ Letra: letra })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error en la API: ${response.status} - ${errorText}`);
        }

        const resultado = await response.json();
        console.log("Respuesta del backend:", resultado);

        inputGuiones.value = resultado.palabraActualizada; // Siempre actualiza los guiones
        inputLetrasOut.value = resultado.letrasErradas.join(" "); // Actualiza las letras erradas
        cantidadErradas = resultado.letrasErradas.length; // Sincroniza intentos errados con el backend

        // Actualizar imagen del ahorcado (ahora basado en cantidadErradas del backend)
        imagenAhorcado.src = `img/ahorcadito_${cantidadErradas + 1}.png`; // Ajustar para que 0 errores sea ahorcadito_1.png

        // --- Manejo del Estado del Juego ---
        if (resultado.estadoJuego === "ganaste") {
            mensajeJuego.textContent = `¡Felicidades! Has adivinado la palabra: ${resultado.palabraSecreta}`;
            ocultarSeccion(botonSubirLetra);
            ocultarSeccion(inputIngresaLetra);
            imagenAhorcado.src = `img/ahorcadito_0.png`; // Imagen de victoria
        } else if (resultado.estadoJuego === "perdiste") {
            ocultarSeccion(botonSubirLetra);
            ocultarSeccion(inputIngresaLetra);
            mensajeJuego.textContent = `GAME OVER!! - La palabra era: ${resultado.palabraSecreta}`;
            imagenAhorcado.src = `img/ahorcadito_7.png`; // Imagen de derrota (el ahorcado completo)
        } else {
            mensajeJuego.textContent = `Ingresa una Letra`;
        }

        inputIngresaLetra.value = ""; // Limpiar el input después de cada intento
        inputIngresaLetra.focus();
    } catch (error) {
        console.error("Error al verificar letra:", error);
        mensajeJuego.textContent = `Error: ${error.message}.`;
    }
}

// --- Event Listeners de Botones ---

// Botón "Iniciar Juego" (Muestra los botones de selección de modo)
botonInicio.addEventListener("click", function(event) {
    event.preventDefault();
    ocultarSeccion(botonInicio);
    mostrarSeccion(botonSolitario);
    mostrarSeccion(botonVersus);
    mostrarSeccion(botonOnline); // Si lo tienes, muéstralo también
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
    let contenido = inputIngresaLetra.value.toUpperCase().trim(); // Usamos .trim() para quitar espacios

    if (contenido === "") {
        mensajeJuego.textContent = "Debe ingresar una letra";
        inputIngresaLetra.focus();
        return;
    }
    if (contenido.length > 1) {
        mensajeJuego.textContent = "Por favor, ingresa solo una letra";
        inputIngresaLetra.value = "";
        inputIngresaLetra.focus();
        return;
    }
    // Validar que sea una letra
    if (!/^[A-Z]$/.test(contenido)) {
        mensajeJuego.textContent = "Ingresa solo letras.";
        inputIngresaLetra.value = "";
        inputIngresaLetra.focus();
        return;
    }

    await VerificarLetra(contenido);
});

// Botón "Reiniciar" (para ambos modos)
botonReiniciar.addEventListener("click", async function(event) {
    event.preventDefault();
    await fetch("https://localhost:7055/api/juego/reiniciar", { method: "POST" });
    // Después de reiniciar el backend, volvemos a la pantalla de selección de modo
    ocultarSeccion(seccionJuego);
    mostrarSeccion(seccionModosJuego);
    mostrarSeccion(botonInicio); // Asegurarse de que el botón de inicio sea visible para volver a empezar
    ocultarSeccion(botonSolitario);
    ocultarSeccion(botonVersus);
    ocultarSeccion(botonOnline);
    resetearUIJuego(); // Limpia la UI del juego
});

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




var palabraActual = ""; // Variable para almacenar la palabra completa (para el final del juego)
var nuevaPalabra = [];   // Variable para la palabra con guiones y letras correctas

async function iniciarJuego(modo = "solitario", palabraVersus = "") {
    try {
        const response = await fetch("https://localhost:7055/api/juego/iniciar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ Modo: modo, Palabra: palabraVersus.toUpperCase() })
        });

        if (!response.ok) {
            throw new Error(`Error al iniciar el juego: ${response.status}`);
        }

        const data = await response.json();
        console.log("Respuesta al iniciar juego:", data);
        nuevaPalabra = data.palabra.split(''); // Inicializamos nuevaPalabra con los guiones
        document.querySelector(".guion").value = data.palabra;
        palabraActual = ""; // Limpiamos palabraActual al iniciar un nuevo juego
        document.querySelector(".LetrasOut").value = "";
        cantidadErradas = 0;
        document.getElementById("imagen").src = "img/ahorcadito_1.png";
        document.querySelector(".txtTitH3").textContent = "Ingresa una Letra";
        document.querySelector(".subirLetra").style.display = "inline";
        document.querySelector(".ingresaLetra").style.display = "inline";

    } catch (error) {
        console.error("Error al iniciar el juego:", error);
        document.querySelector(".txtTitH3").textContent = "Error al iniciar el juego";
    }
}

/*boton comenzar*/
var botonComenzar = document.querySelector(".comenzar");
botonComenzar.addEventListener("click", async function (event) {
    event.preventDefault();
    await iniciarJuego(); // Iniciamos el juego en modo solitario por defecto
    document.querySelector(".comenzar").style.display = "none";
    document.querySelector(".reiniciar").style.display = "inline";
    document.querySelector(".ingresaLetra").style.display = "inline";
    document.querySelector(".subirLetra").style.display = "inline";
    document.querySelector(".txtTitH3").style.display = "inline";
    document.querySelector(".txtTitH3").textContent = "Ingresa una Letra";
    document.querySelector(".ingresaLetra").focus();
});

/*boton reiniciar*/
var botonReiniciar = document.querySelector(".reiniciar");
botonReiniciar.addEventListener("click", async function(event) {
    event.preventDefault();
    await fetch("https://localhost:7055/api/juego/reiniciar", { method: "POST" });
    await iniciarJuego(); // Volvemos a iniciar un nuevo juego
    document.querySelector(".ingresaLetra").focus();
});



cantidadErradas = 0;

// **Función para verificar la letra ingresada**
// Esta función se encarga de enviar la letra al backend y recibir la respuesta
// dependiendo de si la letra es correcta o incorrecta. También actualiza la UI
// según el estado del juego (ganado, perdido o en progreso).

async function VerificarLetra(letra) {
    try {
        const response = await fetch("https://localhost:7055/api/juego/verificar-letra", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ Letra: letra })
        });

        if (!response.ok) {
            throw new Error(`Error en la API: ${response.status}`);
        }

        const resultado = await response.json();
        console.log("Respuesta del backend:", resultado);

        if (resultado.esCorrecta) {
            document.querySelector(".guion").value = resultado.palabraActualizada;
            nuevaPalabra = resultado.palabraActualizada.split(''); // Actualizamos nuestra variable local
        } else if (!document.querySelector(".LetrasOut").value.includes(letra)) {
            cantidadErradas++;
            document.querySelector(".LetrasOut").value += letra + " ";
        }

        // **Verificamos el estado del juego enviado por el backend**
        if (resultado.estadoJuego === "ganaste") {
            document.querySelector(".txtTitH3").textContent = `¡Felicidades! Has adivinado la palabra: ${resultado.palabraActualizada.replace(/_/g, '')}`; // Asumimos que la palabra completa está en palabraActualizada al ganar
            document.querySelector(".subirLetra").style.display = "none";
            document.querySelector(".ingresaLetra").style.display = "none";
            document.getElementById("imagen").src = `img/ahorcadito_0.png`;
        } else if (resultado.estadoJuego === "perdiste") {
            document.querySelector(".subirLetra").style.display = "none";
            document.querySelector(".ingresaLetra").style.display = "none";
            document.querySelector(".txtTitH3").textContent = `GAME OVER!! - La palabra era: ${resultado.palabraSecreta.replace(/_/g, '')}`; // También podríamos necesitar un campo específico para la palabra al perder
            document.getElementById("imagen").src = `img/ahorcadito_7.png`;
        } else {
            // Actualizar imagen del ahorcado según cantidadErradas
            document.getElementById("imagen").src = `img/ahorcadito_${cantidadErradas + 1}.png`;
        }

    } catch (error) {
        console.error("Error al verificar letra:", error);
    }
}

/*boton enviar letra*/
var botonLetra = document.querySelector(".subirLetra");
botonLetra.addEventListener("click", async function(event) {
    event.preventDefault();

    let contenido = document.querySelector(".ingresaLetra").value.toUpperCase();
    if (contenido === "") {
        alert("Debe ingresar una letra");
        return;
    }
    if (contenido.length > 1) {
        alert("Por favor, ingresa solo una letra");
        document.querySelector(".ingresaLetra").value = "";
        document.querySelector(".ingresaLetra").focus();
        return;
    }

    await VerificarLetra(contenido);

    document.querySelector(".ingresaLetra").value = "";
    document.querySelector(".ingresaLetra").focus();
});




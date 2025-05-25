using AhorcadoBackend.Extensions; // Necesario si usas SetObjectAsJson/GetObjectFromJson para otras cosas, pero lo eliminaremos para JuegoEstado.
using AhorcadoBackend.Models; // Asegúrate que tus modelos (JuegoEstado, JuegoEstadoResponse, etc.) estén en este namespace o el que uses.
using AhorcadoBackend.Services; // Asegúrate que tu GameManager esté en este namespace.
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Generic;
using System.Linq; // Necesario para .ToHashSet() y .OrderBy()

[ApiController]
[Route("api/juego")]
public class JuegoController : ControllerBase
{
    private readonly GameManager _gameManager;

    // Ya no necesitamos la clave de sesión si todo el estado lo maneja GameManager
    // private const string JuegoEstadoKey = "JuegoAhorcadoEstado";

    private static List<string> palabras = new List<string>
    { "CASA", "PAYASO", "CAMARA", "HOMERO", "PLATO", "TECLADO", "TRISTEZA", "MONITOR" };

    private static string GenerarPalabraAleatoria()
    {
        Random random = new Random();
        return palabras[random.Next(palabras.Count)];
    }

    // El constructor inyecta GameManager
    public JuegoController(GameManager gameManager)
    {
        _gameManager = gameManager;
    }

    
    

    [HttpPost("iniciar")]
    public ActionResult IniciarJuego([FromBody] PalabraEntrada entrada)
    {
        string palabraElegida;
        if (entrada.Modo == "solitario")
        {
            palabraElegida = GenerarPalabraAleatoria();
        }
        else if (entrada.Modo == "versus")
        {
            if (entrada.Palabra == null || entrada.Palabra.Length < 4 || entrada.Palabra.Length > 8)
            {
                return BadRequest("Para el modo 'versus', la palabra debe tener entre 4 y 8 caracteres.");
            }
            palabraElegida = entrada.Palabra.ToUpper();
        }
        else
        {
            return BadRequest("Modo de juego no válido. Use 'solitario' o 'versus'.");
        }

        // Creamos un nuevo estado de juego en el GameManager
        // Para modo solitario/versus, podemos usar un ID fijo de "sesion" o el ConnectionId de SignalR
        // Por simplicidad, aquí usaremos un GUID para una "sesión" de juego local.
        // Si no usas SignalR para solitario/versus, puedes generar un GUID aquí
        // o si tienes un GameHub, usar Context.ConnectionId como GameId para esta sesión.
        // Por ahora, para que funcione con el Game Manager, generaremos un ID único.
        string gameIdParaSesion = Guid.NewGuid().ToString(); // Generamos un ID para esta partida de sesión
        var nuevoEstado = _gameManager.CreateNewGame(palabraElegida, gameIdParaSesion); // Pasa el gameId

        // Si usabas la sesión HTTP para el estado, ahora el GameManager lo maneja.
        // Retornamos el ID de la partida (que ahora es el ID de la "sesión" de juego)
        // Y el frontend deberá recordar este ID para futuras llamadas.
        return Ok(new { gameId = nuevoEstado.GameId, palabra = nuevoEstado.GuionesActuales, modo = entrada.Modo });
    }

    [HttpPost("verificar-letra")] // Este endpoint ahora sirve para TODOS los modos (solitario, versus, online)
    public ActionResult VerificarLetra([FromBody] LetraOnlineEntrada entrada) // Usa LetraOnlineEntrada para recibir GameId
    {
        if (string.IsNullOrEmpty(entrada.Letra) || !char.IsLetter(entrada.Letra[0]))
        {
            return BadRequest("Ingresa una letra válida.");
        }
        if (string.IsNullOrEmpty(entrada.GameId)) // Ahora GameId es requerido para todas las verificaciones
        {
            return BadRequest("El ID de partida es requerido.");
        }

        var letra = char.ToUpper(entrada.Letra[0]);
        var estadoActual = _gameManager.GetGame(entrada.GameId); // Obtener el estado del juego desde GameManager

        if (estadoActual == null)
        {
            return NotFound("Partida no encontrada o ya finalizada."); // Cambiado de BadRequest a NotFound
        }

        // Si la letra ya fue intentada (correcta o incorrecta)
        if (estadoActual.LetrasIngresadas.Contains(letra)) // Usar LetrasIngresadas, que contiene TODAS las letras intentadas
        {
            // Devuelve el estado actual sin cambios, el frontend ya maneja este mensaje
            return Ok(new JuegoEstadoResponse
            {
                Palabra = estadoActual.GuionesActuales, // Usa GuionesActuales
                IntentosRestantes = estadoActual.IntentosRestantes,
                LetrasIncorrectas = string.Join(", ", estadoActual.LetrasIncorrectas.OrderBy(c => c)),
                JuegoTerminado = estadoActual.JuegoTerminado, // Usa la propiedad JuegoTerminado
                PalabraSecreta = estadoActual.PalabraSecreta // Incluir para el mensaje final si ya terminó
            });
        }

        // Lógica de adivinación de letra
        bool letraEncontrada = false;
        char[] guionesChars = estadoActual.GuionesActuales.ToCharArray();

        for (int i = 0; i < estadoActual.PalabraSecreta.Length; i++)
        {
            if (estadoActual.PalabraSecreta[i] == letra)
            {
                guionesChars[i] = letra;
                letraEncontrada = true;
            }
        }
        estadoActual.GuionesActuales = new string(guionesChars); // Actualiza la palabra adivinada

        if (!letraEncontrada)
        {
            estadoActual.IntentosRestantes--;
            estadoActual.LetrasIncorrectas.Add(letra);
        }
        estadoActual.LetrasIngresadas.Add(letra); // Agrega a todas las letras intentadas

        // Verificar si el juego ha terminado
        estadoActual.JuegoTerminado = estadoActual.IntentosRestantes == 0 || estadoActual.GuionesActuales == estadoActual.PalabraSecreta;

        // Actualizar el estado en el GameManager
        _gameManager.UpdateGame(entrada.GameId, estadoActual);

        // Retornar el estado actualizado al frontend
        return Ok(new JuegoEstadoResponse
        {
            Palabra = estadoActual.GuionesActuales,
            IntentosRestantes = estadoActual.IntentosRestantes,
            LetrasIncorrectas = string.Join(", ", estadoActual.LetrasIncorrectas.OrderBy(c => c)),
            JuegoTerminado = estadoActual.JuegoTerminado,
            PalabraSecreta = estadoActual.PalabraSecreta // Incluir la palabra secreta cuando el juego termina
        });
    }

    [HttpPost("reiniciar")]
    public ActionResult ReiniciarJuego([FromBody] ReiniciarJuegoEntrada entrada) // Ahora necesita GameId
    {
        if (string.IsNullOrEmpty(entrada.GameId))
        {
            return BadRequest("El ID de partida es requerido para reiniciar.");
        }

        _gameManager.RemoveGame(entrada.GameId); // Elimina el juego del GameManager
        return Ok("Juego reiniciado. Puedes iniciar uno nuevo.");
    }


    #region Endpoints Específicos de Partidas Online (Crear/Unirse)

    [HttpPost("crear-online")]
    public ActionResult CrearPartidaOnline()
    {
        string palabraSecreta = GenerarPalabraAleatoria(); // Usa tu función aleatoria
        var newGameEstado = _gameManager.CreateNewGame(palabraSecreta); // GameManager generará el GameId

        return Ok(new { GameId = newGameEstado.GameId, Palabra = newGameEstado.GuionesActuales });
    }

    [HttpPost("unirse-online")]
    public async Task<IActionResult> UnirseOnline([FromBody] JoinGameRequest request)
    {
        var game = _gameManager.GetGame(request.GameId);

        if (game == null)
        {
            return NotFound(new { message = "Partida no encontrada." });
        }

        if (game.PlayerConnectionIds.Count >= 2)
        {
            return BadRequest(new { message = "La partida ya está llena." });
        }

        // Obtener el ConnectionId de SignalR del cliente que hace la solicitud
        string connectionId = HttpContext.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();

        if (string.IsNullOrEmpty(connectionId))
        {
            return BadRequest(new { message = "No se pudo obtener el ConnectionId de SignalR." });
        }

        // Añadir el ConnectionId al juego en el GameManager
        if (_gameManager.AddPlayerToGame(request.GameId, connectionId))
        {
            // Si ya hay 2 jugadores, ¡la partida puede empezar!
            if (game.PlayerConnectionIds.Count == 2)
            {
                // Notificar a ambos jugadores que la partida ha comenzado (vía SignalR)
                // Esto se manejará mejor directamente en el GameHub.
                // Por ahora, solo actualiza el mensaje en el frontend.
                await _hubContext.Clients.Group(request.GameId).SendAsync("ReceiveGameUpdate", new
                {
                    gameId = game.GameId,
                    palabra = game.GuionesActuales,
                    letrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                    intentosRestantes = game.IntentosRestantes,
                    juegoTerminado = game.JuegoTerminado,
                    palabraSecreta = game.PalabraSecreta,
                    message = "¡La partida ha comenzado! Adivina la palabra." // Mensaje de inicio
                });
            }
            return Ok(new JuegoEstadoResponse
            {
                Palabra = game.GuionesActuales,
                IntentosRestantes = game.IntentosRestantes,
                LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                JuegoTerminado = game.JuegoTerminado,
                PalabraSecreta = "" // No revelar la palabra secreta al unirse
            });
        }
        else
        {
            // Esto puede ocurrir si el jugador ya estaba en la lista
            return Ok(new JuegoEstadoResponse
            {
                Palabra = game.GuionesActuales,
                IntentosRestantes = game.IntentosRestantes,
                LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                JuegoTerminado = game.JuegoTerminado,
                PalabraSecreta = ""
            });
        }
    }




#endregion


#region Clases de Ayuda (Modelos de Entrada/Salida)

// Clase para la entrada de iniciar juego (modo y palabra)
public class PalabraEntrada
    {
        public string? Palabra { get; set; }
        public string? Modo { get; set; }
    }

    // Clase para la entrada de verificar letra (ahora con GameId)
    public class LetraOnlineEntrada
    {
        public string Letra { get; set; } = string.Empty; // Inicializamos
        public string GameId { get; set; } = string.Empty; // Asegúrate de que GameId sea string.Empty por defecto
    }

    // Clase para la entrada de unirse a partida
    public class UnirsePartidaEntrada
    {
        public string GameId { get; set; } = string.Empty;
    }

    // Clase para la entrada de reiniciar juego (ahora con GameId)
    public class ReiniciarJuegoEntrada
    {
        public string GameId { get; set; } = string.Empty;
    }

    // clase que sirve a unirse on line
    public class JoinGameRequest
    {
        public string GameId { get; set; } = string.Empty;
    }


    // Clase para la respuesta del estado del juego al frontend (unificada)
    // Asegúrate de que esta clase sea pública y esté accesible (ej. en Models/JuegoEstadoResponse.cs)
    /*
    public class JuegoEstadoResponse
    {
        public string Palabra { get; set; } = string.Empty;
        public int IntentosRestantes { get; set; }
        public string LetrasIncorrectas { get; set; } = string.Empty; // Como un string "A, B, C"
        public bool JuegoTerminado { get; set; }
        public string PalabraSecreta { get; set; } = string.Empty; // Se envía al final del juego
    }
    */

    #endregion
}
using AhorcadoBackend.Hubs;
using AhorcadoBackend.Models;
using AhorcadoBackend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

[ApiController]
[Route("api/juego")]
public class JuegoController : ControllerBase
{
    private readonly GameManager _gameManager;
    private readonly IHubContext<GameHub> _hubContext;

    public JuegoController(GameManager gameManager, IHubContext<GameHub> hubContext)
    {
        _gameManager = gameManager;
        _hubContext = hubContext;
    }

    public class PalabraEntrada
    {
        public string? Palabra { get; set; }
        public string? Modo { get; set; }
    }

    // ========================================================================
    // MODELOS DE ENTRADA/SALIDA (Clases de Ayuda)
    // Se unifican para mayor claridad y consistencia
    // ========================================================================

    public class CrearGameOnlineRequest
    {
        public string CreatorConnectionId { get; set; } = string.Empty;
    }

    public class UnirseGameOnlineRequest
    {
        public string GameId { get; set; } = string.Empty;
        public string PlayerConnectionId { get; set; } = string.Empty;
    }

    // Clase unificada para la entrada de verificar letra en todos los modos
    public class LetraOnlineEntrada
    {
        public string Letra { get; set; } = string.Empty;
        public string GameId { get; set; } = string.Empty;
        public string PlayerConnectionId { get; set; } = string.Empty; // Crucial para online y turnos
    }

    public class ReiniciarJuegoEntrada
    {
        public string GameId { get; set; } = string.Empty;
    }

    public class AdivinarLetraEntrada
    {
        public string GameId { get; set; } = string.Empty;
        public char Letra { get; set; }
    }

    // ========================================================================
    // ENDPOINTS DEL CONTROLADOR
    // ========================================================================

    [HttpPost("iniciar")]
    public ActionResult IniciarJuego([FromBody] PalabraEntrada entrada)
    {
        string gameIdParaSesion = Guid.NewGuid().ToString();
        JuegoEstado nuevoEstado;

        if (entrada.Modo == "versus" && !string.IsNullOrEmpty(entrada.Palabra))
        {
            if (entrada.Palabra.Length < 4 || entrada.Palabra.Length > 8)
            {
                return BadRequest("Para el modo 'versus', la palabra debe tener entre 4 y 8 caracteres.");
            }
            nuevoEstado = _gameManager.CreateNewGame(entrada.Palabra.ToUpper(), gameIdParaSesion);
        }
        else if (entrada.Modo == "solitario")
        {
            nuevoEstado = _gameManager.CreateNewGame(null, gameIdParaSesion);
        }
        else
        {
            return BadRequest("Modo de juego no válido o palabra no proporcionada para 'versus'.");
        }

        return Ok(new JuegoEstadoResponse
        {
            GameId = nuevoEstado.GameId,
            Palabra = nuevoEstado.GuionesActuales,
            IntentosRestantes = nuevoEstado.IntentosRestantes,
            LetrasIncorrectas = string.Join(", ", nuevoEstado.LetrasIncorrectas),
            JuegoTerminado = nuevoEstado.JuegoTerminado,
            PalabraSecreta = nuevoEstado.JuegoTerminado ? nuevoEstado.PalabraSecreta : "",
            TurnoActualConnectionId = null,
            Message = "¡La partida ha comenzado! Adivina la palabra."
        });
    }

    [HttpPost("reiniciar")]
    public ActionResult ReiniciarJuego([FromBody] ReiniciarJuegoEntrada entrada)
    {
        if (string.IsNullOrEmpty(entrada.GameId))
        {
            return BadRequest(new { message = "El ID de partida es requerido para reiniciar." });
        }

        var game = _gameManager.RestartGame(entrada.GameId);

        if (game == null)
        {
            return NotFound(new { message = "Partida no encontrada o no se pudo reiniciar." });
        }

        return Ok(new JuegoEstadoResponse
        {
            GameId = game.GameId,
            Palabra = game.GuionesActuales,
            IntentosRestantes = game.IntentosRestantes,
            LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
            JuegoTerminado = game.JuegoTerminado,
            PalabraSecreta = "",
            TurnoActualConnectionId = null,
            Message = "¡Partida reiniciada! Una nueva palabra ha sido seleccionada."
        });
    }

    

    //Método Adivinar Letra Local (Modificado)

  
    [HttpPost("adivinarLetraLocal")]
    public ActionResult AdivinarLetraLocal([FromBody] AdivinarLetraEntrada entrada)
    {
        if (string.IsNullOrEmpty(entrada.GameId))
        {
            return BadRequest(new { message = "El ID de partida es requerido." });
        }
        char letraMayuscula = char.ToUpper(entrada.Letra);
        if (!char.IsLetter(letraMayuscula))
        {
            return BadRequest(new { message = "Por favor, ingresa solo una letra válida." });
        }

        // 1. Procesar la letra usando el GameManager.
        //    El GameManager ahora devuelve un 'ProcessLetterResult' que incluye el estado del juego
        //    y el mensaje específico de la jugada.
        //    Para el modo local, playerConnectionId es null.
        var result = _gameManager.ProcessLetter(entrada.GameId, letraMayuscula, null);

        if (result.UpdatedGame == null)
        {
            // Esto ocurriría si la partida no se encontró en GameManager.ProcessLetter
            return NotFound(new { message = result.Message }); // Usar el mensaje de error del GameManager
        }

        var game = result.UpdatedGame; // Obtenemos el estado actualizado del juego

        // El mensaje ya viene directamente del ProcessLetterResult, simplificando la lógica.
        string message = result.Message;

        // Devolver el estado actualizado al frontend
        return Ok(new JuegoEstadoResponse
        {
            GameId = game.GameId,
            Palabra = game.GuionesActuales,
            IntentosRestantes = game.IntentosRestantes,
            LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
            JuegoTerminado = game.JuegoTerminado,
            PalabraSecreta = game.JuegoTerminado ? game.PalabraSecreta : "", // Revela solo si terminó
            TurnoActualConnectionId = null, // No hay turnos en modo local
            Message = message // Usamos el mensaje directo del ProcessLetterResult
        });
    }
    

    //Método Helper (No necesita cambios pero lo incluyo para contexto)

    
    // ========================================================================
    // MÉTODO HELPER PARA OBTENER TODAS LAS LETRAS ADIVINADAS
    // Este método ya no es estrictamente necesario para AdivinarLetraLocal
    // porque ProcessLetterResult ya da el mensaje, pero puedes conservarlo
    // si lo usas en otra parte o para lógica futura.
    // ========================================================================
    private HashSet<char> GetAllGuessedLetters(JuegoEstado game)
    {
        var guessed = new HashSet<char>();
        // Añadir letras reveladas en la palabra actual
        foreach (char c in game.GuionesActuales)
        {
            if (char.IsLetter(c))
            {
                guessed.Add(c);
            }
        }
        // Añadir letras incorrectas
        foreach (char c in game.LetrasIncorrectas)
        {
            guessed.Add(c);
        }
        // Asumiendo que JuegoEstado tiene una propiedad 'LetrasAdivinadas' que es una List<char>
        // si existe, también deberías añadirla aquí:
        // if (game.LetrasAdivinadas != null) {
        //     foreach (char c in game.LetrasAdivinadas) {
        //         guessed.Add(c);
        //     }
        // }
        return guessed;
    }
 

   //Resto de Endpoints (Sin Cambios significativos para esta corrección)

 
    // ========================================================================
    // RESTO DE ENDPOINTS (SIN CAMBIOS)
    // ========================================================================
    [HttpPost("crear-online")]
    public IActionResult CrearPartidaOnline([FromBody] CrearGameOnlineRequest request)
    {
        string gameId = Guid.NewGuid().ToString();
        var game = _gameManager.CreateNewGame(null, gameId);

        if (!string.IsNullOrEmpty(request.CreatorConnectionId))
        {
            _gameManager.AddPlayerToGame(game.GameId, request.CreatorConnectionId);
        }
        else
        {
            Console.WriteLine("Advertencia: CreatorConnectionId vacío en CrearPartidaOnline. La partida se creará sin un creador asignado inicialmente.");
        }

        return Ok(new JuegoEstadoResponse
        {
            GameId = game.GameId,
            Palabra = game.GuionesActuales,
            IntentosRestantes = game.IntentosRestantes,
            LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
            JuegoTerminado = game.JuegoTerminado,
            PalabraSecreta = "",
            TurnoActualConnectionId = game.TurnoActualConnectionId, // Asegúrate de que este se asigne correctamente en GameManager
            Message = "¡Partida creada! Comparte el ID para que alguien se una."
        });
    }

    [HttpPost("unirse-online")]
    public async Task<IActionResult> UnirseOnline([FromBody] UnirseGameOnlineRequest request)
    {
        // PASO 1: Validar si el GameId es nulo o vacío
        if (string.IsNullOrEmpty(request.GameId))
        {
            return BadRequest(new { message = "El ID de partida es requerido." });
        }

        // PASO 2: AÑADE AQUÍ LA VALIDACIÓN DEL FORMATO GUID DEL GAMEID
        if (!Guid.TryParse(request.GameId, out _))
        {
            return BadRequest(new { message = "El formato del ID de partida es inválido. Asegúrate de ingresar un ID válido." });
        }

        // PASO 3: Ahora sí, intenta obtener la partida si el formato es correcto
        var game = _gameManager.GetGame(request.GameId);

        if (game == null)
        {
            return NotFound(new { message = "Partida no encontrada." });
        }

        // PASO 4: Validar PlayerConnectionId (esto ya lo tienes bien ubicado)
        if (string.IsNullOrEmpty(request.PlayerConnectionId))
        {
            return BadRequest(new { message = "PlayerConnectionId es requerido para unirse a la partida." });
        }

        // ... (el resto de tu código para añadir el jugador y manejar la lógica de unión)

        if (_gameManager.AddPlayerToGame(request.GameId, request.PlayerConnectionId))
        {
            if (game.PlayerConnectionIds.Count == 2)
            {
                if (string.IsNullOrEmpty(game.TurnoActualConnectionId))
                {
                    game.TurnoActualConnectionId = game.CreadorConnectionId;
                }

                await _hubContext.Clients.Group(request.GameId).SendAsync("ReceiveGameUpdate", new JuegoEstadoResponse
                {
                    GameId = game.GameId,
                    Palabra = game.GuionesActuales,
                    LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                    IntentosRestantes = game.IntentosRestantes,
                    JuegoTerminado = game.JuegoTerminado,
                    PalabraSecreta = "",
                    Message = "¡La partida ha comenzado! Adivina la palabra.",
                    TurnoActualConnectionId = game.TurnoActualConnectionId
                });
            }
            return Ok(new JuegoEstadoResponse
            {
                GameId = game.GameId,
                Palabra = game.GuionesActuales,
                IntentosRestantes = game.IntentosRestantes,
                LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                JuegoTerminado = game.JuegoTerminado,
                PalabraSecreta = "",
                TurnoActualConnectionId = game.TurnoActualConnectionId,
                Message = "Te has unido a la partida. ¡A jugar!"
            });
        }
        else
        {
            return Ok(new JuegoEstadoResponse
            {
                GameId = game.GameId,
                Palabra = game.GuionesActuales,
                IntentosRestantes = game.IntentosRestantes,
                LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                JuegoTerminado = game.JuegoTerminado,
                PalabraSecreta = "",
                TurnoActualConnectionId = game.TurnoActualConnectionId,
                Message = "Ya estás en esta partida. ¡Continuemos!"
            });
        }
    }
}
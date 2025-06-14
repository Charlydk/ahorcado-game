using AhorcadoBackend.Hubs;
using AhorcadoBackend.Models;
using AhorcadoBackend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

// Se recomienda que el namespace del controlador sea el mismo que el proyecto principal
// o un sub-namespace lógico para evitar problemas de resolución de tipos.
// Si tu proyecto se llama AhorcadoBackend, el namespace debería ser AhorcadoBackend.Controllers
namespace AhorcadoBackend.Controllers
{
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

        // --- MODELOS DE ENTRADA/SALIDA (Clases de Ayuda) ---
        // Se unifican para mayor claridad y consistencia
        public class PalabraEntrada
        {
            public string? Palabra { get; set; }
            public string? Modo { get; set; }
        }

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

        // --- ENDPOINTS DEL CONTROLADOR ---

        [HttpPost("iniciar")]
        public ActionResult IniciarJuego([FromBody] PalabraEntrada entrada)
        {
            // Nota: Para modos "solitario" y "versus" manejados por HTTP,
            // no es necesario un `gameIdParaSesion` generado aquí si el GameManager
            // ya lo genera internamente o si estos modos no requieren ID público.
            // Si son puramente locales, no necesitan un gameId tan "público".
            // Sin embargo, para mantener consistencia con `GetGame`, lo dejo como estaba.
            string gameIdParaSesion = Guid.NewGuid().ToString();
            JuegoEstado nuevoEstado;

            if (entrada.Modo == "versus" && !string.IsNullOrEmpty(entrada.Palabra))
            {
                if (entrada.Palabra.Length < 4 || entrada.Palabra.Length > 8)
                {
                    return BadRequest("Para el modo 'versus', la palabra debe tener entre 4 y 8 caracteres.");
                }
                // En este caso, no hay ConnectionId inicial, así que pasamos null
                nuevoEstado = _gameManager.CreateNewGame(entrada.Palabra.ToUpper(), null, gameIdParaSesion);
            }
            else if (entrada.Modo == "solitario")
            {
                // En este caso, no hay ConnectionId inicial, así que pasamos null
                nuevoEstado = _gameManager.CreateNewGame(null, null, gameIdParaSesion);
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
                TurnoActualConnectionId = null, // No aplica para modos locales/versus directos HTTP
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

            // Aquí el `TurnoActualConnectionId` se puede obtener directamente del `game` devuelto
            // si la lógica de reinicio en GameManager lo establece.
            return Ok(new JuegoEstadoResponse
            {
                GameId = game.GameId,
                Palabra = game.GuionesActuales,
                IntentosRestantes = game.IntentosRestantes,
                LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                JuegoTerminado = game.JuegoTerminado,
                PalabraSecreta = "", // No revelar al reiniciar
                TurnoActualConnectionId = game.TurnoActualConnectionId, // Obtener del estado del juego
                Message = "¡Partida reiniciada! Una nueva palabra ha sido seleccionada."
            });
        }

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

            var result = _gameManager.ProcessLetter(entrada.GameId, letraMayuscula, null); // playerConnectionId es null para modo local

            if (result.UpdatedGame == null)
            {
                return NotFound(new { message = result.Message });
            }

            var game = result.UpdatedGame;

            string message = result.Message;

            return Ok(new JuegoEstadoResponse
            {
                GameId = game.GameId,
                Palabra = game.GuionesActuales,
                IntentosRestantes = game.IntentosRestantes,
                LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                JuegoTerminado = game.JuegoTerminado,
                PalabraSecreta = game.JuegoTerminado ? game.PalabraSecreta : "",
                TurnoActualConnectionId = null,
                Message = message
            });
        }

        // --- MÉTODO HELPER PARA OBTENER TODAS LAS LETRAS ADIVINADAS ---
        private HashSet<char> GetAllGuessedLetters(JuegoEstado game)
        {
            var guessed = new HashSet<char>();
            foreach (char c in game.GuionesActuales)
            {
                if (char.IsLetter(c))
                {
                    guessed.Add(c);
                }
            }
            foreach (char c in game.LetrasIncorrectas)
            {
                guessed.Add(c);
            }
            return guessed;
        }

        // --- ENDPOINTS PARA JUEGO ONLINE ---

        [HttpPost("crear-online")]
        public async Task<IActionResult> CrearPartidaOnline([FromBody] CrearGameOnlineRequest request)
        {
            // El GameManager ahora se encarga de asignar el creador y el primer turno.
            // Pasa el CreatorConnectionId directamente al GameManager.
            var game = _gameManager.CreateNewGame(null, request.CreatorConnectionId);

            if (game == null)
            {
                return StatusCode(500, "Error al crear la partida online."); // O un mensaje más específico
            }

            // Unimos el cliente al grupo de SignalR. Esto también podría hacerse desde el cliente directamente
            // después de recibir el gameId, pero aquí aseguramos que el creador esté en su grupo.
            await _hubContext.Groups.AddToGroupAsync(request.CreatorConnectionId, game.GameId);
            Console.WriteLine($"Partida online creada con ID: {game.GameId} por {request.CreatorConnectionId}");

            // Notificamos al creador que la partida ha sido creada
            // Considera enviar un `ReceiveGameUpdate` en lugar de `ReceiveMessage` para consistencia.
            // El Hub ya envía un ReceiveGameUpdate inicial en su método CreateOnlineGame.
            // Si este endpoint se usa para CREAR el juego y NO para que el Hub lo inicie,
            // entonces esta notificación es importante.

            // Puedes devolver el estado inicial para que el frontend del creador se actualice.
            return Ok(new JuegoEstadoResponse
            {
                GameId = game.GameId,
                Palabra = game.GuionesActuales,
                IntentosRestantes = game.IntentosRestantes,
                LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                JuegoTerminado = game.JuegoTerminado,
                PalabraSecreta = "", // No se revela la palabra secreta al inicio
                TurnoActualConnectionId = game.TurnoActualConnectionId,
                Message = "¡Partida creada! Comparte el ID para que alguien se una."
            });
        }

        [HttpPost("unirse-online")]
        public async Task<IActionResult> UnirseOnline([FromBody] UnirseGameOnlineRequest request)
        {
            if (string.IsNullOrEmpty(request.GameId) || string.IsNullOrEmpty(request.PlayerConnectionId))
            {
                return BadRequest(new { message = "El ID de partida y PlayerConnectionId son requeridos." });
            }

            if (!Guid.TryParse(request.GameId, out _))
            {
                return BadRequest(new { message = "El formato del ID de partida es inválido. Asegúrate de ingresar un ID válido." });
            }

            // --- ¡AQUÍ ESTÁ EL CAMBIO CRÍTICO QUE RESUELVE EL CS1061! ---
            // Usamos TryJoinGame, que devuelve un JoinGameResult.
            var joinResult = _gameManager.TryJoinGame(request.GameId, request.PlayerConnectionId);
            var game = joinResult.UpdatedGame; // Obtenemos el estado actualizado del juego del resultado

            if (!joinResult.Success || game == null) // Si no fue exitoso o el juego es nulo
            {
                return BadRequest(new { message = joinResult.Message }); // Devolvemos el mensaje de error del GameManager
            }

            // Si la unión fue exitosa, el cliente debe unirse al grupo de SignalR.
            // Esto también puede hacerse desde el cliente, pero aquí aseguramos la adición.
            await _hubContext.Groups.AddToGroupAsync(request.PlayerConnectionId, game.GameId);
            Console.WriteLine($"Cliente {request.PlayerConnectionId} se unió al grupo {request.GameId}.");

            // Si el GameManager ya marcó la partida como "lista para empezar" o similar
            // y si hay dos jugadores, notifica a ambos (o al grupo).
            if (game.PlayerConnectionIds.Count == 2)
            {
                // Envía una actualización a todo el grupo para que ambos jugadores se sincronicen.
                await _hubContext.Clients.Group(game.GameId).SendAsync("ReceiveGameUpdate", new JuegoEstadoResponse
                {
                    GameId = game.GameId,
                    Palabra = game.GuionesActuales,
                    LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                    IntentosRestantes = game.IntentosRestantes,
                    JuegoTerminado = game.JuegoTerminado,
                    PalabraSecreta = game.JuegoTerminado ? game.PalabraSecreta : "", // Revela si terminó
                    Message = game.Message, // Mensaje del GameManager (ej. "¡El segundo jugador se ha unido!")
                    TurnoActualConnectionId = game.TurnoActualConnectionId
                });
            }
            else
            {
                // Si solo se unió el primer jugador (creador), o solo se unió uno a una partida vacía
                // se le notifica solo a él.
                await _hubContext.Clients.Client(request.PlayerConnectionId).SendAsync("ReceiveGameUpdate", new JuegoEstadoResponse
                {
                    GameId = game.GameId,
                    Palabra = game.GuionesActuales,
                    LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                    IntentosRestantes = game.IntentosRestantes,
                    JuegoTerminado = game.JuegoTerminado,
                    PalabraSecreta = game.JuegoTerminado ? game.PalabraSecreta : "",
                    Message = game.Message, // Mensaje del GameManager
                    TurnoActualConnectionId = game.TurnoActualConnectionId
                });
            }

            // La respuesta HTTP al cliente que intentó unirse
            return Ok(new JuegoEstadoResponse
            {
                GameId = game.GameId,
                Palabra = game.GuionesActuales,
                IntentosRestantes = game.IntentosRestantes,
                LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                JuegoTerminado = game.JuegoTerminado,
                PalabraSecreta = game.JuegoTerminado ? game.PalabraSecreta : "",
                TurnoActualConnectionId = game.TurnoActualConnectionId,
                Message = joinResult.Message // Usar el mensaje que viene del resultado de la unión
            });
        }
    }
}
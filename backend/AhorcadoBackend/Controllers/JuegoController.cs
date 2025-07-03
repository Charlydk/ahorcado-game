using AhorcadoBackend.Hubs;
using AhorcadoBackend.Models;
using AhorcadoBackend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
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
        private readonly JuegoDbContext _dbContext;
        private readonly ILogger<JuegoController> _logger;

        public JuegoController(GameManager gameManager, IHubContext<GameHub> hubContext, JuegoDbContext dbContext, ILogger<JuegoController> Logger)
        {
            _gameManager = gameManager;
            _hubContext = hubContext;
            _dbContext = dbContext;
            _logger = Logger;
        }

        // --- MODELOS DE ENTRADA/SALIDA (Clases de Ayuda) ---
        // Se unifican para mayor claridad y consistencia
        public class PalabraEntrada
        {
            public string Modo { get; set; } = "";
            public string? Palabra { get; set; } // solo para modo versus
            public string? AliasJugador1 { get; set; }
            public string? AliasJugador2 { get; set; }
        }

        public class CrearGameOnlineRequest
        {
            public string CreatorConnectionId { get; set; }
            public string Alias { get; set; }
        }

        public class UnirseGameOnlineRequest
        {
            public string GameId { get; set; } = string.Empty;
            public string PlayerConnectionId { get; set; } = string.Empty;
            public string Alias { get; set; } = string.Empty;
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
            public string? AliasJugador1 { get; set; }
            public string? AliasJugador2 { get; set; }
        }

        // --- ENDPOINTS DEL CONTROLADOR ---

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

                nuevoEstado = _gameManager.CreateNewGame(entrada.Palabra.ToUpper(), null, gameIdParaSesion);


                // Seteamos los alias en el juego
                nuevoEstado.AliasJugadorPorConnectionId = new Dictionary<string, string>
                {
                    { "J1", entrada.AliasJugador1 ?? "Jugador1" },
                    { "J2", entrada.AliasJugador2 ?? "Jugador2" }

                };

            }
            else if (entrada.Modo == "solitario")
            {
                nuevoEstado = _gameManager.CreateNewGame(null, null, gameIdParaSesion);

                nuevoEstado.AliasJugadorPorConnectionId = new Dictionary<string, string>
            {
            { "LOCAL", entrada.AliasJugador1 ?? "Anónimo" }
            };
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
        public async Task<IActionResult> AdivinarLetraLocal([FromBody] AdivinarLetraEntrada entrada)
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

            var result = await _gameManager.ProcessLetter(
            entrada.GameId,
            letraMayuscula,
            null,
            entrada.AliasJugador1,
            entrada.AliasJugador2
            );


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
            var game = _gameManager.CreateNewGame(null, request.CreatorConnectionId);

            if (game == null)
            {
                return StatusCode(500, "Error al crear la partida online.");
            }

            // 🟢 Asociar alias al connectionId del jugador que crea la partida
            game.AliasJugadorPorConnectionId[request.CreatorConnectionId] = request.Alias;
            Console.WriteLine($"🧾 Alias registrado para {request.CreatorConnectionId}: {request.Alias}");

            await _hubContext.Groups.AddToGroupAsync(request.CreatorConnectionId, game.GameId);
            Console.WriteLine($"Partida online creada con ID: {game.GameId} por {request.CreatorConnectionId} (alias: {request.Alias})");

            return Ok(new JuegoEstadoResponse
            {
                GameId = game.GameId,
                CodigoSala = game.CodigoSala,
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
            Console.WriteLine($"🔍 Alias recibido en el request: '{request.Alias}'");

            if (string.IsNullOrEmpty(request.GameId) || string.IsNullOrEmpty(request.PlayerConnectionId))
            {
                return BadRequest(new { message = "El ID de partida y PlayerConnectionId son requeridos." });
            }

            if (!Guid.TryParse(request.GameId, out _))
            {
                return BadRequest(new { message = "El formato del ID de partida es inválido. Asegúrate de ingresar un ID válido." });
            }

            var joinResult = _gameManager.TryJoinGame(request.GameId, request.PlayerConnectionId);

            if (!joinResult.Success || joinResult.UpdatedGame == null)
            {
                return BadRequest(new { message = joinResult.Message });
            }

            var game = joinResult.UpdatedGame;

            if (!string.IsNullOrWhiteSpace(request.Alias))
            {
                game.AliasJugadorPorConnectionId[request.PlayerConnectionId] = request.Alias;
                Console.WriteLine($"✅ Alias '{request.Alias}' registrado para {request.PlayerConnectionId} en partida {request.GameId}");
            }

            if (!joinResult.Success || game == null)
            {
                return BadRequest(new { message = joinResult.Message });
            }

            if (!joinResult.Success || game == null)
            {
                return BadRequest(new { message = joinResult.Message });
            }

            await _hubContext.Groups.AddToGroupAsync(request.PlayerConnectionId, game.GameId);
            Console.WriteLine($"Cliente {request.PlayerConnectionId} se unió al grupo {game.GameId}.");

            var estadoActual = new JuegoEstadoResponse
            {
                GameId = game.GameId,
                Palabra = game.GuionesActuales,
                IntentosRestantes = game.IntentosRestantes,
                LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                JuegoTerminado = game.JuegoTerminado,
                PalabraSecreta = game.JuegoTerminado ? game.PalabraSecreta : null,
                TurnoActualConnectionId = game.TurnoActualConnectionId,
                Message = joinResult.Message
            };

            foreach (var connectionId in game.PlayerConnectionIds)
            {
                await _hubContext.Clients.Client(connectionId).SendAsync("ReceiveGameUpdate", estadoActual);
            }

            return Ok(estadoActual);
        }


        [HttpGet("getGame/{gameId}")]
        public IActionResult GetGame(string gameId)
        {
            var game = _gameManager.GetGame(gameId);
            if (game == null) return NotFound();

            return Ok(new JuegoEstadoResponse
            {
                GameId = game.GameId,
                Palabra = game.GuionesActuales,
                IntentosRestantes = game.IntentosRestantes,
                LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                JuegoTerminado = game.JuegoTerminado,
                PalabraSecreta = game.JuegoTerminado ? game.PalabraSecreta : null,
                TurnoActualConnectionId = game.TurnoActualConnectionId,
                Message = game.Message
            });
        }

        [HttpGet("monitor")]
        public IActionResult ObtenerEstadoDelGameManager()
        {
            var estado = _gameManager.ObtenerEstadoInterno();
            return Ok(estado);
        }


        [HttpPost("entrada-inteligente")]
        public async Task<IActionResult> EntradaInteligente([FromBody] UnirseGameOnlineRequest request)
        {
            if (!_gameManager.TryGetGame(request.GameId, out var game))
                return NotFound(new { message = "Partida no encontrada." });

            _logger.LogWarning($"🚦 Alias recibido: '{request.Alias}', ya en juego: {string.Join(", ", game.AliasJugadorPorConnectionId.Values)}");

            // 🔍 Buscar coincidencia exacta del alias ya registrado
            var entry = game.AliasJugadorPorConnectionId
                .FirstOrDefault(kvp => kvp.Value.Equals(request.Alias, StringComparison.OrdinalIgnoreCase));

            if (!string.IsNullOrEmpty(entry.Key)) // ↩️ ¡Alias ya existe!
            {
                var oldConnectionId = entry.Key;
                var newConnectionId = request.PlayerConnectionId;

                // 🔁 Actualizamos IDs
                game.PlayerConnectionIds.Remove(oldConnectionId);
                game.PlayerConnectionIds.Add(newConnectionId);
                game.AliasJugadorPorConnectionId.Remove(oldConnectionId);
                game.AliasJugadorPorConnectionId[newConnectionId] = request.Alias;

                if (game.TurnoActualConnectionId == oldConnectionId)
                    game.TurnoActualConnectionId = newConnectionId;

                game.DesconexionDetectada = false;
                game.JugadorDesconectadoConnectionId = null;
                game.DesconexionTimestamp = null;

                await _hubContext.Groups.AddToGroupAsync(newConnectionId, game.GameId);
                _logger.LogInformation($"♻️ Alias '{request.Alias}' reconectado con nuevo ConnectionId: {newConnectionId}");

                var respuesta = new JuegoEstadoResponse
                {
                    GameId = game.GameId,
                    Palabra = game.GuionesActuales,
                    IntentosRestantes = game.IntentosRestantes,
                    LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                    JuegoTerminado = game.JuegoTerminado,
                    PalabraSecreta = game.JuegoTerminado ? game.PalabraSecreta : null,
                    TurnoActualConnectionId = game.TurnoActualConnectionId,
                    Message = $"🔄 Reconexión exitosa para {request.Alias}"
                };

                // Reenviar estado a todos (opcional)
                foreach (var id in game.PlayerConnectionIds)
                    await _hubContext.Clients.Client(id).SendAsync("ReceiveGameUpdate", respuesta);

                return Ok(respuesta);
            }

            // Si no es reconexión, intento de ingreso normal
            var joinResult = _gameManager.TryJoinGame(request.GameId, request.PlayerConnectionId);
            var nuevoGame = joinResult.UpdatedGame;

            if (!joinResult.Success || nuevoGame == null)
                return BadRequest(new { message = joinResult.Message });

            nuevoGame.AliasJugadorPorConnectionId[request.PlayerConnectionId] = request.Alias;
            await _hubContext.Groups.AddToGroupAsync(request.PlayerConnectionId, nuevoGame.GameId);

            var estadoNuevo = new JuegoEstadoResponse
            {
                GameId = nuevoGame.GameId,
                Palabra = nuevoGame.GuionesActuales,
                IntentosRestantes = nuevoGame.IntentosRestantes,
                LetrasIncorrectas = string.Join(", ", nuevoGame.LetrasIncorrectas),
                JuegoTerminado = nuevoGame.JuegoTerminado,
                PalabraSecreta = nuevoGame.JuegoTerminado ? nuevoGame.PalabraSecreta : null,
                TurnoActualConnectionId = nuevoGame.TurnoActualConnectionId,
                Message = $"🎉 ¡Bienvenido/a {request.Alias}!"
            };

            foreach (var id in nuevoGame.PlayerConnectionIds)
                await _hubContext.Clients.Client(id).SendAsync("ReceiveGameUpdate", estadoNuevo);

            return Ok(estadoNuevo);
        }

        [HttpGet("buscar-por-codigo/{codigoSala}")]
            public IActionResult BuscarPorCodigoSala(string codigoSala)
            {
                if (string.IsNullOrWhiteSpace(codigoSala))
                    return BadRequest(new { message = "El código de sala no puede estar vacío." });

                var game = _gameManager.GetAllGames()
                    .FirstOrDefault(g => g.CodigoSala.Equals(codigoSala, StringComparison.OrdinalIgnoreCase));

                if (game == null)
                    return NotFound(new { message = $"No se encontró ninguna partida con el código '{codigoSala}'." });

                return Ok(new JuegoEstadoResponse
                {
                    GameId = game.GameId,
                    CodigoSala = game.CodigoSala,
                    Jugadores = game.AliasJugadorPorConnectionId.Values.ToList()
                });
            }


    }


}
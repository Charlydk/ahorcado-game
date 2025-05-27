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

    private static List<string> palabras = new List<string>
    { "CASA", "PAYASO", "CAMARA", "HOMERO", "PLATO", "TECLADO", "TRISTEZA", "MONITOR" };

    private static string GenerarPalabraAleatoria()
    {
        Random random = new Random();
        return palabras[random.Next(palabras.Count)];
    }

    public JuegoController(GameManager gameManager, IHubContext<GameHub> hubContext)
    {
        _gameManager = gameManager;
        _hubContext = hubContext;
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

    public class PalabraEntrada
    {
        public string? Palabra { get; set; }
        public string? Modo { get; set; }
    }

    public class ReiniciarJuegoEntrada
    {
        public string GameId { get; set; } = string.Empty;
    }

    // Clase para la respuesta del estado del juego al frontend (unificada)
    public class JuegoEstadoResponse
    {
        public string GameId { get; set; } = string.Empty;
        public string Palabra { get; set; } = string.Empty;
        public int IntentosRestantes { get; set; }
        public string LetrasIncorrectas { get; set; } = string.Empty;
        public bool JuegoTerminado { get; set; }
        public string PalabraSecreta { get; set; } = string.Empty;
        // Agrega esta propiedad para el frontend para mostrar el turno (opcional, pero útil)
        public string? TurnoActualConnectionId { get; set; }
    }

    // ========================================================================
    // ENDPOINTS DEL CONTROLADOR
    // ========================================================================

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

        string gameIdParaSesion = Guid.NewGuid().ToString();
        // Asumo que nuevoEstado.IntentosRestantes ya se inicializa a 6 dentro de CreateNewGame
        var nuevoEstado = _gameManager.CreateNewGame(palabraElegida, gameIdParaSesion);

        // *** CAMBIO AQUÍ: Usar JuegoEstadoResponse para la respuesta ***
        return Ok(new JuegoEstadoResponse
        {
            GameId = nuevoEstado.GameId,
            Palabra = nuevoEstado.GuionesActuales,
            IntentosRestantes = nuevoEstado.IntentosRestantes, // ¡Ahora se envía!
            LetrasIncorrectas = string.Join(", ", nuevoEstado.LetrasIncorrectas), // Esto puede ser un string vacío al inicio
            JuegoTerminado = nuevoEstado.JuegoTerminado,
            PalabraSecreta = nuevoEstado.JuegoTerminado ? nuevoEstado.PalabraSecreta : "", // No se revela al inicio
                                                                                           // TurnoActualConnectionId no es relevante para solitario/versus inicialmente, pero puedes incluirlo si quieres consistencia
            TurnoActualConnectionId = null
        });
    }

    [HttpPost("verificar-letra")]
    public async Task<ActionResult> VerificarLetra([FromBody] LetraOnlineEntrada entrada)
    {
        if (string.IsNullOrEmpty(entrada.Letra) || !char.IsLetter(entrada.Letra[0]))
        {
            return BadRequest(new { message = "Ingresa una letra válida." });
        }
        if (string.IsNullOrEmpty(entrada.GameId))
        {
            return BadRequest(new { message = "El ID de partida es requerido." });
        }
        if (string.IsNullOrEmpty(entrada.PlayerConnectionId))
        {
            return BadRequest(new { message = "PlayerConnectionId es requerido para verificar la letra." });
        }

        var letra = char.ToUpper(entrada.Letra[0]);
        var estadoActual = _gameManager.GetGame(entrada.GameId);

        if (estadoActual == null)
        {
            return NotFound(new { message = "Partida no encontrada o ya finalizada." });
        }

        // Lógica de VERIFICACIÓN para JUEGO ONLINE (Esperar a otro jugador)
        // Si es una partida online (tiene PlayerConnectionIds) y tiene menos de 2 jugadores,
        // no permitimos adivinar.
        if (estadoActual.PlayerConnectionIds.Any() && estadoActual.PlayerConnectionIds.Count < 2)
        {
            return BadRequest(new { message = "Esperando a otro jugador para empezar la partida." });
        }

        // LÓGICA DE TURNOS: ACTIVADA
        // Solo se aplica si hay 2 jugadores y el juego NO ha terminado.
        if (estadoActual.PlayerConnectionIds.Count == 2 && !estadoActual.JuegoTerminado)
        {
            // Verificar si es el turno del jugador que envió la letra
            if (estadoActual.TurnoActualConnectionId != entrada.PlayerConnectionId)
            {
                return BadRequest(new { message = "No es tu turno. Espera al otro jugador." });
            }
        }

        // Si la letra ya fue intentada (correcta o incorrecta)
        if (estadoActual.LetrasIngresadas.Contains(letra))
        {
            // Devolvemos el estado actual, el frontend debería manejar el mensaje de "Ya ingresaste esa letra."
            return Ok(new JuegoEstadoResponse
            {
                Palabra = estadoActual.GuionesActuales,
                IntentosRestantes = estadoActual.IntentosRestantes,
                LetrasIncorrectas = string.Join(", ", estadoActual.LetrasIncorrectas.OrderBy(c => c)),
                JuegoTerminado = estadoActual.JuegoTerminado,
                PalabraSecreta = estadoActual.JuegoTerminado ? estadoActual.PalabraSecreta : "",
                TurnoActualConnectionId = estadoActual.TurnoActualConnectionId // Envía el turno
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
        estadoActual.GuionesActuales = new string(guionesChars);

        if (!letraEncontrada)
        {
            estadoActual.IntentosRestantes--;
            estadoActual.LetrasIncorrectas.Add(letra);
        }
        estadoActual.LetrasIngresadas.Add(letra);

        // Verificar si el juego ha terminado
        estadoActual.JuegoTerminado = estadoActual.IntentosRestantes == 0 || estadoActual.GuionesActuales == estadoActual.PalabraSecreta;

        // CAMBIO DE TURNO: ACTIVADO
        // Cambiar de turno si la partida es online, no ha terminado y hay dos jugadores.
        if (estadoActual.PlayerConnectionIds.Count == 2 && !estadoActual.JuegoTerminado)
        {
            estadoActual.TurnoActualConnectionId = estadoActual.PlayerConnectionIds
                .FirstOrDefault(id => id != estadoActual.TurnoActualConnectionId); // Cambia al otro ID
        }

        // Actualizar el estado en el GameManager
        _gameManager.UpdateGame(entrada.GameId, estadoActual);

        // Enviar actualización a todos los clientes en el grupo de SignalR
        await _hubContext.Clients.Group(entrada.GameId).SendAsync("ReceiveGameUpdate", new
        {
            gameId = estadoActual.GameId,
            palabra = estadoActual.GuionesActuales,
            letrasIncorrectas = string.Join(", ", estadoActual.LetrasIncorrectas.OrderBy(c => c)),
            intentosRestantes = estadoActual.IntentosRestantes,
            juegoTerminado = estadoActual.JuegoTerminado,
            palabraSecreta = estadoActual.JuegoTerminado ? estadoActual.PalabraSecreta : "",
            turnoActualConnectionId = estadoActual.TurnoActualConnectionId // Envía el ID del jugador con el turno
        });

        // Retornar el estado actualizado al frontend del jugador que hizo la solicitud
        return Ok(new JuegoEstadoResponse
        {
            Palabra = estadoActual.GuionesActuales,
            IntentosRestantes = estadoActual.IntentosRestantes,
            LetrasIncorrectas = string.Join(", ", estadoActual.LetrasIncorrectas.OrderBy(c => c)),
            JuegoTerminado = estadoActual.JuegoTerminado,
            PalabraSecreta = estadoActual.JuegoTerminado ? estadoActual.PalabraSecreta : "",
            TurnoActualConnectionId = estadoActual.TurnoActualConnectionId // Envía el turno
        });
    }

    [HttpPost("reiniciar")]
    public ActionResult ReiniciarJuego([FromBody] ReiniciarJuegoEntrada entrada)
    {
        if (string.IsNullOrEmpty(entrada.GameId))
        {
            return BadRequest(new { message = "El ID de partida es requerido para reiniciar." });
        }

        _gameManager.RemoveGame(entrada.GameId);
        return Ok(new { message = "Juego reiniciado. Puedes iniciar uno nuevo." });
    }

    #region Endpoints Específicos de Partidas Online (Crear/Unirse)

    [HttpPost("crear-online")]
    public IActionResult CrearPartidaOnline([FromBody] CrearGameOnlineRequest request)
    {
        string palabraSecreta = GenerarPalabraAleatoria();
        string gameId = Guid.NewGuid().ToString();
        var game = _gameManager.CreateNewGame(palabraSecreta, gameId);

        if (!string.IsNullOrEmpty(request.CreatorConnectionId))
        {
            _gameManager.AddPlayerToGame(gameId, request.CreatorConnectionId);
            game.CreadorConnectionId = request.CreatorConnectionId;
            // Al crear, el turno inicial es del creador
            game.TurnoActualConnectionId = request.CreatorConnectionId;
            _gameManager.UpdateGame(gameId, game);
        }
        else
        {
            Console.WriteLine("Advertencia: CreatorConnectionId vacío en CrearPartidaOnline.");
        }

        return Ok(new { gameId = game.GameId, palabra = game.GuionesActuales });
    }

    [HttpPost("unirse-online")]
    public async Task<IActionResult> UnirseOnline([FromBody] UnirseGameOnlineRequest request)
    {
        var game = _gameManager.GetGame(request.GameId);

        if (game == null)
        {
            return NotFound(new { message = "Partida no encontrada." });
        }

        if (string.IsNullOrEmpty(request.PlayerConnectionId))
        {
            return BadRequest(new { message = "PlayerConnectionId es requerido para unirse a la partida." });
        }

        // Añadir el ConnectionId al juego y verificar si la partida está llena
        // GameManager.AddPlayerToGame ya debería manejar si el jugador ya está presente
        if (_gameManager.AddPlayerToGame(request.GameId, request.PlayerConnectionId))
        {
            // Si ya hay 2 jugadores, ¡la partida puede empezar!
            if (game.PlayerConnectionIds.Count == 2)
            {
                // El turno ya debería haber sido asignado al creador en CrearPartidaOnline.
                // Si no se asignó o quieres resetearlo, puedes hacerlo aquí:
                if (string.IsNullOrEmpty(game.TurnoActualConnectionId))
                {
                    game.TurnoActualConnectionId = game.CreadorConnectionId;
                }
                _gameManager.UpdateGame(request.GameId, game); // Asegurarse de que el GameManager guarde el turno

                // Notificar a AMBOS jugadores que la partida ha comenzado (vía SignalR)
                await _hubContext.Clients.Group(request.GameId).SendAsync("ReceiveGameUpdate", new
                {
                    gameId = game.GameId,
                    palabra = game.GuionesActuales,
                    letrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                    intentosRestantes = game.IntentosRestantes,
                    juegoTerminado = game.JuegoTerminado,
                    palabraSecreta = "", // No revelar la palabra al inicio
                    message = "¡La partida ha comenzado! Adivina la palabra.",
                    turnoActualConnectionId = game.TurnoActualConnectionId // Indica de quién es el turno
                });
            }
            // Devolver el estado actual para que el frontend del que se une se actualice
            return Ok(new JuegoEstadoResponse
            {
                Palabra = game.GuionesActuales,
                IntentosRestantes = game.IntentosRestantes,
                LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                JuegoTerminado = game.JuegoTerminado,
                PalabraSecreta = "", // No revelar la palabra al unirse
                TurnoActualConnectionId = game.TurnoActualConnectionId // Para que el que se une sepa el turno
            });
        }
        else
        {
            // Si el jugador ya estaba en la lista, simplemente devuelve el estado actual.
            return Ok(new JuegoEstadoResponse
            {
                Palabra = game.GuionesActuales,
                IntentosRestantes = game.IntentosRestantes,
                LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                JuegoTerminado = game.JuegoTerminado,
                PalabraSecreta = "",
                TurnoActualConnectionId = game.TurnoActualConnectionId
            });
        }
    }

    #endregion
}
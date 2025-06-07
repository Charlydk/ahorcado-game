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

        // Esta línea 'string gameIdParaSesion = Guid.NewGuid().ToString();'
        // y 'JuegoEstado nuevoEstado;'
        // están bien aquí una sola vez.

        string gameIdParaSesion = Guid.NewGuid().ToString();
        JuegoEstado nuevoEstado; // Declara 'nuevoEstado' una vez

        // ESTA ES LA LÓGICA DE CREACIÓN DE PARTIDA UNIFICADA
        if (entrada.Modo == "versus" && !string.IsNullOrEmpty(entrada.Palabra))
        {
            if (entrada.Palabra.Length < 4 || entrada.Palabra.Length > 8)
            {
                return BadRequest("Para el modo 'versus', la palabra debe tener entre 4 y 8 caracteres.");
            }
            // Llama a CreateNewGame con la palabra específica
            nuevoEstado = _gameManager.CreateNewGame(entrada.Palabra.ToUpper(), gameIdParaSesion);
        }
        else if (entrada.Modo == "solitario")
        {
            // Llama a CreateNewGame sin palabra específica (GameManager generará una aleatoria)
            nuevoEstado = _gameManager.CreateNewGame(null, gameIdParaSesion);
        }
        else
        {
            return BadRequest("Modo de juego no válido o palabra no proporcionada para 'versus'.");
        }
        // FIN DE LA LÓGICA DE CREACIÓN DE PARTIDA UNIFICADA


        return Ok(new JuegoEstadoResponse
        {
            GameId = nuevoEstado.GameId,
            Palabra = nuevoEstado.GuionesActuales,
            IntentosRestantes = nuevoEstado.IntentosRestantes,
            LetrasIncorrectas = string.Join(", ", nuevoEstado.LetrasIncorrectas),
            JuegoTerminado = nuevoEstado.JuegoTerminado,
            PalabraSecreta = nuevoEstado.JuegoTerminado ? nuevoEstado.PalabraSecreta : "",
            TurnoActualConnectionId = null, // Para modos solitario/versus, no hay turno de conexión
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

        var game = _gameManager.RestartGame(entrada.GameId); // Usar RestartGame del GameManager

        if (game == null)
        {
            return NotFound(new { message = "Partida no encontrada o no se pudo reiniciar." });
        }

        // Devolver el estado actualizado al frontend
        return Ok(new JuegoEstadoResponse
        {
            GameId = game.GameId,
            Palabra = game.GuionesActuales,
            IntentosRestantes = game.IntentosRestantes,
            LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
            JuegoTerminado = game.JuegoTerminado,
            PalabraSecreta = "", // No revelar la palabra al reiniciar
            TurnoActualConnectionId = null, // No aplica para solitario/versus aquí
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
        // Convertimos a mayúscula de inmediato y validamos que sea una letra
        char letraMayuscula = char.ToUpper(entrada.Letra);
        if (!char.IsLetter(letraMayuscula))
        {
            return BadRequest(new { message = "Por favor, ingresa solo una letra válida." });
        }

        // Para el modo local, pasamos null como playerConnectionId ya que no es relevante para el turno
        // La lógica de ProcessLetter en GameManager validará si la letra es correcta, actualizará el estado, etc.
        var game = _gameManager.ProcessLetter(entrada.GameId, letraMayuscula, null); // playerConnectionId es null para local

        if (game == null)
        {
            return NotFound(new { message = "Partida no encontrada o no se pudo procesar la letra." });
        }

        // Devolver el estado actualizado al frontend
        return Ok(new JuegoEstadoResponse
        {
            GameId = game.GameId,
            Palabra = game.GuionesActuales,
            IntentosRestantes = game.IntentosRestantes,
            LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
            JuegoTerminado = game.JuegoTerminado,
            PalabraSecreta = game.JuegoTerminado ? game.PalabraSecreta : "", // Revelar solo si el juego terminó
            TurnoActualConnectionId = null, // No aplica para solitario/versus
            Message = game.JuegoTerminado
                ? (game.GuionesActuales == game.PalabraSecreta ? "¡Felicidades, has ganado!" : "¡Oh no, has perdido!")
                : "Letra procesada."
        });
    }



    [HttpPost("crear-online")]
    public IActionResult CrearPartidaOnline([FromBody] CrearGameOnlineRequest request)
    {
        // Generar un GameId único aquí para pasarlo al GameManager
        // Esto asegura que el ID que usamos para SignalR y en el GameState sea el mismo que generamos.
        string gameId = Guid.NewGuid().ToString();

        // Creamos la partida. El GameManager generará una palabra aleatoria.
        // Pasamos el gameId que acabamos de generar.
        var game = _gameManager.CreateNewGame(null, gameId); // Usa el gameId generado aquí

        if (!string.IsNullOrEmpty(request.CreatorConnectionId))
        {
            // AddPlayerToGame ahora también establece CreadorConnectionId y TurnoActualConnectionId
            // si es el primer jugador, como lo modificamos en GameManager.
            _gameManager.AddPlayerToGame(game.GameId, request.CreatorConnectionId);
            
        }
        else
        {
            Console.WriteLine("Advertencia: CreatorConnectionId vacío en CrearPartidaOnline. La partida se creará sin un creador asignado inicialmente.");
        }

        // Modifica el return Ok para usar JuegoEstadoResponse
        return Ok(new JuegoEstadoResponse
        {
            GameId = game.GameId,
            Palabra = game.GuionesActuales,
            IntentosRestantes = game.IntentosRestantes,
            LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
            JuegoTerminado = game.JuegoTerminado,
            PalabraSecreta = "", // No revelar la palabra al inicio
            TurnoActualConnectionId = game.TurnoActualConnectionId, // Obtener del estado actualizado del juego
            Message = "¡Partida creada! Comparte el ID para que alguien se una."
        });
    }


    [HttpPost("unirse-online")]
    public async Task<IActionResult> UnirseOnline([FromBody] UnirseGameOnlineRequest request) // O UnirseAPartidaOnline
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
                // No necesitas _gameManager.UpdateGame aquí, GameManager.AddPlayerToGame ya lo hace.

                // Notificar a AMBOS jugadores que la partida ha comenzado (vía SignalR)
                await _hubContext.Clients.Group(request.GameId).SendAsync("ReceiveGameUpdate", new JuegoEstadoResponse // Usa JuegoEstadoResponse
                {
                    GameId = game.GameId,
                    Palabra = game.GuionesActuales,
                    LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                    IntentosRestantes = game.IntentosRestantes,
                    JuegoTerminado = game.JuegoTerminado,
                    PalabraSecreta = "", // No revelar la palabra al inicio
                    Message = "¡La partida ha comenzado! Adivina la palabra.",
                    TurnoActualConnectionId = game.TurnoActualConnectionId // Indica de quién es el turno
                });
            }
            // Devolver el estado actual para que el frontend del que se une se actualice
            return Ok(new JuegoEstadoResponse // Usa JuegoEstadoResponse
            {
                GameId = game.GameId, // ¡AÑADE ESTA LÍNEA!
                Palabra = game.GuionesActuales,
                IntentosRestantes = game.IntentosRestantes,
                LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                JuegoTerminado = game.JuegoTerminado,
                PalabraSecreta = "", // No revelar la palabra al unirse
                TurnoActualConnectionId = game.TurnoActualConnectionId, // Para que el que se une sepa el turno
                Message = "Te has unido a la partida. ¡A jugar!" // ¡AÑADE ESTA LÍNEA!
            });
        }
        else
        {
            // Si el jugador ya estaba en la lista, simplemente devuelve el estado actual.
            return Ok(new JuegoEstadoResponse // Usa JuegoEstadoResponse
            {
                GameId = game.GameId, // ¡AÑADE ESTA LÍNEA!
                Palabra = game.GuionesActuales,
                IntentosRestantes = game.IntentosRestantes,
                LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                JuegoTerminado = game.JuegoTerminado,
                PalabraSecreta = "",
                TurnoActualConnectionId = game.TurnoActualConnectionId,
                Message = "Ya estás en esta partida. ¡Continuemos!" // ¡AÑADE ESTA LÍNEA!
            });
        }
    }


}
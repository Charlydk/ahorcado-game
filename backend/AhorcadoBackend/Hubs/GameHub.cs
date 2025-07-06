using AhorcadoBackend.Models;
using AhorcadoBackend.Services;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Threading.Tasks;
using System.Linq;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace AhorcadoBackend.Hubs
{
    public class GameHub : Hub
    {
        private readonly GameManager _gameManager;
        private readonly ILogger<GameHub> _logger;
        private readonly JuegoDbContext _dbContext;


        public GameHub(GameManager gameManager, ILogger<GameHub> logger, JuegoDbContext dbContext)
        {
            _gameManager = gameManager;
            _logger = logger;
            _dbContext = dbContext;
        }
        
        public async Task JoinGameGroup(string gameId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, gameId);
            Console.WriteLine($"Cliente {Context.ConnectionId} se unió al grupo {gameId}");
        }

        // Método para crear una partida online
        public async Task<object> CreateOnlineGame(int? intentosPermitidos)
        {
            int intentos = intentosPermitidos ?? 6;

            var game = await _gameManager.CreateNewGame(
                null,
                Context.ConnectionId,
                null,
                null,
                intentos
            );

            game.CreadorConnectionId = Context.ConnectionId;
            game.TurnoActualConnectionId = Context.ConnectionId;
            game.Message = $"🎮 Sala creada. Código: {game.CodigoSala}. Esperando a otro jugador...";


            await Groups.AddToGroupAsync(Context.ConnectionId, game.GameId);
            Console.WriteLine($"Partida online creada con ID: {game.GameId} por {Context.ConnectionId}");

            await Clients.Client(Context.ConnectionId).SendAsync("ReceiveGameUpdate", new JuegoEstadoResponse
            {
                GameId = game.GameId,
                Palabra = game.GuionesActuales,
                IntentosRestantes = game.IntentosRestantes,
                LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                JuegoTerminado = game.JuegoTerminado,
                TurnoActualConnectionId = game.TurnoActualConnectionId,
                Message = game.Message
            });

            // 🔥 Devolvemos ambos valores al frontend
            return new
            {
                GameId = game.GameId,
                CodigoSala = game.CodigoSala
            };
        }


        // Método para que un cliente se una a una partida online existente
        public async Task JoinOnlineGame(string gameId)
        {
            // El GameManager ahora gestiona el añadir el jugador y las reglas de negocio.
            var result = _gameManager.TryJoinGame(gameId, Context.ConnectionId);
            var game = result.UpdatedGame;

            if (!result.Success || game == null)
            {
                await Clients.Caller.SendAsync("ReceiveMessage", result.Message);
                return;
            }

            // Si el jugador ya estaba en el grupo, SignalR lo ignora, pero es buena práctica.
            await Groups.AddToGroupAsync(Context.ConnectionId, gameId);
            Console.WriteLine($"Cliente {Context.ConnectionId} se unió a la partida {gameId}");

            // El GameManager ya debería haber actualizado el mensaje del juego.
            // Ahora, envía la actualización a *todos* los clientes en el grupo.
            await Clients.Group(gameId).SendAsync("ReceiveGameUpdate", new JuegoEstadoResponse
            {
                GameId = game.GameId,
                Palabra = game.GuionesActuales,
                IntentosRestantes = game.IntentosRestantes,
                LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                JuegoTerminado = game.JuegoTerminado,
                TurnoActualConnectionId = game.TurnoActualConnectionId,
                Message = game.Message,
                PalabraSecreta = game.JuegoTerminado ? game.PalabraSecreta : null
            });
        }

        // Método para procesar una letra ingresada por un cliente
      public async Task ProcessLetter(string gameId, char letter)
{
    try
    {
        var connectionId = Context.ConnectionId;
        var result = await _gameManager.ProcessLetter(gameId, letter, Context.ConnectionId);
        var game = result.UpdatedGame;

        if (game == null)
        {
            await Clients.Caller.SendAsync("ReceiveMessage", result.Message ?? "Error desconocido.");
            return;
        }

        var gameUpdate = new JuegoEstadoResponse
        {
            GameId = game.GameId,
            Palabra = game.GuionesActuales,
            IntentosRestantes = game.IntentosRestantes,
            LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
            JuegoTerminado = game.JuegoTerminado,
            PalabraSecreta = game.JuegoTerminado ? game.PalabraSecreta : null,
            TurnoActualConnectionId = game.TurnoActualConnectionId,
            Message = result.Message
        };

        await Clients.Group(gameId).SendAsync("ReceiveGameUpdate", gameUpdate);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "❗ Error inesperado al procesar letra en GameHub");
        await Clients.Caller.SendAsync("ReceiveMessage", "⚠️ Ocurrió un error inesperado al procesar la letra. Por favor, vuelve a intentarlo.");
    }
}

        // Nuevo método para cuando el cliente abandona un grupo (voluntariamente)
        public async Task LeaveGameGroup(string gameId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, gameId);
            Console.WriteLine($"Cliente {Context.ConnectionId} ha abandonado voluntariamente el grupo {gameId}.");

            // Notificar al GameManager sobre el abandono
            // El GameManager manejará la lógica de la partida (ej. si el otro jugador queda solo, etc.)
            _gameManager.PlayerLeftGame(gameId, Context.ConnectionId);
        }


// Método para reingresar a una partida después de una desconexión
public async Task ReingresarPartida(string gameId, string alias)
{
    if (!_gameManager.TryGetGame(gameId, out var game))
    {
        _logger.LogWarning($"🔁 Reingreso fallido: partida {gameId} no existe.");
        await Clients.Caller.SendAsync("ReceiveError", "No se encontró la partida.");
        return;
    }

    // Buscar connectionId del jugador reconectado
    var nuevoConnectionId = Context.ConnectionId;

    // Mapear alias → connectionId nuevamente
    var match = game.AliasJugadorPorConnectionId
        .FirstOrDefault(kvp => kvp.Value.Equals(alias, StringComparison.OrdinalIgnoreCase));

    if (match.Key != null)
    {
        // Actualizar ConnectionId si cambió
        if (match.Key != nuevoConnectionId)
        {
            game.PlayerConnectionIds.Remove(match.Key);
            game.PlayerConnectionIds.Add(nuevoConnectionId);
            game.AliasJugadorPorConnectionId.Remove(match.Key);
            game.AliasJugadorPorConnectionId[nuevoConnectionId] = alias;

            // Restaurar turno si era suyo
            if (game.TurnoActualConnectionId == match.Key)
                game.TurnoActualConnectionId = nuevoConnectionId;

            _logger.LogInformation($"🔁 Jugador '{alias}' reconectado exitosamente a la partida {gameId}.");
        }

        game.DesconexionDetectada = false;
        game.JugadorDesconectadoConnectionId = null;
        game.DesconexionTimestamp = null;

        // Volver a agregar al grupo SignalR
        await Groups.AddToGroupAsync(nuevoConnectionId, gameId);

        // Enviar estado actualizado al jugador que vuelve
        await Clients.Client(nuevoConnectionId).SendAsync("ReceiveGameUpdate", new JuegoEstadoResponse
        {
            GameId = game.GameId,
            Palabra = game.GuionesActuales,
            IntentosRestantes = game.IntentosRestantes,
            LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
            JuegoTerminado = game.JuegoTerminado,
            PalabraSecreta = game.PalabraSecreta,
            TurnoActualConnectionId = game.TurnoActualConnectionId,
            Message = $"🎉 ¡Bienvenido de nuevo, {alias}!"
        });
    }
    else
    {
        _logger.LogWarning($"🔁 Alias '{alias}' no encontrado en la partida {gameId}.");
        await Clients.Caller.SendAsync("ReceiveError", "Tu alias no coincide con ningún jugador de la partida.");
    }
}




        // Método para recibir mensajes de heartbeat del cliente. No necesita hacer nada.
        public Task SendHeartbeat()
        {
            _logger.LogDebug($"Heartbeat recibido de {Context.ConnectionId}");
            return Task.CompletedTask;
        }



        // Método que se llama cuando un cliente se desconecta (cierra navegador, pierde conexión, etc.)
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var connectionId = Context.ConnectionId;
            string logMessage;

            if (exception != null)
            {
                // Si hay una excepción real al desconectarse
                logMessage = $"Cliente {connectionId} desconectado. Excepción: {exception.Message}";
                _logger.LogError(exception, logMessage);
            }
            else
            {
                // Si no hay una excepción explícita (cierre por timeout, cierre limpio, etc.)
                logMessage = $"Cliente {connectionId} desconectado. Cierre de conexión sin excepción directa. (Posiblemente timeout de inactividad o cierre de proxy).";
                _logger.LogWarning(logMessage); // Nivel Warning para seguimiento
            }

            // Ahora delegamos la lógica de manejo de la desconexión al GameManager.
            // El GameManager se encargará de encontrar la partida, remover al jugador y notificar al oponente.
            _gameManager.PlayerDisconnected(connectionId); // <-- CAMBIO AQUÍ: Llamamos al nuevo método en GameManager

            await base.OnDisconnectedAsync(exception);
        }




    }
}
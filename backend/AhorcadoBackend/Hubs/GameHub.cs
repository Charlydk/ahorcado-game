using AhorcadoBackend.Models;
using AhorcadoBackend.Services;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Threading.Tasks;
using System.Linq;
using System.Collections.Generic;

namespace AhorcadoBackend.Hubs
{
    public class GameHub : Hub
    {
        private readonly GameManager _gameManager;
        private readonly ILogger<GameHub> _logger;


        public GameHub(GameManager gameManager, ILogger<GameHub> logger)
        {
            _gameManager = gameManager;
            _logger = logger;
        }
        
        public async Task JoinGameGroup(string gameId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, gameId);
            Console.WriteLine($"Cliente {Context.ConnectionId} se unió al grupo {gameId}");
        }

        // Método para crear una partida online
        public async Task<string> CreateOnlineGame()
        {
            // Pasa el ConnectionId del creador al GameManager para que lo asocie a la partida.
            var game = _gameManager.CreateNewGame(null, Context.ConnectionId); // Nuevo overload para creador connectionId

            // Si el GameManager ya maneja PlayerConnectionIds, quizás no necesites esta línea aquí:
            // game.PlayerConnectionIds.Add(Context.ConnectionId); 

            // Asegúrate de que tu GameManager establezca estas propiedades al crear la partida
            // (o actualízalas si tu CreateNewGame solo crea un estado base)
            game.CreadorConnectionId = Context.ConnectionId;
            game.TurnoActualConnectionId = Context.ConnectionId;
            game.Message = $"Partida creada. ID: {game.GameId}. Esperando a otro jugador...";

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

            return game.GameId;
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
            var result = _gameManager.ProcessLetter(gameId, letter, Context.ConnectionId);
            var game = result.UpdatedGame;

            if (game == null)
            {
                await Clients.Caller.SendAsync("ReceiveMessage", result.Message);
                return;
            }

            // Si no fue el turno del jugador, el GameManager ya lo manejó y nos devolvió un mensaje específico.
            if (result.Message == "No es tu turno. Espera al otro jugador." || result.WasLetterAlreadyGuessed) // Añadido check para letra ya adivinada
            {
                // Enviar el mensaje específico solo al que intentó jugar
                await Clients.Caller.SendAsync("ReceiveMessage", result.Message);
                // Y si quieres, enviar el estado actual del juego (sin cambios visibles por el error)
                await Clients.Caller.SendAsync("ReceiveGameUpdate", new JuegoEstadoResponse
                {
                    GameId = game.GameId,
                    Palabra = game.GuionesActuales,
                    IntentosRestantes = game.IntentosRestantes,
                    LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                    JuegoTerminado = game.JuegoTerminado,
                    TurnoActualConnectionId = game.TurnoActualConnectionId,
                    PalabraSecreta = game.JuegoTerminado ? game.PalabraSecreta : null,
                    Message = game.Message // El mensaje general del juego
                });
                return;
            }

            // Enviar el estado actualizado del juego a todos los clientes en el grupo
            await Clients.Group(gameId).SendAsync("ReceiveGameUpdate", new JuegoEstadoResponse
            {
                GameId = game.GameId,
                Palabra = game.GuionesActuales,
                IntentosRestantes = game.IntentosRestantes,
                LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                JuegoTerminado = game.JuegoTerminado,
                PalabraSecreta = game.JuegoTerminado ? game.PalabraSecreta : null, // Solo se revelará si el juego terminó
                TurnoActualConnectionId = game.TurnoActualConnectionId,
                Message = result.Message // ¡Usamos el mensaje específico del resultado del GameManager!
            });
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
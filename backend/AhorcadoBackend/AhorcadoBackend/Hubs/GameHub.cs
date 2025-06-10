// GameHub.cs
using AhorcadoBackend.Models;
using AhorcadoBackend.Services;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Threading.Tasks;
using System.Linq;

namespace AhorcadoBackend.Hubs
{
    public class GameHub : Hub
    {
        private readonly GameManager _gameManager;
        private readonly IHubContext<GameHub> _hubContext;

        public GameHub(GameManager gameManager, IHubContext<GameHub> hubContext)
        {
            _gameManager = gameManager;
            _hubContext = hubContext;
        }

        // Método para que los clientes se unan a un grupo de SignalR (por ID de partida)
        public async Task JoinGameGroup(string gameId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, gameId);
            Console.WriteLine($"Cliente {Context.ConnectionId} se unió al grupo {gameId}");
            // Opcional: Podrías enviar un mensaje de bienvenida al grupo
            //await Clients.Group(gameId).SendAsync("ReceiveMessage", $"{Context.ConnectionId} se ha unido a la partida.");
        }

        // Método para crear una partida online
        public async Task<string> CreateOnlineGame()
        {
            var game = _gameManager.CreateNewGame(null, null); // Crea una nueva partida con ID aleatorio
            game.PlayerConnectionIds.Add(Context.ConnectionId); // Agrega al creador
            game.CreadorConnectionId = Context.ConnectionId; // Define al creador
            game.TurnoActualConnectionId = Context.ConnectionId; // El creador tiene el primer turno

            await Groups.AddToGroupAsync(Context.ConnectionId, game.GameId);
            Console.WriteLine($"Partida online creada con ID: {game.GameId} por {Context.ConnectionId}");

            // Notificar al creador con el estado inicial de la partida (esperando oponente)
            await Clients.Client(Context.ConnectionId).SendAsync("ReceiveGameUpdate", new JuegoEstadoResponse
            {
                GameId = game.GameId,
                Palabra = game.GuionesActuales,
                IntentosRestantes = game.IntentosRestantes,
                LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                JuegoTerminado = game.JuegoTerminado,
                TurnoActualConnectionId = game.TurnoActualConnectionId,
                Message = $"Partida creada. ID: {game.GameId}. Esperando a otro jugador..."
            });

            return game.GameId; // Devuelve el GameId al cliente
        }

        // Método para que un cliente se una a una partida online existente
        public async Task JoinOnlineGame(string gameId)
        {
            var game = _gameManager.GetGame(gameId);
            if (game == null)
            {
                await Clients.Caller.SendAsync("ReceiveMessage", "La partida no existe.");
                return;
            }

            if (game.PlayerConnectionIds.Count >= 2)
            {
                await Clients.Caller.SendAsync("ReceiveMessage", "La partida ya está llena.");
                return;
            }

            if (game.PlayerConnectionIds.Contains(Context.ConnectionId))
            {
                await Clients.Caller.SendAsync("ReceiveMessage", "Ya estás en esta partida.");
                // Aunque ya esté, enviamos el estado actual para refrescar su UI
                await Clients.Caller.SendAsync("ReceiveGameUpdate", new JuegoEstadoResponse
                {
                    GameId = game.GameId,
                    Palabra = game.GuionesActuales,
                    IntentosRestantes = game.IntentosRestantes,
                    LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                    JuegoTerminado = game.JuegoTerminado,
                    TurnoActualConnectionId = game.TurnoActualConnectionId,
                    Message = game.Message // Usar el mensaje actual del juego
                });
                return;
            }

            game.PlayerConnectionIds.Add(Context.ConnectionId);
            game.LastActivityTime = DateTime.UtcNow; // Actualizar actividad
            await Groups.AddToGroupAsync(Context.ConnectionId, gameId);
            Console.WriteLine($"Cliente {Context.ConnectionId} se unió a la partida {gameId}");

            // Si se unió el segundo jugador, el juego comienza
            if (game.PlayerConnectionIds.Count == 2)
            {
                game.JuegoTerminado = false; // Asegurar que no esté marcado como terminado
                // Decide quién tiene el primer turno si no lo decidiste al crear.
                // Aquí, el creador ya tiene el primer turno, lo mantenemos.
                game.Message = "¡El segundo jugador se ha unido! ¡Comienza la partida!";
                Console.WriteLine($"Partida {gameId} lista para comenzar con 2 jugadores.");
            }
            else
            {
                game.Message = "Te has unido. Esperando a otro jugador...";
            }

            // Enviar la actualización del estado del juego a TODOS los jugadores del grupo.
            // Esto es crucial para que ambos, el creador y el que se une, reciban el estado.
            await _hubContext.Clients.Group(gameId).SendAsync("ReceiveGameUpdate", new JuegoEstadoResponse
            {
                GameId = game.GameId,
                Palabra = game.GuionesActuales,
                IntentosRestantes = game.IntentosRestantes,
                LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                JuegoTerminado = game.JuegoTerminado,
                TurnoActualConnectionId = game.TurnoActualConnectionId,
                Message = game.Message
            });
        }


        // Método para procesar una letra ingresada por un cliente
        public async Task ProcessLetter(string gameId, char letter)
        {
            var game = _gameManager.GetGame(gameId);
            if (game == null || game.JuegoTerminado)
            {
                await Clients.Caller.SendAsync("ReceiveMessage", "La partida no existe o ha terminado.");
                return;
            }

            // Verificar si es el turno del jugador que envió la letra
            if (game.TurnoActualConnectionId != Context.ConnectionId)
            {
                await Clients.Caller.SendAsync("ReceiveMessage", "No es tu turno.");
                // Opcional: Podrías enviar un ReceiveGameUpdate con el estado actual y un mensaje de "No es tu turno"
                // para refrescar la UI y el mensaje del juego.
                return;
            }

            game.LastActivityTime = DateTime.UtcNow; // Actualizar actividad

            var resultado = _gameManager.ProcessLetter(gameId, letter, Context.ConnectionId);

            // Cambiar el turno al otro jugador si el juego no ha terminado y es online
            if (!game.JuegoTerminado && game.PlayerConnectionIds.Count == 2)
            {
                var otherPlayerId = game.PlayerConnectionIds.FirstOrDefault(id => id != Context.ConnectionId);
                game.TurnoActualConnectionId = otherPlayerId;
                game.Message = "¡Espera tu turno!"; // Mensaje para el que acaba de jugar
                // No actualizamos el mensaje en el GameState directamente para el que le toca.
                // Ese mensaje se establecerá en ReceiveGameUpdate en el cliente.
            }

            // Enviar el estado actualizado del juego a todos los clientes en el grupo
            await _hubContext.Clients.Group(gameId).SendAsync("ReceiveGameUpdate", new JuegoEstadoResponse
            {
                GameId = game.GameId,
                Palabra = game.GuionesActuales,
                IntentosRestantes = game.IntentosRestantes,
                LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                JuegoTerminado = game.JuegoTerminado,
                PalabraSecreta = game.PalabraSecreta, // Solo se revelará si el juego terminó
                TurnoActualConnectionId = game.TurnoActualConnectionId,
                Message = game.Message // El mensaje actual del juego (ej. "Letra correcta!", "Ya ingresaste esa letra!", etc.)
            });
        }

        // Método que se llama cuando un cliente se desconecta
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            Console.WriteLine($"Cliente {Context.ConnectionId} desconectado.");
            var disconnectedConnectionId = Context.ConnectionId;
            var affectedGame = _gameManager.FindAndRemovePlayerFromGame(disconnectedConnectionId);

            if (affectedGame != null)
            {
                Console.WriteLine($"Cliente {disconnectedConnectionId} removido de la partida {affectedGame.GameId}.");

                // Si la partida se marcó como terminada por el GameManager (ej. porque solo un jugador quedó)
                if (affectedGame.JuegoTerminado)
                {
                    Console.WriteLine($"Partida {affectedGame.GameId} terminada por desconexión de {disconnectedConnectionId}.");
                    // Notificar a todos los clientes en el grupo (si alguien quedó) con el estado final
                    // ESTO ES LO QUE NECESITAS DESCOMENTAR Y ASEGURAR QUE ESTÉ ASÍ:
                    Console.WriteLine($"Enviando JuegoEstadoResponse a clientes en grupo {affectedGame.GameId} con mensaje: '{affectedGame.Message}'.");

                    await _hubContext.Clients.Group(affectedGame.GameId).SendAsync("ReceiveGameUpdate", new JuegoEstadoResponse
                    {
                        GameId = affectedGame.GameId,
                        Palabra = affectedGame.GuionesActuales,
                        IntentosRestantes = affectedGame.IntentosRestantes,
                        LetrasIncorrectas = string.Join(", ", affectedGame.LetrasIncorrectas),
                        JuegoTerminado = affectedGame.JuegoTerminado,
                        PalabraSecreta = affectedGame.PalabraSecreta, // Revela la palabra al final
                        TurnoActualConnectionId = affectedGame.TurnoActualConnectionId, // Será null si terminó
                        Message = affectedGame.Message // El mensaje del GameManager sobre la terminación de la partida
                    });
                }
                else if (affectedGame.PlayerConnectionIds.Count == 0)
                {
                    // Si la partida quedó vacía y fue eliminada, no hay nadie a quien notificar en ese grupo.
                    Console.WriteLine($"Partida {affectedGame.GameId} quedó sin jugadores y fue eliminada. No hay jugadores para notificar.");
                }
                // Si la partida no se marcó como terminada (lo cual no debería pasar para online de 2 jugadores
                // si uno se desconecta y solo queda uno), entonces no haríamos nada aquí.
            }
            else
            {
                Console.WriteLine($"Cliente {Context.ConnectionId} desconectado de una partida no encontrada o ya vacía.");
            }

            await base.OnDisconnectedAsync(exception);
        }
    }
}
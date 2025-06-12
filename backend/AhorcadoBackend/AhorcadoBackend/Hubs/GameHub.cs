using AhorcadoBackend.Models;
using AhorcadoBackend.Services;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Threading.Tasks;
using System.Linq;
using System.Collections.Generic; // Asegúrate de tener esta directiva para List

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
            game.Message = $"Partida creada. ID: {game.GameId}. Esperando a otro jugador..."; // Establece el mensaje inicial

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
                Message = game.Message // Usar el mensaje que ya se estableció
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
                        PalabraSecreta = game.JuegoTerminado ? game.PalabraSecreta : null, // Revela solo si terminó
                        Message = game.Message // Usar el mensaje actual del juego
                    });
                    return;
                }
                else
                {
                    await Clients.Caller.SendAsync("ReceiveMessage", "La partida ya está llena.");
                    return;
                }
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
                game.Message = "¡El segundo jugador se ha unido! ¡Comienza la partida!"; // Mensaje para ambos
                Console.WriteLine($"Partida {gameId} lista para comenzar con 2 jugadores.");
            }
            else
            {
                game.Message = "Te has unido. Esperando a otro jugador...";
            }

            // Enviar la actualización del estado del juego a TODOS los jugadores del grupo.
            await _hubContext.Clients.Group(gameId).SendAsync("ReceiveGameUpdate", new JuegoEstadoResponse
            {
                GameId = game.GameId,
                Palabra = game.GuionesActuales,
                IntentosRestantes = game.IntentosRestantes,
                LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                JuegoTerminado = game.JuegoTerminado,
                TurnoActualConnectionId = game.TurnoActualConnectionId,
                Message = game.Message, // El mensaje actual del juego (ej. "¡El segundo jugador se ha unido!")
                PalabraSecreta = game.JuegoTerminado ? game.PalabraSecreta : null // Revela solo si terminó
            });
        }


        // Método para procesar una letra ingresada por un cliente
        public async Task ProcessLetter(string gameId, char letter)
        {
            // El GameManager ahora valida el turno. Aquí solo recuperamos el resultado.
            var result = _gameManager.ProcessLetter(gameId, letter, Context.ConnectionId);
            var game = result.UpdatedGame; // Obtenemos el estado del juego actualizado del resultado

            if (game == null)
            {
                // Esto ocurriría si la partida no existe en el GameManager
                await Clients.Caller.SendAsync("ReceiveMessage", result.Message); // Envía el mensaje de error del GameManager
                return;
            }

            // Si no fue el turno del jugador, el GameManager ya lo manejó y nos devolvió un mensaje específico.
            if (result.Message == "No es tu turno. Espera al otro jugador.")
            {
                await Clients.Caller.SendAsync("ReceiveMessage", result.Message);
                // Opcional: Podrías enviar un ReceiveGameUpdate con el estado actual y el mensaje,
                // pero el mensaje "No es tu turno" es más para el cliente que intentó jugar.
                // await Clients.Caller.SendAsync("ReceiveGameUpdate", new JuegoEstadoResponse
                // {
                //     GameId = game.GameId,
                //     Palabra = game.GuionesActuales,
                //     IntentosRestantes = game.IntentosRestantes,
                //     LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                //     JuegoTerminado = game.JuegoTerminado,
                //     TurnoActualConnectionId = game.TurnoActualConnectionId,
                //     Message = result.Message // Mensaje específico para el jugador que no es su turno
                // });
                return;
            }


            // Enviar el estado actualizado del juego a todos los clientes en el grupo
            await _hubContext.Clients.Group(gameId).SendAsync("ReceiveGameUpdate", new JuegoEstadoResponse
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

        // Método que se llama cuando un cliente se desconecta
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            Console.WriteLine($"Cliente {Context.ConnectionId} desconectado.");
            var disconnectedConnectionId = Context.ConnectionId;
            var affectedGame = _gameManager.FindAndRemovePlayerFromGame(disconnectedConnectionId);

            if (affectedGame != null)
            {
                Console.WriteLine($"Cliente {disconnectedConnectionId} removido de la partida {affectedGame.GameId}.");

                // Notificar a todos los clientes en el grupo (si alguien quedó) con el estado final
                // Si la partida se marcó como terminada por el GameManager (ej. porque solo un jugador quedó o no quedan)
                if (affectedGame.JuegoTerminado || affectedGame.PlayerConnectionIds.Count == 0)
                {
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
                // Si no se marcó como terminada (aunque para 2 jugadores, si uno se va, sí debería),
                // no enviaríamos una actualización de fin de juego aquí, pero la lógica del GameManager lo hace.
            }
            else
            {
                Console.WriteLine($"Cliente {Context.ConnectionId} desconectado de una partida no encontrada o ya vacía.");
            }

            await base.OnDisconnectedAsync(exception);
        }
    }
}
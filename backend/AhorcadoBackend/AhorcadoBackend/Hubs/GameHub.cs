
using AhorcadoBackend.Models;
using AhorcadoBackend.Services;
using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace AhorcadoBackend.Hubs
{
    
    public class GameHub : Hub
    {
        private readonly GameManager _gameManager;

        public GameHub(GameManager gameManager)
        {
            _gameManager = gameManager;
        }

        // Método para que un cliente se una a un grupo (partida)
        public async Task JoinGame(string gameId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, gameId);
            Console.WriteLine($"Cliente {Context.ConnectionId} unido al grupo {gameId}");

            // Aquí podemos añadir el ConnectionId al GameManager cuando se une vía SignalR
            // _gameManager.AddPlayerToGame(gameId, Context.ConnectionId);
            // NOTA: Para evitar duplicidad con la llamada HTTP POST de unirse-online,
            // vamos a confiar en que la llamada HTTP POST a 'unirse-online' maneja
            // la adición del jugador al GameManager. La llamada SignalR solo une al grupo.
        }

        // Método para enviar una actualización de juego a un grupo (opcional por ahora, usaremos REST)
        // public async Task SendGameUpdate(string gameId, JuegoEstadoResponse data)
        // {
        //     await Clients.Group(gameId).SendAsync("ReceiveGameUpdate", data);
        // }

        // Maneja la desconexión de un cliente
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            // Aquí, idealmente, deberíamos buscar en qué partida estaba este ConnectionId
            // y removerlo. Por simplicidad ahora, lo omitimos, pero es importante para juegos reales.
            // Podrías iterar sobre _activeGames o tener un mapa ConnectionId -> GameId.
            Console.WriteLine($"Cliente {Context.ConnectionId} desconectado.");
            await base.OnDisconnectedAsync(exception);
        }
    }
}

using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace AhorcadoBackend.Hubs
{
    public class GameHub : Hub
    {
        // Este método será llamado por los clientes para unirse a una partida
        public async Task JoinGame(string gameId)
        {
            // Añade al cliente que llamó a este método a un grupo de SignalR
            // Los grupos son útiles para enviar mensajes solo a los clientes de una partida específica
            await Groups.AddToGroupAsync(Context.ConnectionId, gameId);
            Console.WriteLine($"Cliente {Context.ConnectionId} se unió a la partida {gameId}"); // Solo para depuración
        }

        // Aquí iremos añadiendo métodos para enviar el estado del juego, manejar turnos, etc.
        // Por ahora, solo tenemos JoinGame.
    }
}

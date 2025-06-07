
using AhorcadoBackend.Models;
using AhorcadoBackend.Services;
using Microsoft.AspNetCore.SignalR;
using System; // Asegúrate de tener este using para Exception
using System.Threading.Tasks;
using System.Linq; // Necesario para .FirstOrDefault()

namespace AhorcadoBackend.Hubs
{
    // Asegúrate de que tu GameHub herede de Hub
    public class GameHub : Hub
    {
        private readonly GameManager _gameManager;
        // Inyectamos IHubContext<GameHub> para poder enviar mensajes desde el Hub mismo
        // (esto es útil si el GameManager no enviara los mensajes y quisieras hacerlo desde aquí)
        private readonly IHubContext<GameHub> _hubContext;

        // Constructor para inyectar GameManager y IHubContext
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
            // await Clients.Group(gameId).SendAsync("ReceiveMessage", $"{Context.ConnectionId} se ha unido a la partida.");
        }

        // Método para que los clientes abandonen un grupo de SignalR
        public async Task LeaveGameGroup(string gameId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, gameId);
            Console.WriteLine($"Cliente {Context.ConnectionId} dejó el grupo {gameId}");
        }

        // *** NUEVO MÉTODO: ProcessLetter para modo Online ***
        public async Task ProcessLetter(string gameId, char letra) // playerConnectionId se obtiene de Context.ConnectionId
        {
            Console.WriteLine($"ProcessLetter llamado para GameId: {gameId}, Letra: {letra}, ConnectionId: {Context.ConnectionId}");

            // 1. Delegar la lógica al GameManager
            // Usamos Context.ConnectionId como el playerConnectionId
            var updatedGame = _gameManager.ProcessLetter(gameId, letra, Context.ConnectionId);

            if (updatedGame == null)
            {
                // La partida no se encontró o no era su turno, etc.
                // Podrías enviar un mensaje de error solo al cliente que hizo la llamada
                await Clients.Caller.SendAsync("ReceiveGameUpdate", new JuegoEstadoResponse
                {
                    GameId = gameId,
                    Message = "Error: No se pudo procesar la letra. Partida no encontrada o no es tu turno."
                });
                return;
            }

            // 2. Notificar a todos los jugadores en el grupo de SignalR
            // Construye el JuegoEstadoResponse para enviar
            var response = new JuegoEstadoResponse
            {
                GameId = updatedGame.GameId,
                Palabra = updatedGame.GuionesActuales,
                IntentosRestantes = updatedGame.IntentosRestantes,
                LetrasIncorrectas = string.Join(", ", updatedGame.LetrasIncorrectas),
                JuegoTerminado = updatedGame.JuegoTerminado,
                PalabraSecreta = updatedGame.JuegoTerminado ? updatedGame.PalabraSecreta : "", // Revelar si terminó
                TurnoActualConnectionId = updatedGame.TurnoActualConnectionId,
                Message = updatedGame.JuegoTerminado
                    ? (updatedGame.GuionesActuales == updatedGame.PalabraSecreta ? "¡Felicidades, has ganado!" : "¡Oh no, has perdido!")
                    : "Letra procesada."
            };

            // Envía la actualización a todos los clientes en el grupo de la partida
            await _hubContext.Clients.Group(gameId).SendAsync("ReceiveGameUpdate", response);

            Console.WriteLine($"Actualización de juego enviada para GameId: {gameId}. Estado: {response.Palabra}, Intentos: {response.IntentosRestantes}");
        }

        // Otros métodos de Hub, como OnConnectedAsync y OnDisconnectedAsync, si los tienes:
        public override async Task OnConnectedAsync()
        {
            // Puedes añadir lógica para cuando un cliente se conecta
            Console.WriteLine($"Cliente conectado: {Context.ConnectionId}");
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            Console.WriteLine($"Cliente desconectado: {Context.ConnectionId}. Error: {exception?.Message}");

            // Usar el nuevo método del GameManager para encontrar y remover al jugador
            var affectedGame = _gameManager.FindAndRemovePlayerFromGame(Context.ConnectionId);

            if (affectedGame != null)
            {
                Console.WriteLine($"Jugador {Context.ConnectionId} se desconectó de la partida {affectedGame.GameId}.");

                // Si la partida se marcó como terminada en el GameManager debido a la desconexión
                if (affectedGame.JuegoTerminado)
                {
                    Console.WriteLine($"Partida {affectedGame.GameId} ha terminado por desconexión de jugador.");
                    // Notificar a los jugadores restantes en el grupo
                    // Asegúrate de enviar un JuegoEstadoResponse completo.
                    await _hubContext.Clients.Group(affectedGame.GameId).SendAsync("ReceiveGameUpdate", new JuegoEstadoResponse
                    {
                        GameId = affectedGame.GameId,
                        Palabra = affectedGame.GuionesActuales,
                        IntentosRestantes = affectedGame.IntentosRestantes,
                        LetrasIncorrectas = string.Join(", ", affectedGame.LetrasIncorrectas),
                        JuegoTerminado = affectedGame.JuegoTerminado,
                        PalabraSecreta = affectedGame.PalabraSecreta, // Revela la palabra
                        TurnoActualConnectionId = affectedGame.TurnoActualConnectionId,
                        Message = affectedGame.Message // El mensaje del GameManager sobre la terminación de la partida
                    });
                }
                else
                {
                    // Si la partida no terminó (ej. solo se removió el jugador, pero aún quedan dos y es un modo flexible)
                    // Podrías enviar una actualización normal o un mensaje de que un jugador se fue.
                    // Por ahora, asumimos que si un jugador se va en online, la partida termina.
                }
            }

            await base.OnDisconnectedAsync(exception);
        }
    }
}

using Microsoft.AspNetCore.SignalR;
using AhorcadoPro.Backend.Models;
using AhorcadoPro.Backend.Services;

namespace AhorcadoPro.Backend.Hubs
{
    public class GameHub : Hub
    {
        private readonly GameManager _gameManager;
        private readonly ILogger<GameHub> _logger;
        private readonly IGeminiService _geminiService;

        public GameHub(GameManager gameManager, ILogger<GameHub> logger, IGeminiService geminiService)
        {
            _gameManager = gameManager;
            _logger = logger;
            _geminiService = geminiService;
        }

        public async Task JoinGame(string gameId, string alias)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, gameId);
            _logger.LogInformation($"Player {alias} ({Context.ConnectionId}) joined game {gameId}");

            // Notify game manager
            var result = await _gameManager.AddPlayerToGame(gameId, Context.ConnectionId, alias);
            if (result != null)
            {
                await Clients.Group(gameId).SendAsync("GameUpdated", result);
            }
        }

        public async Task ProcessLetter(string gameId, string letter)
        {
            var result = await _gameManager.ProcessLetter(gameId, Context.ConnectionId, letter);
            if (result != null)
            {
                await Clients.Group(gameId).SendAsync("GameUpdated", result);
            }
        }

        public async Task SendMessage(string gameId, string alias, string message)
        {
            await Clients.Group(gameId).SendAsync("ReceiveMessage", alias, message);
        }

        public async Task RequestHint(string gameId)
        {
            var game = _gameManager.GetGame(gameId);
            if (game == null) return;

            var hint = await _geminiService.GetHintAsync(game.WordToGuess, game.Category);
            await Clients.Group(gameId).SendAsync("ReceiveHint", hint);
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            await _gameManager.HandleDisconnect(Context.ConnectionId);
            await base.OnDisconnectedAsync(exception);
        }
    }
}

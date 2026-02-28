using System.Collections.Concurrent;
using AhorcadoPro.Backend.Models;
using AhorcadoPro.Backend.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using AhorcadoPro.Backend.Hubs;

namespace AhorcadoPro.Backend.Services
{
    public class GameManager
    {
        private readonly ConcurrentDictionary<string, GameSession> _activeGames = new();
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<GameManager> _logger;
        private readonly Random _random = new();

        public GameManager(IServiceProvider serviceProvider, ILogger<GameManager> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        public async Task<GameSession> CreateGame(GameMode mode, string? creatorAlias, int maxAttempts = 6, string? theme = null)
        {
            string? wordText = null;
            string? category = null;

            if (!string.IsNullOrEmpty(theme))
            {
                using var scope = _serviceProvider.CreateScope();
                var gemini = scope.ServiceProvider.GetRequiredService<IGeminiService>();
                var aiResult = await gemini.GenerateWordAsync(theme);
                if (aiResult != null)
                {
                    wordText = aiResult.Word;
                    category = aiResult.Category;
                }
            }

            if (wordText == null)
            {
                var word = await GetRandomWord();
                wordText = word?.Text.ToUpper() ?? "AHORCADO";
                category = word?.Category ?? "General";
            }

            var game = new GameSession
            {
                Mode = mode,
                WordToGuess = wordText ?? "AHORCADO",
                Category = category ?? "General",
                MaxAttempts = maxAttempts,
                RemainingAttempts = maxAttempts,
                Player1Alias = creatorAlias,
                Player1RemainingAttempts = maxAttempts,
                Player2RemainingAttempts = maxAttempts
            };

            _activeGames[game.Id] = game;
            return game;
        }

        public GameSession? GetGame(string gameId)
        {
            return _activeGames.TryGetValue(gameId, out var game) ? game : null;
        }

        public async Task<GameSession?> AddPlayerToGame(string gameId, string connectionId, string alias)
        {
            if (_activeGames.TryGetValue(gameId, out var game))
            {
                lock (game)
                {
                    game.LastActivity = DateTime.UtcNow;
                    if (game.Player1Id == null)
                    {
                        game.Player1Id = connectionId;
                        game.Player1Alias = alias;
                    }
                    else if (game.Player2Id == null && game.Player1Id != connectionId)
                    {
                        game.Player2Id = connectionId;
                        game.Player2Alias = alias;
                        game.Status = GameStatus.InProgress;
                    }
                }
                return game;
            }
            return null;
        }

        public async Task<GameSession?> ProcessLetter(string gameId, string connectionId, string letter)
        {
            if (!_activeGames.TryGetValue(gameId, out var game)) return null;

            lock (game)
            {
                game.LastActivity = DateTime.UtcNow;
                if (game.Status != GameStatus.InProgress) return game;

                letter = letter.ToUpper();

                if (game.Mode == GameMode.OnlineVersus)
                {
                    return ProcessVersusRaceLetter(game, connectionId, letter);
                }
                else
                {
                    return ProcessCoopOrSoloLetter(game, connectionId, letter);
                }
            }
        }

        private GameSession ProcessVersusRaceLetter(GameSession game, string connectionId, string letter)
        {
            bool isPlayer1 = connectionId == game.Player1Id;
            bool isPlayer2 = connectionId == game.Player2Id;

            if (!isPlayer1 && !isPlayer2) return game;

            string progress = isPlayer1 ? (game.Player1Progress ?? "") : (game.Player2Progress ?? "");
            string incorrect = isPlayer1 ? (game.Player1Incorrect ?? "") : (game.Player2Incorrect ?? "");
            int remaining = isPlayer1 ? game.Player1RemainingAttempts : game.Player2RemainingAttempts;

            if (progress.Contains(letter) || incorrect.Contains(letter)) return game;

            if (game.WordToGuess.Contains(letter))
            {
                progress += letter;
            }
            else
            {
                incorrect += letter;
                remaining--;
            }

            if (isPlayer1)
            {
                game.Player1Progress = progress;
                game.Player1Incorrect = incorrect;
                game.Player1RemainingAttempts = remaining;
            }
            else
            {
                game.Player2Progress = progress;
                game.Player2Incorrect = incorrect;
                game.Player2RemainingAttempts = remaining;
            }

            // Check if this player won
            bool won = game.WordToGuess.All(c => progress.Contains(c));
            if (won)
            {
                game.Status = GameStatus.Won;
                game.FinishedAt = DateTime.UtcNow;
                _ = RecordScore(isPlayer1 ? game.Player1Alias : game.Player2Alias, 100, game.Mode);
            }
            else if (remaining <= 0)
            {
                // If one player loses, the other could still be playing in Race mode
                // But for simplicity, let's say if both lose or one wins, it ends.
                // Or maybe only end if both have finished their attempts or someone won.
                if (game.Player1RemainingAttempts <= 0 && game.Player2RemainingAttempts <= 0)
                {
                    game.Status = GameStatus.Lost;
                    game.FinishedAt = DateTime.UtcNow;
                }
            }

            return game;
        }

        private GameSession ProcessCoopOrSoloLetter(GameSession game, string connectionId, string letter)
        {
            if (game.GuessedLetters.Contains(letter) || game.IncorrectLetters.Contains(letter)) return game;

            if (game.WordToGuess.Contains(letter))
            {
                game.GuessedLetters += letter;
            }
            else
            {
                game.IncorrectLetters += letter;
                game.RemainingAttempts--;
            }

            bool won = game.WordToGuess.All(c => game.GuessedLetters.Contains(c));
            if (won)
            {
                game.Status = GameStatus.Won;
                game.FinishedAt = DateTime.UtcNow;
                _ = RecordScore(game.Player1Alias, 50, game.Mode);
            }
            else if (game.RemainingAttempts <= 0)
            {
                game.Status = GameStatus.Lost;
                game.FinishedAt = DateTime.UtcNow;
            }

            return game;
        }

        public async Task HandleDisconnect(string connectionId)
        {
            var game = _activeGames.Values.FirstOrDefault(g => g.Player1Id == connectionId || g.Player2Id == connectionId);
            if (game != null)
            {
                lock (game)
                {
                    _logger.LogInformation("Player {ConnectionId} disconnected from game {GameId}", connectionId, game.Id);
                    // If it's a solo game or everyone left, we could remove it.
                    // For now, just mark last activity.
                    game.LastActivity = DateTime.UtcNow;
                }
            }
        }

        public void EndGame(string gameId)
        {
            if (_activeGames.TryRemove(gameId, out _))
            {
                _logger.LogInformation("Game {GameId} removed from active games.", gameId);
            }
        }

        public void CleanupIdleGames(TimeSpan maxIdleTime)
        {
            var now = DateTime.UtcNow;
            var idleGameIds = _activeGames.Where(kvp => now - kvp.Value.LastActivity > maxIdleTime)
                                         .Select(kvp => kvp.Key)
                                         .ToList();

            foreach (var id in idleGameIds)
            {
                _logger.LogInformation("Cleaning up idle game {GameId}", id);
                _activeGames.TryRemove(id, out _);
            }
        }

        private async Task RecordScore(string? alias, int points, GameMode mode)
        {
            if (string.IsNullOrEmpty(alias)) return;
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            context.Scores.Add(new Score { GuestAlias = alias, Points = points, Mode = mode });
            await context.SaveChangesAsync();
        }

        private async Task<Word?> GetRandomWord()
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var count = await context.Words.CountAsync(w => w.IsActive);
            if (count == 0) return null;
            var skip = _random.Next(count);
            return await context.Words.Where(w => w.IsActive).Skip(skip).FirstOrDefaultAsync();
        }
    }
}

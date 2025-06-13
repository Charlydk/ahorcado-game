using AhorcadoBackend.Models;
using Microsoft.AspNetCore.SignalR; // NECESARIO para IHubContext
using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Collections.Generic;
using AhorcadoBackend.Hubs;

namespace AhorcadoBackend.Services
{
    public class GameManager
    {
        private readonly ConcurrentDictionary<string, JuegoEstado> _activeGames;
        private readonly Random _random;
        private readonly IHubContext<GameHub> _hubContext; // ¡DECLARACIÓN AQUÍ!

        // Lista de palabras predefinidas. Considerar cargar desde un archivo o DB a futuro.
        private readonly List<string> _palabras = new List<string>
        { "CASA", "PAYASO", "CAMARA", "HOMERO", "PLATO", "TECLADO", "TRISTEZA", "MONITOR", "PROGRAMACION", "DESARROLLO", "SOFTWARE", "COMPUTADORA", "INTERNET" };

        // Constructor que ACEPTA IHubContext<GameHub>
        public GameManager(IHubContext<GameHub> hubContext)
        {
            _hubContext = hubContext; // ASIGNACIÓN AQUÍ
            _activeGames = new ConcurrentDictionary<string, JuegoEstado>();
            _random = new Random();
        }

        // Constructor sin IHubContext (para pruebas o si no se usa SignalR) - OPCIONAL
        // Si siempre vas a usar SignalR, puedes remover este constructor sin parámetros.
        public GameManager()
        {
            _activeGames = new ConcurrentDictionary<string, JuegoEstado>();
            _random = new Random();
            // _hubContext NO se inicializa aquí, esto podría causar NullReferenceException si se usa.
            // Por eso, es mejor tener un único constructor con la inyección.
        }


        private string GenerarPalabraAleatoria()
        {
            return _palabras[_random.Next(_palabras.Count)];
        }


        // Crea una nueva partida y la añade al diccionario
        // Agregamos un parámetro 'creatorConnectionId' para poder asociarlo desde el inicio.
        public JuegoEstado CreateNewGame(string? palabraSecreta = null, string? creatorConnectionId = null, string? gameId = null)
        {
            string newGameId = gameId ?? Guid.NewGuid().ToString();

            if (string.IsNullOrEmpty(palabraSecreta))
            {
                palabraSecreta = GenerarPalabraAleatoria();
            }
            else
            {
                palabraSecreta = palabraSecreta.ToUpper();
            }

            var nuevoEstado = new JuegoEstado
            {
                GameId = newGameId,
                PalabraSecreta = palabraSecreta,
                GuionesActuales = new string('_', palabraSecreta.Length),
                IntentosRestantes = 6,
                JuegoTerminado = false,
                PlayerConnectionIds = new List<string>(), // Asegúrate de inicializar la lista
                LastActivityTime = DateTime.UtcNow // Establece la hora de creación como última actividad
            };

            // Si se proporciona un ConnectionId al crear, añádelo
            if (!string.IsNullOrEmpty(creatorConnectionId))
            {
                nuevoEstado.PlayerConnectionIds.Add(creatorConnectionId);
                nuevoEstado.CreadorConnectionId = creatorConnectionId;
                nuevoEstado.TurnoActualConnectionId = creatorConnectionId; // El creador tiene el primer turno por defecto
            }

            _activeGames[newGameId] = nuevoEstado;

            return nuevoEstado;
        }



        // Obtiene el estado de una partida por su ID
        public JuegoEstado? GetGame(string gameId)
        {
            if (_activeGames.TryGetValue(gameId, out var game))
            {
                game.LastActivityTime = DateTime.UtcNow;
                return game;
            }
            return null;
        }

        // Nuevo método: Obtener partida por ConnectionId de un jugador (útil para OnDisconnected)
        public JuegoEstado? GetGameByPlayerConnectionId(string connectionId)
        {
            var game = _activeGames.Values.FirstOrDefault(g => g.PlayerConnectionIds.Contains(connectionId));
            if (game != null)
            {
                game.LastActivityTime = DateTime.UtcNow;
            }
            return game;
        }

        // Remueve una partida por su ID (ej. cuando termina o es inactiva)
        public void RemoveGame(string gameId)
        {
            _activeGames.TryRemove(gameId, out _);
        }

        // Clase auxiliar para el resultado de un intento de unirse a una partida
        public class JoinGameResult
        {
            public bool Success { get; set; }
            public string Message { get; set; } = string.Empty;
            public JuegoEstado? UpdatedGame { get; set; }
        }

        // Modificamos AddPlayerToGame para que devuelva un JoinGameResult y actualice el mensaje de la partida
        public JoinGameResult TryJoinGame(string gameId, string connectionId)
        {
            var result = new JoinGameResult();

            if (!_activeGames.TryGetValue(gameId, out var game))
            {
                result.Message = "La partida no existe.";
                return result;
            }

            if (game.PlayerConnectionIds.Contains(connectionId))
            {
                result.Success = true;
                result.Message = "Ya estás en esta partida.";
                result.UpdatedGame = game;
                return result;
            }

            if (game.PlayerConnectionIds.Count >= 2)
            {
                result.Message = "La partida ya está llena.";
                return result;
            }

            // Si el juego ya está terminado, no permitir unirse
            if (game.JuegoTerminado)
            {
                result.Message = "La partida ya ha terminado y no se puede unir.";
                return result;
            }

            game.PlayerConnectionIds.Add(connectionId);
            game.LastActivityTime = DateTime.UtcNow;

            // Si se unió el segundo jugador, la partida realmente comienza
            if (game.PlayerConnectionIds.Count == 2)
            {
                game.JuegoTerminado = false; // Asegurar que no esté marcado como terminado
                // El turno ya debería estar definido por el creador, lo mantenemos.
                game.Message = "¡El segundo jugador se ha unido! ¡Comienza la partida!";
                Console.WriteLine($"Partida {gameId} lista para comenzar con 2 jugadores.");
            }
            else
            {
                // Esto es más para partidas con N jugadores o si el creador aún está solo
                game.Message = "Te has unido. Esperando a otro jugador...";
            }

            result.Success = true;
            result.UpdatedGame = game;
            // El mensaje ya se estableció en 'game.Message'
            return result;
        }


        // Remueve un ConnectionId de una partida (útil al desconectarse)
        // Este método ya lo tienes, pero lo dejo aquí para referencia.
        public bool RemovePlayerFromGame(string gameId, string connectionId)
        {
            if (_activeGames.TryGetValue(gameId, out var game))
            {
                bool removed = game.PlayerConnectionIds.Remove(connectionId);
                if (removed)
                {
                    game.LastActivityTime = DateTime.UtcNow;
                    // Si el jugador removido era el del turno, cederlo al otro si existe.
                    if (game.TurnoActualConnectionId == connectionId && game.PlayerConnectionIds.Any())
                    {
                        game.TurnoActualConnectionId = game.PlayerConnectionIds.FirstOrDefault(id => id != connectionId);
                    }
                }
                return removed;
            }
            return false;
        }

        // =========================================================================================
        // MÉTODO MODIFICADO: Procesa una letra adivinada y devuelve un ProcessLetterResult
        // =========================================================================================
        public ProcessLetterResult ProcessLetter(string gameId, char letra, string? playerConnectionId)
        {
            var result = new ProcessLetterResult();

            if (!_activeGames.TryGetValue(gameId, out var game))
            {
                result.Message = "La partida no existe.";
                return result;
            }

            if (game.JuegoTerminado)
            {
                result.Message = game.Message;
                result.UpdatedGame = game;
                result.IsGameOver = true;
                return result;
            }

            // Validar que sea el turno del jugador que envía la letra (solo si es partida online de 2 jugadores)
            if (game.PlayerConnectionIds.Count == 2 && game.TurnoActualConnectionId != playerConnectionId)
            {
                result.Message = "No es tu turno. Espera al otro jugador.";
                result.UpdatedGame = game;
                return result;
            }

            letra = char.ToUpper(letra);

            if (game.LetrasIngresadas == null) game.LetrasIngresadas = new List<char>();
            if (game.LetrasIncorrectas == null) game.LetrasIncorrectas = new List<char>();


            if (game.LetrasIngresadas.Contains(letra))
            {
                result.Message = $"La letra '{letra}' ya fue ingresada. Intenta con otra.";
                result.UpdatedGame = game;
                result.WasLetterAlreadyGuessed = true;
                return result;
            }

            game.LetrasIngresadas.Add(letra);

            bool letraCorrecta = false;
            string nuevaPalabraGuiones = "";

            for (int i = 0; i < game.PalabraSecreta.Length; i++)
            {
                if (game.PalabraSecreta[i] == letra)
                {
                    nuevaPalabraGuiones += letra;
                    letraCorrecta = true;
                }
                else
                {
                    nuevaPalabraGuiones += game.GuionesActuales[i];
                }
            }

            game.GuionesActuales = nuevaPalabraGuiones;

            if (!letraCorrecta)
            {
                game.IntentosRestantes--;
                game.LetrasIncorrectas.Add(letra);
                result.Message = $"¡Incorrecto! La letra '{letra}' no está en la palabra.";
                result.WasLetterIncorrect = true;
            }
            else
            {
                result.Message = $"¡Bien! La letra '{letra}' es correcta.";
                result.WasLetterCorrect = true;
            }

            // Lógica de fin de juego (Victoria/Derrota)
            if (game.IntentosRestantes <= 0)
            {
                game.JuegoTerminado = true;
                game.Message = $"¡GAME OVER! La palabra era: {game.PalabraSecreta}";
                game.TurnoActualConnectionId = null;
                result.IsGameOver = true;
                result.Message = game.Message;
            }
            else if (game.GuionesActuales == game.PalabraSecreta)
            {
                game.JuegoTerminado = true;
                game.Message = $"¡Felicidades! Has adivinado la palabra: {game.PalabraSecreta}";
                game.TurnoActualConnectionId = null;
                result.IsGameWon = true;
                result.Message = game.Message;
            }

            game.LastActivityTime = DateTime.UtcNow;

            // Solo cambiar el turno si el juego NO ha terminado y hay 2 jugadores
            if (!game.JuegoTerminado && game.PlayerConnectionIds.Count == 2)
            {
                string oldTurnId = game.TurnoActualConnectionId;
                game.TurnoActualConnectionId = game.PlayerConnectionIds.FirstOrDefault(id => id != oldTurnId);
                Console.WriteLine($"DEBUG: Turno cambiado en partida {game.GameId}. Anterior: {oldTurnId}, Nuevo: {game.TurnoActualConnectionId}");
            }

            result.UpdatedGame = game;
            return result;
        }

        // Reinicia una partida existente
        public JuegoEstado? RestartGame(string gameId)
        {
            if (_activeGames.TryGetValue(gameId, out var game))
            {
                game.PalabraSecreta = GenerarPalabraAleatoria();
                game.GuionesActuales = new string('_', game.PalabraSecreta.Length);
                game.LetrasIngresadas.Clear();
                game.LetrasIncorrectas.Clear();
                game.IntentosRestantes = 6;
                game.JuegoTerminado = false;
                game.LastActivityTime = DateTime.UtcNow;

                if (game.PlayerConnectionIds.Any())
                {
                    game.TurnoActualConnectionId = game.CreadorConnectionId ?? game.PlayerConnectionIds.First();
                }
                else
                {
                    game.TurnoActualConnectionId = null;
                }
                game.Message = "La partida ha sido reiniciada. ¡A adivinar!";

                return game;
            }
            return null;
        }

        public void CleanInactiveGames(TimeSpan inactivityThreshold, TimeSpan completedGameRetention)
        {
            DateTime now = DateTime.UtcNow;
            var gamesToClean = new List<string>();

            foreach (var entry in _activeGames)
            {
                var game = entry.Value;

                if (game.PlayerConnectionIds.Count == 0 && (now - game.LastActivityTime) > inactivityThreshold)
                {
                    Console.WriteLine($"Limpiando partida vacía: {game.GameId}");
                    gamesToClean.Add(game.GameId);
                }
                else if (game.JuegoTerminado && (now - game.LastActivityTime) > completedGameRetention)
                {
                    Console.WriteLine($"Limpiando partida terminada: {game.GameId}");
                    gamesToClean.Add(game.GameId);
                }
                else if (game.PlayerConnectionIds.Count == 1 && (now - game.LastActivityTime) > inactivityThreshold)
                {
                    Console.WriteLine($"Limpiando partida de un jugador inactivo: {game.GameId}");
                    gamesToClean.Add(game.GameId);
                }
            }

            foreach (var gameId in gamesToClean)
            {
                RemoveGame(gameId);
            }
            Console.WriteLine($"GameManager: Limpieza completada. Partidas activas restantes: {_activeGames.Count}");
        }

        // --- Nuevo método para cuando un jugador abandona voluntariamente ---
        public void PlayerLeftGame(string gameId, string connectionId)
        {
            if (_activeGames.TryGetValue(gameId, out var game))
            {
                Console.WriteLine($"GameManager: Cliente {connectionId} abandonó voluntariamente la partida {gameId}.");
                RemovePlayerFromGameAndHandleConsequences(game, connectionId, "Tu oponente ha abandonado la partida.");
            }
            else
            {
                Console.WriteLine($"GameManager: Partida {gameId} no encontrada al intentar que {connectionId} la abandone.");
            }
        }

        // --- Método para cuando un jugador se desconecta inesperadamente ---
        public void PlayerDisconnected(string connectionId)
        {
            var gameEntry = _activeGames.FirstOrDefault(kv => kv.Value.PlayerConnectionIds.Contains(connectionId));

            if (gameEntry.Value != null)
            {
                var gameId = gameEntry.Key;
                var game = gameEntry.Value;

                Console.WriteLine($"GameManager: Cliente {connectionId} se desconectó de la partida {gameId}.");
                RemovePlayerFromGameAndHandleConsequences(game, connectionId, "Tu oponente se ha desconectado.");
            }
            else
            {
                Console.WriteLine($"GameManager: Cliente {connectionId} se desconectó, pero no estaba en ninguna partida activa.");
            }
        }

        // --- Método auxiliar para manejar las consecuencias de remover un jugador ---
        private void RemovePlayerFromGameAndHandleConsequences(JuegoEstado game, string connectionIdToRemove, string disconnectionMessage)
        {
            // Remover el ConnectionId del jugador de la lista
            game.PlayerConnectionIds.Remove(connectionIdToRemove);

            // Solo aplicar esta lógica si es una partida online y aún quedan jugadores después de la remoción
            if (game.PlayerConnectionIds.Count == 1) // Si queda un jugador después de que el otro se fue
            {
                game.JuegoTerminado = true;
                game.Message = disconnectionMessage; // Mensaje específico de desconexión/abandono
                game.TurnoActualConnectionId = null; // No hay más turnos si el juego online de 2 jugadores terminó

                var remainingPlayerConnectionId = game.PlayerConnectionIds.First();

                // Enviar la actualización de estado al jugador restante
                // Usa _hubContext para enviar al cliente específico
                _hubContext.Clients.Client(remainingPlayerConnectionId).SendAsync("ReceiveGameUpdate", new JuegoEstadoResponse
                {
                    GameId = game.GameId,
                    Palabra = game.GuionesActuales, // Mostrar el estado actual de la palabra
                    IntentosRestantes = game.IntentosRestantes,
                    LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                    JuegoTerminado = game.JuegoTerminado,
                    PalabraSecreta = game.PalabraSecreta, // Revela la palabra
                    TurnoActualConnectionId = game.TurnoActualConnectionId,
                    Message = game.Message
                });
                Console.WriteLine($"Partida {game.GameId}: Notificado al jugador {remainingPlayerConnectionId} sobre la desconexión/abandono del oponente.");

                // Remover la partida si quieres que se limpie del GameManager después de la notificación
                _activeGames.TryRemove(game.GameId, out _);
                Console.WriteLine($"Partida {game.GameId} marcada como terminada y removida después de la desconexión.");
            }
            else if (game.PlayerConnectionIds.Count == 0)
            {
                // Si no quedan jugadores, simplemente remover la partida
                _activeGames.TryRemove(game.GameId, out _);
                Console.WriteLine($"Partida {game.GameId} removida porque no quedan jugadores.");
            }
            // Si la partida ya estaba terminada (ej. por ganar/perder antes de la desconexión),
            // o si es un modo no-online de 2 jugadores, la lógica adicional de fin de juego no es necesaria aquí.
        }
    }
}
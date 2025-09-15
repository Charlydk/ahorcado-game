using AhorcadoBackend.Models;
using Microsoft.AspNetCore.SignalR; // NECESARIO para IHubContext
using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Collections.Generic;
using AhorcadoBackend.Hubs;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;

namespace AhorcadoBackend.Services
{
    public class GameManager
    {
        private readonly ConcurrentDictionary<string, JuegoEstado> _activeGames;
        private readonly Random _random;
        private readonly IHubContext<GameHub> _hubContext; // ¡DECLARACIÓN AQUÍ!
        private readonly ILogger<GameManager> _logger; // <-- ADICIÓN AQUÍ: Declaración del logger


        // Constructor que ACEPTA IHubContext<GameHub>
        public GameManager(IHubContext<GameHub> hubContext, ILogger<GameManager> logger)


        {
            _hubContext = hubContext;
            _logger = logger;
            _activeGames = new ConcurrentDictionary<string, JuegoEstado>();
            _random = new Random();

        }
        // Método para obtener el estado interno del GameManager
        public MonitorEstado ObtenerEstadoInterno()
        {
            return new MonitorEstado
            {
                CantidadPartidas = _activeGames.Count,
                GameIds = _activeGames.Keys.ToList(),
                InstanciaId = GetHashCode().ToString()
            };
        }

        public IEnumerable<JuegoEstado> GetAllGames()
        {
            return _activeGames.Values;
        }

        private async Task<string?> GenerarPalabraAleatoriaAsync()
        {
            try
            {
                using var context = await _contextFactory.CreateDbContextAsync();
                var palabras = await context.Palabras
                    .Where(p => p.Activa)
                    .Select(p => p.TextoPalabra)
                    .ToListAsync();

                if (!palabras.Any()) return null;

                return palabras[_random.Next(palabras.Count)].ToUpper();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error al generar palabra aleatoria desde Supabase");
                return null;
            }
        }


        private readonly IDbContextFactory<JuegoDbContext> _contextFactory;

        public GameManager(IHubContext<GameHub> hubContext, ILogger<GameManager> logger, IDbContextFactory<JuegoDbContext> contextFactory)
        {
            _hubContext = hubContext;
            _logger = logger;
            _contextFactory = contextFactory;
            _activeGames = new ConcurrentDictionary<string, JuegoEstado>();
            _random = new Random();
        }

        private static string GenerarCodigoSala(int longitud = 4)
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            var random = new Random();
            return new string(Enumerable.Repeat(chars, longitud)
                .Select(s => s[random.Next(s.Length)]).ToArray());
        }


        // Crea una nueva partida y la añade al diccionario
        // Agregamos un parámetro 'creatorConnectionId' para poder asociarlo desde el inicio.
        public async Task<JuegoEstado> CreateNewGame(string? palabraSecreta = null, string? creatorConnectionId = null, string? gameId = null, string? aliasCreador = null, int intentosPermitidos = 6)
        {


            string newGameId = gameId ?? Guid.NewGuid().ToString();
            _logger.LogInformation($"🧩 Partida {newGameId} registrada en memoria en instancia: {GetHashCode()}");

            if (string.IsNullOrEmpty(palabraSecreta))
            {
                palabraSecreta = await GenerarPalabraAleatoriaAsync();
                if (string.IsNullOrEmpty(palabraSecreta))
                    palabraSecreta = "AHORCADO"; // fallback literal si falla
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
                IntentosRestantes = intentosPermitidos,
                JuegoTerminado = false,
                PlayerConnectionIds = new List<string>(), // Asegúrate de inicializar la lista
                LastActivityTime = DateTime.UtcNow,
                CodigoSala = GenerarCodigoSala(4)
            };

            // Si se proporciona un ConnectionId al crear, añádelo
            if (!string.IsNullOrEmpty(creatorConnectionId))
            {
                nuevoEstado.PlayerConnectionIds.Add(creatorConnectionId);
                nuevoEstado.CreadorConnectionId = creatorConnectionId;
                nuevoEstado.TurnoActualConnectionId = creatorConnectionId;

                if (!string.IsNullOrWhiteSpace(aliasCreador))
                {
                    nuevoEstado.AliasJugadorPorConnectionId[creatorConnectionId] = aliasCreador;
                }
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

        // Método 'RemoveGame' ya existente, que cumple la función de 'EndGame'
        public void RemoveGame(string gameId)
        {
            if (_activeGames.TryRemove(gameId, out _))
            {
                _logger.LogInformation($"Partida {gameId} finalizada y eliminada del GameManager."); // <-- LOGGING
            }
            else
            {
                _logger.LogWarning($"Intento de finalizar la partida {gameId}, pero no fue encontrada en GameManager."); // <-- LOGGING
            }
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
            _logger.LogDebug($"🧪 J2 intentando unirse a partida: {gameId}");
            _logger.LogDebug($"🧪 Cantidad de partidas activas: {_activeGames.Count}");
            _logger.LogDebug($"🧪 GameIds actuales: {string.Join(" | ", _activeGames.Keys)}");

            _logger.LogInformation($"🎯 J2 intentando unirse desde instancia: {GetHashCode()}");



            var result = new JoinGameResult();

            if (!_activeGames.TryGetValue(gameId, out var game))
            {
                result.Message = "La partida no existe.";
                _logger.LogWarning($"Intento de unirse a partida {gameId} por {connectionId}: Partida no encontrada."); // <-- LOGGING
                return result;
            }

            if (game.PlayerConnectionIds.Contains(connectionId))
            {
                result.Success = true;
                result.Message = "Ya estás en esta partida.";
                result.UpdatedGame = game;
                _logger.LogInformation($"Jugador {connectionId} ya está en la partida {gameId}."); // <-- LOGGING
                return result;
            }

            _logger.LogInformation($"[TryJoinGame] Estado actual al intentar unirse: GameId: {gameId}, ConnectionId entrante: {connectionId}, Jugadores actuales: {string.Join(", ", game.PlayerConnectionIds)}");
            if (game.PlayerConnectionIds.Count >= 2)
            {
                result.Message = "La partida ya está llena.";
                _logger.LogWarning($"Intento de unirse a partida {gameId} por {connectionId}: Partida llena."); // <-- LOGGING
                return result;
            }

            // Si el juego ya está terminado, no permitir unirse
            if (game.JuegoTerminado)
            {
                result.Message = "La partida ya ha terminado y no se puede unir.";
                _logger.LogWarning($"Intento de unirse a partida {gameId} por {connectionId}: Partida ya terminada."); // <-- LOGGING
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
                _logger.LogInformation($"Partida {gameId} lista para comenzar con 2 jugadores. Jugador {connectionId} se unió."); // <-- LOGGING

            }
            else
            {
                // Esto es más para partidas con N jugadores o si el creador aún está solo
                game.Message = "Te has unido. Esperando a otro jugador...";
                _logger.LogInformation($"Jugador {connectionId} se unió a partida {gameId}. Esperando más jugadores."); // <-- LOGGING

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
                    _logger.LogInformation($"Jugador {connectionId} removido de la partida {gameId}. Jugadores restantes: {game.PlayerConnectionIds.Count}."); // <-- LOGGING

                    // Si el jugador removido era el del turno, cederlo al otro si existe.
                    if (game.TurnoActualConnectionId == connectionId && game.PlayerConnectionIds.Any())
                    {
                        game.TurnoActualConnectionId = game.PlayerConnectionIds.FirstOrDefault(id => id != connectionId);
                        _logger.LogInformation($"Turno cedido en partida {gameId} de {connectionId} a {game.TurnoActualConnectionId}."); // <-- LOGGING

                    }
                }
                return removed;
            }
            _logger.LogWarning($"Intento de remover jugador {connectionId} de partida {gameId}: Partida no encontrada o jugador no estaba en ella."); // <-- LOGGING

            return false;
        }

        // =========================================================================================
        // MÉTODO MODIFICADO: Procesa una letra adivinada y devuelve un ProcessLetterResult
        // =========================================================================================

        public async Task<ProcessLetterResult> ProcessLetter(
    string gameId,
    char letra,
    string? playerConnectionId,
    string? aliasJugador1 = null,
    string? aliasJugador2 = null)
        {
            var result = new ProcessLetterResult();

            // ✅ Validación anticipada
            if (string.IsNullOrWhiteSpace(gameId) || letra == '\0')
            {
                _logger.LogWarning($"⛔ gameId o letra inválidos: gameId='{gameId}' | letra='{letra}'");
                result.Message = "Datos inválidos. La letra o el ID de partida no pueden estar vacíos.";
                return result;
            }

            if (!_activeGames.TryGetValue(gameId, out var game))
            {
                result.Message = "La partida no existe.";
                _logger.LogWarning($"Intento de procesar letra '{letra}' en partida {gameId}: Partida no encontrada.");
                return result;
            }

            _logger.LogInformation($"👀 AliasDict antes de inicializar: {(game.AliasJugadorPorConnectionId == null ? "null" : string.Join(", ", game.AliasJugadorPorConnectionId.Select(p => $"{p.Key}={p.Value}")))}");

            if (game.PlayerConnectionIds.Count == 0)
            {
                game.AliasJugadorPorConnectionId ??= new Dictionary<string, string>();

                if (!game.AliasJugadorPorConnectionId.TryGetValue("LOCAL", out var valorActual) || valorActual == "Anónimo")
                {
                    game.AliasJugadorPorConnectionId["LOCAL"] = aliasJugador1 ?? "Anónimo";
                    _logger.LogInformation($"✅ Alias actualizado en modo solitario: LOCAL={aliasJugador1}");
                }
            }

            if (game.JuegoTerminado)
            {
                result.Message = game.Message;
                result.UpdatedGame = game;
                result.IsGameOver = true;
                _logger.LogInformation($"Intento de procesar letra '{letra}' en partida {gameId}: Juego ya terminado.");
                return result;
            }

            if (game.PlayerConnectionIds.Count == 2 && game.TurnoActualConnectionId != playerConnectionId)
            {
                result.Message = "No es tu turno. Espera al otro jugador.";
                result.UpdatedGame = game;
                _logger.LogWarning($"Jugador {playerConnectionId} intentó jugar en partida {gameId} cuando no era su turno.");
                return result;
            }

            letra = char.ToUpper(letra);
            game.LetrasIngresadas ??= new List<char>();
            game.LetrasIncorrectas ??= new List<char>();

            if (game.LetrasIngresadas.Contains(letra))
            {
                result.Message = $"La letra '{letra}' ya fue ingresada. Intenta con otra.";
                result.UpdatedGame = game;
                result.WasLetterAlreadyGuessed = true;
                _logger.LogInformation($"Letra '{letra}' ya ingresada en partida {gameId}.");
                return result;
            }

            // 🧱 Validar estado del juego antes de continuar
            if (string.IsNullOrWhiteSpace(game.PalabraSecreta) || string.IsNullOrWhiteSpace(game.GuionesActuales))
            {
                _logger.LogError($"❌ PalabraSecreta o GuionesActuales no inicializados en partida {game.GameId}.");
                result.Message = "Error interno al procesar la letra. La palabra no fue correctamente asignada.";
                result.UpdatedGame = game;
                result.IsGameOver = true;
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

            result.Message = letraCorrecta
                ? $"¡Bien! La letra '{letra}' es correcta."
                : $"¡Incorrecto! La letra '{letra}' no está en la palabra.";

            if (letraCorrecta)
            {
                result.WasLetterCorrect = true;
                _logger.LogInformation($"Letra '{letra}' correcta en partida {gameId}.");
            }
            else
            {
                game.IntentosRestantes--;
                game.LetrasIncorrectas.Add(letra);
                result.WasLetterIncorrect = true;
                _logger.LogInformation($"Letra '{letra}' incorrecta en partida {gameId}. Intentos restantes: {game.IntentosRestantes}.");
            }

            // 🚨 ¿La partida terminó?
            bool esVictoria = game.GuionesActuales == game.PalabraSecreta;
            bool esDerrota = game.IntentosRestantes <= 0;

            if (esVictoria || esDerrota)
            {
                game.JuegoTerminado = true;
                game.Message = esVictoria
                    ? $"¡Felicidades! Has adivinado la palabra: {game.PalabraSecreta}"
                    : $"¡GAME OVER! La palabra era: {game.PalabraSecreta}";

                string alias1;
                string? alias2 = null;

                if (game.PlayerConnectionIds.Count == 0)
                {
                    alias1 = game.AliasJugadorPorConnectionId.GetValueOrDefault("LOCAL",
                              game.AliasJugadorPorConnectionId.GetValueOrDefault("J1", "Jugador1"));
                    alias2 = game.AliasJugadorPorConnectionId.GetValueOrDefault("J2", null);
                }
                else
                {
                    var j1 = game.PlayerConnectionIds.ElementAtOrDefault(0);
                    var j2 = game.PlayerConnectionIds.ElementAtOrDefault(1);
                    alias1 = game.AliasJugadorPorConnectionId.GetValueOrDefault(j1 ?? "", "Jugador1");
                    alias2 = game.AliasJugadorPorConnectionId.GetValueOrDefault(j2 ?? "", "Jugador2");
                }

                try
                {
                    using var db = await _contextFactory.CreateDbContextAsync();

                    db.Partidas.Add(new Partida
                    {
                        AliasJugador = alias1 ?? "SinNombre1",
                        AliasJugador2 = alias2,
                        FueVictoria = esVictoria,
                        Fecha = DateTime.UtcNow,
                        PalabraSecreta = game.PalabraSecreta ?? "???",
                        EsOnline = game.PlayerConnectionIds.Count > 1
                    });

                    await db.SaveChangesAsync();
                    _logger.LogInformation($"💾 Partida {gameId} guardada en Supabase. Resultado: {(esVictoria ? "VICTORIA" : "DERROTA")}");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"❌ Error al guardar la partida {gameId} en la base de datos.");
                    result.Message = "El juego terminó correctamente, pero no se pudo guardar la partida.";
                    result.UpdatedGame = game;
                    result.IsGameOver = true;
                    return result;
                }

                game.TurnoActualConnectionId = null;
                result.IsGameWon = esVictoria;
                result.IsGameOver = true;
                result.Message = game.Message;
            }

            game.LastActivityTime = DateTime.UtcNow;

            if (!game.JuegoTerminado && game.PlayerConnectionIds.Count == 2)
            {
                string oldTurnId = game.TurnoActualConnectionId;
                game.TurnoActualConnectionId = game.PlayerConnectionIds.FirstOrDefault(id => id != oldTurnId);
                _logger.LogDebug($"Turno cambiado en partida {game.GameId}. Anterior: {oldTurnId}, Nuevo: {game.TurnoActualConnectionId}");
            }
            
            if (game.JuegoTerminado)
            {
                _logger.LogInformation($"Partida {game.GameId} ha terminado. Limpiando del GameManager.");
                RemoveGame(gameId);
            }

            result.UpdatedGame = game;
            return result;

        }


        // Reinicia una partida existente
        public async Task<JuegoEstado?> RestartGame(string gameId)
        {
            if (_activeGames.TryGetValue(gameId, out var game))
            {
                var palabra = await GenerarPalabraAleatoriaAsync();
                if (string.IsNullOrWhiteSpace(palabra))
                {
                    _logger.LogWarning($"❗ No se encontró palabra en Supabase. Usando fallback 'AHORCADO'.");
                    palabra = "AHORCADO";
                }

                game.PalabraSecreta = palabra;
                game.GuionesActuales = new string('_', palabra.Length);
                game.LetrasIngresadas.Clear();
                game.LetrasIncorrectas.Clear();
                game.IntentosRestantes = 6;
                game.JuegoTerminado = false;
                game.LastActivityTime = DateTime.UtcNow;

                game.TurnoActualConnectionId = game.PlayerConnectionIds.Any()
                    ? game.CreadorConnectionId ?? game.PlayerConnectionIds.First()
                    : null;

                game.Message = "La partida ha sido reiniciada. ¡A adivinar!";
                _logger.LogInformation($"Partida {gameId} reiniciada.");

                return game;
            }

            _logger.LogWarning($"Intento de reiniciar partida {gameId}: Partida no encontrada.");
            return null;
        }


        public void CleanInactiveGames(TimeSpan inactivityThreshold, TimeSpan completedGameRetention)
        {
            DateTime now = DateTime.UtcNow;
            var gamesToCleanDirectly = new List<string>(); // Para partidas 0 o terminadas

            // Lista para players inactivos que necesitamos "desconectar"
            var inactivePlayersToDisconnect = new List<(string gameId, string connectionId)>();

            foreach (var entry in _activeGames)
            {
                var game = entry.Value;

                if (game.PlayerConnectionIds.Count == 0 && (now - game.LastActivityTime) > inactivityThreshold)
                {
                    _logger.LogInformation($"Limpiando partida vacía: {game.GameId} por inactividad.");
                    gamesToCleanDirectly.Add(game.GameId);
                }
                else if (game.JuegoTerminado && (now - game.LastActivityTime) > completedGameRetention)
                {
                    _logger.LogInformation($"Limpiando partida terminada: {game.GameId} por retención.");
                    gamesToCleanDirectly.Add(game.GameId);
                }
                // SI SOLO HAY UN JUGADOR Y ESTÁ INACTIVO, LLAMAMOS A PlayerDisconnected
                else if (game.PlayerConnectionIds.Count == 1 && (now - game.LastActivityTime) > inactivityThreshold)
                {
                    string connectionIdOfInactivePlayer = game.PlayerConnectionIds.First();
                    _logger.LogWarning($"Partida {game.GameId} con jugador {connectionIdOfInactivePlayer} inactivo. Simulating disconnect."); // Usar Warning para destacar
                    inactivePlayersToDisconnect.Add((game.GameId, connectionIdOfInactivePlayer));
                    // NO AÑADIMOS game.GameId a gamesToCleanDirectly aquí, porque PlayerDisconnected la removerá si es necesario.
                }

                // Si un jugador se desconectó temporalmente pero no volvió en X segundos
                else if (game.DesconexionDetectada && game.DesconexionTimestamp.HasValue &&
                        (now - game.DesconexionTimestamp.Value) > TimeSpan.FromSeconds(40))
                {
                    _logger.LogWarning($"🧹 Partida {game.GameId} finalizada por desconexión prolongada.");

                    game.JuegoTerminado = true;
                    game.Message = "La partida terminó porque un jugador se desconectó durante mucho tiempo.";

                    gamesToCleanDirectly.Add(game.GameId);
                }

            }

            // Primero, manejar las "desconexiones" de jugadores inactivos
            foreach (var (gameId, connectionId) in inactivePlayersToDisconnect)
            {

                PlayerDisconnected(connectionId);
            }

            // Luego, limpiar las partidas que no tienen jugadores o ya terminaron y superaron el tiempo de retención
            foreach (var gameId in gamesToCleanDirectly)
            {
                RemoveGame(gameId); // Este es tu método para eliminar la partida del diccionario.
            }
            _logger.LogInformation($"GameManager: Limpieza completada. Partidas activas restantes: {_activeGames.Count}");
        }

        // --- Nuevo método para cuando un jugador abandona voluntariamente ---
        public void PlayerLeftGame(string gameId, string connectionId)
        {
            _logger.LogWarning($"⚠️ [PlayerLeftGame] llamado desde LeaveGameGroup() → {connectionId}");

            if (_activeGames.TryGetValue(gameId, out var game))
            {
                _logger.LogInformation($"Cliente {connectionId} abandonó voluntariamente la partida {gameId}."); // <-- LOGGING
                Console.WriteLine($"GameManager: Cliente {connectionId} abandonó voluntariamente la partida {gameId}.");
                RemovePlayerFromGameAndHandleConsequences(game, connectionId, "Tu oponente ha abandonado la partida.");
            }
            else
            {
                _logger.LogWarning($"Partida {gameId} no encontrada al intentar que {connectionId} la abandone."); // <-- LOGGING
                Console.WriteLine($"GameManager: Partida {gameId} no encontrada al intentar que {connectionId} la abandone.");
            }
        }

        // --- Método para cuando un jugador se desconecta inesperadamente ---
        public async Task PlayerDisconnected(string connectionId)
        {
            var gameEntry = _activeGames.FirstOrDefault(kv => kv.Value.PlayerConnectionIds.Contains(connectionId));

            if (gameEntry.Value != null)
            {
                var game = gameEntry.Value;
                _logger.LogWarning($"⛔ Cliente {connectionId} se desconectó de la partida {game.GameId}. Marcando como desconectado temporalmente.");

                // 🧠 Marcar como desconectado sin finalizar aún
                game.JugadorDesconectadoConnectionId = connectionId;
                game.DesconexionDetectada = true;
                game.DesconexionTimestamp = DateTime.UtcNow;
            }
        }


        public bool TryGetGame(string gameId, out JuegoEstado game)
        {
            return _activeGames.TryGetValue(gameId, out game);
        }


        // --- Método auxiliar para manejar las consecuencias de remover un jugador ---
        private void RemovePlayerFromGameAndHandleConsequences(JuegoEstado game, string connectionIdToRemove, string disconnectionMessage)
        {
            // Remover el ConnectionId del jugador de la lista
            game.PlayerConnectionIds.Remove(connectionIdToRemove);
            _logger.LogInformation($"Removido connectionId {connectionIdToRemove} de la partida {game.GameId}."); // <-- LOGGING


            // Solo aplicar esta lógica si es una partida online y aún quedan jugadores después de la remoción
            if (game.PlayerConnectionIds.Count == 1) // Si queda un jugador después de que el otro se fue
            {
                game.JuegoTerminado = true;
                game.Message = disconnectionMessage; // Mensaje específico de desconexión/abandono
                game.TurnoActualConnectionId = null; // No hay más turnos si el juego online de 2 jugadores terminó

                var remainingPlayerConnectionId = game.PlayerConnectionIds.First();

                _logger.LogInformation($"Notificando a jugador {remainingPlayerConnectionId} sobre la desconexión del oponente en partida {game.GameId}."); // <-- LOGGING
                // Enviar la actualización de estado al jugador restante
                // Usa _hubContext para enviar al cliente específico
                _hubContext.Clients.Client(remainingPlayerConnectionId).SendAsync("ReceiveGameUpdate", new JuegoEstadoResponse
                {
                    GameId = game.GameId,
                    CodigoSala = game.CodigoSala,
                    Palabra = game.GuionesActuales, // Mostrar el estado actual de la palabra
                    IntentosRestantes = game.IntentosRestantes,
                    LetrasIncorrectas = string.Join(", ", game.LetrasIncorrectas),
                    JuegoTerminado = game.JuegoTerminado,
                    PalabraSecreta = game.PalabraSecreta, // Revela la palabra
                    TurnoActualConnectionId = game.TurnoActualConnectionId,
                    Message = game.Message
                });
                // _logger.LogInformation($"Partida {game.GameId} removida después de la desconexión del oponente y notificación."); // <-- LOGGING

                Console.WriteLine($"Partida {game.GameId}: Notificado al jugador {remainingPlayerConnectionId} sobre la desconexión/abandono del oponente.");

                // No la removemos aquí. Dejamos que el GameCleanupService se encargue luego.
                _logger.LogInformation($"Partida {game.GameId} marcada como terminada, se limpiará más adelante.");

                Console.WriteLine($"Partida {game.GameId} marcada como terminada y removida después de la desconexión.");
            }
            else if (game.PlayerConnectionIds.Count == 0)
            {
                _logger.LogInformation($"Partida {game.GameId} ahora vacía. Removiéndola."); // <-- LOGGING
                RemoveGame(game.GameId); // <-- USANDO TU MÉTODO EXISTENTE RemoveGame
            }
            else
            {
                _logger.LogDebug($"Partida {game.GameId}: Conexión de {connectionIdToRemove} manejada, {game.PlayerConnectionIds.Count} jugadores restantes."); // <-- LOGGING
            }
        }
    }
}
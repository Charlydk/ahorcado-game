using AhorcadoBackend.Models;
using System;
using System.Collections.Concurrent;
using System.Linq; // Añadir esta directiva using para usar Linq

namespace AhorcadoBackend.Services
{
    public class GameManager
    {
        private readonly ConcurrentDictionary<string, JuegoEstado> _activeGames;
        private readonly Random _random;

        // Lista de palabras predefinidas. Considerar cargar desde un archivo o DB a futuro.
        private readonly List<string> _palabras = new List<string>
        { "CASA", "PAYASO", "CAMARA", "HOMERO", "PLATO", "TECLADO", "TRISTEZA", "MONITOR", "PROGRAMACION", "DESARROLLO", "SOFTWARE", "COMPUTADORA", "INTERNET" };


        public GameManager()
        {
            _activeGames = new ConcurrentDictionary<string, JuegoEstado>();
            _random = new Random();
        }

        private string GenerarPalabraAleatoria()
        {
            return _palabras[_random.Next(_palabras.Count)];
        }


        // Crea una nueva partida y la añade al diccionario
        public JuegoEstado CreateNewGame(string? gameId = null)
        {
            string newGameId = gameId ?? Guid.NewGuid().ToString().Substring(0, 8).ToUpper(); // Genera un ID de 8 caracteres

            // Asegurarse de que el ID generado no exista ya (especialmente importante para IDs cortos)
            while (_activeGames.ContainsKey(newGameId))
            {
                newGameId = Guid.NewGuid().ToString().Substring(0, 8).ToUpper();
            }

            var nuevaPartida = new JuegoEstado
            {
                GameId = newGameId,
                PalabraSecreta = GenerarPalabraAleatoria(),
                IntentosRestantes = 6, // Puedes ajustar esto
                LastActivityTime = DateTime.UtcNow // Inicializar la última actividad
            };
            nuevaPartida.GuionesActuales = new string('_', nuevaPartida.PalabraSecreta.Length);

            _activeGames.TryAdd(nuevaPartida.GameId, nuevaPartida);
            return nuevaPartida;
        }

        // Obtiene el estado de una partida por su ID
        public JuegoEstado? GetGame(string gameId)
        {
            if (_activeGames.TryGetValue(gameId, out var game))
            {
                game.LastActivityTime = DateTime.UtcNow; // Actualizar actividad al acceder
                return game;
            }
            return null;
        }

        // =========================================================================================
        // NUEVO MÉTODO: Encuentra una partida por el ConnectionId de uno de sus jugadores
        // =========================================================================================
        public JuegoEstado? GetGameByPlayerConnectionId(string connectionId)
        {
            // Busca en todas las partidas activas si alguna contiene este connectionId
            var game = _activeGames.Values.FirstOrDefault(g => g.PlayerConnectionIds.Contains(connectionId));
            if (game != null)
            {
                game.LastActivityTime = DateTime.UtcNow; // Actualizar actividad al acceder
            }
            return game;
        }


        // Remueve una partida por su ID (ej. cuando termina o es inactiva)
        public void RemoveGame(string gameId)
        {
            _activeGames.TryRemove(gameId, out _);
        }

        // Añade un ConnectionId a una partida existente
        public bool AddPlayerToGame(string gameId, string connectionId)
        {
            if (_activeGames.TryGetValue(gameId, out var game))
            {
                if (game.PlayerConnectionIds.Count >= 2) // Limitar a 2 jugadores por partida online
                {
                    return false; // La partida ya está llena
                }

                if (!game.PlayerConnectionIds.Contains(connectionId))
                {
                    game.PlayerConnectionIds.Add(connectionId);
                    game.LastActivityTime = DateTime.UtcNow; // Actualizar actividad al añadir jugador

                    if (game.PlayerConnectionIds.Count == 1)
                    {
                        game.CreadorConnectionId = connectionId;
                        game.TurnoActualConnectionId = connectionId;
                    }
                    return true;
                }
            }
            return false;
        }

        // Remueve un ConnectionId de una partida (útil al desconectarse)
        public bool RemovePlayerFromGame(string gameId, string connectionId)
        {
            if (_activeGames.TryGetValue(gameId, out var game))
            {
                bool removed = game.PlayerConnectionIds.Remove(connectionId);
                if (removed)
                {
                    game.LastActivityTime = DateTime.UtcNow; // Actualizar actividad al remover jugador
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

        // Procesa una letra adivinada
        public JuegoEstado? ProcessLetter(string gameId, char letra, string playerConnectionId)
        {
            if (_activeGames.TryGetValue(gameId, out var game))
            {
                // Validar que sea el turno del jugador que envía la letra
                if (game.TurnoActualConnectionId != playerConnectionId)
                {
                    // No es su turno, podrías lanzar una excepción o devolver null/un estado con error
                    Console.WriteLine($"Error: No es el turno de {playerConnectionId} en la partida {gameId}. Turno de {game.TurnoActualConnectionId}");
                    return null;
                }

                if (game.JuegoTerminado) return game; // No procesar si el juego ya terminó

                letra = char.ToUpper(letra);

                if (game.LetrasIngresadas.Contains(letra))
                {
                    // Ya se intentó esta letra
                    return game;
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
                }

                // Verificar si el juego terminó
                if (game.IntentosRestantes <= 0)
                {
                    game.JuegoTerminado = true;
                    // Aquí podrías establecer la palabra secreta para revelar
                    game.PalabraSecreta = game.PalabraSecreta;
                }
                else if (game.GuionesActuales == game.PalabraSecreta)
                {
                    game.JuegoTerminado = true;
                }

                game.LastActivityTime = DateTime.UtcNow; // Actualizar actividad al procesar letra

                // Cambiar el turno al otro jugador si el juego no ha terminado
                if (!game.JuegoTerminado && game.PlayerConnectionIds.Count == 2)
                {
                    game.TurnoActualConnectionId = game.PlayerConnectionIds.FirstOrDefault(id => id != game.TurnoActualConnectionId);
                }
                else if (game.JuegoTerminado)
                {
                    game.TurnoActualConnectionId = null; // No hay turno si el juego terminó
                }

                return game;
            }
            return null;
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
                game.LastActivityTime = DateTime.UtcNow; // Actualizar actividad al reiniciar

                // Asegurar que haya un turno si hay jugadores. Reiniciar al creador o al primer jugador.
                if (game.PlayerConnectionIds.Any())
                {
                    game.TurnoActualConnectionId = game.CreadorConnectionId ?? game.PlayerConnectionIds.First();
                }
                else
                {
                    game.TurnoActualConnectionId = null; // No hay jugadores, no hay turno
                }

                return game;
            }
            return null;
        }

        // =========================================================================================
        // NUEVO MÉTODO: Limpia las partidas inactivas o terminadas
        // =========================================================================================
        public void CleanInactiveGames(TimeSpan inactivityThreshold, TimeSpan completedGameRetention)
        {
            DateTime now = DateTime.UtcNow;
            var gamesToClean = new List<string>();

            foreach (var entry in _activeGames)
            {
                var game = entry.Value;
                // Criterios para limpiar:
                // 1. Partidas con 0 jugadores y más allá del umbral de inactividad.
                // 2. Partidas terminadas (ganadas o perdidas) y más allá del umbral de retención.
                // 3. Partidas con un solo jugador y más allá del umbral de inactividad (asumiendo que el otro se desconectó y no volvió).

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
                // Considerar también partidas con 1 jugador que excedan el umbral de inactividad
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

    }
}
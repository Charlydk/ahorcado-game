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
        public JuegoEstado CreateNewGame(string? palabraSecreta = null, string? gameId = null)
        {
            // Si no se proporciona un gameId, generamos uno.
            string newGameId = gameId ?? Guid.NewGuid().ToString();

            // Si no se proporciona palabraSecreta, generamos una aleatoria.
            // Aquí es donde necesitas una lista de palabras en GameManager.
            // ¡Asegúrate de que GameManager tenga su propia lista de palabras!
            if (string.IsNullOrEmpty(palabraSecreta))
            {
                palabraSecreta = GenerarPalabraAleatoria(); // Llama a un método interno para generar palabra
            }
            else
            {
                palabraSecreta = palabraSecreta.ToUpper(); // Asegura que la palabra esté en mayúsculas
            }

            var nuevoEstado = new JuegoEstado
            {
                GameId = newGameId,
                PalabraSecreta = palabraSecreta,
                GuionesActuales = new string('_', palabraSecreta.Length),
                IntentosRestantes = 6, // O el número de intentos que desees
                JuegoTerminado = false
            };

            _activeGames[newGameId] = nuevoEstado; // Añade la partida al diccionario

            return nuevoEstado;
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
        public JuegoEstado? ProcessLetter(string gameId, char letra, string? playerConnectionId) // *** CORRECCIÓN: 'string?' para que sea nullable ***
        {
            if (_activeGames.TryGetValue(gameId, out var game))
            {
                // Validar que sea el turno del jugador que envía la letra
                // *** CORRECCIÓN: Solo valida si playerConnectionId NO es null (es decir, en modo online) ***
                if (playerConnectionId != null && game.TurnoActualConnectionId != playerConnectionId)
                {
                    Console.WriteLine($"Error: No es el turno de {playerConnectionId} en la partida {gameId}. Turno de {game.TurnoActualConnectionId}");
                    // Para el frontend, devolver el estado actual con un mensaje de error sería mejor.
                    // Por ahora, para depurar el error, devolver null podría ser confuso.
                    // Podríamos modificar JuegoEstadoResponse para llevar un mensaje de error.
                    // De momento, sigamos la lógica de devolver null si no es el turno,
                    // pero el frontend debería manejar este null o un status 400.
                    return null;
                }

                if (game.JuegoTerminado) return game; // No procesar si el juego ya terminó

                letra = char.ToUpper(letra);

                // *** CORRECCIÓN: Asegúrate de que las listas estén inicializadas si no lo están ya ***
                // Aunque lo ideal es que estén inicializadas en JuegoEstado.cs, esto es un "seguro"
                if (game.LetrasIngresadas == null) game.LetrasIngresadas = new List<char>();
                if (game.LetrasIncorrectas == null) game.LetrasIncorrectas = new List<char>();


                if (game.LetrasIngresadas.Contains(letra))
                {
                    // Ya se intentó esta letra. El frontend debería manejar esto.
                    // Podrías retornar el estado actual o null si quieres que el frontend lo trate como error.
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
                    game.PalabraSecreta = game.PalabraSecreta; // Revelar la palabra si se pierde
                }
                else if (game.GuionesActuales == game.PalabraSecreta)
                {
                    game.JuegoTerminado = true; // Si se adivina, se gana
                }

                game.LastActivityTime = DateTime.UtcNow; // Actualizar actividad al procesar letra

                // Cambiar el turno al otro jugador si el juego no ha terminado y es una partida online (2 jugadores)
                if (!game.JuegoTerminado && game.PlayerConnectionIds.Count == 2)
                {
                    // Asegura que el TurnoActualConnectionId no sea null antes de intentar cambiarlo
                    if (game.TurnoActualConnectionId != null)
                    {
                        game.TurnoActualConnectionId = game.PlayerConnectionIds.FirstOrDefault(id => id != game.TurnoActualConnectionId);
                    }
                    else
                    {
                        // Si por alguna razón el turno actual era null pero hay 2 jugadores, asigna al primero.
                        game.TurnoActualConnectionId = game.PlayerConnectionIds.FirstOrDefault();
                    }
                }
                else if (game.JuegoTerminado)
                {
                    game.TurnoActualConnectionId = null; // No hay turno si el juego terminó
                }

                return game;
            }
            return null; // Partida no encontrada
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


        // *** NUEVO MÉTODO: Encuentra y remueve un jugador por su ConnectionId de CUALQUIER partida ***
        public JuegoEstado? FindAndRemovePlayerFromGame(string disconnectedConnectionId)
        {
            JuegoEstado? affectedGame = null;

            // Recorre una copia de las partidas para evitar errores de enumeración si se modifican
            foreach (var entry in _activeGames)
            {
                var gameId = entry.Key;
                var game = entry.Value;

                if (game.PlayerConnectionIds.Contains(disconnectedConnectionId))
                {
                    // El jugador desconectado está en esta partida. Remuévelo.
                    bool removed = game.PlayerConnectionIds.Remove(disconnectedConnectionId);
                    if (removed)
                    {
                        Console.WriteLine($"Jugador {disconnectedConnectionId} removido de la partida {gameId}. Jugadores restantes: {game.PlayerConnectionIds.Count}");
                        game.LastActivityTime = DateTime.UtcNow;
                        affectedGame = game;

                        // Lógica para manejar el estado de la partida después de la desconexión
                        if (game.PlayerConnectionIds.Count == 0)
                        {
                            // Si no quedan jugadores, podemos eliminar la partida
                            Console.WriteLine($"Partida {gameId} quedó sin jugadores, eliminando...");
                            _activeGames.TryRemove(gameId, out _);
                            game.JuegoTerminado = true; // Marca como terminada para el retorno
                            game.Message = "La partida ha terminado debido a la desconexión de todos los jugadores.";
                        }
                        else if (game.PlayerConnectionIds.Count == 1)
                        {
                            // Si solo queda un jugador, la partida termina para el propósito del juego online de 2 jugadores
                            game.JuegoTerminado = true;
                            game.TurnoActualConnectionId = null; // Ya no hay turno
                            game.Message = "El otro jugador se ha desconectado. La partida ha terminado.";
                            Console.WriteLine($"Partida {gameId} ahora solo tiene un jugador. Marcada como terminada.");
                            // Opcional: Podrías eliminarla aquí también si no quieres que el jugador restante siga esperando
                            // _activeGames.TryRemove(gameId, out _);
                        }
                        // Si el jugador desconectado era el del turno, cederlo al otro si existe.
                        else if (game.TurnoActualConnectionId == disconnectedConnectionId && game.PlayerConnectionIds.Any())
                        {
                            game.TurnoActualConnectionId = game.PlayerConnectionIds.FirstOrDefault(); // Cede el turno al jugador restante
                        }

                        // Ya encontramos la partida y removimos al jugador, salimos.
                        break;
                    }
                }
            }
            return affectedGame; // Retorna la partida afectada si se encontró, o null
        }
    }
}
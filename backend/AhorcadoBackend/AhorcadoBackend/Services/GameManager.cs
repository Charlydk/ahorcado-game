using AhorcadoBackend.Models; // Asegúrate de que este namespace apunte a donde tienes tu clase JuegoEstado
using System;
using System.Collections.Concurrent; // Para ConcurrentDictionary

namespace AhorcadoBackend.Services // Asegúrate de que el namespace coincida con la estructura de tu proyecto
{
    public class GameManager
    {
        // ConcurrentDictionary es thread-safe y es ideal para almacenar múltiples estados de juego
        // donde varios jugadores pueden acceder simultáneamente (como en el modo online).
        private readonly ConcurrentDictionary<string, JuegoEstado> _activeGames;
        private readonly Random _random;

        public GameManager()
        {
            _activeGames = new ConcurrentDictionary<string, JuegoEstado>();
            _random = new Random();
        }

        // Crea una nueva partida y la añade al diccionario
        public JuegoEstado CreateNewGame(string palabraSecreta, string? gameId = null)
        {
            // Si no se proporciona un gameId (para modo solitario/versus), generamos uno.
            // Para partidas online, el ID lo generará el backend y lo devolverá.
            // Para las partidas de "sesión" (solitario/versus) el frontend nos mandará un ID único (ej. GUID)
            // O podemos generarlo aquí y devolverlo. Por simplicidad, si no viene gameId, lo generamos aquí.
            string newGameId = gameId ?? Guid.NewGuid().ToString(); // Usa el gameId proporcionado o genera uno nuevo

            var newGame = new JuegoEstado
            {
                GameId = newGameId, // Asegúrate de que JuegoEstado tenga una propiedad GameId
                PalabraSecreta = palabraSecreta.ToUpper(),
                GuionesActuales = new string('_', palabraSecreta.Length),
                LetrasIngresadas = new HashSet<char>(),
                LetrasIncorrectas = new HashSet<char>(),
                IntentosRestantes = 6, // 6 intentos base
                JuegoTerminado = false
            };

            _activeGames[newGameId] = newGame; // Añade o actualiza el juego en el diccionario
            return newGame;
        }

        // Obtiene el estado de una partida por su ID
        public JuegoEstado? GetGame(string gameId)
        {
            _activeGames.TryGetValue(gameId, out var game);
            return game;
        }

        // Actualiza el estado de una partida existente
        public void UpdateGame(string gameId, JuegoEstado updatedGame)
        {
            _activeGames[gameId] = updatedGame; // Sobreescribe el estado existente
        }

        // Elimina una partida (útil para reiniciar o al terminar)
        public void RemoveGame(string gameId)
        {
            _activeGames.TryRemove(gameId, out _); // Intenta remover del diccionario
        }

        // Puedes añadir métodos para obtener palabras aleatorias aquí si quieres centralizar esa lógica
        // public string GetRandomWord() { ... }
    }
}
using System;
using System.Collections.Generic;

namespace AhorcadoBackend.Models
{
    public class JuegoEstado
    {
        public string GameId { get; set; } = Guid.NewGuid().ToString();
        public string PalabraSecreta { get; set; } = string.Empty;
        public string GuionesActuales { get; set; } = string.Empty;
        public List<char> LetrasIngresadas { get; set; } = new List<char>();
        public List<char> LetrasIncorrectas { get; set; } = new List<char>();
        public int IntentosRestantes { get; set; }
        public bool JuegoTerminado { get; set; }
        // Nueva propiedad para rastrear los IDs de conexión de los jugadores
        public List<string> PlayerConnectionIds { get; set; } = new List<string>();
        public string? CreadorConnectionId { get; set; } // Opcional: Para saber quién creó la partida
        public string? TurnoActualConnectionId { get; set; } // Opcional: Para el turno, si lo implementas
        public DateTime LastActivityTime { get; set; } = DateTime.UtcNow; // Para la limpieza de partidas
        public string Message { get; set; } = string.Empty; // Mensaje para el cliente, por ejemplo, "Letra procesada", "Juego terminado", etc.
        public Dictionary<string, string> AliasJugadorPorConnectionId { get; set; } = new();// Para mapear ConnectionId a alias de jugador



    }
}

using System;
using System.Collections.Generic;

namespace AhorcadoBackend.Models
{
    public class JuegoEstado
    {
        public string GameId { get; set; } = Guid.NewGuid().ToString();
        public string PalabraSecreta { get; set; } = string.Empty;
        public string GuionesActuales { get; set; } = string.Empty;
        public HashSet<char> LetrasIngresadas { get; set; } = new HashSet<char>();
        public HashSet<char> LetrasIncorrectas { get; set; } = new HashSet<char>();
        public int IntentosRestantes { get; set; }
        public bool JuegoTerminado { get; set; }
        // Nueva propiedad para rastrear los IDs de conexión de los jugadores
        public List<string> PlayerConnectionIds { get; set; } = new List<string>();
        public string? CreadorConnectionId { get; set; } // Opcional: Para saber quién creó la partida
        public string? TurnoActualConnectionId { get; set; } // Opcional: Para el turno, si lo implementas


    }
}

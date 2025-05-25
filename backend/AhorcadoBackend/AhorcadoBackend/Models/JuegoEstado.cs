using System;
using System.Collections.Generic;

namespace AhorcadoBackend.Models
{
    public class JuegoEstado
    {
        public string GameId { get; set; } = Guid.NewGuid().ToString(); // ID único para cada partida
        public string PalabraSecreta { get; set; } = string.Empty;
        public string GuionesActuales { get; set; } = string.Empty; // La palabra con guiones y letras adivinadas
        public HashSet<char> LetrasIngresadas { get; set; } = new HashSet<char>(); // Todas las letras que el jugador ha intentado
        public HashSet<char> LetrasIncorrectas { get; set; } = new HashSet<char>(); // Solo las letras incorrectas
        public int IntentosRestantes { get; set; }
        public bool JuegoTerminado { get; set; }
        
    }
}

namespace AhorcadoBackend.Models
{
    public class Partida
    {
        public int Id { get; set; }
        public string? AliasJugador { get; set; }
        public bool FueVictoria { get; set; }
        public DateTime Fecha { get; set; }
        public string? PalabraSecreta { get; set; } // opcional para mostrar en historial
        public bool EsOnline { get; set; } // si la partida fue local u online
    }
}

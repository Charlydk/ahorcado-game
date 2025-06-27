namespace AhorcadoBackend.Models
{
    public class Partida
    {
        public int Id { get; set; }
        public string? AliasJugador { get; set; }
        public string? AliasJugador2 { get; set; }
        public bool FueVictoria { get; set; }
        public DateTime Fecha { get; set; }
        public string PalabraSecreta { get; set; } = string.Empty;
        public bool EsOnline { get; set; } // si la partida fue local u online
    }
}

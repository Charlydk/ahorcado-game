namespace AhorcadoBackend.Models
{
    public class JuegoEstadoResponse
    {
        public string GameId { get; set; } = string.Empty;
        public string Palabra { get; set; } = string.Empty;
        public int IntentosRestantes { get; set; }
        public string LetrasIncorrectas { get; set; } = string.Empty;
        public bool JuegoTerminado { get; set; }
        public string PalabraSecreta { get; set; } = string.Empty;
        public string? TurnoActualConnectionId { get; set; }
        public string Message { get; set; } = string.Empty;

    }
}

namespace AhorcadoBackend.Models
{
    public class JuegoEstadoResponse
    {
        public string Palabra { get; set; } = string.Empty; // La palabra actual con guiones
        public int IntentosRestantes { get; set; }
        public string LetrasIncorrectas { get; set; } = string.Empty; // Letras incorrectas como string (ej: "A, E, I")
        public bool JuegoTerminado { get; set; }
        public string PalabraSecreta { get; set; } = string.Empty; // La palabra real, solo se envía al final
    }
}

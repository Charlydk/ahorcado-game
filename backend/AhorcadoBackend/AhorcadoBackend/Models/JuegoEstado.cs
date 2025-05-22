namespace AhorcadoBackend.Models
{
    public class JuegoEstado
    {
        public string PalabraSecreta { get; set; }
        public string GuionesActuales { get; set; }
        public HashSet<char> LetrasIngresadas { get; set; } = new HashSet<char>();
        public int IntentosRestantes { get; set; } = 6;
    }
}

namespace AhorcadoBackend.Models
{
    public class ProcessLetterResult
    {
        public JuegoEstado? UpdatedGame { get; set; } // El estado actualizado del juego
        public string Message { get; set; } = string.Empty; // El mensaje específico del resultado de la adivinanza
        public bool WasLetterCorrect { get; set; } // Indica si la letra fue correcta
        public bool WasLetterIncorrect { get; set; } // Indica si la letra fue incorrecta
        public bool WasLetterAlreadyGuessed { get; set; } // Indica si la letra ya había sido adivinada
        public bool IsGameOver { get; set; } // Indica si el juego terminó con este intento
        public bool IsGameWon { get; set; } // Indica si el juego fue ganado
    }
}

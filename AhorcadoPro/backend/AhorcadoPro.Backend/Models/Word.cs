namespace AhorcadoPro.Backend.Models
{
    public class Word
    {
        public int Id { get; set; }
        public string Text { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Difficulty { get; set; } = "Media"; // Fácil, Media, Difícil
        public bool IsActive { get; set; } = true;
    }
}

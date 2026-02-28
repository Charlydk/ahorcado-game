using Microsoft.AspNetCore.Identity;

namespace AhorcadoPro.Backend.Models
{
    public class ApplicationUser : IdentityUser
    {
        public string? Alias { get; set; }
        public int TotalPoints { get; set; }
        public int Wins { get; set; }
        public int Losses { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}

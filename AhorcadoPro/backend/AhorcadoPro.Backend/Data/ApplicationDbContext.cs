using AhorcadoPro.Backend.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace AhorcadoPro.Backend.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Word> Words { get; set; }
        public DbSet<Score> Scores { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Any specific configuration
        }
    }

    public class Score
    {
        public int Id { get; set; }
        public string? UserId { get; set; }
        public string? GuestAlias { get; set; }
        public int Points { get; set; }
        public DateTime Date { get; set; } = DateTime.UtcNow;
        public GameMode Mode { get; set; }
    }
}

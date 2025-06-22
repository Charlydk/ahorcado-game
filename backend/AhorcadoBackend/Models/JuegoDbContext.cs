using Microsoft.EntityFrameworkCore;

namespace AhorcadoBackend.Models
{
    public class JuegoDbContext :DbContext
    {
        public JuegoDbContext(DbContextOptions<JuegoDbContext> options) : base(options) { }

        public DbSet<Partida> Partidas { get; set; }
    }
}

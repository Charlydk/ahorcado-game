using Microsoft.EntityFrameworkCore;

namespace AhorcadoBackend.Models
{
    public class JuegoDbContext :DbContext
    {
        public JuegoDbContext(DbContextOptions<JuegoDbContext> options) : base(options) { }

        public DbSet<Partida> Partidas { get; set; }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            base.OnConfiguring(optionsBuilder);

            var npgsqlExtension = optionsBuilder.Options.Extensions
                .FirstOrDefault(e => e.GetType().Name.Contains("Npgsql"));

            Console.WriteLine("🎯 DEBUG desde JuegoDbContext:");
            Console.WriteLine("    Extension: " + npgsqlExtension);

            if (npgsqlExtension is Microsoft.EntityFrameworkCore.Infrastructure.RelationalOptionsExtension ro)
            {
                Console.WriteLine("    Connection string detectada: " + ro.ConnectionString);
            }
        }

    }


}

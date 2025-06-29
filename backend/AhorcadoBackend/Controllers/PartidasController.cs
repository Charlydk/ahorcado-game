using AhorcadoBackend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AhorcadoBackend.Controllers
{
    [ApiController]
    [Route("api/partidas")]
    public class PartidasController : ControllerBase
    {
        private readonly IDbContextFactory<JuegoDbContext> _contextFactory;

        public PartidasController(IDbContextFactory<JuegoDbContext> contextFactory)
        {
            _contextFactory = contextFactory;
        }


        [HttpPost]
        public async Task<IActionResult> GuardarPartida([FromBody] Partida partida)
        {
            partida.Fecha = DateTime.UtcNow;
            using var context = await _contextFactory.CreateDbContextAsync();
            context.Partidas.Add(partida);
            await context.SaveChangesAsync();
            return Ok(new { message = "Partida guardada" });
        }

        [HttpGet("historial/{alias}")]
        public async Task<IActionResult> ObtenerHistorial(string alias)
        {
            using var context = await _contextFactory.CreateDbContextAsync();
            var partidas = await context.Partidas
                .Where(p => p.AliasJugador == alias)
                .OrderByDescending(p => p.Fecha)
                .ToListAsync();

            return Ok(partidas);
        }

        [HttpGet("testconexion")]
        public async Task<IActionResult> TestConexion()
        {
            try
            {
                using var conn = new Npgsql.NpgsqlConnection(
                    "Host=db.cifhzukobpkvlqsyqrka.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=postgres;SSL Mode=Require;Trust Server Certificate=true");

                await conn.OpenAsync();
                return Ok("✅ Conexión directa exitosa con Supabase.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"❌ Error de conexión directa: {ex.Message}");
            }
        }


    }
}

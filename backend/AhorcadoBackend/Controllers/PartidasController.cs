using AhorcadoBackend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AhorcadoBackend.Controllers
{
    [ApiController]
    [Route("api/partidas")]
    public class PartidasController : ControllerBase
    {
        private readonly JuegoDbContext _context;

        public PartidasController(JuegoDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> GuardarPartida([FromBody] Partida partida)
        {
            partida.Fecha = DateTime.UtcNow;
            _context.Partidas.Add(partida);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Partida guardada" });
        }

        [HttpGet("historial/{alias}")]
        public async Task<IActionResult> ObtenerHistorial(string alias)
        {
            var partidas = await _context.Partidas
                .Where(p => p.AliasJugador == alias)
                .OrderByDescending(p => p.Fecha)
                .ToListAsync();

            return Ok(partidas);
        }
    }
}

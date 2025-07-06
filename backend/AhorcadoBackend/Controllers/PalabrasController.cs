using AhorcadoBackend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AhorcadoBackend.Controllers;

[ApiController]
[Route("api/palabras")]
public class PalabrasController : ControllerBase
{
    private readonly IDbContextFactory<JuegoDbContext> _contextFactory;

    public PalabrasController(IDbContextFactory<JuegoDbContext> contextFactory)
    {
        _contextFactory = contextFactory;
    }

    [HttpGet("todas")]
    public async Task<IActionResult> GetAllIncludingInactivas()
    {
        using var context = await _contextFactory.CreateDbContextAsync();
        var palabras = await context.Palabras.ToListAsync(); // sin filtro
        return Ok(palabras);
    }

    [HttpPost("agregar")]
    public async Task<IActionResult> Agregar([FromBody] Palabra nuevaPalabra)
    {
        using var context = await _contextFactory.CreateDbContextAsync();
        context.Palabras.Add(nuevaPalabra);
        await context.SaveChangesAsync();
        return Ok(new { message = "Palabra agregada correctamente." });
    }

    [HttpPut("editar/{id}")]
    public async Task<IActionResult> Editar(int id, [FromBody] Palabra actualizada)
    {
        using var context = await _contextFactory.CreateDbContextAsync();
        var palabra = await context.Palabras.FindAsync(id);
        if (palabra == null) return NotFound();

        palabra.TextoPalabra = actualizada.TextoPalabra;
        palabra.Categoria = actualizada.Categoria;
        palabra.Dificultad = actualizada.Dificultad;
        palabra.Activa = actualizada.Activa;

        await context.SaveChangesAsync();
        return Ok(new { message = "Palabra actualizada correctamente." });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Desactivar(int id)
    {
        using var context = await _contextFactory.CreateDbContextAsync();
        var palabra = await context.Palabras.FindAsync(id);
        if (palabra == null) return NotFound();

        palabra.Activa = false;
        await context.SaveChangesAsync();
        return Ok(new { message = "Palabra desactivada." });
    }
}

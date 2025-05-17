using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;

[ApiController]
[Route("api/juego")]
public class JuegoController : ControllerBase
{
    private static string palabraActual; // Variable para guardar la palabra

    private static List<string> palabras = new List<string>
    { "CASA", "PAYASO", "CAMARA", "HOMERO", "PLATO", "TECLADO", "TRISTEZA", "MONITOR" };

    [HttpGet("palabra")]
    public ActionResult<string> ObtenerPalabra()
    {
        if (string.IsNullOrEmpty(palabraActual)) // Si no hay palabra, genera una nueva
        {
            Random rnd = new Random();
            int index = rnd.Next(palabras.Count);
            palabraActual = palabras[index];
        }
        return Ok(palabraActual); // Devuelve la misma palabra durante toda la partida
    }

    [HttpPost("reiniciar")]
    public ActionResult ReiniciarJuego()
    {
        palabraActual = null; // Reseteamos la palabra
        return Ok("Juego reiniciado, nueva palabra en la próxima solicitud.");
    }
}

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

    [HttpPost("verificar-letra")]
    public ActionResult VerificarLetra([FromBody] LetraEntrada entrada)
    {
        if (string.IsNullOrEmpty(entrada.Letra))
            return BadRequest("Debes ingresar una letra válida.");

        if (string.IsNullOrEmpty(palabraActual))
            return BadRequest("No hay palabra activa. Inicia el juego primero.");

        char letra = char.ToUpper(entrada.Letra[0]); // Convertimos la letra a mayúscula
        bool contieneLetra = palabraActual.Contains(letra);

        return Ok(new { existe = contieneLetra });
    }

    public class LetraEntrada
    {
        public string Letra { get; set; }
    }
}

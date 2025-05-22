using AhorcadoBackend.Extensions;
using AhorcadoBackend.Models;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq; // Necesario para .ToHashSet()

[ApiController]
[Route("api/juego")]
public class JuegoController : ControllerBase
{
    // Claves para almacenar los datos del juego en la sesión
    private const string JuegoEstadoKey = "JuegoAhorcadoEstado";

    // NO NECESITAMOS MÁS ESTAS VARIABLES STATIC
    // private static string palabraActual = "";
    // private static string guiones = "";
    // private static HashSet<char> letrasIngresadas = new HashSet<char>();
    // private static int intentosRestantes = 6;

    private static List<string> palabras = new List<string>
    { "CASA", "PAYASO", "CAMARA", "HOMERO", "PLATO", "TECLADO", "TRISTEZA", "MONITOR" };

    private static string GenerarPalabraAleatoria()
    {
        Random random = new Random();
        return palabras[random.Next(palabras.Count)];
    }

    #region iniciar juego

    [HttpPost("iniciar")]
    public ActionResult IniciarJuego([FromBody] PalabraEntrada entrada)
    {
        string palabraElegida;
        if (entrada.Modo == "solitario")
        {
            palabraElegida = GenerarPalabraAleatoria();
        }
        else if (entrada.Modo == "versus")
        {
            if (entrada.Palabra == null || entrada.Palabra.Length < 4 || entrada.Palabra.Length > 8)
            {
                return BadRequest("Para el modo 'versus', la palabra debe tener entre 4 y 8 caracteres.");
            }
            palabraElegida = entrada.Palabra.ToUpper();
        }
        else
        {
            return BadRequest("Modo de juego no válido. Use 'solitario' o 'versus'.");
        }

        // Creamos un nuevo estado de juego
        var nuevoEstado = new JuegoEstado
        {
            PalabraSecreta = palabraElegida,
            GuionesActuales = new string('_', palabraElegida.Length),
            LetrasIngresadas = new HashSet<char>(),
            IntentosRestantes = 6
        };

        // Guardamos el estado completo del juego en la sesión
        HttpContext.Session.SetObjectAsJson(JuegoEstadoKey, nuevoEstado);

        return Ok(new { palabra = nuevoEstado.GuionesActuales, modo = entrada.Modo });
    }
    #endregion

    #region verificar letra
    [HttpPost("verificar-letra")]
    public ActionResult VerificarLetra([FromBody] LetraEntrada entrada)
    {
        try
        {
            if (string.IsNullOrEmpty(entrada.Letra))
                return BadRequest("Debes ingresar una letra válida.");

            // Recuperamos el estado del juego de la sesión
            var estadoActual = HttpContext.Session.GetObjectFromJson<JuegoEstado>(JuegoEstadoKey);

            if (estadoActual == null)
                return BadRequest("No hay partida activa. Inicia el juego primero.");

            char letra = char.ToUpper(entrada.Letra[0]);

            // Verificamos si la letra ya fue ingresada en esta partida
            if (estadoActual.LetrasIngresadas.Contains(letra))
            {
                return Ok(new { mensaje = "Letra ya ingresada", esCorrecta = false, palabraActualizada = estadoActual.GuionesActuales, estadoJuego = "jugando", letrasErradas = estadoActual.LetrasIngresadas.Where(l => !estadoActual.PalabraSecreta.Contains(l)).ToList() });
            }

            estadoActual.LetrasIngresadas.Add(letra); // Guardamos la letra ingresada

            bool esCorrecta = estadoActual.PalabraSecreta.Contains(letra);

            if (esCorrecta)
            {
                char[] guionesArray = estadoActual.GuionesActuales.ToCharArray();
                for (int i = 0; i < estadoActual.PalabraSecreta.Length; i++)
                {
                    if (estadoActual.PalabraSecreta[i] == letra)
                    {
                        guionesArray[i] = letra;
                    }
                }
                estadoActual.GuionesActuales = new string(guionesArray);
            }
            else
            {
                estadoActual.IntentosRestantes--; // Reducimos intentos si la letra es incorrecta
            }

            // Evaluamos el estado del juego
            string estadoJuego = "jugando";
            string palabraFinal = "";

            if (!estadoActual.GuionesActuales.Contains('_'))
            {
                estadoJuego = "ganaste";
                palabraFinal = estadoActual.PalabraSecreta;
            }
            else if (estadoActual.IntentosRestantes <= 0)
            {
                estadoJuego = "perdiste";
                palabraFinal = estadoActual.PalabraSecreta;
            }

            // Guardamos el estado actualizado del juego en la sesión
            HttpContext.Session.SetObjectAsJson(JuegoEstadoKey, estadoActual);

            // Filtramos solo las letras erradas para enviarlas al frontend
            var letrasErradasActualizadas = estadoActual.LetrasIngresadas
                                                       .Where(l => !estadoActual.PalabraSecreta.Contains(l))
                                                       .ToList();

            Console.WriteLine($"Letra: {letra}, esCorrecta: {esCorrecta}, palabraActualizada: {estadoActual.GuionesActuales}, estadoJuego: {estadoJuego}, palabraFinal: {palabraFinal}, intentosRestantes: {estadoActual.IntentosRestantes}");

            return Ok(new
            {
                esCorrecta,
                palabraActualizada = estadoActual.GuionesActuales,
                estadoJuego,
                palabraSecreta = palabraFinal, // Solo se envía si el juego terminó
                letrasErradas = letrasErradasActualizadas, // Enviamos las letras erradas para actualizar la UI
                intentosRestantes = estadoActual.IntentosRestantes // Enviamos intentos restantes
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error en VerificarLetra: {ex.Message}");
            // Considera no devolver el stack trace en producción
            return StatusCode(500, $"Error interno: {ex.Message}. StackTrace: {ex.StackTrace}");
        }
    }
    #endregion

    #region reiniciar palabra
    [HttpPost("reiniciar")]
    public ActionResult ReiniciarJuego()
    {
        // Eliminamos el estado del juego de la sesión para reiniciar
        HttpContext.Session.Remove(JuegoEstadoKey);
        return Ok("Juego reiniciado. Puedes iniciar uno nuevo.");
    }
    #endregion

    #region Clases de ayuda
    public class PalabraEntrada
    {
        public string? Palabra { get; set; } // Hacemos la propiedad nullable
        public string? Modo { get; set; }    // Hacemos la propiedad nullable
    }

    public class LetraEntrada
    {
        public string Letra { get; set; } = string.Empty; // Inicializamos con string.Empty
    }
    #endregion
}
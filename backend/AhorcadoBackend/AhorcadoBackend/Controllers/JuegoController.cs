using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;

[ApiController]
[Route("api/juego")]
public class JuegoController : ControllerBase
{
    #region Variables + lista de palabras + Metodo GenerarPalabraAleatoria
    
    private static string palabraActual = "";
    private static string guiones = "";
    private static HashSet<char> letrasIngresadas = new HashSet<char>(); // 🔹 Evitar letras duplicadas
    private static int intentosRestantes = 6; // 🔹 Control de intentos

    private static List<string> palabras = new List<string>
    { "CASA", "PAYASO", "CAMARA", "HOMERO", "PLATO", "TECLADO", "TRISTEZA", "MONITOR" };
    
    private static string GenerarPalabraAleatoria()
    {
        Random random = new Random();
        return palabras[random.Next(palabras.Count)];
    }
    #endregion

    #region iniciar juego
    // 🔹 Método para iniciar el juego
     
    [HttpPost("iniciar")]
    public ActionResult IniciarJuego([FromBody] PalabraEntrada entrada)
    {
        if (entrada.Modo == "versus" && (entrada.Palabra.Length < 4 || entrada.Palabra.Length > 8))
            return BadRequest("La palabra debe tener entre 4 y 8 caracteres.");

        palabraActual = entrada.Modo == "solitario" ? GenerarPalabraAleatoria() : entrada.Palabra.ToUpper();
        guiones = new string('_', palabraActual.Length);
        letrasIngresadas.Clear(); // 🔹 Reiniciamos letras ingresadas
        intentosRestantes = 6; // 🔹 Reiniciamos intentos

        return Ok(new { palabra = guiones, modo = entrada.Modo });
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

            if (string.IsNullOrEmpty(palabraActual))
                return BadRequest("No hay palabra activa. Inicia el juego primero.");

            char letra = char.ToUpper(entrada.Letra[0]);

            if (letrasIngresadas.Contains(letra)) // 🔹 Evitar procesar letras repetidas
            {
                return Ok(new { mensaje = "Letra ya ingresada", esCorrecta = false, palabraActualizada = guiones, estadoJuego = "jugando" });
            }

            letrasIngresadas.Add(letra); // 🔹 Guardamos la letra ingresada
            bool esCorrecta = palabraActual.Contains(letra);

            if (esCorrecta)
            {
                char[] guionesArray = guiones.ToCharArray();
                for (int i = 0; i < palabraActual.Length; i++)
                {
                    if (palabraActual[i] == letra)
                    {
                        guionesArray[i] = letra;
                    }
                }
                guiones = new string(guionesArray);
            }
            else
            {
                intentosRestantes--; // 🔹 Reducimos intentos si la letra es incorrecta
            }
            // 🔹 Evaluamos el estado del juego
            string estadoJuego = "jugando";
            string palabraFinal = ""; // Inicializamos una variable para la palabra final
            if (!guiones.Contains('_'))
            {
                estadoJuego = "ganaste";
                palabraFinal = palabraActual; // La palabra final es la palabra actual si se gana
            }
            else if (intentosRestantes <= 0)
            {
                estadoJuego = "perdiste";
                palabraFinal = palabraActual; // La palabra final es la palabra actual si se pierde
            }

            Console.WriteLine($"Letra: {letra}, esCorrecta: {esCorrecta}, palabraActualizada: {guiones}, estadoJuego: {estadoJuego}, palabraFinal: {palabraFinal}");

            return Ok(new { esCorrecta, palabraActualizada = guiones, estadoJuego, palabraSecreta = palabraFinal }); // Usamos palabraFinal
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error en VerificarLetra: {ex.Message}");
            return StatusCode(500, $"Error interno: {ex.Message}");
        }
    }
    #endregion

    #region reiniciar palabra
    [HttpPost("reiniciar")]
    public ActionResult ReiniciarJuego()
    {
        palabraActual = "";
        guiones = "";
        letrasIngresadas.Clear();
        intentosRestantes = 6;
        return Ok("Juego reiniciado, nueva palabra en la próxima solicitud.");
    }
    #endregion

    #region Métodos de ayuda
    public class PalabraEntrada
    {
        public string Palabra { get; set; }
        public string Modo { get; set; }
    }

    public class LetraEntrada
    {
        public string Letra { get; set; }
    }
    #endregion
}
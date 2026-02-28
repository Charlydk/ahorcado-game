namespace AhorcadoPro.Backend.Services
{
    using System.Text;
    using System.Text.Json;
    using System.Text.Json.Serialization;

    public interface IGeminiService
    {
        Task<string> GetHintAsync(string word, string category);
        Task<string> GetDefinitionAsync(string word);
        Task<AiWordResult?> GenerateWordAsync(string? theme = null);
    }

    public class AiWordResult
    {
        public string Word { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Hint { get; set; } = string.Empty;
    }

    public class GeminiService : IGeminiService
    {
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;
        private readonly ILogger<GeminiService> _logger;

        public GeminiService(IConfiguration configuration, HttpClient httpClient, ILogger<GeminiService> logger)
        {
            _configuration = configuration;
            _httpClient = httpClient;
            _logger = logger;
        }

        public async Task<string> GetHintAsync(string word, string category)
        {
            var prompt = $"Eres un asistente de un juego de ahorcado. La palabra es '{word}' y la categoría es '{category}'. Dame una pista breve y críptica en español que ayude al jugador sin ser demasiado obvia. Solo responde con el texto de la pista.";
            return await CallGeminiAsync(prompt) ?? "No hay pistas disponibles.";
        }

        public async Task<string> GetDefinitionAsync(string word)
        {
            var prompt = $"Dame la definición corta de la palabra '{word}' en español, como si fuera un diccionario. Solo responde con la definición.";
            return await CallGeminiAsync(prompt) ?? "Definición no disponible.";
        }

        public async Task<AiWordResult?> GenerateWordAsync(string? theme = null)
        {
            var prompt = "Genera una palabra para el juego del ahorcado. " +
                         (string.IsNullOrEmpty(theme) ? "Usa un tema aleatorio interesante." : $"El tema debe ser '{theme}'.") +
                         " Responde estrictamente en formato JSON con los campos: word (en mayúsculas, sin acentos si es posible), category, hint (pista en español).";

            var jsonResponse = await CallGeminiAsync(prompt);
            if (string.IsNullOrEmpty(jsonResponse)) return null;

            try
            {
                // Gemini sometimes wraps JSON in markdown blocks
                var cleanJson = jsonResponse.Trim();
                if (cleanJson.StartsWith("```json")) cleanJson = cleanJson.Substring(7);
                if (cleanJson.EndsWith("```")) cleanJson = cleanJson.Substring(0, cleanJson.Length - 3);

                return JsonSerializer.Deserialize<AiWordResult>(cleanJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to parse Gemini JSON response: {Response}", jsonResponse);
                return null;
            }
        }

        private async Task<string?> CallGeminiAsync(string prompt)
        {
            var apiKey = _configuration["Gemini:ApiKey"];
            if (string.IsNullOrEmpty(apiKey))
            {
                _logger.LogWarning("Gemini API Key is missing.");
                return null;
            }

            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={apiKey}";

            var requestBody = new
            {
                contents = new[]
                {
                    new { parts = new[] { new { text = prompt } } }
                }
            };

            try
            {
                var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync(url, content);

                if (!response.IsSuccessStatusCode)
                {
                    var error = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Gemini API error: {StatusCode} - {Error}", response.StatusCode, error);
                    return null;
                }

                var responseJson = await response.Content.ReadAsStringAsync();
                var geminiResponse = JsonSerializer.Deserialize<GeminiResponse>(responseJson);

                return geminiResponse?.Candidates?[0].Content?.Parts?[0].Text?.Trim();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calling Gemini API");
                return null;
            }
        }

        private class GeminiResponse
        {
            [JsonPropertyName("candidates")]
            public GeminiCandidate[]? Candidates { get; set; }
        }

        private class GeminiCandidate
        {
            [JsonPropertyName("content")]
            public GeminiContent? Content { get; set; }
        }

        private class GeminiContent
        {
            [JsonPropertyName("parts")]
            public GeminiPart[]? Parts { get; set; }
        }

        private class GeminiPart
        {
            [JsonPropertyName("text")]
            public string? Text { get; set; }
        }
    }
}

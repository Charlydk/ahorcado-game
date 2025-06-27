namespace AhorcadoBackend.Requests
{
    public class UnirseGameOnlineRequest
    {
        public string GameId { get; set; } = string.Empty;
        public string PlayerConnectionId { get; set; } = string.Empty;
        public string Alias { get; set; } = "Anónimo";
    }
}
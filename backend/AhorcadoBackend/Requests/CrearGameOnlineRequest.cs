namespace AhorcadoBackend.Requests
{
    public class CrearGameOnlineRequest
    {
        public string CreatorConnectionId { get; set; } = string.Empty;
        public string Alias { get; set; } = "Anónimo";
    }
}

namespace AhorcadoBackend.Models
{
    public class MonitorEstado
    {
        public int CantidadPartidas { get; set; }
        public List<string> GameIds { get; set; } = new();
        public string InstanciaId { get; set; } = string.Empty;
        public List<string> Logs { get; set; } = new();
    }

}

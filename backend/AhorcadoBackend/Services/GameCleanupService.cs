using Microsoft.Extensions.Hosting; // Necesario para IHostedService / BackgroundService
using Microsoft.Extensions.Logging; // Opcional, pero buena práctica para logs
using Microsoft.Extensions.DependencyInjection; // Necesario para IServiceScopeFactory
using System;
using System.Threading;
using System.Threading.Tasks;

namespace AhorcadoBackend.Services
{
    // GameCleanupService heredará de BackgroundService para ejecutarse en segundo plano.
    public class GameCleanupService : BackgroundService
    {
        private readonly ILogger<GameCleanupService> _logger;
        private readonly IServiceScopeFactory _scopeFactory; // Para obtener GameManager de forma segura

        // Intervalo de tiempo para ejecutar la limpieza (ej. cada 5 minutos)
        private static readonly TimeSpan CleanupInterval = TimeSpan.FromMinutes(5);
        // Tiempo después del cual una partida se considera inactiva si no tiene jugadores o uno solo
        private static readonly TimeSpan InactivityThreshold = TimeSpan.FromMinutes(10);
        // Tiempo después del cual una partida TERMINADA se elimina, incluso si hubo actividad reciente
        private static readonly TimeSpan CompletedGameRetention = TimeSpan.FromMinutes(5);

        public GameCleanupService(ILogger<GameCleanupService> logger, IServiceScopeFactory scopeFactory)
        {
            _logger = logger;
            _scopeFactory = scopeFactory;
        }

        // Este método se ejecuta cuando el servicio se inicia.
        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Game Cleanup Service iniciado.");

            // El bucle continuará ejecutándose hasta que la aplicación se detenga
            while (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogInformation("Game Cleanup Service: Realizando limpieza de partidas...");

                // Creamos un nuevo ámbito de servicio para obtener el GameManager.
                // Esto es importante porque GameManager es un Singleton, pero los servicios de limpieza
                // pueden tener un ciclo de vida diferente o necesitar obtener dependencias
                // como si fueran una nueva petición.
                using (var scope = _scopeFactory.CreateScope())
                {
                    var gameManager = scope.ServiceProvider.GetRequiredService<GameManager>();
                    gameManager.CleanInactiveGames(InactivityThreshold, CompletedGameRetention);
                }

                _logger.LogInformation($"Game Cleanup Service: Próxima limpieza en {CleanupInterval.TotalMinutes} minutos.");
                await Task.Delay(CleanupInterval, stoppingToken);
            }

            _logger.LogInformation("Game Cleanup Service detenido.");
        }

        public override async Task StopAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Game Cleanup Service está deteniéndose.");
            await base.StopAsync(stoppingToken);
        }
    }
}
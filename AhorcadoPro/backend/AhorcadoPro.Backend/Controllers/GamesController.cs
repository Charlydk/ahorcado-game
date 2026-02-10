using AhorcadoPro.Backend.Models;
using AhorcadoPro.Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace AhorcadoPro.Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GamesController : ControllerBase
    {
        private readonly GameManager _gameManager;

        public GamesController(GameManager gameManager)
        {
            _gameManager = gameManager;
        }

        [HttpPost("create")]
        public async Task<IActionResult> CreateGame([FromBody] CreateGameRequest request)
        {
            var game = await _gameManager.CreateGame(request.Mode, request.Alias, request.MaxAttempts, request.Theme);
            return Ok(game);
        }
    }

    public class CreateGameRequest
    {
        public GameMode Mode { get; set; }
        public string? Alias { get; set; }
        public int MaxAttempts { get; set; } = 6;
        public string? Theme { get; set; }
    }
}

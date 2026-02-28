using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AhorcadoPro.Backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace AhorcadoPro.Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthController> _logger;

        public AuthController(UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            IConfiguration configuration,
            ILogger<AuthController> logger)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _configuration = configuration;
            _logger = logger;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto model)
        {
            var user = new ApplicationUser { UserName = model.Email, Email = model.Email, Alias = model.Alias };
            var result = await _userManager.CreateAsync(user, model.Password);

            if (result.Succeeded)
            {
                return Ok(new { Message = "User registered successfully" });
            }

            return BadRequest(result.Errors);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto model)
        {
            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user != null && await _userManager.CheckPasswordAsync(user, model.Password))
            {
                var token = GenerateJwtToken(user);
                return Ok(new { Token = token, Alias = user.Alias, Email = user.Email });
            }

            return Unauthorized();
        }

        [HttpPost("guest")]
        public IActionResult GuestLogin([FromBody] GuestLoginDto model)
        {
            if (string.IsNullOrWhiteSpace(model.Alias)) return BadRequest("Alias is required");

            var token = GenerateJwtToken(null, model.Alias);
            return Ok(new { Token = token, Alias = model.Alias, IsGuest = true });
        }

        [HttpPost("google")]
        public async Task<IActionResult> GoogleLogin([FromBody] string googleToken)
        {
            // Placeholder for Google Auth verification logic
            // In a real app, use GoogleJsonWebSignature.ValidateAsync(googleToken)
            _logger.LogWarning("Google Login called with token: {Token}", googleToken);
            return StatusCode(501, "Google Authentication not fully implemented yet.");
        }

        private string GenerateJwtToken(ApplicationUser? user, string? guestAlias = null)
        {
            var jwtSettings = _configuration.GetSection("Jwt");
            var secretKey = jwtSettings["Key"];

            if (string.IsNullOrEmpty(secretKey))
            {
                throw new InvalidOperationException("JWT Key is not configured.");
            }

            var key = Encoding.ASCII.GetBytes(secretKey);

            var claims = new List<Claim>();
            if (user != null)
            {
                claims.Add(new Claim(ClaimTypes.NameIdentifier, user.Id));
                claims.Add(new Claim(ClaimTypes.Email, user.Email ?? ""));
                claims.Add(new Claim("alias", user.Alias ?? ""));
                claims.Add(new Claim("isGuest", "false"));
            }
            else
            {
                claims.Add(new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()));
                claims.Add(new Claim("alias", guestAlias ?? "Guest"));
                claims.Add(new Claim("isGuest", "true"));
            }

            var tokenHandler = new JwtSecurityTokenHandler();
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddDays(7),
                Issuer = jwtSettings["Issuer"],
                Audience = jwtSettings["Audience"],
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }

    public class RegisterDto {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Alias { get; set; } = string.Empty;
    }

    public class LoginDto {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class GuestLoginDto {
        public string Alias { get; set; } = string.Empty;
    }
}

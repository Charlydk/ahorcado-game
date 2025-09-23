using AhorcadoBackend.Hubs;
using AhorcadoBackend.Models;
using AhorcadoBackend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.OpenApi.Models;



Console.WriteLine("DEBUG: Iniciando la aplicación ASP.NET Core...");

var builder = WebApplication.CreateBuilder(args);

Console.WriteLine("DEBUG: Builder creado. Configurando servicios...");


// Configura Kestrel para escuchar en el puerto proporcionado por Cloud Run ($PORT)
builder.WebHost.UseUrls($"http://*:{Environment.GetEnvironmentVariable("PORT") ?? "8080"}");
// ------------------------------------------

Console.WriteLine("DEBUG: Builder creado. Configurando servicios...");


// =========================================================
// TODAS las llamadas a builder.Services.Add... DEBEN IR AQU�
// =========================================================

builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddSignalR(hubOptions =>
{
    // Envía un ping cada 10 segundos para mantener la conexión viva
    hubOptions.KeepAliveInterval = TimeSpan.FromSeconds(10);
    // Opcional: Aumentar el tiempo de espera para el handshake inicial (si hay problemas al conectar)
    hubOptions.HandshakeTimeout = TimeSpan.FromSeconds(30); // El valor por defecto es 15 segundos
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSingleton<GameManager>();
//builder.Services.AddHostedService<GameCleanupService>(); // lo comento para que pueda dormir el servicio de render
builder.Services.AddDistributedMemoryCache();


// Configuraci�n de Sesiones
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

//servicio con sqllite para pruebas con archivo local
//builder.Services.AddDbContextFactory<JuegoDbContext>(options =>
//    options.UseSqlite("Data Source=partidas.db"));

Console.WriteLine("🔗 Cadena activa: " + builder.Configuration.GetConnectionString("Default"));


builder.Services.AddDbContextFactory<JuegoDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

var connectionString = builder.Configuration.GetConnectionString("Default");
Console.WriteLine("🔗 Cadena de conexión activa: " + connectionString);




// Configuraci�n de CORS (si es necesaria para tu frontend)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSpecificOrigin", // Este es el nombre de tu política CORS existente
        policy => policy.WithOrigins(
            "http://127.0.0.1:5500",
            "http://localhost:5500",
            "https://localhost:7055",
            "https://charlydk.github.io",     // Sin barra final
            "https://charlydk.github.io/",    // Con barra final
            "https://charlydk.github.io/ahorcado-game", // El repo base sin subfolder
            "https://charlydk.github.io/ahorcado-game/",//
            "https://charlydk.github.io/ahorcado-game/frontend/"
        )
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials()); // Esencial para sesiones con CORS
});

// asignamos puerto para produccion de db supabase
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";

builder.WebHost.ConfigureKestrel(serverOptions =>
{
    serverOptions.ListenAnyIP(Int32.Parse(port));
});



// =========================================================
// AQU� se construye la aplicaci�n. NADA de builder.Services.Add... debe ir despu�s de esta l�nea.
// =========================================================
var app = builder.Build();

Console.WriteLine("DEBUG: App construida. Configurando pipeline de solicitudes...");

// =========================================================
// TODAS las llamadas a app.Use... y app.Map... DEBEN IR AQU�
// =========================================================

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

//app.UseHttpsRedirection(); --> Descomentar si se quiere forzar HTTPS

// Habilitar el middleware de sesiones (debe ir antes de UseRouting/MapControllers)
app.UseSession();

// --- �IMPORTANTE! app.UseRouting() DEBE IR AQU� ---
app.UseRouting(); // Habilita el enrutamiento para controladores y SignalR

// Usar la pol�tica CORS definida. Aseg�rate de usar el mismo nombre aqu�.
app.UseCors("AllowSpecificOrigin");


app.UseAuthorization(); // Se aplica a las rutas despu�s de este punto

app.MapGet("/api/status", () => "�AhorcadoBackend est� vivo en Render!");

Console.WriteLine("DEBUG: Configuración de middlewares completa. Mapeando endpoints...");


// --- Configuraci�n de SignalR ---
app.MapHub<GameHub>("/gamehub");
// --- Fin Configuraci�n de SignalR ---



app.MapControllers(); // Mapea tus controladores API

Console.WriteLine("DEBUG: Antes de app.Run()...");



app.Run();

Console.WriteLine("DEBUG: Aplicación finalizada."); // Esto rara vez se ve en un servidor

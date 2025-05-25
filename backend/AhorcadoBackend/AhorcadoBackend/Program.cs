using AhorcadoBackend.Hubs;
using AhorcadoBackend.Services;

var builder = WebApplication.CreateBuilder(args);

// =========================================================
// TODAS las llamadas a builder.Services.Add... DEBEN IR AQU�
// =========================================================

builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR();
builder.Services.AddSingleton<GameManager>();

// A�adir el servicio de cach� en memoria (para que las sesiones funcionen)
builder.Services.AddDistributedMemoryCache();

// Configuraci�n de Sesiones
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

// Configuraci�n de CORS (si es necesaria para tu frontend)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSpecificOrigin", // Nombre de tu pol�tica CORS
        policy => policy.WithOrigins("http://127.0.0.1:5500", "http://localhost:5500", "https://localhost:7055") // Tus or�genes de frontend
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .AllowCredentials()); // Esencial para sesiones con CORS
});


// =========================================================
// AQU� se construye la aplicaci�n. NADA de builder.Services.Add... debe ir despu�s de esta l�nea.
// =========================================================
var app = builder.Build();

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

// --- Configuraci�n de SignalR ---
app.MapHub<GameHub>("/gamehub");
// --- Fin Configuraci�n de SignalR ---

app.MapControllers(); // Mapea tus controladores API


app.Run();
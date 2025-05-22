var builder = WebApplication.CreateBuilder(args);

// =========================================================
// TODAS las llamadas a builder.Services.Add... DEBEN IR AQUÍ
// =========================================================

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Añadir el servicio de caché en memoria (para que las sesiones funcionen)
builder.Services.AddDistributedMemoryCache();

// Configuración de Sesiones
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

// Configuración de CORS (si es necesaria para tu frontend)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSpecificOrigin", // Nombre de tu política CORS
        policy => policy.WithOrigins("http://127.0.0.1:5500", "http://localhost:5500", "https://localhost:7055") // Tus orígenes de frontend
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .AllowCredentials()); // Esencial para sesiones con CORS
});


// =========================================================
// AQUÍ se construye la aplicación. NADA de builder.Services.Add... debe ir después de esta línea.
// =========================================================
var app = builder.Build();

// =========================================================
// TODAS las llamadas a app.Use... y app.Map... DEBEN IR AQUÍ
// =========================================================

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Habilitar el middleware de sesiones (debe ir antes de UseRouting/MapControllers)
app.UseSession();

app.UseAuthorization();

// Usar la política CORS definida. Asegúrate de usar el mismo nombre aquí.
app.UseCors("AllowSpecificOrigin"); // <-- Asegúrate de que este nombre coincida con el que definiste

app.MapControllers();

app.Run();
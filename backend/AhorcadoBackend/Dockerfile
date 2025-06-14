# Usar una imagen base de .NET SDK para construir la aplicación
# Reemplaza '8.0' con la versión de .NET que uses (e.g., 6.0, 7.0, 8.0)
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src/app # Establece un directorio de trabajo dentro del contenedor Docker

# Copiar el archivo de proyecto y restaurar las dependencias
# Las rutas son AHORA relativas al 'Root Directory' de Render (backend/AhorcadoBackend)
# Así que 'AhorcadoBackend.csproj' está directamente en el contexto
COPY ["AhorcadoBackend.csproj", "./"]
RUN dotnet restore "AhorcadoBackend.csproj"

# Copiar el resto de los archivos del proyecto (incluyendo tu código fuente)
# El '.' aquí se refiere a todo lo que está en 'backend/AhorcadoBackend'
COPY . .

# Publicar la aplicación para producción
# El resultado de esta publicación estará en /app/publish
RUN dotnet publish "AhorcadoBackend.csproj" -c Release -o /app/publish

# Usar una imagen base de .NET Runtime para ejecutar la aplicación (más pequeña y segura)
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app # Establece el directorio de trabajo para la imagen final

# Copiar los archivos publicados de la etapa 'build' a la imagen final
COPY --from=build /app/publish .

# Exponer el puerto por defecto de ASP.NET Core (Render lo manejará por nosotros)
EXPOSE 80

# Comando para ejecutar la aplicación cuando el contenedor inicie
ENTRYPOINT ["dotnet", "AhorcadoBackend.dll"]
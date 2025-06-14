# Usar una imagen base de .NET SDK para construir la aplicación
# Reemplaza '8.0' con la versión de .NET que uses (e.g., 6.0, 7.0, 8.0)
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copiar el archivo de proyecto y restaurar las dependencias
COPY ["backend/AhorcadoBackend/AhorcadoBackend.csproj", "backend/AhorcadoBackend/"]
RUN dotnet restore "backend/AhorcadoBackend/AhorcadoBackend.csproj"

# Copiar el resto de los archivos del proyecto
COPY . .
WORKDIR "/src/backend/AhorcadoBackend"

# Publicar la aplicación para producción
# El resultado de esta publicación estará en /app/publish
RUN dotnet publish "AhorcadoBackend.csproj" -c Release -o /app/publish

# Usar una imagen base de .NET Runtime para ejecutar la aplicación (más pequeña y segura)
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Copiar los archivos publicados de la etapa 'build' a la imagen final
COPY --from=build /app/publish .

# Exponer el puerto por defecto de ASP.NET Core (usualmente 80 para HTTP, 443 para HTTPS)
# Render lo manejará por nosotros, pero es buena práctica
EXPOSE 80

# Comando para ejecutar la aplicación cuando el contenedor inicie
# Reemplaza 'AhorcadoBackend.dll' con el nombre exacto de tu archivo .dll
ENTRYPOINT ["dotnet", "AhorcadoBackend.dll"]
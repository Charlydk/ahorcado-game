FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src/app
COPY ["AhorcadoBackend.csproj", "./"]
RUN dotnet restore "AhorcadoBackend.csproj"
COPY . .
RUN dotnet publish "AhorcadoBackend.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app # Establece el directorio de trabajo para la imagen final
COPY --from=build /app/publish .
EXPOSE 80
ENTRYPOINT ["dotnet", "AhorcadoBackend.dll"]
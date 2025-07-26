# 🎲 Ahorcado Full-Stack con .NET y SignalR

Este proyecto es una reimaginación completa del clásico juego del Ahorcado, desarrollado como una aplicación web full-stack con un backend en **ASP.NET Core** y un frontend en **Vanilla JavaScript**. La característica principal es su capacidad de **juego multijugador en tiempo real** gracias a **SignalR**.

**➡️ [Juega la demo en vivo aquí](https://charlydk.github.io/ahorcado-game/frontend/)**

![Captura de pantalla del juego del ahorcado](https://github.com/Charlydk/ahorcado-game/blob/main/frontend/img/screenshot.png?raw=true)

---

## 🏛️ Arquitectura Técnica

El proyecto sigue una arquitectura cliente-servidor bien definida:

* **Backend (ASP.NET Core 8):** Una API web robusta que centraliza toda la lógica del juego.
    * **API RESTful:** Endpoints para gestionar las partidas (iniciar, reiniciar), las palabras (CRUD) y las estadísticas de los jugadores.
    * **SignalR Hub:** Un hub (`GameHub`) que maneja toda la comunicación en tiempo real para las partidas online, gestionando grupos, conexiones y la sincronización del estado del juego entre los jugadores.
    * **Gestor de Estado Centralizado (`GameManager`):** Un servicio Singleton que mantiene el estado de todas las partidas activas en memoria, manejando la lógica de turnos, letras y finalización de cada juego.
    * **Persistencia con Entity Framework:** Conexión a una base de datos PostgreSQL (Supabase) para almacenar el historial de partidas y un banco de palabras administrable.
    * **Servicio en Segundo Plano (`IHostedService`):** Un `GameCleanupService` que se ejecuta periódicamente para limpiar partidas inactivas o terminadas, asegurando la eficiencia y el buen uso de los recursos del servidor.
* **Frontend (Vanilla JavaScript, HTML, CSS):** Una interfaz de cliente liviana y dinámica.
    * **Cliente SignalR:** Se conecta al `GameHub` del backend para enviar y recibir actualizaciones del juego en tiempo real.
    * **Lógica de UI Dinámica:** Manipulación del DOM para reflejar los diferentes estados del juego (bienvenida, selección de modo, juego, salas online) creando una experiencia de Single Page Application (SPA).
    * **Panel de Administración:** Una sección protegida para realizar operaciones CRUD (Crear, Leer, Actualizar, Borrar) sobre las palabras en la base de datos, demostrando una funcionalidad full-stack completa.
* **Contenerización (Docker):** Incluye un `Dockerfile` para construir una imagen de la aplicación backend, lista para ser desplegada en cualquier entorno de contenedores moderno (como Google Cloud Run, Render, etc.).

---

## 🛠️ Stack Tecnológico

**Backend:**
* C# y ASP.NET Core 8
* SignalR (para WebSockets)
* Entity Framework Core (ORM)
* PostgreSQL (Base de Datos)
* Docker

**Frontend:**
* HTML5
* CSS3 (con animaciones personalizadas)
* Vanilla JavaScript (ES6+)
* Bootstrap 5
* SignalR Client Library
* SweetAlert2

---

## ⚙️ Instalación y Ejecución Local

### Backend
1.  Clona el repositorio.
2.  Abre el proyecto `AhorcadoBackend.csproj` con Visual Studio o VS Code.
3.  Asegúrate de tener configurada una cadena de conexión a una base de datos PostgreSQL en `appsettings.json`.
4.  Ejecuta el proyecto con `dotnet run`.

### Frontend
1.  Navega a la carpeta `frontend`.
2.  Abre el archivo `game.js` y asegúrate de que la constante `BACKEND_URL` apunta a la dirección de tu backend local (ej. `http://localhost:5000/api/`).
3.  Abre el archivo `index.html` en tu navegador.

### Nota
Para ingresar al modo admin y agregar palabras desde el portal usa el usuario devfab

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.
# 📜 Juego del Ahorcado - Proyecto Full Stack

Este repositorio contiene el código fuente de una aplicación web completa del clásico **Juego del Ahorcado**, desarrollada con un backend en ASP.NET Core y un frontend en JavaScript puro.

![Captura de Pantalla del Juego](https://i.imgur.com/8x2a2aH.png)

---

## ✨ Características Principales

- **Múltiples Modos de Juego:**
  - **🎮 Solitario:** Un jugador contra la máquina.
  - **👥 Versus Local:** Dos jugadores en el mismo dispositivo; uno ingresa la palabra y el otro adivina.
  - **🌐 Online Cooperativo:** Dos jugadores se unen a una sala para adivinar la palabra juntos, con turnos y estado sincronizado en tiempo real.
- **Comunicación en Tiempo Real:** Usa **SignalR** para una comunicación bidireccional instantánea entre el servidor y los clientes en el modo online.
- **Persistencia de Datos:** Guarda el historial de partidas y un ranking de jugadores en una base de datos **PostgreSQL**, gestionada a través de **Entity Framework Core**.
- **Panel de Administración:** Una sección protegida por alias que permite añadir, editar y desactivar palabras del juego.
- **Diseño Responsivo y Temático:** Una interfaz de usuario con una temática de "castillo sombrío", efectos visuales, animaciones y sonidos, construida con **HTML5, CSS3 y Bootstrap 5**.
- **Listo para Despliegue:** Incluye un **`Dockerfile`** para empaquetar la aplicación en un contenedor, facilitando su despliegue en la nube.

---

## 🛠️ Arquitectura y Tecnologías

La aplicación sigue una arquitectura cliente-servidor donde el backend expone una API REST y un Hub de SignalR, y el frontend consume estos servicios.

### **Backend (Servidor)**
- **Framework:** ASP.NET Core 8
- **Lenguaje:** C#
- **Tiempo Real:** SignalR
- **Base de Datos:** Entity Framework Core con un proveedor para PostgreSQL.
- **Contenerización:** Docker

### **Frontend (Cliente)**
- **Lenguaje:** JavaScript (ES6+, Vanilla JS)
- **Librerías:** SignalR Client, SweetAlert2
- **Maquetación y Estilos:** HTML5, CSS3, Bootstrap 5

---

## 🔧 Cómo Ejecutar el Proyecto Localmente

Sigue estos pasos para configurar y ejecutar el proyecto en tu máquina de desarrollo.

### **Requisitos Previos**
- SDK de .NET 8 o superior.
- Una instancia de base de datos PostgreSQL.
- Un editor de código como Visual Studio Code.
- La extensión **Live Server** para Visual Studio Code (recomendado).

### **1. Configuración del Backend**

1.  **Clonar el Repositorio:**
    ```bash
    git clone <https://github.com/Charlydk/ahorcado-game>
    cd <ahorcado-game>
    ```

2.  **Configurar la Base de Datos:**
    - Abre el archivo `AhorcadoBackend/appsettings.json`.
    - Modifica la `ConnectionString` llamada `"Default"` para que apunte a tu base de datos PostgreSQL.
      ```json
      "ConnectionStrings": {
        "Default": "Host=localhost;Port=5432;Database=ahorcado_db;Username=tu_usuario;Password=tu_contraseña;"
      }
      ```

3.  **Instalar Dependencias y Aplicar Migraciones:**
    - Abre una terminal en la carpeta raíz del backend (`AhorcadoBackend/`).
    - Ejecuta `dotnet restore` para instalar los paquetes NuGet.
    - Ejecuta `dotnet ef database update` para aplicar las migraciones y crear las tablas en tu base de datos.

4.  **Iniciar el Servidor:**
    - Ejecuta `dotnet run`.
    - El servidor se iniciará en la URL especificada en `launchSettings.json` (ej. `http://localhost:5195`).

### **2. Configuración del Frontend**

1.  **Apuntar al Backend Local:**
    - Abre el archivo `frontend/game.js`.
    - Asegúrate de que la constante `BACKEND_URL` apunte a la URL de tu servidor local. Descomenta la línea de desarrollo y comenta la de producción.
      ```javascript
      const BACKEND_URL = "http://localhost:5195/api/"; // Para desarrollo local
      // const BACKEND_URL = "[https://ahorcado-backend-806698815588.southamerica-east1.run.app/api/](https://ahorcado-backend-806698815588.southamerica-east1.run.app/api/)"; // Para producción
      ```

2.  **Lanzar la Aplicación:**
    - Haz clic derecho en el archivo `frontend/index.html` desde Visual Studio Code.
    - Selecciona **"Open with Live Server"**.
    - Tu navegador se abrirá en una dirección como `http://127.0.0.1:5500`. ¡Ya puedes jugar!

---

## 🐳 Despliegue con Docker

El proyecto incluye un `Dockerfile` para facilitar el despliegue.

1.  **Construir la Imagen de Docker:**
    ```bash
    docker build -t juego-ahorcado .
    ```

2.  **Ejecutar el Contenedor:**
    - Asegúrate de pasar la cadena de conexión de tu base de datos de producción como una variable de entorno.
    ```bash
    docker run -d -p 8080:8080 --name ahorcado-app \
      -e ConnectionStrings__Default="Host=tu_host_db;Database=tu_db;..." \
      juego-ahorcado
    ```
    La aplicación estará disponible en `http://localhost:8080`.

---
_Este proyecto fue creado como parte de un portfolio personal. © 2025_

  @media print {
    .ms-editor-squiggler {
        display:none !important;
    }
  }
  .ms-editor-squiggler {
    all: initial;
    display: block !important;
    height: 0px !important;
    width: 0px !important;
  }

  ----------------------------------------

  # 🔬 Análisis Profundo del Código Fuente

Este documento proporciona un análisis técnico detallado de cada archivo clave del proyecto "Juego del Ahorcado", explicando su propósito, sus funciones principales, las decisiones de diseño y cómo interactúa con otras partes del sistema.

---

## 🏛️ Análisis Arquitectónico y de Diseño

Antes de detallar cada archivo, es importante entender las decisiones de diseño de alto nivel que dan forma al proyecto:

1.  **Estado Centralizado en Memoria (Backend):** La decisión de usar un `GameManager` como un servicio **Singleton** es el pilar de la arquitectura del backend. Esto significa que hay una única instancia de esta clase gestionando el estado de **todas** las partidas en memoria.
    * **Ventaja:** Acceso extremadamente rápido al estado del juego, ideal para una aplicación en tiempo real. No se necesita consultar la base de datos para cada letra adivinada.
    * **Desafío:** La memoria es volátil. Si el servidor se reinicia, todas las partidas en curso se pierden. Además, esto no escala horizontalmente (a múltiples servidores) sin una capa de estado distribuido como Redis. Para este proyecto, es una solución perfecta y eficiente.

2.  **Separación de Responsabilidades (Backend):**
    * **`GameManager` vs. `GameHub`**: El `GameManager` contiene la **lógica pura** del juego (reglas, turnos, estado). El `GameHub` actúa como un **controlador de red**, recibiendo solicitudes de los clientes y traduciéndolas en llamadas al `GameManager`. Esta separación es clave para la mantenibilidad y las pruebas.
    * **API REST vs. SignalR**: La aplicación combina dos paradigmas de comunicación. La **API REST** se usa para acciones sin estado o de inicio (iniciar partida local, obtener ranking), mientras que **SignalR** se reserva para la comunicación de baja latencia y en tiempo real durante el juego online.

3.  **Frontend como Single-Page Application (SPA):**
    * Aunque no usa un framework como React o Angular, el frontend emula el comportamiento de una SPA. El archivo `index.html` contiene toda la UI, y `game.js` se encarga de mostrar y ocultar secciones dinámicamente. Esto crea una experiencia de usuario fluida y rápida, sin recargas de página completas.

---

## 🚀 Backend (ASP.NET Core) - Análisis Detallado

### 🧠 `Services/GameManager.cs`

Esta clase es el motor del juego. Su diseño es crucial para el funcionamiento de la aplicación.

* **`ConcurrentDictionary<string, JuegoEstado>`**: La elección de `ConcurrentDictionary` en lugar de un `Dictionary` normal es una decisión de diseño fundamental para la seguridad en entornos multi-hilo. Un servidor web procesa múltiples solicitudes simultáneamente. `ConcurrentDictionary` maneja internamente los bloqueos para evitar que dos solicitudes modifiquen la colección de partidas al mismo tiempo, previniendo condiciones de carrera y corrupción de datos.

* **Ciclo de Vida de `JuegoEstado`**: Un objeto `JuegoEstado` nace en `CreateNewGame`, vive y se modifica dentro del `_activeGames`, y finalmente muere cuando es eliminado por `RemoveGame` o por el `GameCleanupService`. Es un objeto de estado efímero que solo existe mientras la partida está activa.

* **Métodos de Análisis Profundo:**
    * **`ProcessLetter(...)`**: Este método es un excelente ejemplo de un "método de transacción". Realiza una serie de validaciones en secuencia (partida existe, no ha terminado, es el turno del jugador). Si alguna validación falla, sale temprano. Si todas pasan, modifica el estado y, al final, persiste el resultado si el juego termina. Esta secuencia ordenada garantiza la integridad del estado del juego.
    * **`CleanInactiveGames(...)`**: Este es el "recolector de basura" de la lógica de negocio. Sin este proceso, el diccionario `_activeGames` crecería indefinidamente con partidas abandonadas, llevando a una **fuga de memoria**. Su existencia es vital para la estabilidad del servidor a largo plazo.

### 🔌 `Hubs/GameHub.cs`

Actúa como el intermediario entre las conexiones de red de los clientes y la lógica del juego.

* **Uso de Grupos de SignalR**: Cuando un jugador crea o se une a una partida, se le añade a un "grupo" cuyo nombre es el `GameId`. Esto es increíblemente eficiente. En lugar de que el servidor tenga que buscar y enviar un mensaje a cada `connectionId` individualmente, simplemente envía un mensaje al grupo: `Clients.Group(gameId).SendAsync(...)`. SignalR se encarga de difundirlo a todos los miembros de ese grupo.

* **`OnDisconnectedAsync(Exception? exception)`**: Este evento es fundamental para la robustez del modo online. Las desconexiones (un jugador cerrando el navegador, perdiendo internet) son inevitables. Al notificar al `GameManager` aquí, la aplicación puede reaccionar de manera proactiva: informar al oponente, marcar la partida como terminada y, eventualmente, limpiarla. Sin este manejo, se crearían "partidas fantasma" con jugadores que ya no están conectados.

### 🎛️ `Controllers/`

* **`JuegoController.cs`**: La existencia de este controlador demuestra una buena separación de preocupaciones. Las acciones que no necesitan ser instantáneas o difundidas a múltiples usuarios (como iniciar una partida local o ver el ranking) se manejan a través del patrón familiar de solicitud-respuesta de HTTP, que es más simple y no consume recursos de conexión en tiempo real.

* **`PalabrasController.cs` y `PartidasController.cs`**: Estos controladores siguen el patrón estándar de una API REST para operaciones CRUD (Crear, Leer, Actualizar, Borrar), proporcionando una interfaz limpia para que el frontend (`admin.js`) y otras partes de la aplicación interactúen con la base de datos de forma desacoplada.

### 💾 `Models/` y `JuegoDbContext.cs`

* **`IDbContextFactory<JuegoDbContext>`**: En `Program.cs`, se registra una *fábrica* de `DbContext` en lugar del `DbContext` directamente. Esto es una práctica recomendada cuando se inyecta en servicios de larga duración como un Singleton (`GameManager`). Un `DbContext` de EF Core no es seguro para subprocesos y está diseñado para un ciclo de vida corto (una solicitud HTTP). La fábrica permite al `GameManager` crear un `DbContext` nuevo y de corta duración cada vez que necesita acceder a la base de datos (`using var context = await _contextFactory.CreateDbContextAsync();`), evitando problemas de concurrencia y estado obsoleto.

---
---

## 💻 Frontend (HTML, CSS, JavaScript) - Análisis Detallado

### 🚀 `game.js`

Este archivo orquesta toda la experiencia del usuario.

* **Gestión de Estado (Vanilla JS):** El estado se gestiona a través de un conjunto de variables globales (`currentGameId`, `currentMode`, `aliasJugadorActual`). Aunque simple, es efectivo para esta escala de aplicación. En un proyecto más grande, esto podría evolucionar hacia un objeto de estado único o una pequeña biblioteca de gestión de estado para evitar la dispersión de variables globales.

* **Comunicación Asíncrona:** El código hace un uso extensivo de `async/await` con `fetch` y `connection.invoke`. Esto es crucial para una UI que no se bloquea. Cuando se realiza una llamada de red, el navegador no se congela; puede continuar renderizando y respondiendo a otras interacciones del usuario mientras espera la respuesta del servidor.

* **Flujo de Renderizado de la UI:** La función `actualizarUIJuego(data)` es el único punto de verdad para renderizar el estado del juego. Recibe un objeto de datos del backend y actualiza sistemáticamente cada parte del DOM (`palabra-guiones`, `imagenAhorcado`, etc.). Este patrón centralizado hace que la lógica de renderizado sea predecible y fácil de depurar.

* **Feedback al Usuario:** El uso de `mostrarMensajeAlerta` y las animaciones CSS (`ahorcado-impacto`, `acierto-efecto`) es fundamental para la experiencia del usuario. Proporciona una respuesta visual inmediata a cada acción, haciendo que el juego se sienta receptivo y vivo.

### 🎨 `custom.css`

* **Atmósfera y Tema:** Más allá de los colores, el uso de `background-attachment: fixed` en el `body` crea un efecto de paralaje simple, donde el contenido se desplaza sobre un fondo estático, añadiendo profundidad. La fuente `Creepster` es una elección deliberada para establecer instantáneamente un tono temático.

* **Animaciones (`@keyframes`):** Las animaciones no son solo decorativas; son funcionales.
    * `sacudidaYGlow`: Proporciona feedback de error instantáneo.
    * `glowAcertado`: Recompensa al usuario por una acción correcta.
    * `final-victoria` / `final-derrota`: Comunican claramente el resultado final del juego de una manera más impactante que un simple mensaje de texto.

---

## 🌊 Flujo de Datos: Un Ejemplo Completo

Para entender cómo encajan todas las piezas, sigamos una acción del usuario de principio a fin.

#### **Escenario 1: Adivinar Letra en Modo Online**

1.  **Frontend (`game.js`):** El usuario escribe 'A' y hace clic en "Adivinar".
2.  El `addEventListener` del botón se dispara. Llama a `manejarEnvioLetra('A')`.
3.  Dentro de `manejarEnvioLetra`, detecta que `currentMode` es 'online'.
4.  Invoca el método del Hub de SignalR: `await connection.invoke("ProcessLetter", currentGameId, 'A')`. La UI se bloquea temporalmente para evitar dobles envíos.
5.  **Backend (`GameHub.cs`):** El método `ProcessLetter` en el servidor recibe la llamada.
6.  Delega inmediatamente la lógica al Singleton: `await _gameManager.ProcessLetter(...)`.
7.  **Backend (`GameManager.cs`):** El `GameManager` procesa la letra, actualiza el `JuegoEstado` correspondiente en el diccionario `_activeGames`. Determina que la letra es correcta.
8.  `GameManager` devuelve el `ProcessLetterResult` al `GameHub`.
9.  **Backend (`GameHub.cs`):** El Hub recibe el resultado. Ahora, notifica a **todos** en la partida. Construye un `JuegoEstadoResponse` y lo envía al grupo: `await Clients.Group(gameId).SendAsync("ReceiveGameUpdate", gameUpdate)`.
10. **Frontend (`game.js`):** El listener `connection.on("ReceiveGameUpdate", ...)` se activa en los navegadores de **ambos** jugadores.
11. La función anónima dentro del listener recibe los datos (`gameUpdate`) y llama a `actualizarUIJuego(data)`.
12. **Frontend (DOM):** `actualizarUIJuego` actualiza el texto de los guiones, la imagen, los mensajes y vuelve a habilitar los controles para el siguiente turno. El ciclo se ha completado.

---

## 💡 Puntos de Mejora y Escalabilidad

El proyecto es sólido, pero aquí hay algunas vías para futuras mejoras:

* **Pruebas:** Introducir un proyecto de pruebas (xUnit, NUnit) para crear pruebas unitarias para la lógica del `GameManager`, asegurando que las reglas del juego funcionen como se espera sin necesidad de la UI.
* **Autenticación Robusta:** El sistema de alias es simple. Podría reemplazarse por un sistema de autenticación basado en tokens (JWT) para tener usuarios registrados y persistentes.
* **Gestión de Estado en Frontend:** Para aplicaciones más complejas, las variables globales pueden volverse difíciles de manejar. Refactorizar el estado del cliente en un único objeto o usar una pequeña biblioteca de gestión de estado podría mejorar la organización.
* **Escalado Horizontal:** Si la aplicación necesitara soportar miles de usuarios concurrentes en múltiples servidores, el `GameManager` en memoria se convertiría en un cuello de botella. El siguiente paso sería mover el estado de las partidas a un almacén de estado distribuido como **Redis** y usar un "backplane" de SignalR para que los diferentes servidores puedan comunicarse entre sí.


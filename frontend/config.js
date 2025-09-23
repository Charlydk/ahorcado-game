const CONFIG = {
    // URLs del Backend:
    // Para desarrollo local
    BACKEND_API_URL: "http://localhost:8080/api/",
    BACKEND_HUB_URL: "http://localhost:8080/gamehub",
  
    // Para producción
    PROD_BACKEND_API_URL: "https://ahorcado-backend.onrender.com/api/",
    PROD_BACKEND_HUB_URL: "https://ahorcado-backend.onrender.com/gamehub",
  };
  
  // Si estás probando localmente, usa las URLs de desarrollo.
  // Si vas a desplegar, cambia esta configuración o usa una variable de entorno.
  export const BACKEND_API_URL = CONFIG.BACKEND_API_URL;
  export const BACKEND_HUB_URL = CONFIG.BACKEND_HUB_URL;
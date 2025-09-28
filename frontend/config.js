const CONFIG = {
    // URLs del Backend:
    // Para desarrollo local
    BACKEND_API_URL: "http://localhost:8080/api/",
    BACKEND_HUB_URL: "http://localhost:8080/gamehub",
  
    // Para producción
    PROD_BACKEND_API_URL: "https://ahorcado-backend.onrender.com/api/",
    PROD_BACKEND_HUB_URL: "https://ahorcado-backend.onrender.com/gamehub",
  };
  
  let esLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

  // Exportamos las URLs correctas según el entorno
  export const BACKEND_API_URL = esLocal ? CONFIG.BACKEND_API_URL : CONFIG.PROD_BACKEND_API_URL;
  export const BACKEND_HUB_URL = esLocal ? CONFIG.BACKEND_HUB_URL : CONFIG.PROD_BACKEND_HUB_URL;
  
  // Imprimimos en la consola para poder verificar fácilmente qué URL se está usando
  console.log(`Backend API URL: ${BACKEND_API_URL}`);
  console.log(`Backend Hub URL: ${BACKEND_HUB_URL}`);
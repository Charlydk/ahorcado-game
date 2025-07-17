// URL base del backend
const API_URL_ADMIN = `${BACKEND_URL}palabras/`;

// Referencias UI
const seccionAdminPalabras = document.getElementById("seccionAdminPalabras");
const tablaAdmin = document.getElementById("tablaAdminPalabras");
const formAdmin = document.getElementById("formularioAdmin");
const formTitulo = document.getElementById("formAdminTitulo");

const inputTexto = document.getElementById("textoAdmin");
const inputCategoria = document.getElementById("categoriaAdmin");
const inputDificultad = document.getElementById("dificultadAdmin");
const inputPalabraId = document.getElementById("palabraIdAdmin");

// Mostrar sección Admin
function irASeccionAdmin() {
  ocultarTodasLasSecciones();
  mostrarSeccion(seccionAdminPalabras);
  cargarPalabrasAdmin();
}

// Volver
function volverAlInicioAdmin() {
  ocultarSeccion(seccionAdminPalabras); // Asegura que desaparezca del DOM visible
  inicializarUI(); // Tu lógica actual para volver a bienvenida
}


// Mostrar form
function mostrarFormularioAdmin() {
  formTitulo.textContent = "Agregar Palabra";
  inputPalabraId.value = "";
  inputTexto.value = "";
  inputCategoria.value = "";
  inputDificultad.value = "fácil";
  formAdmin.classList.remove("d-none");
}

// Guardar nueva o editar
async function guardarPalabraAdmin() {
  const palabra = {
    textoPalabra: inputTexto.value.trim(),
    categoria: inputCategoria.value.trim(),
    dificultad: inputDificultad.value,
    activa: true
  };

  const id = inputPalabraId.value;
  const url = id ? `${API_URL_ADMIN}editar/${id}` : `${API_URL_ADMIN}agregar`;
  const metodo = id ? "PUT" : "POST";

  const resp = await fetch(url, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(palabra)
  });

  if (resp.ok) {
    formAdmin.classList.add("d-none");
    cargarPalabrasAdmin();
    Swal.fire("¡Guardado!", "La palabra fue registrada con éxito", "success");
  } else {
    const mensaje = await resp.text();
    Swal.fire("Error", mensaje || "No se pudo guardar", "error");
  }
}

// Cargar todas
async function cargarPalabrasAdmin() {
  const res = await fetch(`${API_URL_ADMIN}todas`);

  if (!res.ok) {
    const msg = await res.text();
    console.warn("Error al cargar palabras:", msg);
    Swal.fire("Error", "No se pudieron cargar las palabras.", "error");
    return;
  }

  let datos = [];
  try {
    datos = await res.json();
  } catch (e) {
    console.error("Error al parsear JSON:", e);
    Swal.fire("Error", "Respuesta inesperada del servidor", "warning");
    return;
  }
  tablaAdmin.innerHTML = "";

  datos.forEach(p => {
    const fila = document.createElement("tr");
    if (!p.activa) fila.classList.add("table-secondary");

    fila.innerHTML = `
      <td>${p.textoPalabra}</td>
      <td>${p.categoria}</td>
      <td>${p.dificultad}</td>
      <td>${p.activa ? "✅" : "❌"}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1" onclick='editarPalabraAdmin(${JSON.stringify(p)})'>✏️</button>
        <button class="btn btn-sm btn-outline-${p.activa ? "danger" : "success"}" onclick='toggleActivoAdmin(${p.id}, ${p.activa})'>
          ${p.activa ? "Desactivar" : "Activar"}
        </button>
      </td>
    `;

    tablaAdmin.appendChild(fila);
  });
}

function editarPalabraAdmin(p) {
  inputPalabraId.value = p.id;
  inputTexto.value = p.textoPalabra;
  inputCategoria.value = p.categoria;
  inputDificultad.value = p.dificultad;
  formTitulo.textContent = "Editar Palabra";
  formAdmin.classList.remove("d-none");
}

async function toggleActivoAdmin(id, activa) {
  if (activa) {
    await fetch(`${API_URL_ADMIN}${id}`, { method: "DELETE" });
  } else {
    const res = await fetch(`${API_URL_ADMIN}todas`);
    const lista = await res.json();
    const palabra = lista.find(p => p.id === id);
    if (!palabra) return;
    palabra.activa = true;

    await fetch(`${API_URL_ADMIN}editar/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(palabra)
    });
  }

  cargarPalabrasAdmin();
}

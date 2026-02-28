export default function Auth() {
  return (
    <div className="bg-black bg-opacity-70 p-8 rounded-xl border border-halloween-orange max-w-md w-full">
      <h2 className="creepster text-4xl text-halloween-orange mb-6 text-center">Invocación de Usuario</h2>
      <p className="text-gray-400 text-center mb-8">El modo de login con Google y registro se está habilitando...</p>
      <div className="space-y-4">
        <button className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition flex items-center justify-center gap-2">
           <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
           Continuar con Google
        </button>
        <div className="flex items-center gap-4 text-gray-500">
           <div className="h-px bg-gray-800 flex-grow"></div>
           <span className="text-xs uppercase">o</span>
           <div className="h-px bg-gray-800 flex-grow"></div>
        </div>
        <input
          type="email"
          placeholder="Email de Invocador"
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-halloween-orange"
        />
        <input
          type="password"
          placeholder="Palabra Clave"
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-halloween-orange"
        />
        <button className="w-full bg-halloween-orange text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition uppercase tracking-widest">
           Entrar al Castillo
        </button>
      </div>
    </div>
  );
}

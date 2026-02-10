import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { motion } from 'framer-motion';
import { User, Users, Zap, Sparkles } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [alias, setAlias] = useState(localStorage.getItem('alias') || '');
  const [theme, setTheme] = useState('');
  const [loading, setLoading] = useState(false);

  const startQuickGame = async (mode: number) => {
    if (!alias) {
      alert('Por favor, ingresa un alias antes de invocar el juego.');
      return;
    }
    localStorage.setItem('alias', alias);
    setLoading(true);
    try {
      const response = await api.post('/games/create', {
        mode,
        alias,
        maxAttempts: 6,
        theme: theme.trim() || null
      });
      navigate(`/game/${response.data.id}`);
    } catch (err) {
      console.error(err);
      alert('Error al crear la partida. ¿Está el backend encendido?');
    } finally {
      setLoading(false);
    }
  };

  const modes = [
    { id: 0, name: 'Solitario', icon: <User size={24} />, desc: 'Tú contra el verdugo' },
    { id: 2, name: 'Online Coop', icon: <Users size={24} />, desc: 'Adivina con un amigo' },
    { id: 3, name: 'Duelo Online', icon: <Zap size={24} />, desc: 'Carrera por sobrevivir' },
  ];

  return (
    <div className="max-w-4xl w-full flex flex-col items-center">
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-12"
      >
        <h1 className="creepster text-8xl text-halloween-orange mb-4 neon-text">AHORCADO PRO</h1>
        <p className="text-xl text-gray-400 italic">"Donde cada letra errada, te acerca a la nada."</p>
      </motion.div>

      <div className="w-full max-w-md mb-12 flex flex-col gap-4">
        <div className="bg-black bg-opacity-70 p-6 rounded-xl border border-halloween-orange border-opacity-30">
          <label className="block text-halloween-orange text-sm font-bold uppercase mb-2">Tu Alias de Invocador</label>
          <input
            type="text"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="Ej: CharlyDK"
            className="w-full bg-gray-900 border-2 border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-halloween-orange transition"
          />
        </div>

        <div className="bg-black bg-opacity-70 p-6 rounded-xl border border-purple-500 border-opacity-30">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-purple-400" />
            <label className="block text-purple-400 text-sm font-bold uppercase">Tema Personalizado (IA)</label>
          </div>
          <input
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="Ej: Películas de Terror de los 80"
            className="w-full bg-gray-900 border-2 border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition"
          />
          <p className="text-[10px] text-gray-500 mt-2 italic">Deja vacío para un tema aleatorio.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {modes.map((mode) => (
          <motion.button
            key={mode.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => startQuickGame(mode.id)}
            disabled={loading}
            className="bg-black bg-opacity-60 p-8 rounded-2xl border-2 border-gray-800 hover:border-halloween-orange transition-all flex flex-col items-center gap-4 group"
          >
            <div className="p-4 bg-gray-900 rounded-full text-halloween-orange group-hover:bg-halloween-orange group-hover:text-white transition">
              {mode.icon}
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-white mb-1 uppercase tracking-widest">{mode.name}</h3>
              <p className="text-sm text-gray-500">{mode.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-[100]">
           <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-halloween-orange"></div>
           <p className="creepster text-3xl text-halloween-orange mt-6 animate-pulse">Abriendo portales...</p>
        </div>
      )}
    </div>
  );
}

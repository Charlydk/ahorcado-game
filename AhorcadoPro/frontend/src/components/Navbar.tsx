import React from 'react';
import { Link } from 'react-router-dom';
import { Ghost, User, Trophy } from 'lucide-react';

const Navbar: React.FC = () => {
  const alias = localStorage.getItem('alias');

  return (
    <header className="bg-black bg-opacity-90 border-b border-halloween-orange border-opacity-30 py-4 shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 group">
          <Ghost className="text-halloween-orange group-hover:animate-bounce" size={32} />
          <h1 className="creepster text-3xl text-halloween-orange neon-text">AHORCADO PRO</h1>
        </Link>

        <nav className="flex items-center gap-6">
          <Link to="/" className="text-gray-300 hover:text-halloween-orange transition text-sm font-bold uppercase tracking-widest">Inicio</Link>
          <button className="text-gray-300 hover:text-halloween-orange transition flex items-center gap-1">
            <Trophy size={18} />
            <span className="hidden sm:inline text-sm font-bold uppercase tracking-widest">Ranking</span>
          </button>
          <Link to="/auth" className="bg-halloween-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition shadow-md">
            <User size={18} />
            <span className="font-bold text-sm">{alias || 'Login'}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;

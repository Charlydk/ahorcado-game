import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Game from './pages/Game';
import Auth from './pages/Auth';
import Navbar from './components/Navbar';

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8 flex flex-col items-center justify-center">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/game/:gameId" element={<Game />} />
            <Route path="/auth" element={<Auth />} />
          </Routes>
        </main>
        <footer className="bg-black bg-opacity-80 text-white text-center py-4">
          <p className="creepster text-xl text-halloween-orange">Ahorcado Pro &copy; 2025</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;

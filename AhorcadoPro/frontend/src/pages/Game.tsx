import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGame } from '../hooks/useGame';
import LivingHangman from '../components/LivingHangman';
import { motion } from 'framer-motion';
import { Send, Sparkles, MessageSquare } from 'lucide-react';

const Game: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const alias = localStorage.getItem('alias') || 'Invitado';
  const { game, messages, hint, loading, sendLetter, sendMessage, requestHint } = useGame(gameId, alias);
  const [inputLetter, setInputLetter] = useState('');
  const [chatInput, setChatInput] = useState('');

  if (loading || !game) {
    return (
      <div className="flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-halloween-orange"></div>
        <p className="mt-4 text-halloween-orange creepster text-2xl">Invocando la partida...</p>
      </div>
    );
  }

  const handleSendLetter = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputLetter.length === 1) {
      sendLetter(inputLetter);
      setInputLetter('');
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      sendMessage(chatInput);
      setChatInput('');
    }
  };

  const displayWord = (progress: string) => {
    return game.wordToGuess.split('').map((char: string, i: number) => (
      <span key={i} className="mx-1 border-b-4 border-halloween-orange min-w-[2rem] inline-block text-center text-4xl font-bold uppercase">
        {progress.includes(char) ? char : ''}
      </span>
    ));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-6xl">
      {/* Left Column: Player 1 Status */}
      <div className="bg-black bg-opacity-60 p-6 rounded-xl border border-halloween-orange border-opacity-20 flex flex-col items-center">
        <h3 className="text-xl font-bold mb-4 text-halloween-orange">{game.player1Alias} (P1)</h3>
        <LivingHangman
          errors={game.player1Incorrect?.length || 0}
          maxErrors={game.maxAttempts}
          status={game.status}
        />
        <div className="mt-6 flex flex-wrap justify-center gap-2">
            {displayWord(game.mode === 3 ? game.player1Progress : game.guessedLetters)}
        </div>
      </div>

      {/* Middle Column: Controls & Info */}
      <div className="flex flex-col items-center justify-between py-8">
        <div className="text-center flex flex-col items-center">
          <h2 className="creepster text-4xl text-halloween-orange mb-2 neon-text">{game.category}</h2>
          <p className="text-sm text-gray-400 mb-4">Modo: {game.mode === 3 ? 'Duelo Online' : 'Cooperativo'}</p>

          <button
            onClick={() => requestHint()}
            className="flex items-center gap-2 bg-purple-900 bg-opacity-40 border border-purple-500 text-purple-200 px-4 py-1 rounded-full text-xs hover:bg-opacity-60 transition mb-4"
          >
            <Sparkles size={14} />
            Pedir Pista (IA)
          </button>

          {hint && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-purple-900 bg-opacity-20 border border-purple-500/30 p-3 rounded-lg max-w-xs text-sm italic text-purple-200"
            >
              "{hint}"
            </motion.div>
          )}
        </div>

        <div className="w-full max-w-xs">
          <form onSubmit={handleSendLetter} className="flex gap-2">
            <input
              type="text"
              maxLength={1}
              value={inputLetter}
              onChange={(e) => setInputLetter(e.target.value)}
              className="flex-grow bg-gray-800 border-2 border-halloween-orange rounded-lg px-4 py-3 text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="?"
            />
            <button type="submit" className="bg-halloween-orange p-4 rounded-lg hover:bg-orange-600 transition">
              <Sparkles className="text-white" />
            </button>
          </form>
          <div className="mt-4 text-center">
            <p className="text-gray-400">Letras probadas:</p>
            <p className="text-xl text-red-500 tracking-widest">
                {game.mode === 3 ? game.player1Incorrect : game.incorrectLetters}
            </p>
          </div>
        </div>

        {game.status !== 'InProgress' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`text-6xl font-black creepster mt-8 ${game.status === 'Won' ? 'text-green-500' : 'text-red-600'}`}
          >
            {game.status === 'Won' ? '¡VICTORIA!' : '¡PERDISTE!'}
          </motion.div>
        )}
      </div>

      {/* Right Column: Player 2 (if exists) & Chat */}
      <div className="flex flex-col gap-8">
        {game.player2Alias && (
          <div className="bg-black bg-opacity-60 p-6 rounded-xl border border-halloween-orange border-opacity-20 flex flex-col items-center">
            <h3 className="text-xl font-bold mb-4 text-halloween-orange">{game.player2Alias} (P2)</h3>
            <LivingHangman
              errors={game.player2Incorrect?.length || 0}
              maxErrors={game.maxAttempts}
              status={game.status}
            />
            <div className="mt-6 flex flex-wrap justify-center gap-2">
                {displayWord(game.mode === 3 ? game.player2Progress : game.guessedLetters)}
            </div>
          </div>
        )}

        {/* Chat */}
        <div className="bg-black bg-opacity-80 rounded-xl border border-gray-700 h-80 flex flex-col overflow-hidden">
          <div className="bg-gray-800 p-3 flex items-center gap-2 border-b border-gray-700">
            <MessageSquare size={18} className="text-halloween-orange" />
            <span className="font-bold text-sm">Chat de Invocación</span>
          </div>
          <div className="flex-grow overflow-y-auto p-4 space-y-2 flex flex-col">
            {messages.map((msg, i) => (
              <div key={i} className={`max-w-[80%] p-2 rounded-lg text-sm ${msg.alias === alias ? 'bg-halloween-orange self-end text-white' : 'bg-gray-700 self-start text-gray-200'}`}>
                <span className="block text-[10px] opacity-70 mb-1">{msg.alias}</span>
                {msg.text}
              </div>
            ))}
          </div>
          <form onSubmit={handleSendMessage} className="p-2 bg-gray-900 flex gap-1">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-grow bg-gray-800 text-xs px-3 py-2 rounded focus:outline-none"
              placeholder="Escribe un mensaje..."
            />
            <button type="submit" className="bg-halloween-orange p-2 rounded">
              <Send size={14} className="text-white" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Game;

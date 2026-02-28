import React from 'react';
import { motion } from 'framer-motion';

interface LivingHangmanProps {
  errors: number;
  maxErrors: number;
  status: 'InProgress' | 'Won' | 'Lost' | 'Waiting';
}

const LivingHangman: React.FC<LivingHangmanProps> = ({ errors, maxErrors, status }) => {
  const isWinning = status === 'Won';
  const isLosing = status === 'Lost' || errors >= maxErrors;
  const isSweating = errors > maxErrors / 2;

  return (
    <div className="relative w-64 h-80 flex items-center justify-center">
      <svg viewBox="0 0 200 250" className="w-full h-full">
        {/* Gallows */}
        <path d="M20 230 L180 230 M40 230 L40 20 L120 20 L120 50" stroke="#4a2c10" strokeWidth="8" fill="none" />

        {/* Rope */}
        <line x1="120" y1="50" x2="120" y2="70" stroke="#d4a373" strokeWidth="4" />

        {/* Head */}
        {errors > 0 && (
          <motion.g
            animate={isWinning ? { y: [0, -10, 0] } : { rotate: [0, 2, -2, 0] }}
            transition={{ repeat: Infinity, duration: isWinning ? 0.5 : 2 }}
          >
            <circle cx="120" cy="90" r="20" fill="#fefae0" stroke="#000" strokeWidth="2" />

            {/* Eyes */}
            <motion.g animate={status === 'InProgress' ? { scaleY: [1, 0.1, 1] } : {}}>
               {/* Normal eyes */}
               {!isLosing && !isWinning && (
                 <>
                   <circle cx="113" cy="85" r="2" fill="#000" />
                   <circle cx="127" cy="85" r="2" fill="#000" />
                 </>
               )}
               {/* Scared eyes */}
               {isLosing && (
                 <>
                   <text x="110" y="88" fontSize="10" fontWeight="bold">X</text>
                   <text x="123" y="88" fontSize="10" fontWeight="bold">X</text>
                 </>
               )}
               {/* Happy eyes */}
               {isWinning && (
                 <>
                   <path d="M110 88 Q113 83 116 88" stroke="#000" fill="none" strokeWidth="2" />
                   <path d="M124 88 Q127 83 130 88" stroke="#000" fill="none" strokeWidth="2" />
                 </>
               )}
            </motion.g>

            {/* Mouth */}
            {!isWinning && !isLosing && <path d="M115 100 Q120 105 125 100" stroke="#000" fill="none" strokeWidth="2" />}
            {isWinning && <path d="M112 100 Q120 110 128 100" stroke="#000" fill="none" strokeWidth="2" />}
            {isLosing && <path d="M115 105 Q120 95 125 105" stroke="#000" fill="none" strokeWidth="2" />}

            {/* Sweat drops */}
            {isSweating && status === 'InProgress' && (
              <motion.circle
                cx="135" cy="80" r="1.5" fill="#a2d2ff"
                animate={{ y: [0, 10], opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 1 }}
              />
            )}
          </motion.g>
        )}

        {/* Body */}
        {errors > 1 && <line x1="120" y1="110" x2="120" y2="170" stroke="#fefae0" strokeWidth="4" />}

        {/* Arms */}
        {errors > 2 && <line x1="120" y1="120" x2="90" y2="150" stroke="#fefae0" strokeWidth="4" />}
        {errors > 3 && <line x1="120" y1="120" x2="150" y2="150" stroke="#fefae0" strokeWidth="4" />}

        {/* Legs */}
        {errors > 4 && <line x1="120" y1="170" x2="100" y2="210" stroke="#fefae0" strokeWidth="4" />}
        {errors > 5 && <line x1="120" y1="170" x2="140" y2="210" stroke="#fefae0" strokeWidth="4" />}
      </svg>
    </div>
  );
};

export default LivingHangman;

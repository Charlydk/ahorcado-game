import { useState, useEffect } from 'react';
import { gameHub } from '../services/gameHub';

export function useGame(gameId: string | undefined, alias: string | null) {
  const [game, setGame] = useState<any>(null);
  const [messages, setMessages] = useState<{alias: string, text: string}[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId || !alias) return;

    const init = async () => {
      await gameHub.startConnection();
      await gameHub.joinGame(gameId, alias);
      setLoading(false);
    };

    init();

    const handleGameUpdated = (updatedGame: any) => {
      setGame(updatedGame);
    };

    const handleReceiveMessage = (fromAlias: string, text: string) => {
      setMessages((prev) => [...prev, { alias: fromAlias, text }]);
    };

    const handleReceiveHint = (receivedHint: string) => {
      setHint(receivedHint);
    };

    gameHub.onGameUpdated(handleGameUpdated);
    gameHub.onReceiveMessage(handleReceiveMessage);
    gameHub.onReceiveHint(handleReceiveHint);

    return () => {
      gameHub.offGameUpdated(handleGameUpdated);
      gameHub.offReceiveMessage(handleReceiveMessage);
      gameHub.offReceiveHint(handleReceiveHint);
    };

  }, [gameId, alias]);

  const sendLetter = async (letter: string) => {
    if (gameId) {
      await gameHub.processLetter(gameId, letter);
    }
  };

  const sendMessage = async (text: string) => {
    if (gameId && alias) {
      await gameHub.sendMessage(gameId, alias, text);
    }
  };

  const requestHint = async () => {
    if (gameId) {
      await gameHub.requestHint(gameId);
    }
  };

  return { game, messages, hint, loading, sendLetter, sendMessage, requestHint };
}

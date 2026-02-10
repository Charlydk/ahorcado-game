import * as signalR from '@microsoft/signalr';

const HUB_URL = import.meta.env.VITE_HUB_URL || 'http://localhost:5000/hubs/game';

class GameHubService {
  private connection: signalR.HubConnection | null = null;

  async startConnection() {
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets
      })
      .withAutomaticReconnect()
      .build();

    try {
      await this.connection.start();
      console.log('SignalR connected');
    } catch (err) {
      console.error('SignalR connection error: ', err);
      setTimeout(() => this.startConnection(), 5000);
    }
  }

  async joinGame(gameId: string, alias: string) {
    if (this.connection) {
      await this.connection.invoke('JoinGame', gameId, alias);
    }
  }

  async processLetter(gameId: string, letter: string) {
    if (this.connection) {
      await this.connection.invoke('ProcessLetter', gameId, letter);
    }
  }

  onGameUpdated(callback: (game: any) => void) {
    this.connection?.on('GameUpdated', callback);
  }

  onReceiveMessage(callback: (alias: string, message: string) => void) {
    this.connection?.on('ReceiveMessage', callback);
  }

  onReceiveHint(callback: (hint: string) => void) {
    this.connection?.on('ReceiveHint', callback);
  }

  offGameUpdated(callback: (game: any) => void) {
    this.connection?.off('GameUpdated', callback);
  }

  offReceiveMessage(callback: (alias: string, message: string) => void) {
    this.connection?.off('ReceiveMessage', callback);
  }

  offReceiveHint(callback: (hint: string) => void) {
    this.connection?.off('ReceiveHint', callback);
  }

  async sendMessage(gameId: string, alias: string, message: string) {
    await this.connection?.invoke('SendMessage', gameId, alias, message);
  }

  async requestHint(gameId: string) {
    await this.connection?.invoke('RequestHint', gameId);
  }
}

export const gameHub = new GameHubService();

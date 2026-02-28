namespace AhorcadoPro.Backend.Models
{
    public enum GameMode
    {
        Solo,
        VersusLocal,
        OnlineCoop,
        OnlineVersus
    }

    public enum GameStatus
    {
        Waiting,
        InProgress,
        Won,
        Lost,
        Aborted
    }

    public class GameSession
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public GameMode Mode { get; set; }
        public GameStatus Status { get; set; } = GameStatus.Waiting;

        public string WordToGuess { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;

        // For online modes
        public string? Player1Id { get; set; }
        public string? Player1Alias { get; set; }
        public string? Player2Id { get; set; }
        public string? Player2Alias { get; set; }

        public string GuessedLetters { get; set; } = string.Empty;
        public string IncorrectLetters { get; set; } = string.Empty;
        public int RemainingAttempts { get; set; }
        public int MaxAttempts { get; set; }

        public string? CurrentTurnPlayerId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? FinishedAt { get; set; }
        public DateTime LastActivity { get; set; } = DateTime.UtcNow;

        // For OnlineVersus (Option A: Race)
        // We might need separate states if they race on the same word but independently?
        // User said: "Both compete for guessing the same word simultaneously, the first to finish wins."
        // This means they each have their own progress on the same word.
        public string? Player1Progress { get; set; }
        public string? Player2Progress { get; set; }
        public string? Player1Incorrect { get; set; }
        public string? Player2Incorrect { get; set; }
        public int Player1RemainingAttempts { get; set; }
        public int Player2RemainingAttempts { get; set; }
    }
}

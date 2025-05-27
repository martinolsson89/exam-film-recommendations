namespace FilmRecomendations.Services;

public interface IAiService
{
    Task<string> GetMovieRecommendationsAsync(string prompt);
    
    /// <summary>
    /// Generates a concise summary of an actor's biography (around 200 words)
    /// </summary>
    /// <param name="biography">The full actor biography to summarize</param>
    /// <param name="actorName">The name of the actor</param>
    /// <returns>A summarized biography of approximately 200 words</returns>
    Task<string> GetActorBiographySummaryAsync(string biography, string actorName);
}
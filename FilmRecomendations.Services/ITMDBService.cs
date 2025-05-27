using FilmRecomendations.Models.DTOs;

namespace FilmRecomendations.Services;

public interface ITMDBService
{
    /// <summary>
    /// Fetches the movie id by searching the movie database by name and release year
    /// </summary>
    /// <param name="movieName">Name of the movie</param>
    /// <param name="releaseYear">Release year of the movie</param>
    /// <returns>Movie ID from TMDB</returns>
    Task<MovieIdResponse> GetMovieIdAsync(string movieName, int releaseYear);

    /// <summary>
    /// Fetches movie details by movie id
    /// </summary>
    /// <param name="movieId">ID of the movie in TMDB</param>
    /// <returns>Movie details</returns>
    // In ITMDBService.cs
    Task<Movie> GetMovieDetailsAsync(int movieId);
    /// Fetches streaming providers for a movie by movie id
    /// </summary>
    /// <param name="movieId">ID of the movie in TMDB</param>
    /// <returns>Streaming provider information</returns>
    Task<StreamingProviderResponse> GetStreamingProvidersAsync(int movieId);
    Task<List<MovieTrailer>> GetMovieTrailersAsync(int movieId);
    Task<List<Director>> GetMovieDirectorsAsync(int movieId);
    Task<List<Actor>> GetMovieActorsAsync(int movieId);
    /// <summary>
    /// Fetches detailed information for an actor including biography and known for movies
    /// </summary>
    /// <param name="actorId">ID of the actor in TMDB</param>
    /// <returns>Actor details with known for movies</returns>
    Task<ActorDetails> GetActorDetailsAsync(int actorId);
}
using System.Text.Json;
using FilmRecomendations.Models.DTOs;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using System.Net.Http.Headers;

namespace FilmRecomendations.Services;

public class TMDBService : ITMDBService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<TMDBService> _logger;
    private readonly IConfiguration _configuration;

    public TMDBService(HttpClient httpClient, ILogger<TMDBService> logger, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _httpClient.BaseAddress = new Uri(configuration["TMDb:BaseUrl"] ?? "https://api.themoviedb.org/3/");
        _logger = logger;
        _configuration = configuration;
    }

    public async Task<MovieIdResponse> GetMovieIdAsync(string movieName, int releaseYear)
    {
        var movieResponse = new MovieIdResponse();

        try
        {
            var apiKey = Environment.GetEnvironmentVariable("TMDb:ApiKey");
            var searchUrl = $"search/movie?api_key={apiKey}&query={Uri.EscapeDataString(movieName)}&year={releaseYear}";
            _logger.LogInformation($"Searching for movie: {movieName} ({releaseYear})");

            var response = await _httpClient.GetAsync(searchUrl);

            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                using var document = JsonDocument.Parse(content);

                var results = document.RootElement.GetProperty("results");

                // return id and poster_path of first result if found.

                // Check if any results were found
                if (results.GetArrayLength() > 0)
                {
                    // Get the first result's ID
                    if (results[0].TryGetProperty("id", out var idElement))
                    {

                        movieResponse.Id = idElement.GetInt32();
                    }
                    // Get the first result's poster path
                    if (results[0].TryGetProperty("poster_path", out var posterPathElement))
                    {
                        movieResponse.poster_path = $"https://image.tmdb.org/t/p/w500{posterPathElement.GetString()}";
                    }
                    return movieResponse;
                }
            }
            else
            {
                _logger.LogWarning($"Failed to search for movie. Status code: {response.StatusCode}");
            }

            return new MovieIdResponse();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error searching for movie: {movieName} ({releaseYear})");
            throw;
        }
    }

    public async Task<List<Director>> GetMovieDirectorsAsync(int movieId)
{
    try
    {
        var apiKey = Environment.GetEnvironmentVariable("TMDb:ApiKey");
        var requestUrl = $"movie/{movieId}/credits?api_key={apiKey}";
        _logger.LogInformation($"Fetching credits for movie ID: {movieId} for directors");

        var response = await _httpClient.GetAsync(requestUrl);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning($"Failed to fetch credits for movie ID {movieId}. Status code: {response.StatusCode}");
            return new List<Director>();
        }

        var content = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(content);

        var directors = new List<Director>();

        if (document.RootElement.TryGetProperty("crew", out var crewElement))
        {
            foreach (var item in crewElement.EnumerateArray())
            {
                if (item.TryGetProperty("job", out var jobElement) &&
                    jobElement.GetString() == "Director")
                {
                    var director = new Director
                    {
                        Id = item.GetProperty("id").GetInt32(),
                        Name = item.GetProperty("name").GetString(),
                        ProfilePath = item.TryGetProperty("profile_path", out var profilePathElement) 
                                        ? profilePathElement.GetString() 
                                        : null
                    };
                    directors.Add(director);
                }
            }
        }

        return directors;
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, $"Error fetching directors for movie ID {movieId}");
        throw;
    }
}

    public async Task<List<Actor>> GetMovieActorsAsync(int movieId)
    {
        try
        {
            var apiKey = Environment.GetEnvironmentVariable("TMDb:ApiKey");
            var requestUrl = $"movie/{movieId}/credits?api_key={apiKey}";
            _logger.LogInformation($"Fetching credits for movie ID: {movieId} for actors");

            var response = await _httpClient.GetAsync(requestUrl);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning($"Failed to fetch credits for movie ID {movieId}. Status code: {response.StatusCode}");
                return new List<Actor>();
            }

            var content = await response.Content.ReadAsStringAsync();
            using var document = JsonDocument.Parse(content);

            var actors = new List<Actor>();

            if (document.RootElement.TryGetProperty("cast", out var castElement))
            {
                foreach (var item in castElement.EnumerateArray())
                {
                    var actor = new Actor
                    {
                        Id = item.GetProperty("id").GetInt32(),
                        Name = item.GetProperty("name").GetString(),
                        Character = item.TryGetProperty("character", out var characterElement) 
                                    ? characterElement.GetString() 
                                    : null,
                        ProfilePath = item.TryGetProperty("profile_path", out var profilePathElement) 
                                    ? profilePathElement.GetString() 
                                    : null
                    };
                    actors.Add(actor);
                }
            }

            return actors;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error fetching actors for movie ID {movieId}");
            throw;
        }
    }

    public async Task<Movie> GetMovieDetailsAsync(int movieId)
    {
        try
        {
            var apiKey = Environment.GetEnvironmentVariable("TMDb:ApiKey");
            var detailsUrl = $"movie/{movieId}?api_key={apiKey}";
            _logger.LogInformation($"Fetching details for movie ID: {movieId}");

            var response = await _httpClient.GetAsync(detailsUrl);

            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();

                // Log the first part of the response for debugging
                _logger.LogDebug($"API Response: {content.Substring(0, Math.Min(500, content.Length))}");

                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                };

                var movie = JsonSerializer.Deserialize<Movie>(content, options);

                if (movie != null)
                {
                    // If poster path is still null, try to extract it directly
                    if (string.IsNullOrEmpty(movie.poster_path))
                    {
                        using var document = JsonDocument.Parse(content);
                        if (document.RootElement.TryGetProperty("poster_path", out var posterPathElement))
                        {
                            movie.poster_path = posterPathElement.GetString();
                        }
                    }

                    // Fetch additional data in parallel to improve performance
                    var trailerTask = GetMovieTrailersAsync(movieId);
                    var streamingTask = GetStreamingProvidersAsync(movieId);
                    var directorsTask = GetMovieDirectorsAsync(movieId);
                    var actorsTask = GetMovieActorsAsync(movieId);

                    // Wait for all tasks to complete
                    await Task.WhenAll(trailerTask, streamingTask, directorsTask, actorsTask);

                    // Add extension property fields to the Movie class (we'll define these later)
                    movie.Trailers = trailerTask.Result;
                    movie.StreamingProviders = streamingTask.Result;
                    movie.Directors = directorsTask.Result;
                    movie.Actors = actorsTask.Result;
                }

                return movie;
            }
            else
            {
                _logger.LogWarning($"Failed to fetch details for movie ID {movieId}. Status code: {response.StatusCode}");
                return null;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error fetching details for movie ID {movieId}");
            throw;
        }
    }

    public async Task<StreamingProviderResponse> GetStreamingProvidersAsync(int movieId)
    {
        try
        {
            var apiKey = Environment.GetEnvironmentVariable("TMDb:ApiKey");
            if (string.IsNullOrEmpty(apiKey))
            {
                _logger.LogError("TMDB API key is missing.");
                throw new InvalidOperationException("TMDB API key is missing.");
            }

            var requestUrl = $"movie/{movieId}/watch/providers?api_key={apiKey}";
            _logger.LogInformation($"Fetching streaming providers for movie ID: {movieId}");

            var response = await _httpClient.GetAsync(requestUrl);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning($"Failed to fetch streaming providers for movie ID {movieId}. Status code: {response.StatusCode}");
                return new StreamingProviderResponse
                {
                    Id = movieId,
                    Results = new Dictionary<string, CountryProviders>()
                };
            }

            var content = await response.Content.ReadAsStringAsync();
            _logger.LogDebug($"API Response: {content.Substring(0, Math.Min(500, content.Length))}");

            var providerResponse = new StreamingProviderResponse { Id = movieId };
            var results = new Dictionary<string, CountryProviders>();

            using var document = JsonDocument.Parse(content);
            if (document.RootElement.TryGetProperty("results", out var resultsElement) &&
                resultsElement.TryGetProperty("SE", out var seElement))
            {
                var countryProviders = new CountryProviders
                {
                    Flatrate = ParseProviders(seElement, "flatrate"),
                    Rent = ParseProviders(seElement, "rent"),
                    Buy = ParseProviders(seElement, "buy")
                };
                results["SE"] = countryProviders;
            }

            providerResponse.Results = results;
            return providerResponse;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error fetching streaming providers for movie ID {movieId}");
            throw;
        }
    }

    private static List<Provider> ParseProviders(JsonElement element, string providerType)
    {
        var providers = new List<Provider>();

        if (element.TryGetProperty(providerType, out var providersArray))
        {
            foreach (var provider in providersArray.EnumerateArray())
            {
                var newProvider = new Provider
                {
                    ProviderId = provider.TryGetProperty("provider_id", out var idElement) ? idElement.GetInt32() : 0,
                    ProviderName = provider.TryGetProperty("provider_name", out var nameElement) ? nameElement.GetString() : null,
                    LogoPath = provider.TryGetProperty("logo_path", out var logoElement) ? logoElement.GetString() : null
                };
                providers.Add(newProvider);
            }
        }

        return providers;
    }

    public async Task<List<MovieTrailer>> GetMovieTrailersAsync(int movieId)
    {
        try
        {
            var apiKey = Environment.GetEnvironmentVariable("TMDb:ApiKey");
            _logger.LogInformation($"Fetching trailers for movie ID: {movieId}");

            // Create a request message as per the TMDB docs
            var request = new HttpRequestMessage
            {
                Method = HttpMethod.Get,
                RequestUri = new Uri($"{_httpClient.BaseAddress}movie/{movieId}/videos?api_key={apiKey}&language=en-US"),
                Headers =
                {
                    { "accept", "application/json" },
                },
            };

            using var response = await _httpClient.SendAsync(request);

            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                using var document = JsonDocument.Parse(content);

                var results = document.RootElement.GetProperty("results");
                var trailers = new List<MovieTrailer>();

                foreach (var result in results.EnumerateArray())
                {
                    // Only include YouTube trailers or teasers
                    if ((result.TryGetProperty("type", out var typeElement) &&
                        (typeElement.GetString() == "Trailer" || typeElement.GetString() == "Teaser")) &&
                        result.TryGetProperty("site", out var siteElement) &&
                        siteElement.GetString() == "YouTube")
                    {
                        trailers.Add(new MovieTrailer
                        {
                            Id = result.TryGetProperty("id", out var idElement) ? idElement.GetString() : string.Empty,
                            Name = result.TryGetProperty("name", out var nameElement) ? nameElement.GetString() : string.Empty,
                            Key = result.TryGetProperty("key", out var keyElement) ? keyElement.GetString() : string.Empty,
                            Site = siteElement.GetString(),
                            Type = typeElement.GetString()
                        });
                    }
                }

                return trailers;
            }
            else
            {
                _logger.LogWarning($"Failed to fetch trailers for movie ID {movieId}. Status code: {response.StatusCode}");
                return new List<MovieTrailer>();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error fetching trailers for movie ID {movieId}");
            return new List<MovieTrailer>();
        }
    }

    public async Task<ActorDetails> GetActorDetailsAsync(int actorId)
    {
        try
        {
            var apiKey = Environment.GetEnvironmentVariable("TMDb:ApiKey");
            var personUrl = $"person/{actorId}?api_key={apiKey}";
            var creditsUrl = $"person/{actorId}/movie_credits?api_key={apiKey}";
            _logger.LogInformation($"Fetching details for actor ID: {actorId}");

            // Create tasks for parallel requests
            var personTask = _httpClient.GetAsync(personUrl);
            var creditsTask = _httpClient.GetAsync(creditsUrl);

            // Wait for both requests to complete
            await Task.WhenAll(personTask, creditsTask);

            var personResponse = personTask.Result;
            var creditsResponse = creditsTask.Result;

            if (!personResponse.IsSuccessStatusCode || !creditsResponse.IsSuccessStatusCode)
            {
                _logger.LogWarning($"Failed to fetch actor details for ID {actorId}. Person status: {personResponse.StatusCode}, Credits status: {creditsResponse.StatusCode}");
                return null;
            }

            // Parse person details
            var personContent = await personResponse.Content.ReadAsStringAsync();
            using var personDocument = JsonDocument.Parse(personContent);
            var person = personDocument.RootElement;

            // Parse movie credits
            var creditsContent = await creditsResponse.Content.ReadAsStringAsync();
            using var creditsDocument = JsonDocument.Parse(creditsContent);
            var cast = creditsDocument.RootElement.GetProperty("cast");

            // Create actor details object
            var actorDetails = new ActorDetails
            {
                Id = person.GetProperty("id").GetInt32(),
                Name = person.GetProperty("name").GetString(),
                ProfilePath = person.TryGetProperty("profile_path", out var profilePath) && !profilePath.ValueKind.Equals(JsonValueKind.Null) 
                    ? profilePath.GetString() 
                    : null,
                Biography = person.TryGetProperty("biography", out var bio) && !bio.ValueKind.Equals(JsonValueKind.Null) 
                    ? bio.GetString() 
                    : "No biography available.",
                Birthday = person.TryGetProperty("birthday", out var bday) && !bday.ValueKind.Equals(JsonValueKind.Null) 
                    ? bday.GetString() 
                    : null,
                PlaceOfBirth = person.TryGetProperty("place_of_birth", out var pob) && !pob.ValueKind.Equals(JsonValueKind.Null) 
                    ? pob.GetString() 
                    : null,
                KnownForMovies = new List<ActorMovieCredit>()
            };

            // Get movies by popularity (for "known for" section)
            var actorMovies = new List<ActorMovieCredit>();
            foreach (var movie in cast.EnumerateArray())
            {
                if (movie.TryGetProperty("id", out var id) && 
                    movie.TryGetProperty("title", out var title) &&
                    movie.TryGetProperty("poster_path", out var poster))
                {
                    var movieCredit = new ActorMovieCredit
                    {
                        Id = id.GetInt32(),
                        Title = title.GetString(),
                        Character = movie.TryGetProperty("character", out var character) && !character.ValueKind.Equals(JsonValueKind.Null)
                            ? character.GetString()
                            : "Unknown",
                        PosterPath = !poster.ValueKind.Equals(JsonValueKind.Null)
                            ? $"https://image.tmdb.org/t/p/w200{poster.GetString()}"
                            : null,
                        ReleaseDate = movie.TryGetProperty("release_date", out var releaseDate) && !releaseDate.ValueKind.Equals(JsonValueKind.Null)
                            ? releaseDate.GetString()
                            : null,
                        // Extract popularity and vote metrics
                        Popularity = movie.TryGetProperty("popularity", out var popularity) && !popularity.ValueKind.Equals(JsonValueKind.Null)
                            ? popularity.GetDouble()
                            : 0,
                        VoteAverage = movie.TryGetProperty("vote_average", out var voteAverage) && !voteAverage.ValueKind.Equals(JsonValueKind.Null)
                            ? voteAverage.GetDouble()
                            : 0,
                        VoteCount = movie.TryGetProperty("vote_count", out var voteCount) && !voteCount.ValueKind.Equals(JsonValueKind.Null)
                            ? voteCount.GetInt32()
                            : 0
                    };
                    
                    actorMovies.Add(movieCredit);
                }
            }

            // Sort by a combined score of popularity and vote_average, with a minimum vote_count threshold
            // to ensure we get meaningful ratings, and filter out documentaries (by checking if actor is in their own movie)
            actorDetails.KnownForMovies = actorMovies
                .Where(m => m.VoteCount >= 20 && !m.Title.Contains(actorDetails.Name)) // Remove movies with low vote count and potential documentaries
                .OrderByDescending(m => (m.Popularity * 0.6) + (m.VoteAverage * 0.4)) // Weight popularity higher than ratings
                .Take(5)
                .ToList();

            return actorDetails;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error fetching actor details for ID {actorId}");
            throw;
        }
    }
}
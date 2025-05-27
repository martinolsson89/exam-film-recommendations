using Microsoft.Extensions.Logging;
using OpenAI.Chat;
using System.ClientModel;
using System.Net.Http;
using System.Text.Json;
using System.Web;

namespace FilmRecomendations.Services
{
    public class AiService : IAiService
    {
        private readonly ChatClient _chatClient;
        private ITMDBService _tmdbService;
        private readonly ILogger<AiService> _logger;

        public AiService(ITMDBService tmdbService, ILogger<AiService> logger)
        {
            _chatClient = InitializeChatClient();
            _tmdbService = tmdbService;
            _logger = logger;
        }

        private ChatClient InitializeChatClient()
        {
            // string apiKey = Environment.GetEnvironmentVariable("GROK_API_KEY");
            // string apiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY");

            // Set up the API key and endpoint for GROK.
            var apiKey = Environment.GetEnvironmentVariable("GROK_API_KEY");
            var credential = new ApiKeyCredential(apiKey);
            var baseURL = new OpenAI.OpenAIClientOptions
            {
                Endpoint = new Uri("https://api.x.ai/v1")
            };

            if (string.IsNullOrEmpty(apiKey))
            {
                throw new InvalidOperationException("API key for GROK is not set in the environment variables.");
            }

            // Initialize the chat client with GROK.
            return new ChatClient("grok-2-latest", credential, baseURL);

            // Initialize the chat client with GPT.
            // return new ChatClient("gpt-4o-mini", apiKey);
        }

        public async Task<string> GetMovieRecommendationsAsync(string prompt)
        {
            var messages = new List<ChatMessage>
            {
                new SystemChatMessage(
                    "You are a movie recommendation assistant. When given a movie description, " +
                    "you must return raw JSON only any number of movies that are similar to the input description and nothing else. The output must be a valid JSON array " +
                    "of objects in the following exact format (do not include any markdown, explanation, or extra text):\n\n" +
                    "[\n" +
                    "  {\n" +
                    "    \"movie_name\": \"Name of the movie\",\n" +
                    "    \"release_year\": 2000\n" +
                    "  },\n" +
                    "  {\n" +
                    "    \"movie_name\": \"Name of the movie 2\",\n" +
                    "    \"release_year\": 2001\n" +
                    "  }\n" +
                    "]\n\n" +
                    "Make sure that your entire output is only this JSON without any additional commentary."
                ),
                new UserChatMessage(prompt)
            };

            var completionOptions = new ChatCompletionOptions
            {
                Temperature = 0.7f,
            };

            ChatCompletion chatCompletion = await _chatClient.CompleteChatAsync(messages, completionOptions);
            string responseContent = chatCompletion.Content[0].Text;


            return await GetMovieIdAndPoster(responseContent);
        }

        public async Task<string> GetMovieIdAndPoster(string gptResponse)
        {
             // Parse the GPT response to extract the list of movies.
            var movieRecommendations = JsonSerializer.Deserialize<List<MovieRecommendation>>(gptResponse);
            if (movieRecommendations == null || movieRecommendations.Count == 0)
            {
                return "[]";
            }

            var resultList = new List<MovieDetail>();

            foreach (var rec in movieRecommendations)
            {
                
                // Fetch the movie ID from TMDB.
                var movieIdResponse = await _tmdbService.GetMovieIdAsync(rec.movie_name, rec.release_year);
                if (movieIdResponse.Id <= 0)
                {
                    continue;
                }

                // Add the movie details to the result list.
                resultList.Add(new MovieDetail
                {
                    movie_id = movieIdResponse.Id,
                    movie_name = rec.movie_name,
                    release_year = rec.release_year,
                    poster_path = movieIdResponse.poster_path
                });
        
            }

            // Return aggregated results as a JSON array.
            return JsonSerializer.Serialize(resultList);

        }

        private class MovieRecommendation
        {
            public string movie_name { get; set; }
            public int release_year { get; set; }
        }

        private class MovieDetail
        {
            public int movie_id { get; set; }
            public string movie_name { get; set; }
            public int release_year { get; set; }
            public string poster_path { get; set; }
        }
        
        public async Task<string> GetActorBiographySummaryAsync(string biography, string actorName)
        {
            if (string.IsNullOrWhiteSpace(biography) || biography == "No biography available.")
            {
                return biography; // Return original if empty or already minimal
            }
            
            try
            {
                var messages = new List<ChatMessage>
                {
                    new SystemChatMessage(
                        "You are an expert summarizer who creates concise actor biographies. " +
                        "Your task is to create a BRIEF summary of the actor's career, major achievements, and significant life events " +
                        "in EXACTLY 150-200 words, never more. Focus on their career highlights, most famous roles, awards, and major " +
                        "contributions to cinema. Maintain a neutral, informative tone. Do not include your own opinions " +
                        "or commentary. Only return the summary text without any additional formatting or explanation. " +
                        "Count your words carefully and ensure the summary is between 150-200 words. This is absolutely critical."
                    ),
                    new UserChatMessage($"Summarize this biography of {actorName} in 150-200 words. Never exceed 200 words:\n\n{biography}")
                };

                var completionOptions = new ChatCompletionOptions
                {
                    Temperature = 0.5f,
                    // Note: In this version of the OpenAI SDK, there doesn't appear to be a property for limiting tokens
                };

                try { _logger?.LogInformation($"Requesting summary for {actorName}'s biography"); } catch { /* Continue despite logging errors */ }
                ChatCompletion chatCompletion = await _chatClient.CompleteChatAsync(messages, completionOptions);
                string summary = chatCompletion.Content[0].Text;
                
                // Count words and validate the length
                string[] words = summary.Split(new[] { ' ', '\t', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);
                int wordCount = words.Length;
                
                try { _logger?.LogInformation($"Generated summary for {actorName} with {wordCount} words"); } catch { /* Continue despite logging errors */ }
                
                // If the summary is still too long (over 250 words), make a second attempt with stronger constraints
                if (wordCount > 250)
                {
                    try { _logger?.LogWarning($"Summary too long ({wordCount} words) - truncating to approximately 200 words"); } catch { /* Continue despite logging errors */ }
                    
                    // A simple approach to truncate to around 200 words by taking the first 200 words
                    // This is a fallback in case the AI doesn't follow instructions
                    string[] truncatedWords = words.Take(200).ToArray();
                    summary = string.Join(" ", truncatedWords);
                    
                    // Add a period at the end if it doesn't end with punctuation
                    if (!summary.EndsWith(".") && !summary.EndsWith("!") && !summary.EndsWith("?"))
                    {
                        summary += "."; 
                    }
                    
                    try { _logger?.LogInformation($"Truncated summary to {truncatedWords.Length} words"); } catch { /* Continue despite logging errors */ }
                }
                
                return summary;
            }
            catch (Exception ex)
            {
                try 
                {
                    _logger?.LogError(ex, $"Error generating biography summary for {actorName}");
                }
                catch 
                {
                    // Suppress any logging errors to ensure the main functionality continues
                }
                
                return biography; // Fallback to original biography on error
            }
        }
    }
}

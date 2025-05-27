using System.Collections.Generic;

namespace FilmRecomendations.Models.DTOs;

public class StreamingProviderResponse
{
    public int Id { get; set; }
    public Dictionary<string, CountryProviders> Results { get; set; }
}

public class CountryProviders
{
    public List<Provider> Flatrate { get; set; }
    public List<Provider> Rent { get; set; }
    public List<Provider> Buy { get; set; }
}

public class Provider
{
    public int ProviderId { get; set; }
    public string ProviderName { get; set; }
    public string LogoPath { get; set; }
    
    // Full URL to the provider logo
    public string LogoUrl => !string.IsNullOrEmpty(LogoPath) 
        ? $"https://image.tmdb.org/t/p/original{LogoPath}" 
        : null;
}
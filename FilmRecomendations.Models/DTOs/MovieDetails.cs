namespace FilmRecomendations.Models.DTOs;

public class Movie
{
    public bool adult { get; set; }
    public string backdrop_path { get; set; }
    public BelongsToCollection belongs_to_collection { get; set; }
    public int budget { get; set; }
    public List<Genre> genres { get; set; }
    public string homepage { get; set; }
    public int id { get; set; }
    public string imdb_id { get; set; }
    public string original_language { get; set; }
    public string original_title { get; set; }
    public string overview { get; set; }
    public double popularity { get; set; }
    public string poster_path { get; set; }
    public List<ProductionCompany> production_companies { get; set; }
    public List<ProductionCountry> production_countries { get; set; }
    public string release_date { get; set; }
    public long Revenue { get; set; }
    public int Runtime { get; set; }
    public List<SpokenLanguage> spoken_languages { get; set; }
    public string Status { get; set; }
    public string Tagline { get; set; }
    public string Title { get; set; }
    public bool Video { get; set; }
    public double vote_average { get; set; }
    public int vote_count { get; set; }
    public List<MovieTrailer> Trailers { get; set; }
    public StreamingProviderResponse StreamingProviders { get; set; }
    public List<Director> Directors { get; set; }
    public List<Actor> Actors { get; set; }
}

public class BelongsToCollection
{
    public int id { get; set; }
    public string name { get; set; }
    public string poster_path { get; set; }
    public string backdrop_path { get; set; }
}

public class Genre
{
    public int id { get; set; }
    public string Name { get; set; }
}

public class ProductionCompany
{
    public int id { get; set; }
    public string logo_path { get; set; }
    public string Name { get; set; }
    public string origin_country { get; set; }
}

public class ProductionCountry
{
    public string iso_3166_1 { get; set; }
    public string name { get; set; }
}

public class SpokenLanguage
{
    public string english_name { get; set; }
    public string iso_639_1 { get; set; }
    public string Name { get; set; }
}

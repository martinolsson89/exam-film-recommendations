namespace FilmRecomendations.Models.DTOs;

public class ActorDetails
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string ProfilePath { get; set; }
    public string Biography { get; set; }
    public string Birthday { get; set; }
    public string PlaceOfBirth { get; set; }
    public List<ActorMovieCredit> KnownForMovies { get; set; }
}

public class ActorMovieCredit
{
    public int Id { get; set; }
    public string Title { get; set; }
    public string Character { get; set; }
    public string PosterPath { get; set; }
    public string ReleaseDate { get; set; }
    // Add these new properties for sorting by popularity and rating
    public double Popularity { get; set; }
    public double VoteAverage { get; set; }
    public int VoteCount { get; set; }
}
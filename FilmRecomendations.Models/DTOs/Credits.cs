namespace FilmRecomendations.Models.DTOs;

public class Director
{
    public int Id { get; set; }
    public string? Name { get; set; }
    public string? ProfilePath { get; set; }
}

public class Actor
{
    public int Id { get; set; }
    public string? Name { get; set; }
    public string? Character { get; set; }
    public string? ProfilePath { get; set; }
}

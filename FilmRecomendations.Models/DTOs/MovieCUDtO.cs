using System.ComponentModel.DataAnnotations;

namespace FilmRecomendations.Models.DTOs;
public class MovieCUDtO
{
    public Guid? MovieId { get; set; } = null;
    [Required]
    public string Title { get; set; } = "";
    public int? TMDbId { get; set; } = null;
    public bool? Liked { get; set; } = null;
    public string? UserId { get; set; } =null;
}
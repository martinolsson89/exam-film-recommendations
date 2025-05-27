using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;

namespace FilmRecomendations.Models.DTOs;

public class MovieGetDto
{
    public Guid? MovieId { get; set; } = null;
    [Required]
    public string Title { get; set; } = "";
    public int? TMDbId { get; set; } = null;
    public bool? Liked { get; set; } = null;
    public string? UserId { get; set; } = null;
}

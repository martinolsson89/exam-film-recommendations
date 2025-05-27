using System.ComponentModel.DataAnnotations;

namespace FilmRecomendations.Models.DTOs;

public class RegisterRequestDto
{
    [Required]
    [EmailAddress]
    public required string Email { get; set; }
    [Required]
    public required string Password { get; set; }
    [Required]
    public required string UserName { get; set; }
}

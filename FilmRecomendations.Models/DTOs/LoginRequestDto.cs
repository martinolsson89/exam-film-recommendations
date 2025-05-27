using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace FilmRecomendations.Models.DTOs;

public class LoginRequestDto
{
    [Required]
    public required string Email { get; set; }
    [Required]
    public required string Password { get; set; }
}

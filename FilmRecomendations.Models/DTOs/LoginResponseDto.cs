using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace FilmRecomendations.Models.DTOs;

public class LoginResponseDto
{
    public string? Token { get; set; }
    public string? UserId { get; set; }
}

using Microsoft.AspNetCore.Identity;
using Database.Seeder;

namespace FilmRecomendations.Db.DbModels;

public class ApplicationUser: IdentityUser
{
    public string? ProfilePicture { get; set; } = ProfilePictureSeeder.RandomizeProfilePicture();

    //Any movies we know the user likes/dislikes/want to see we add here:
    public List<MovieDbM> Movies { get; set; } = new List<MovieDbM>();
}

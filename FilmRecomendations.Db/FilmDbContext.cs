using FilmRecomendations.Db.DbModels;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
namespace FilmRecomendations.Db;

public class FilmDbContext(DbContextOptions<FilmDbContext> options) : IdentityDbContext<ApplicationUser>(options)
{
    public DbSet<MovieDbM> Movies { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<MovieDbM>()
            .HasOne(m => m.User)
            .WithMany(u => u.Movies)
            .HasForeignKey(m => m.UserId);

        modelBuilder.Entity<MovieDbM>()
            .HasIndex(m => m.UserId)
            .HasDatabaseName("IX_Movies_UserId");
    }
}

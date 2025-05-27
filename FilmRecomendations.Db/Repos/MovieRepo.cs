using System.Linq;
using FilmRecomendations.Db.DbModels;
using FilmRecomendations.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace FilmRecomendations.Db.Repos;

public class MovieRepo(FilmDbContext _context) : IMovieRepo
{
    public async Task<MovieGetDto> AddMovieAsync(MovieCUDtO item)
    {
        if (item.MovieId != null)
            throw new ArgumentException($"{nameof(item.MovieId)} must be null when creating a new object");

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == item.UserId) ?? 
            throw new ArgumentException($"User {item.UserId} does not exist in the database");

        var movie = new MovieDbM()
        {
            Title = item.Title,
            TMDbId = item.TMDbId,
            Liked = item.Liked,
            User = user
        };

        _context.Movies.Add(movie);
        await _context.SaveChangesAsync();

        return MapToDto(movie);
    }

    public async Task<MovieGetDto> DeleteMovieAsync(Guid movieId)
    {
        var query = _context.Movies
            .Where(m => m.MovieId == movieId);

        var item = await query.FirstOrDefaultAsync() ?? 
            throw new ArgumentException($"Item {movieId} does not exist in the database");

        _context.Movies.Remove(item);
        await _context.SaveChangesAsync();

        return MapToDto(item);
    }

    public async Task<MovieGetDto?> GetMovieAsync(Guid movieId)
    {
        var movie = await _context.Movies.AsNoTracking().FirstOrDefaultAsync(m => m.MovieId == movieId);
        return movie != null ? MapToDto(movie) : null;
    }

    public async Task<ResponsePageDto<MovieGetDto>> GetMoviesAsync(string userId, string? filter, int pageNumber, int pageSize)
    {
        filter ??= "";
        filter = filter.ToLower();
        IQueryable<MovieDbM> query = _context.Movies.AsNoTracking();
        
        var count = await query
            .Where(m => m.UserId == userId &&
                m.Title.ToLower().Contains(filter))
            .CountAsync();
            
        var items = await query
            .Where(m => m.UserId == userId &&
                m.Title.ToLower().Contains(filter))
            .Skip(pageNumber * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new ResponsePageDto<MovieGetDto>()
        {
            DbItemsCount = count,
            PageItems = items.Select(MapToDto).ToList(),
            PageNr = pageNumber,
            PageSize = pageSize
        };
    }

    public async Task<ResponsePageDto<MovieGetDto>> GetWatchlistAsync(string userId, string? filter, int pageNumber, int pageSize)
    {
        filter ??= "";
        filter = filter.ToLower();
        IQueryable<MovieDbM> query = _context.Movies.AsNoTracking();
        
        var count = await query
            .Where(m => m.UserId == userId &&
                m.Title.ToLower().Contains(filter) && 
                m.Liked == null)
            .CountAsync();
            
        var items = await query
            .Where(m => m.UserId == userId && 
                m.Title.ToLower().Contains(filter) && 
                m.Liked == null)
            .Skip(pageNumber * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new ResponsePageDto<MovieGetDto>()
        {
            DbItemsCount = count,
            PageItems = items.Select(MapToDto).ToList(),
            PageNr = pageNumber,
            PageSize = pageSize
        };
    }

    public async Task<MovieGetDto> UpdateMovieAsync(MovieCUDtO item)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == item.UserId) ?? 
            throw new ArgumentException($"User {item.UserId} does not exist in the database");

        var query = _context.Movies
            .Where(m => m.MovieId == item.MovieId);

        var movie = await query.FirstOrDefaultAsync() ?? 
            throw new ArgumentException($"Item {item.MovieId} does not exist in the database");

        movie.Title = item.Title;
        movie.TMDbId = item.TMDbId;
        movie.Liked = item.Liked;
        movie.User = user;

        await _context.SaveChangesAsync();

        return MapToDto(movie);
    }

    private static MovieGetDto MapToDto(MovieDbM movie)
    {
        return new MovieGetDto
        {
            MovieId = movie.MovieId,
            Title = movie.Title,
            TMDbId = movie.TMDbId,
            Liked = movie.Liked
        };
    }
    public async Task<MovieGetDto?> GetMovieByTMDbIdAsync(string userId, int tmdbId)
    {
        var movie = await _context.Movies
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.UserId == userId && m.TMDbId == tmdbId);
        
        return movie == null ? null : MapToDto(movie);
    }

    public async Task<ResponsePageDto<MovieGetDto>> GetLikedMoviesAsync(string userId, string? filter, int pageNumber, int pageSize)
    {
        filter ??= "";
        filter = filter.ToLower();
        IQueryable<MovieDbM> query = _context.Movies.AsNoTracking();
        
        var count = await query
            .Where(m => m.UserId == userId &&
                m.Title.ToLower().Contains(filter) && 
                m.Liked == true)
            .CountAsync();
            
        var items = await query
            .Where(m => m.UserId == userId && 
                m.Title.ToLower().Contains(filter) && 
                m.Liked == true)
            .Skip(pageNumber * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new ResponsePageDto<MovieGetDto>()
        {
            DbItemsCount = count,
            PageItems = items.Select(MapToDto).ToList(),
            PageNr = pageNumber,
            PageSize = pageSize
        };
    }

    public async Task<ResponsePageDto<MovieGetDto>> GetDislikedMoviesAsync(string userId, string? filter, int pageNumber, int pageSize)
    {
        filter ??= "";
        filter = filter.ToLower();
        IQueryable<MovieDbM> query = _context.Movies.AsNoTracking();
        
        var count = await query
            .Where(m => m.UserId == userId &&
                m.Title.ToLower().Contains(filter) && 
                m.Liked == false)
            .CountAsync();
            
        var items = await query
            .Where(m => m.UserId == userId && 
                m.Title.ToLower().Contains(filter) && 
                m.Liked == false)
            .Skip(pageNumber * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new ResponsePageDto<MovieGetDto>()
        {
            DbItemsCount = count,
            PageItems = items.Select(MapToDto).ToList(),
            PageNr = pageNumber,
            PageSize = pageSize
        };
    }
}
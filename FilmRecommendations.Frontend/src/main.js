import './style.css';

const promptForm = document.getElementById('promptForm');
const promptInput = document.getElementById('promptInput');
const movieRecommendations = document.getElementById('movieRecommendations');
const loadingIndicator = document.getElementById('loadingIndicator');
const themeSwitcher = document.getElementById('themeSwitcher');

// Update the DOMContentLoaded event handler to properly restore the grid layout
window.addEventListener('DOMContentLoaded', () => {
  // Clear navigation history when returning to main page
  sessionStorage.removeItem('navigationHistory');
  
  const savedMovies = sessionStorage.getItem('movieRecommendations');
  if (savedMovies) {
    const movies = JSON.parse(savedMovies);
    
    // Ensure movieRecommendations has the correct grid classes if we have results
    if (movies.length > 0) {
      movieRecommendations.classList.add('grid', 'grid-cols-1', 'sm:grid-cols-2', 'md:grid-cols-3');
      movieRecommendations.classList.remove('flex', 'items-center', 'justify-center');
      
      // Restore the last search query to the input field
      const lastQuery = sessionStorage.getItem('lastSearchQuery');
      if (lastQuery) {
        promptInput.value = lastQuery;
      }
    }
    
    // Display the saved movies
    displayMovies(movies);
  }
});

// On page load, check localStorage for the preferred theme
const currentTheme = localStorage.getItem('theme');
if (currentTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

// Toggle dark mode and save the setting in localStorage
themeSwitcher.addEventListener('click', () => {
  document.documentElement.classList.toggle('dark');
  if (document.documentElement.classList.contains('dark')) {
    localStorage.setItem('theme', 'dark');
  } else {
    localStorage.setItem('theme', 'light');
  }
});

// Handle suggestion bubbles
document.querySelectorAll('.suggestion').forEach((bubble) => {
  bubble.addEventListener('click', () => {
    promptInput.value = bubble.textContent.trim();
  });
});

// Handle form submission with API call
promptForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const userPrompt = promptInput.value.trim();
  if (!userPrompt) return;

  // Clear previous recommendations
  movieRecommendations.innerHTML = '';
  loadingIndicator.classList.remove('hidden');


   // Build the request URL with encoded prompt
   const apiUrl = `https://localhost:7103/FilmRecomendations/GetFilmRecommendation?prompt=${encodeURIComponent(userPrompt)}`;

  // Fetch movie recommendations from the backend API
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      console.error('Error fetching film recommendations:', response.statusText);
      return;
    }
    const movies = await response.json();

    // Save both the query and results regardless of whether we found movies or not
    sessionStorage.setItem('lastSearchQuery', userPrompt);
    sessionStorage.setItem('movieRecommendations', JSON.stringify(movies));

    if (movies.length === 0) {
      // Remove grid layout classes
      movieRecommendations.classList.remove('grid', 'grid-cols-1', 'sm:grid-cols-2', 'md:grid-cols-3');
      // Add flex layout classes to center the content
      movieRecommendations.classList.add('flex', 'items-center', 'justify-center');
      movieRecommendations.innerHTML = '<div class="text-center p-4">Hoppsan, ingen rekommendation kunde göras...vänligen prova en annan sökning.</div>';
      return;
    }
    
    console.log('Movies:', movies);
    displayMovies(movies);
  } catch (error) {
    console.error('Error fetching film recommendations:', error);
  } finally {
    // Hide the loading indicator after completion
    loadingIndicator.classList.add('hidden');
  }
});

// FIXED: Changed movie card creation to remove transparency issues and hover effects
function displayMovies(movies) {
  movies.forEach((movie) => {
    // Create the card container with modified classes to remove transparency and scale effects
    const movieCard = document.createElement('div');
    movieCard.classList.add(
      'movie-card',
      'bg-white',     
      'dark:bg-gray-700', 
      'rounded-lg',
      'overflow-hidden',
      'shadow-lg',
      'transition',
      'duration-300',
      'opacity-0',
      'cursor-pointer'
    );

    // Create the movie poster image
    const posterImg = document.createElement('img');
    posterImg.src = movie.poster_path;
    posterImg.alt = movie.movie_name;
    posterImg.classList.add('w-full', 'md:h-64', 'object-cover');

    // Create the movie title container
    const titleDiv = document.createElement('div');
    titleDiv.classList.add('p-4');
    
    const releaseYearText = document.createElement('h5');
    releaseYearText.classList.add('text-l', 'font-semibold');
    releaseYearText.textContent = `(${movie.release_year})`;
    
    const titleText = document.createElement('h2');
    titleText.classList.add('text-lg', 'font-semibold');
    titleText.textContent = movie.movie_name;

    titleDiv.appendChild(titleText);
    titleDiv.appendChild(releaseYearText);
    movieCard.appendChild(posterImg);
    movieCard.appendChild(titleDiv);

    // Add click event to show detailed movie info
    movieCard.addEventListener('click', () => showMovieDetails(movie));

    movieRecommendations.appendChild(movieCard);

    // Trigger the appear animation after the element is added to the DOM
    requestAnimationFrame(() => {
      movieCard.classList.remove('opacity-0');
      movieCard.classList.add('opacity-100');
    });
  });
}

function showMovieDetails(movie) {
  // Save the selected movie for later use
  sessionStorage.setItem('selectedMovie', JSON.stringify(movie));
  
  const movieSlug = movie.movie_name.toLowerCase().replace(/\s+/g, '-');
  
  window.location.href = `movie-details.html?movie=${movieSlug}`;
}

// Store the last query to compare with the current one
let lastSearchQuery = sessionStorage.getItem('lastSearchQuery') || '';

// Listen for changes on the input field
promptInput.addEventListener('input', () => {
  const currentQuery = promptInput.value.trim();
  // Only clear the displayed results, but keep the stored data
  if (currentQuery !== lastSearchQuery) {
    movieRecommendations.innerHTML = '';
    lastSearchQuery = currentQuery;
  }
});
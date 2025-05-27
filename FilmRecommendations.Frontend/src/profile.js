import { isAuthenticated, getUsername, getTokenPayload } from './auth-utils.js';

document.addEventListener('DOMContentLoaded', () => {
  if (!isAuthenticated()) {
    window.location.href = '/';
    return;
  }

  // Initialize profile information
  initProfile();

  // Fetch and display watchlist
  fetchWatchlist();

  fetchLikedMovies();

  fetchDislikedMovies();

  // Setup theme switcher
  setupThemeSwitcher();

  // Setup profile picture change functionality
  setupProfilePictureChange();
});

function initProfile() {
  const profileImageContainer = document.getElementById('profileImageContainer');
  const profileImage = document.getElementById('profileImage');

  // Ensure proper sizing for the container
  if (profileImageContainer) {
    // Remove any existing size classes that might conflict
    profileImageContainer.classList.remove('w-36', 'h-36', 'w-31', 'h-31');
    // Set the size to a consistent value
    profileImageContainer.classList.add('w-24', 'h-24');
    profileImageContainer.style.maxWidth = '6rem';
    profileImageContainer.style.maxHeight = '6rem';
  }


  const payload = getTokenPayload();
  if (payload) {
    if (payload.email) {
      document.getElementById('profileEmail').textContent = payload.email;
    }

    // Try to calculate join date from token claims if available
    if (payload.nbf) {
      const joinDate = new Date(payload.nbf * 1000);
      document.getElementById('profileJoinDate').textContent = joinDate.toLocaleDateString();
    }

    const savedProfilePic = localStorage.getItem('userProfilePicture');
    if (savedProfilePic) {
      profileImage.src = savedProfilePic;
      profileImage.style.display = 'block';
    }
  }
}

function setupProfilePictureChange() {
  const changeProfilePicButton = document.getElementById('changeProfilePicButton');
  const profilePicInput = document.getElementById('profilePicInput');
  const profileImage = document.getElementById('profileImage');

  changeProfilePicButton.addEventListener('click', () => {
    profilePicInput.click();
  });

  profilePicInput.addEventListener('change', (event) => {
    if (event.target.files && event.target.files[0]) {
      const reader = new FileReader();

      reader.onload = (e) => {
        profileImage.src = e.target.result;
        profileImage.style.display = 'block';

        const letterSpan = profileImage.parentNode.querySelector('div');
        if (letterSpan) {
          letterSpan.remove();
        }

        localStorage.setItem('userProfilePicture', e.target.result);

        showSuccessAlert('Profilbild uppdaterad!');
      };

      reader.readAsDataURL(event.target.files[0]);
    }
  });
}

function setupThemeSwitcher() {
  const themeSwitcher = document.getElementById('themeSwitcher');

  const currentTheme = localStorage.getItem('theme');
  if (currentTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  themeSwitcher.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    if (document.documentElement.classList.contains('dark')) {
      localStorage.setItem('theme', 'dark');
    } else {
      localStorage.setItem('theme', 'light');
    }
  });
}

function showSuccessAlert(message) {
  const successAlert = document.getElementById('successAlert');
  const successAlertMessage = document.getElementById('successAlertMessage');

  successAlertMessage.textContent = message || 'Åtgärden lyckades!';
  successAlert.classList.remove('hidden');

  setTimeout(() => {
    successAlert.classList.add('hidden');
  }, 3000);
}

// Fetch watchlist from the server and display it
function fetchWatchlist() {
  const watchlistContainer = document.getElementById('watchlistContainer');
  const token = localStorage.getItem('authToken');

  if (!token) {
    showErrorAlert('Du måste logga in för att se din watchlist.');
    return;
  }

  fetch('https://localhost:7103/api/Movies/watchlist?pageNumber=0&pageSize=10', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      const moviesContainer = document.querySelector('#watchlistContainer .bg-gray-100');
      moviesContainer.innerHTML = '';

      if (data && data.pageItems && data.pageItems.$values && data.pageItems.$values.length > 0) {
        const movieGrid = document.createElement('div');
        movieGrid.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4';

        // Add each movie to the grid
        data.pageItems.$values.forEach(movie => {
          const movieCard = document.createElement('div');
          movieCard.className = 'bg-white dark:bg-gray-600 p-4 rounded-md shadow-sm flex items-center';

          movieCard.innerHTML = `
            <div class="flex-1">
              <h3 class="font-medium">${movie.title}</h3>
              <p class="text-sm text-gray-500 dark:text-gray-300">TMDB ID: ${movie.tmDbId}</p>
            </div>
            <button class="watchlist-remove-btn ml-2 text-red-500 hover:text-red-700" 
                    data-movie-id="${movie.movieId}">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </button>
          `;

          movieGrid.appendChild(movieCard);
        });

        moviesContainer.appendChild(movieGrid);

        // Add pagination info if relevant
        // if (data.dbItemsCount > data.pageSize) {
        //   const paginationInfo = document.createElement('div');
        //   paginationInfo.className = 'text-sm text-gray-500 dark:text-gray-400 mt-4 text-center';
        //   paginationInfo.textContent = `Visar ${data.pageItems.$values.length} av ${data.dbItemsCount} filmer`;
        //   moviesContainer.appendChild(paginationInfo);
        // }

        const removeButtons = document.querySelectorAll('.watchlist-remove-btn');
        removeButtons.forEach(button => {
          button.addEventListener('click', () => {
            const movieId = button.getAttribute('data-movie-id');
            removeFromWatchlist(movieId);
          });
        });

      } else {
        moviesContainer.innerHTML = `
          <p class="text-gray-500 dark:text-gray-400 italic">Du har inte sparat några filmer än.</p>
        `;
      }
    })
    .catch(error => {
      console.error('Error fetching watchlist:', error);
      showErrorAlert('Kunde inte hämta din watchlist. Försök igen senare.');
    });
}

// Helper function to remove a movie from watchlist
function removeFromWatchlist(movieId) {
  const token = localStorage.getItem('authToken');

  if (!token) {
    showErrorAlert('Du måste logga in för att ta bort filmer från din watchlist.');
    return;
  }

  fetch(`https://localhost:7103/api/Movies/${movieId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      fetchWatchlist();
      fetchLikedMovies();
      fetchDislikedMovies();
      showSuccessAlert('Filmen har tagits bort från din lista');
    })
    .catch(error => {
      console.error('Error removing movie from watchlist:', error);
      showErrorAlert('Kunde inte ta bort filmen från din lista. Försök igen senare.');
    });
}

// Fetch liked movies from the server and display it
function fetchLikedMovies() {
  const likedMoviesContainer = document.getElementById('likedMoviesContainer');
  const token = localStorage.getItem('authToken');

  if (!token) {
    showErrorAlert('Du måste logga in för att se dina gillade filmer.');
    return;
  }

  fetch('https://localhost:7103/api/Movies/LikedMovies?pageNumber=0&pageSize=10', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      const moviesContainer = document.querySelector('#likedMoviesContainer .bg-gray-100');
      moviesContainer.innerHTML = '';

      if (data && data.pageItems && data.pageItems.$values && data.pageItems.$values.length > 0) {
        const movieGrid = document.createElement('div');
        movieGrid.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4';

        // Add each movie to the grid
        data.pageItems.$values.forEach(movie => {
          const movieCard = document.createElement('div');
          movieCard.className = 'bg-white dark:bg-gray-600 p-4 rounded-md shadow-sm flex items-center';

          movieCard.innerHTML = `
            <div class="flex-1">
              <h3 class="font-medium">${movie.title}</h3>
              <p class="text-sm text-gray-500 dark:text-gray-300">TMDB ID: ${movie.tmDbId}</p>
            </div>
            <button class="liked-remove-btn ml-2 text-red-500 hover:text-red-700" 
                    data-movie-id="${movie.movieId}">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6
a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </button>
          `;
          movieGrid.appendChild(movieCard);
        });

        moviesContainer.appendChild(movieGrid);


        const removeButtons = document.querySelectorAll('.liked-remove-btn');
        removeButtons.forEach(button => {
          button.addEventListener('click', () => {
            const movieId = button.getAttribute('data-movie-id');
            removeFromWatchlist(movieId);
          });
        });

      } else {
        moviesContainer.innerHTML = `
          <p class="text-gray-500 dark:text-gray-400 italic">Du har inte sparat några filmer än.</p>
        `;
      }
    })
    .catch(error => {
      console.error('Error fetching watchlist:', error);
      showErrorAlert('Kunde inte hämta din watchlist. Försök igen senare.');
    });
}

// Fetch disliked movies from the server and display it
function fetchDislikedMovies() {
  const dislikedMoviesContainer = document.getElementById('dislikedMoviesContainer');
  const token = localStorage.getItem('authToken');

  if (!token) {
    showErrorAlert('Du måste logga in för att se dina ogillade filmer.');
    return;
  }

  fetch('https://localhost:7103/api/Movies/DislikedMovies?pageNumber=0&pageSize=10', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      const moviesContainer = document.querySelector('#dislikedMoviesContainer .bg-gray-100');
      moviesContainer.innerHTML = '';

      if (data && data.pageItems && data.pageItems.$values && data.pageItems.$values.length > 0) {
        const movieGrid = document.createElement('div');
        movieGrid.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4';

        // Add each movie to the grid
        data.pageItems.$values.forEach(movie => {
          const movieCard = document.createElement('div');
          movieCard.className = 'bg-white dark:bg-gray-600 p-4 rounded-md shadow-sm flex items-center';

          movieCard.innerHTML = `
            <div class="flex-1">
              <h3 class="font-medium">${movie.title}</h3>
              <p class="text-sm text-gray-500 dark:text-gray-300">TMDB ID: ${movie.tmDbId}</p>
            </div>
            <button class="disliked-remove-btn ml-2 text-red-500 hover:text-red-700" 
                    data-movie-id="${movie.movieId}">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </button>
          `;
          movieGrid.appendChild(movieCard);
        });

        moviesContainer.appendChild(movieGrid);
        const removeButtons = document.querySelectorAll('.disliked-remove-btn');
        removeButtons.forEach(button => {
          button.addEventListener('click', () => {
            const movieId = button.getAttribute('data-movie-id');
            removeFromWatchlist(movieId);
          });
        });
      }
      else {
        moviesContainer.innerHTML = `
          <p class="text-gray-500 dark:text-gray-400 italic">Du har inte sparat några filmer än.</p>
        `;
      }
    }
    )
    .catch(error => {
      console.error('Error fetching watchlist:', error);
      showErrorAlert('Kunde inte hämta din watchlist. Försök igen senare.');
    });
}


function showErrorAlert(message) {
  const successAlert = document.getElementById('successAlert');
  const successAlertMessage = document.getElementById('successAlertMessage');

  successAlertMessage.textContent = message || 'Ett fel har inträffat.';
  successAlert.classList.remove('bg-green-100', 'border-green-400', 'text-green-700');
  successAlert.classList.add('bg-red-100', 'border-red-400', 'text-red-700', 'hidden');

  successAlert.classList.remove('hidden');

  setTimeout(() => {
    successAlert.classList.add('hidden');
  }, 3000);
}


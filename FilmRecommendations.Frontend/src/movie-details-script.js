import { addToWatchlist, showNotification, addToLikeList, addToDislikeList } from './movie-buttons-actions.js';

// Navigation History Management
let navigationHistory = JSON.parse(sessionStorage.getItem('navigationHistory')) || [];

// Initialize navigation history if empty (first time on movie details page)
if (navigationHistory.length === 0) {
    // Check if we came from main page
    const referrer = document.referrer;
    if (referrer.includes('index.html') || referrer.includes('localhost:5173') && !referrer.includes('movie-details.html')) {
        navigationHistory.push({ type: 'main', url: referrer || 'index.html' });
    }
}

// Preserve dark mode setting
const currentTheme = localStorage.getItem('theme');
if (currentTheme === 'dark') {
    document.documentElement.classList.add('dark');
} else {
    document.documentElement.classList.remove('dark');
}

// Retrieve the movie data from sessionStorage
const movie = JSON.parse(sessionStorage.getItem('selectedMovie'));

// Initialize navigation history for current movie if needed
function initializeCurrentMovieInHistory() {
    if (movie) {
        const currentHistory = JSON.parse(sessionStorage.getItem('navigationHistory')) || [];
        const movieSlug = movie.movie_name ? 
            movie.movie_name.toLowerCase().replace(/\s+/g, '-') : 
            movie.title.toLowerCase().replace(/\s+/g, '-');
        
        // Check if current movie is already in history
        const currentMovieInHistory = currentHistory.some(item => 
            item.type === 'movie' && item.movieData && item.movieData.movie_id === movie.movie_id
        );
        
        // If not in history, add it (this handles direct URL navigation)
        if (!currentMovieInHistory) {
            currentHistory.push({
                type: 'movie',
                movieData: movie,
                movieSlug: movieSlug,
                url: `movie-details.html?movie=${movieSlug}`
            });
            sessionStorage.setItem('navigationHistory', JSON.stringify(currentHistory));
        }
    }
}

// If no movie data is found, show error message
if (!movie) {
    document.getElementById('movieDetailsContent').innerHTML = `
        <div class="text-center p-4">No movie details available.</div>
    `;
} else {
    // Initialize navigation history for current movie
    initializeCurrentMovieInHistory();
    
    // Update URL in the address bar without reloading the page
    const movieSlug = movie.movie_name ? 
        movie.movie_name.toLowerCase().replace(/\s+/g, '-') : 
        movie.title.toLowerCase().replace(/\s+/g, '-');
    
    // Use search parameters instead of changing the path
    const url = new URL(window.location);
    url.searchParams.set('title', movieSlug);
    window.history.replaceState(null, '', url);
    
    // Show loading state
    document.getElementById('movieDetailsContent').innerHTML = `
        <div class="text-center p-4">Loading movie details...</div>
    `;
    
    // Call function to fetch and display movie details
    showMovieDetails(movie);
}

// Helper function to preload images
function preloadImages(sources) {
    sources.forEach(src => {
        if (src) {
            const img = new Image();
            img.src = src;
        }
    });
}

function showMovieDetails(movie) {
    // Get the content container
    const movieDetailsContent = document.getElementById('movieDetailsContent');
    const movieDetailsContainer = document.getElementById('movieDetailsContainer');
    
    // Fetch detailed movie data using the movie_id property from the selected movie
    fetch(`https://localhost:7103/FilmRecomendations/GetMovieDetails/${movie.movie_id}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Error fetching movie details.');
            }
            return response.json();
        })
        .then(async data => {
            // Set the backdrop image as background if available
            if (data.backdrop_path) {
                console.log("Backdrop path found:", data.backdrop_path);
                const backdropUrl = `https://image.tmdb.org/t/p/original${data.backdrop_path}`;
                
                // Adjust the opacity in the rgba function
                const topOpacity = 0.5; // Opacity at the top (0.1-0.7 recommended)
                const bottomOpacity = Math.min(topOpacity + 0.4, 0.95); // More opaque at bottom, maximum 0.95
                
                // Apply gradient with increased opacity at bottom
                movieDetailsContainer.style.backgroundImage = `linear-gradient(to bottom, 
                    rgba(0, 0, 0, ${topOpacity}) 0%, 
                    rgba(0, 0, 0, ${bottomOpacity}) 100%), 
                    url('${backdropUrl}')`;
                movieDetailsContainer.style.backgroundSize = 'cover';
                movieDetailsContainer.style.backgroundPosition = 'center';
                movieDetailsContainer.style.backgroundRepeat = 'no-repeat';
                
                // Add additional styling to ensure visibility of content
                movieDetailsContainer.classList.remove('bg-gray-100', 'dark:bg-gray-800');
                movieDetailsContainer.classList.add('text-white');
            } else {
                console.log("No backdrop path available in data:", data);
            }

            let runtime = convertRuntime(data.runtime);
            data.runtime = runtime;

            // Fetch streaming providers
            let streamingProviders = null;
            try {
                const providersResponse = await fetch(`https://localhost:7103/FilmRecomendations/GetStreamingProviders/${movie.movie_id}`);
                if (providersResponse.ok) {
                    streamingProviders = await providersResponse.json();
                }
            } catch (error) {
                console.error('Error fetching streaming providers:', error);
            }
            
            // Display the fetched details with improved layout
            movieDetailsContent.innerHTML = `
                <div class="container mx-auto px-4 py-8">
                    <div class="flex flex-col md:flex-row items-start md:items-start gap-8">
                        <div class="w-full md:w-1/3 flex justify-center md:justify-start">
                            <img src="https://image.tmdb.org/t/p/w500${data.poster_path}" alt="${data.original_title}" 
                                class="w-4/5 md:w-full max-w-xs rounded-lg shadow-lg">
                        </div>
                        <div class="w-full md:w-2/3 flex flex-col gap-6">
                            <div>
                                <p class="mb-2 flex items-center font-bold">
                                    <span>${data.vote_average.toString().substring(0, 3)}</span>
                                    <img src="/src/assets/star.png" alt="Star" class="w-3 h-3 ml-1" />
                                </p>
                                <h2 class="text-3xl font-bold mb-4">${data.original_title} (${data.release_date.substring(0, 4)})</h2>
                                <p class="mb-2"><span class="font-semibold">${data.genres.$values.map(genre => genre.name).join(', ')}</span></p>
                                <p class="mb-4">${data.overview}</p>
                                <p class="mb-2"><span class="font-semibold">Length:</span> ${data.runtime}</p>
                                <p class="mb-2"><span class="font-semibold">Country:</span> ${data.production_countries.$values.map(country => country.name).join(', ')}</p>
                                <p class="mb-2"><span class="font-semibold">Director:</span> ${data.directors.$values.map(director => director.name).join(', ')}</p>
                                <div class="mb-6">
                                    <h3 class="text-xl font-semibold mb-6">Main Cast:</h3>
                                    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                                        ${data.actors.$values.slice(0, 6).map(actor => `
                                            <div class="flex flex-col items-center cursor-pointer actor-element" data-actor-id="${actor.id}">
                                                <img 
                                                    src="${actor.profilePath ? 'https://image.tmdb.org/t/p/w200' + actor.profilePath : '/src/assets/default-avatar.png'}" 
                                                    alt="${actor.name}" 
                                                    class="w-16 h-16 object-cover rounded-full border-1 border-white"
                                                    onerror="this.src='/src/assets/default-avatar.png'"
                                                >
                                                <p class="text-center text-sm mt-2">${actor.name}</p>
                                                <p class="text-center text-xs text-gray-500">${actor.character}</p>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                                <hr class="border-t border-gray-300 dark:border-gray-700 mt-4">
                            </div>
                            <div class="flex flex-wrap gap-2">
                                <button id="trailerButton" class="bg-transparent hover:bg-blue-700 text-white font-semibold hover:text-white py-2 px-4 border border-blue-300 hover:border-transparent rounded">
                                    <div class="flex items-center">
                                        <img src="/src/assets/play.png" class="w-4 h-4 me-2"> Trailer
                                    </div>
                                </button>
                                <button id="watchlist" class="bg-transparent hover:bg-blue-700 text-white font-semibold hover:text-white py-2 px-4 border border-blue-300 hover:border-transparent rounded">
                                    <div class="flex items-center">
                                        <img src="/src/assets/layer-plus1.png" class="w-4 h-4 me-2"> Add to List
                                    </div>
                                </button>
                                <button class="bg-transparent hover:bg-blue-700 text-white font-semibold hover:text-white py-2 px-4 border border-blue-300 hover:border-transparent rounded">
                                    <div class="flex items-center">
                                        <img src="/src/assets/check1.png" class="w-4 h-4 me-2"> Mark as Watched
                                    </div>
                                </button>
                                <button id="like" class="bg-transparent hover:bg-green-700 text-white font-semibold hover:text-white py-2 px-4 border border-green-300 hover:border-transparent rounded">
                                    <div class="flex items-center">
                                        <img src="/src/assets/thumbs-up.png" class="w-4 h-4 me-2"> Like
                                    </div>
                                </button>
                                <button id="dislike" class="bg-transparent hover:bg-red-700 text-white font-semibold hover:text-white py-2 px-4 border border-red-300 hover:border-transparent rounded">
                                    <div class="flex items-center">
                                        <img src="/src/assets/thumbs-down.png" class="w-4 h-4 me-2"> Dislike
                                    </div>
                                </button>
                            </div>
                            <details class="group">
                                <summary class="text-l font-bold cursor-pointer">
                                    Where can I stream ${data.original_title}?
                                </summary>
                                <div class="overflow-hidden max-h-0 transition-all duration-300 group-open:max-h-96">
                                    <hr class="border-t border-gray-300 dark:border-gray-700 mt-2 mb-4">
                                    ${renderStreamingProviders(streamingProviders)}
                                </div>
                            </details>
                        </div>
                    </div>
                </div>

                <!-- Trailer Modal -->
                <div id="trailerModal" class="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center hidden">
                    <div class="relative bg-black rounded-lg overflow-hidden w-full max-w-4xl mx-4">
                        <div class="flex justify-between items-center p-2 absolute top-0 right-0 z-10">
                            <button id="closeTrailerModal" class="text-white hover:text-gray-300 p-1 text-xl">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div id="trailerContainer" class="aspect-w-16 aspect-h-9">
                            <!-- YouTube iframe will be inserted here -->
                        </div>
                    </div>
                </div>
            `;
            
            // Add event listener for trailer button
            const trailerButton = document.getElementById('trailerButton');
            if (trailerButton) {
                trailerButton.addEventListener('click', () => playTrailer(data.trailers.$values));
            }
            
            // FIXED: Add event listener for closing the trailer modal with improved handling
            const closeTrailerModal = document.getElementById('closeTrailerModal');
            if (closeTrailerModal) {
                closeTrailerModal.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    closeTrailer();
                });
            }
            
            // Close modal when clicking outside the video
            const trailerModal = document.getElementById('trailerModal');
            if (trailerModal) {
                trailerModal.addEventListener('click', (event) => {
                    if (event.target === trailerModal) {
                        closeTrailer();
                    }
                });
            }
            
            // FIXED: Setup actor click handlers
            setupActorClickHandlers();
        })
        .catch(error => {
            console.error(error);
            
        });
}

// Back button event listener with custom navigation logic
document.getElementById('backButton').addEventListener('click', () => {
    handleBackNavigation();
});

function handleBackNavigation() {
    // Get current navigation history
    const currentHistory = JSON.parse(sessionStorage.getItem('navigationHistory')) || [];
    
    console.log('Current navigation history:', currentHistory);
    console.log('History length:', currentHistory.length);
    
    if (currentHistory.length <= 1) {
        // If we're at the first movie or no history, go to main page
        console.log('Going to main page - history too short');
        sessionStorage.removeItem('navigationHistory'); // Clean up
        window.location.href = 'index.html';
        return;
    }
    
    // Remove current page from history
    currentHistory.pop();
    
    // Get the previous page
    const previousPage = currentHistory[currentHistory.length - 1];
    console.log('Going back to:', previousPage);
    
    // Update history in session storage
    sessionStorage.setItem('navigationHistory', JSON.stringify(currentHistory));
    
    if (previousPage.type === 'main') {
        // Go back to main page
        console.log('Navigating to main page');
        sessionStorage.removeItem('navigationHistory'); // Clean up
        window.location.href = previousPage.url;
    } else if (previousPage.type === 'movie') {
        // Go back to previous movie - set it as selected movie and reload
        console.log('Navigating to previous movie:', previousPage.movieData.movie_name);
        sessionStorage.setItem('selectedMovie', JSON.stringify(previousPage.movieData));
        // Use replace to avoid creating new history entry
        window.location.replace(`movie-details.html?movie=${previousPage.movieSlug}`);
    }
}

function convertRuntime(runtime) {
    const hours = Math.floor(runtime / 60);
    const minutes = runtime % 60;
    return `${hours}h ${minutes}m`;
}

function renderStreamingProviders(providersData) {
    console.log("Providers data:", providersData);
    if (!providersData || !providersData.results || Object.keys(providersData.results).length === 0) {
        return `<p class="mt-2">No streaming options available at this time.</p>`;
    }

    // First try Swedish providers (SE)
    let flatrateProviders = [];
    let rentProviders = [];
    
    // Try to find providers from different regions
    const regions = Object.keys(providersData.results);
    
    // Check Swedish providers first, then try other regions
    const priorityRegions = ['SE', 'US', 'GB'];
    const orderedRegions = [...priorityRegions, ...regions.filter(r => !priorityRegions.includes(r))];
    
    // Find flatrate (streaming) providers
    for (const region of orderedRegions) {
        if (providersData.results[region]?.flatrate?.$values?.length > 0) {
            flatrateProviders = providersData.results[region].flatrate.$values;
            break;
        }
    }
    
    // Find rent providers
    for (const region of orderedRegions) {
        if (providersData.results[region]?.rent?.$values?.length > 0) {
            rentProviders = providersData.results[region].rent.$values;
            break;
        }
    }

    // If no providers found at all
    if (flatrateProviders.length === 0 && rentProviders.length === 0) {
        return `<p class="mt-2">No streaming options available at this time.</p>`;
    }

    // Function to shorten provider names
    function shortenProviderName(name) {
        const nameMap = {
            'Amazon Prime Video': 'Amazon Prime',
            'Google Play Movies': 'Google Play',
            'Apple TV Plus': 'Apple TV+',
            'Apple TV': 'Apple TV',
            'YouTube Premium': 'YouTube',
            'Disney Plus': 'Disney+',
            'HBO Max': 'HBO Max'
        };
        
        return nameMap[name] || name;
    }

    // Build the output HTML
    let html = '';
    
    // Add streaming section if available
    if (flatrateProviders.length > 0) {
        html += `
            <div class="mb-4">
                <h3 class="text-white text-lg font-semibold mb-2">Stream</h3>
                <div class="flex flex-wrap gap-3">
                    ${flatrateProviders.map(provider => 
                        `<div class="flex flex-col items-center">
                            <img src="${provider.logoUrl || `https://image.tmdb.org/t/p/original${provider.logoPath}`}" 
                                alt="${provider.providerName}" 
                                class="w-12 h-12 rounded-lg shadow" 
                                title="${provider.providerName}">
                            <span class="text-xs mt-1">${shortenProviderName(provider.providerName)}</span>
                        </div>`
                    ).join('')}
                </div>
            </div>
        `;
    }
    
    // Add rental section if available
    if (rentProviders.length > 0) {
        html += `
            <div class="mb-4">
                <h3 class="text-white text-lg font-semibold mb-2">Rent</h3>
                <div class="flex flex-wrap gap-3">
                    ${rentProviders.map(provider => 
                        `<div class="flex flex-col items-center">
                            <img src="${provider.logoUrl || `https://image.tmdb.org/t/p/original${provider.logoPath}`}" 
                                alt="${provider.providerName}" 
                                class="w-12 h-12 rounded-lg shadow" 
                                title="${provider.providerName}">
                            <span class="text-xs mt-1">${shortenProviderName(provider.providerName)}</span>
                        </div>`
                    ).join('')}
                </div>
            </div>
        `;
    }
    
    return html;
}

// Function to play trailer video
function playTrailer(trailers) {
    if (!trailers || trailers.length === 0) {
        showNoTrailerMessage();
        return;
    }

    // Find a YouTube trailer, preferring official trailers
    const youtubeTrailers = trailers.filter(trailer => 
        trailer.site.toLowerCase() === 'youtube' && 
        trailer.type.toLowerCase().includes('trailer')
    );
    
    // If no YouTube trailers found, try any YouTube video
    let selectedTrailer = youtubeTrailers.length > 0 ? 
        youtubeTrailers[0] : 
        trailers.find(trailer => trailer.site.toLowerCase() === 'youtube');
    
    if (!selectedTrailer) {
        showNoTrailerMessage();
        return;
    }
    
    // Get the trailer container and create the YouTube iframe
    const trailerContainer = document.getElementById('trailerContainer');

    trailerContainer.innerHTML = `
        <iframe 
            id="youtubeTrailer"
            width="100%" 
            height="100%" 
            src="https://www.youtube.com/embed/${selectedTrailer.key}?autoplay=1" 
            title="${selectedTrailer.name}" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen>
        </iframe>
    `;
    
    // Show the modal
    document.getElementById('trailerModal').classList.remove('hidden');
    
    // Prevent body scrolling when modal is open
    document.body.style.overflow = 'hidden';
}

// FIXED: Improved close trailer function with better cleanup
function closeTrailer() {
    const trailerModal = document.getElementById('trailerModal');
    const trailerContainer = document.getElementById('trailerContainer');
    
    if (trailerModal) {
        trailerModal.classList.add('hidden');
    }
    
    // Clear the container to stop the video
    if (trailerContainer) {
        trailerContainer.innerHTML = '';
    }
    
    // Re-enable body scrolling
    document.body.style.overflow = 'auto';
}

// Function to show a message when no trailer is available
function showNoTrailerMessage() {
    const trailerModal = document.getElementById('trailerModal');
    const trailerContainer = document.getElementById('trailerContainer');
    
    if (trailerContainer) {
        trailerContainer.innerHTML = `
            <div class="flex items-center justify-center h-64 bg-black">
                <div class="text-center text-white p-4">
                    <p class="text-xl font-bold mb-2">No trailer available</p>
                    <p>There is currently no trailer available for this movie.</p>
                </div>
            </div>
        `;
    }
    
    if (trailerModal) {
        trailerModal.classList.remove('hidden');
    }
    
    // Prevent body scrolling when modal is open
    document.body.style.overflow = 'hidden';
}

// Add keyboard event listener for closing the modal with Escape key
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeTrailer();
        closeActorModal();
    }
});

// Add extra darkening effect to background when actor modal is shown
function showActorModalWithBackground() {
    const actorModal = document.getElementById('actorModal');
    const movieDetailsContainer = document.getElementById('movieDetailsContainer');
    const modalContent = actorModal.querySelector('div');
    
    if (actorModal) {
        // First ensure visibility but with initial opacity 0
        actorModal.style.opacity = '0';
        actorModal.classList.remove('hidden');
        
        // Apply initial transform to content for subtle animation
        if (modalContent) {
            modalContent.style.transform = 'translateY(10px)';
            modalContent.style.opacity = '0';
        }
        
        // Force a reflow before starting animation
        void actorModal.offsetWidth;
        
        // Start animation
        actorModal.style.opacity = '1';
        if (modalContent) {
            setTimeout(() => {
                modalContent.style.transform = 'translateY(0)';
                modalContent.style.opacity = '1';
            }, 50);
        }
        
        // Add darkening class to the movie details background
        if (movieDetailsContainer) {
            // Store the original background for later restoration
            if (!movieDetailsContainer.dataset.originalBg) {
                movieDetailsContainer.dataset.originalBg = movieDetailsContainer.style.backgroundImage;
            }
            
            // Apply a darker overlay
            const currentBg = movieDetailsContainer.style.backgroundImage;
            if (currentBg) {
                // Extract and modify the linear gradient part to make it darker
                const bgParts = currentBg.split('url(');
                if (bgParts.length > 1) {
                    // Replace the original gradient with a darker one
                    movieDetailsContainer.style.backgroundImage = `linear-gradient(to bottom, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0.85) 100%), url(${bgParts[1]}`;
                }
            }
        }
        
        // Prevent body scrolling
        document.body.style.overflow = 'hidden';
    }
}

// FIXED: Add back the setupActorClickHandlers function
function setupActorClickHandlers() {
    document.querySelectorAll('.actor-element').forEach(actorElement => {
        actorElement.addEventListener('click', function() {
            const actorId = this.getAttribute('data-actor-id');
            if (actorId) {
                showActorDetails(actorId);
            }
        });
    });
}

function navigateToMovie(movieId, movieTitle) {
    // Create minimal movie data object
    const movieData = {
      movie_id: movieId,
      movie_name: movieTitle
    };
    
    // Add current movie to navigation history before navigating
    const currentHistory = JSON.parse(sessionStorage.getItem('navigationHistory')) || [];
    const movieSlug = movieTitle.toLowerCase().replace(/\s+/g, '-');
    
    // Add the new movie to history
    currentHistory.push({
        type: 'movie',
        movieData: movieData,
        movieSlug: movieSlug,
        url: `movie-details.html?movie=${movieSlug}`
    });
    
    // Store updated history and movie data
    sessionStorage.setItem('navigationHistory', JSON.stringify(currentHistory));
    sessionStorage.setItem('selectedMovie', JSON.stringify(movieData));
    
    // Navigate to the movie details page using replace to avoid browser history buildup
    window.location.replace(`movie-details.html?movie=${movieSlug}`);
  }

// FIXED: Add function to show actor details with improved scrolling for mobile
async function showActorDetails(actorId) {
    const actorModal = document.getElementById('actorModal');
    const actorDetailsContent = document.getElementById('actorDetailsContent');
    
    if (!actorModal || !actorDetailsContent) {
        console.error('Actor modal elements not found');
        return;
    }
    
    // Show loading state
    actorDetailsContent.innerHTML = `
        <div class="flex justify-center items-center p-16">
            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    `;
    
    // Show modal with darkened background
    showActorModalWithBackground();
    
    // Reset scroll position for the content div
    actorDetailsContent.scrollTop = 0;
    
    try {
        // Use the new endpoint that provides summarized actor details
        const response = await fetch(`https://localhost:7103/FilmRecomendations/GetSummarizedActorDetails/${actorId}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch actor details');
        }
        
        const actorDetails = await response.json();
        
        // Handle Leonardo DiCaprio with fixed Titanic poster URL
        if (actorId === "6193" || actorDetails.name === "Leonardo DiCaprio") {
            // Make sure knownForMovies exists
            if (!actorDetails.knownForMovies) {
                actorDetails.knownForMovies = { $values: [] };
            } else if (!actorDetails.knownForMovies.$values) {
                actorDetails.knownForMovies.$values = [];
            }
            
            // Fix Titanic entry if it exists or needs to be added
            let titanicMovie = actorDetails.knownForMovies.$values.find(m => 
                m.title === "Titanic" || m.title === "Titanic: Stories from the Heart");
                
            if (titanicMovie) {
                // Fix existing Titanic entry
                titanicMovie.title = "Titanic";
                titanicMovie.posterPath = "/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg";
            } else {
                // Add Titanic to the known movies
                actorDetails.knownForMovies.$values.push({
                    id: 597,
                    title: "Titanic", 
                    posterPath: "/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg"
                });
            }
        }
        
        // Create content HTML
        actorDetailsContent.innerHTML = `
            <div class="p-6">
                <div class="flex flex-col md:flex-row gap-6">
                    <div class="md:w-1/3">
                        <img 
                            src="${actorDetails.profilePath ? 'https://image.tmdb.org/t/p/w300' + actorDetails.profilePath : '/src/assets/default-avatar.png'}" 
                            alt="${actorDetails.name}" 
                            class="w-full rounded-lg shadow-lg"
                            onerror="this.src='/src/assets/default-avatar.png'"
                        >
                        <div class="mt-4 space-y-1">
                            ${actorDetails.birthday ? `<p><span class="font-semibold">Born:</span> ${new Date(actorDetails.birthday).toLocaleDateString()}</p>` : ''}
                            ${actorDetails.placeOfBirth ? `<p><span class="font-semibold">Birthplace:</span> ${actorDetails.placeOfBirth}</p>` : ''}
                        </div>
                    </div>
                    <div class="md:w-2/3">
                        <h2 class="text-2xl font-bold">${actorDetails.name}</h2>
                        <div class="mt-4">
                            <h3 class="text-lg font-semibold mb-2">Biography</h3>
                            <div class="biography-text">
                                <p>${actorDetails.biography || 'No biography available for this actor.'}</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 class="text-lg font-semibold mb-4">Known For</h3>
                    <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        ${actorDetails.knownForMovies && actorDetails.knownForMovies.$values ? 
                            actorDetails.knownForMovies.$values.slice(0, 4).map(movie => {
                                // Special case for Titanic to ensure correct poster
                                if (movie.title === "Titanic" || movie.title === "Titanic: Stories from the Heart") {
                                    return `
                                    <div class="flex flex-col movie-item cursor-pointer transition duration-200 hover:opacity-80 hover:scale-105" 
                                         data-movie-id="597" 
                                         data-movie-title="Titanic"
                                         data-release-year="1997">
                                        <div class="relative overflow-hidden rounded-lg">
                                            <img 
                                                src="https://image.tmdb.org/t/p/w500/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg" 
                                                alt="Titanic" 
                                                class="w-full shadow transition duration-200"
                                                onerror="this.src='/src/assets/default-poster.png'"
                                            >
                                            <div class="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition duration-200"></div>
                                        </div>
                                        <p class="text-center text-sm mt-2 font-medium">Titanic</p>
                                    </div>
                                    `;
                                }
                                return `
                                <div class="flex flex-col movie-item cursor-pointer transition duration-200 hover:opacity-80 hover:scale-105" 
                                     data-movie-id="${movie.id}" 
                                     data-movie-title="${movie.title}"
                                     data-release-year="${movie.releaseDate ? movie.releaseDate.substring(0, 4) : ''}">
                                    <div class="relative overflow-hidden rounded-lg">
                                        <img 
                                            src="${movie.posterPath ? 'https://image.tmdb.org/t/p/w200' + movie.posterPath : '/src/assets/default-poster.png'}" 
                                            alt="${movie.title}" 
                                            class="w-full shadow transition duration-200"
                                            onerror="this.src='/src/assets/default-poster.png'"
                                        >
                                        <div class="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition duration-200"></div>
                                    </div>
                                    <p class="text-center text-sm mt-2 font-medium">${movie.title}</p>
                                </div>
                                `;
                            }).join('') : 
                            '<p>No movie information available.</p>'
                        }
                    </div>
                </div>
            </div>
        `;
        
        // Set up click handlers for movie items after rendering the content
        setupMovieClickHandlers();
        
    } catch (error) {
        console.error('Error fetching actor details:', error);
        actorDetailsContent.innerHTML = `
            <div class="text-center p-8">
                <p class="text-xl text-red-500 mb-2">Error</p>
                <p>Could not load actor information. Please try again later.</p>
            </div>
        `;
    }
}

// Function to handle movie click events
function setupMovieClickHandlers() {
  document.querySelectorAll('.movie-item').forEach(movieElement => {
    movieElement.addEventListener('click', function() {
      const movieId = this.getAttribute('data-movie-id');
      const movieTitle = this.getAttribute('data-movie-title');
      
      if (movieId && movieTitle) {
        navigateToMovie(movieId, movieTitle);
      }
    });
  });
}

// FIXED: Enhanced closeActorModal function to restore original background
function closeActorModal() {
    const actorModal = document.getElementById('actorModal');
    const movieDetailsContainer = document.getElementById('movieDetailsContainer');
    const modalContent = actorModal.querySelector('div');
    
    if (actorModal) {
        // Start fade out animation
        actorModal.style.opacity = '0';
        
        // Animate the modal content
        if (modalContent) {
            modalContent.style.transform = 'translateY(8px)';
            modalContent.style.opacity = '0';
        }
        
        // Wait for animation to complete before hiding completely
        setTimeout(() => {
            actorModal.classList.add('hidden');
            
            // Reset transform for next time
            if (modalContent) {
                modalContent.style.transform = '';
                modalContent.style.opacity = '';
            }
            
            // Reset opacity
            actorModal.style.opacity = '';
            
            // Restore original background if we stored it
            if (movieDetailsContainer && movieDetailsContainer.dataset.originalBg) {
                movieDetailsContainer.style.backgroundImage = movieDetailsContainer.dataset.originalBg;
            }
            
            // Re-enable body scrolling
            document.body.style.overflow = 'auto';
        }, 180);
    }
}

// FIXED: Ensure the actor modal close button has a proper event listener
document.addEventListener('DOMContentLoaded', () => {
    const closeActorModalBtn = document.getElementById('closeActorModal');
    if (closeActorModalBtn) {
        closeActorModalBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeActorModal();
        });
    }
    
    // Close actor modal when clicking outside content
    const actorModal = document.getElementById('actorModal');
    if (actorModal) {
        actorModal.addEventListener('click', (event) => {
            if (event.target === actorModal) {
                closeActorModal();
            }
        });
    }
});

// Display fallback static movie data in case of API failure
function displayStaticMovieData(movie) {
    const movieDetailsContent = document.getElementById('movieDetailsContent');
    
    movieDetailsContent.innerHTML = `
        <div class="container mx-auto px-4 py-8">
            <div class="flex flex-col md:flex-row items-start md:items-start gap-8">
                <div class="w-full md:w-1/3 flex justify-center md:justify-start">
                    <img src="${movie.poster_path || '/src/assets/default-poster.png'}" 
                        alt="${movie.movie_name}" 
                        class="w-4/5 md:w-full max-w-xs rounded-lg shadow-lg"
                        onerror="this.src='/src/assets/default-poster.png'">
                </div>
                <div class="w-full md:w-2/3 flex flex-col gap-6">
                    <div>
                        <h2 class="text-3xl font-bold mb-4">${movie.movie_name} (${movie.release_year})</h2>
                        <p class="mb-4 text-gray-300">Unable to load detailed information at this time.</p>
                        <div class="bg-red-800 bg-opacity-20 text-red-200 p-4 rounded-lg mb-4">
                            <p>We're having trouble connecting to the movie database. Please try again later.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Movie CRUD operations
// Add event listener for watchlist button
document.addEventListener('click', (event) => {
    if (event.target.closest('#watchlist')) {
        // Get the currently displayed movie
        fetch(`https://localhost:7103/FilmRecomendations/GetMovieDetails/${movie.movie_id}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error fetching movie details.');
                }
                return response.json();
            })
            .then(data => {
                addToWatchlist(data);
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Ett fel inträffade. Kunde inte hämta filmdetaljer.', 'error');
            });
    }
});

document.addEventListener('click', (event) => {
    if(event.target.closest('#like')) {
        fetch(`https://localhost:7103/FilmRecomendations/GetMovieDetails/${movie.movie_id}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error fetching movie details.');
                }
                return response.json();
            })
            .then(data => {
                addToLikeList(data);
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Ett fel inträffade. Kunde inte hämta filmdetaljer.', 'error');
            });
    }
});

document.addEventListener('click', (event) => {
    if(event.target.closest('#dislike')) {
        fetch(`https://localhost:7103/FilmRecomendations/GetMovieDetails/${movie.movie_id}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error fetching movie details.');
                }
                return response.json();
            })
            .then(data => {
                addToDislikeList(data);
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Ett fel inträffade. Kunde inte hämta filmdetaljer.', 'error');
            });
    }
});


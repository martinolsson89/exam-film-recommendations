import { saveAuthToken, removeAuthToken, isAuthenticated, getUsername } from './auth-utils.js';

// Register modal functionality
const registerButton = document.getElementById('registerButton');
const registerModal = document.getElementById('registerModal');
const closeRegisterModal = document.getElementById('closeRegisterModal');
const registerForm = document.getElementById('registerForm');
const modalContent = registerModal.querySelector('div');

const logoutButton = document.createElement('button');
logoutButton.id = 'logoutButton';
logoutButton.className = 'bg-red-600 hover:bg-red-500 text-white font-semibold hover:text-white py-2 px-4 rounded';
logoutButton.innerHTML = '<div class="flex items-center">Logga ut</div>';

const userDisplay = document.createElement('span');
userDisplay.id = 'userDisplay';
userDisplay.className = 'mr-4 font-bold pt-2 text-gray-900 dark:text-gray-100';

const profilePicture = document.createElement('div');
profilePicture.id = 'profilePicture';
profilePicture.className = 'w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center cursor-pointer overflow-hidden border-2 border-white dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-400 transition-colors';
profilePicture.innerHTML = '<img src="/src/assets/default-avatar.png" onerror="this.style.display=\'none\';this.parentNode.innerHTML=\'<span class=\\\'text-xl font-bold text-gray-700 dark:text-gray-300\\\'>U</span>\';" class="w-full h-full object-cover">';
profilePicture.title = "Min profil";

// Add click event to redirect to profile page
profilePicture.addEventListener('click', () => {
    window.location.href = '/profile.html';
  });

registerButton.addEventListener('click', () => {
  registerModal.classList.remove('hidden');
  // Animate in
  setTimeout(() => {
    modalContent.classList.remove('opacity-0', 'scale-95');
    modalContent.classList.add('opacity-100', 'scale-100');
  }, 10);
});

closeRegisterModal.addEventListener('click', closeRegisterModalFunction);

// Close when clicking outside the modal content
registerModal.addEventListener('click', (e) => {
  if (e.target === registerModal) {
    closeRegisterModalFunction();
  }
});

function closeRegisterModalFunction() {
  // Animate out
  modalContent.classList.remove('opacity-100', 'scale-100');
  modalContent.classList.add('opacity-0', 'scale-95');
  
  // Hide after animation completes
  setTimeout(() => {
    registerModal.classList.add('hidden');
  }, 300);
}

// Alert handling functions
function showSuccessAlert(message) {
    const successAlert = document.getElementById('successAlert');
    const successAlertMessage = document.getElementById('successAlertMessage');
    
    successAlertMessage.textContent = message || 'Registrering lyckades!';
    successAlert.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      successAlert.classList.add('hidden');
    }, 5000);
  }

  function showErrorAlert(message) {
  const errorAlert = document.getElementById('errorAlert');
  const errorAlertMessage = document.getElementById('errorAlertMessage');
  
  // Use innerHTML instead of textContent to allow HTML formatting
  errorAlertMessage.innerHTML = message || 'Ett fel uppstod vid registrering';
  
  // Make the alert wider for multi-line messages
  if (message && message.includes('<br>')) {
    errorAlert.classList.add('max-w-md', 'w-auto');
  } else {
    errorAlert.classList.remove('max-w-md', 'w-auto');
  }
  
  errorAlert.classList.remove('hidden');
  
  // Auto-hide after longer time for more complex messages
  setTimeout(() => {
    errorAlert.classList.add('hidden');
    // Reset width classes after hiding
    errorAlert.classList.remove('max-w-md', 'w-auto');
  }, 8000); // 8 seconds for password errors to give users time to read
}

function showModalError(modalId, message) {
    const modalError = document.getElementById(`${modalId}ModalError`);
    const modalErrorMessage = document.getElementById(`${modalId}ModalErrorMessage`);
    
    // Use innerHTML instead of textContent to allow HTML formatting
    modalErrorMessage.innerHTML = message || 'Ett fel uppstod. Försök igen';
    
    // Make the alert wider for multi-line messages
    if (message && message.includes('<br>')) {
      modalError.classList.add('text-sm');
    } else {
      modalError.classList.remove('text-sm');
    }
    
    modalError.classList.remove('hidden');
  }
  
  function clearModalError(modalId) {
    const modalError = document.getElementById(`${modalId}ModalError`);
    if (modalError) {
      modalError.classList.add('hidden');
    }
  }

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Clear previous error messages
    clearModalError('register');
    
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    console.log('Registration submitted:', { username, email, password });
    
    try {
      const response = await fetch('https://localhost:7103/api/Auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('Success:', data);
        showSuccessAlert('Ditt konto har skapats! Du kan nu logga in');
        closeRegisterModalFunction();
        registerForm.reset();
      } else {
        console.error('Error:', data);
        // Handle specific error messages from the API
        let errorMessage = 'Ett fel uppstod vid registrering';
        
        // Check if data.errors is an array (password validation errors)
        if (data.errors && Array.isArray(data.errors)) {
          errorMessage = 'Lösenordet måste uppfylla följande krav:<br>';
          errorMessage += data.errors.map(err => `• ${err}`).join('<br>');
        }
        // Handle array directly
        else if (Array.isArray(data)) {
          errorMessage = 'Lösenordet måste uppfylla följande krav:<br>';
          errorMessage += data.map(err => `• ${err}`).join('<br>');
        }
        // Handle structured errors object
        else if (data.errors) {
          // Check for specific error types
          if (data.errors.Email) {
            errorMessage = `E-post: ${data.errors.Email[0]}`;
          } else if (data.errors.Password) {
            if (Array.isArray(data.errors.Password)) {
              errorMessage = 'Lösenordsfel:<br>';
              errorMessage += data.errors.Password.map(err => `• ${err}`).join('<br>');
            } else {
              errorMessage = `Lösenord: ${data.errors.Password[0]}`;
            }
          } else if (data.errors.Username) {
            errorMessage = `Användarnamn: ${data.errors.Username[0]}`;
          }
        } else if (data.message) {
          errorMessage = data.message;
        }
        
        // Show error in the modal instead of the global alert
        showModalError('register', errorMessage);
      }
    } catch (error) {
      console.error('Error:', error);
      showModalError('register', 'Kunde inte ansluta till servern. Försök igen senare');
    }
  });

// Login modal functionality
const loginButton = document.getElementById('loginButton');
const loginModal = document.getElementById('loginModal');
const closeLoginModal = document.getElementById('closeLoginModal');
const loginForm = document.getElementById('loginForm');
const loginModalContent = loginModal.querySelector('div');

loginButton.addEventListener('click', () => {
  loginModal.classList.remove('hidden');
  // Animate in
  setTimeout(() => {
    loginModalContent.classList.remove('opacity-0', 'scale-95');
    loginModalContent.classList.add('opacity-100', 'scale-100');
  }, 10);
});

closeLoginModal.addEventListener('click', closeLoginModalFunction);

// Close when clicking outside the modal content
loginModal.addEventListener('click', (e) => {
  if (e.target === loginModal) {
    closeLoginModalFunction();
  }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Clear previous error messages
    clearModalError('login');
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    console.log('Login submitted:', { email, password, rememberMe });
    
    try {
      const response = await fetch('https://localhost:7103/api/Auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('Login Success:', data);
        
        // Store the JWT token
        if (data.token) {
          saveAuthToken(data.token);
          updateAuthUI();
          showSuccessAlert('Inloggning lyckades!');
        }
        
        closeLoginModalFunction();
        loginForm.reset();
      } else {
        console.error('Login Error:', data);
        // Show error in the modal instead of the global alert
        showModalError('login', data.message || 'Felaktig e-post eller lösenord');
      }
    } catch (error) {
      console.error('Login Error:', error);
      showModalError('login', 'Kunde inte ansluta till servern. Försök igen senare');
    }
  });
  
  function closeLoginModalFunction() {
    // Animate out
    loginModalContent.classList.remove('opacity-100', 'scale-100');
    loginModalContent.classList.add('opacity-0', 'scale-95');
    
    // Hide after animation completes
    setTimeout(() => {
      loginModal.classList.add('hidden');
      clearModalError('login'); // Clear any error messages
      loginForm.reset(); // Reset the form
    }, 300);
  }
  function updateAuthUI() {
    const authContainer = document.querySelector('.flex.gap-3.absolute.top-4.right-6.z-10 .flex.flex-wrap.gap-3');
  
    if (isAuthenticated()) {
      // User is logged in
      loginButton.classList.add('hidden');
      registerButton.classList.add('hidden');
      
      // Set username in display
      const username = getUsername();
      if (username) {
        userDisplay.textContent = `Inloggad som: ${username}`;
        
        // Set first letter of username as fallback in case image fails to load
        if (username.length > 0) {
          const firstLetter = username.charAt(0).toUpperCase();
          profilePicture.querySelector('span') && (profilePicture.querySelector('span').textContent = firstLetter);
        }
      }
      
      // Add user display and profile elements if not already there
      if (!document.getElementById('userDisplay')) {
        authContainer.prepend(userDisplay);
      }
      
      if (!document.getElementById('profilePicture')) {
        authContainer.appendChild(profilePicture);
      }
      
      if (!document.getElementById('logoutButton')) {
        authContainer.appendChild(logoutButton);
      }
    } else {
      // User is not logged in
      loginButton.classList.remove('hidden');
      registerButton.classList.remove('hidden');
      
      // Remove user display, profile picture and logout button if they exist
      if (document.getElementById('userDisplay')) {
        userDisplay.remove();
      }
      
      if (document.getElementById('profilePicture')) {
        profilePicture.remove();
      }
      
      if (document.getElementById('logoutButton')) {
        logoutButton.remove();
      }
    }
  }
  
  // Add logout functionality
  logoutButton.addEventListener('click', () => {
    removeAuthToken();
    updateAuthUI();
    showSuccessAlert('Du har loggats ut');
  });
  
  // Call this function on page load to set the initial state
  document.addEventListener('DOMContentLoaded', updateAuthUI);

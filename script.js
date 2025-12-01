/* ============================================
   GLOBAL WEATHER FORECAST APP - JAVASCRIPT
   ============================================ */

// API Configuration
const API_KEY = '48d10e169fff261c7715cef26fa5ee74';
const WEATHER_API = 'https://api.openweathermap.org/data/2.5/weather';
const FORECAST_API = 'https://api.openweathermap.org/data/2.5/forecast';
const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';

// Popular Cities for Autocomplete
const popularCities = [
    'London', 'Paris', 'New York', 'Tokyo', 'Dubai', 'Sydney', 'Singapore', 'Hong Kong',
    'Bangkok', 'Istanbul', 'Barcelona', 'Rome', 'Amsterdam', 'Berlin', 'Madrid', 'Vienna',
    'Prague', 'Warsaw', 'Moscow', 'Cairo', 'Lagos', 'Johannesburg', 'Mexico City', 'Toronto',
    'Vancouver', 'São Paulo', 'Buenos Aires', 'Lima', 'Santiago', 'Mumbai', 'Delhi',
    'Bangalore', 'Manila', 'Jakarta', 'Seoul', 'Osaka', 'Shanghai', 'Beijing', 'Kuala Lumpur',
    'Hanoi', 'Ho Chi Minh', 'Baramulla', 'Auckland', 'Christchurch', 'Honolulu', 'Miami',
    'Los Angeles', 'San Francisco', 'Chicago', 'Boston', 'Seattle', 'Denver', 'Austin'
];

// Weather Icons Mapping
const weatherIcons = {
    'Clear': '☀️',
    'Clouds': '☁️',
    'Rain': '🌧️',
    'Drizzle': '🌦️',
    'Thunderstorm': '⛈️',
    'Snow': '❄️',
    'Mist': '🌫️',
    'Smoke': '🌫️',
    'Haze': '🌫️',
    'Dust': '🌫️',
    'Fog': '🌫️',
    'Sand': '🌫️',
    'Ash': '🌫️',
    'Squall': '💨',
    'Tornado': '🌪️'
};

// Favorites Storage
let favorites = JSON.parse(localStorage.getItem('weatherFavorites')) || [];

// ============================================
// TAB SWITCHING
// ============================================

function switchTab(tabName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Remove active from all tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected page
    if (tabName === 'location') {
        document.getElementById('locationPage').classList.add('active');
        document.getElementById('tabLocation').classList.add('active');
    } else {
        document.getElementById('searchPage').classList.add('active');
        document.getElementById('tabSearch').classList.add('active');
    }
}

// ============================================
// GEOLOCATION - MY LOCATION TAB
// ============================================

function getMyLocation() {
    showLoading('locationLoading');
    clearError('locationError');

    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser', 'locationError');
        hideLoading('locationLoading');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        position => {
            const { latitude, longitude } = position.coords;
            getLocationName(latitude, longitude, 'location');
        },
        error => {
            hideLoading('locationLoading');
            let errorMsg = 'Unable to get your location.';
            if (error.code === 1) {
                errorMsg = '📍 Location permission denied. Please enable location access in browser settings.';
            } else if (error.code === 2) {
                errorMsg = '📍 Location information is not available.';
            } else if (error.code === 3) {
                errorMsg = '📍 Location request timed out. Please try again.';
            }
            showError(errorMsg, 'locationError');
        },
        { timeout: 10000, enableHighAccuracy: false }
    );
}

// Get location name from coordinates
async function getLocationName(lat, lon, pageType) {
    try {
        const response = await fetch(`${NOMINATIM_REVERSE}?lat=${lat}&lon=${lon}&format=json`);
        const data = await response.json();

        if (data.address) {
            const city = data.address.city || data.address.town || data.address.village || 'Unknown';
            const country = data.address.country || 'World';
            getWeatherByCoordinates(lat, lon, city, country, pageType);
        }
    } catch (error) {
        hideLoading(pageType === 'location' ? 'locationLoading' : 'searchLoading');
        showError('Failed to determine your location name', pageType === 'location' ? 'locationError' : 'searchError');
    }
}

// ============================================
// SEARCH FUNCTIONALITY
// ============================================

function handleSearchInput() {
    const input = document.getElementById('searchInput').value.trim().toLowerCase();
    const autocompleteList = document.getElementById('autocompleteList');

    if (input.length < 1) {
        autocompleteList.classList.remove('show');
        return;
    }

    const filtered = popularCities.filter(city => city.toLowerCase().includes(input)).slice(0, 8);

    if (filtered.length === 0) {
        autocompleteList.classList.remove('show');
        return;
    }

    autocompleteList.innerHTML = filtered.map(city => 
        `<div class="autocomplete-item" onclick="selectCity('${city}')">${city}</div>`
    ).join('');
    autocompleteList.classList.add('show');
}

function selectCity(cityName) {
    document.getElementById('searchInput').value = cityName;
    document.getElementById('autocompleteList').classList.remove('show');
    searchWeather();
}

function searchWeather() {
    const city = document.getElementById('searchInput').value.trim();

    if (!city) {
        showError('Please enter a city name', 'searchError');
        return;
    }

    showLoading('searchLoading');
    clearError('searchError');

    getCoordinatesFromCity(city, 'search');
}

// Get coordinates from city name
async function getCoordinatesFromCity(cityName, pageType) {
    try {
        const response = await fetch(`${NOMINATIM_SEARCH}?q=${encodeURIComponent(cityName)}&format=json&limit=1`);
        const data = await response.json();

        if (!data || data.length === 0) {
            hideLoading(pageType === 'location' ? 'locationLoading' : 'searchLoading');
            showError(`City "${cityName}" not found. Try another city name.`, pageType === 'location' ? 'locationError' : 'searchError');
            return;
        }

        const result = data[0];
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        const city = result.name;
        const country = result.address?.country || 'World';

        getWeatherByCoordinates(lat, lon, city, country, pageType);
    } catch (error) {
        hideLoading(pageType === 'location' ? 'locationLoading' : 'searchLoading');
        showError('Failed to find location. Please try again.', pageType === 'location' ? 'locationError' : 'searchError');
    }
}

// ============================================
// FETCH WEATHER DATA
// ============================================

async function getWeatherByCoordinates(lat, lon, cityName, country, pageType) {
    try {
        const containerId = pageType === 'location' ? 'locationWeather' : 'searchWeather';
        const loadingId = pageType === 'location' ? 'locationLoading' : 'searchLoading';
        const errorId = pageType === 'location' ? 'locationError' : 'searchError';

        // Fetch current weather and forecast
        const [currentRes, forecastRes] = await Promise.all([
            fetch(`${WEATHER_API}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`),
            fetch(`${FORECAST_API}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`)
        ]);

        if (!currentRes.ok || !forecastRes.ok) {
            throw new Error('Failed to fetch weather data');
        }

        const currentData = await currentRes.json();
        const forecastData = await forecastRes.json();

        displayWeather(currentData, forecastData, cityName, country, containerId);
        hideLoading(loadingId);
        updateLastUpdate();

        // Save to favorites if search
        if (pageType === 'search') {
            addToFavorites(cityName, country);
        }
    } catch (error) {
        hideLoading(pageType === 'location' ? 'locationLoading' : 'searchLoading');
        showError('Unable to fetch weather data. Please try again.', pageType === 'location' ? 'locationError' : 'searchError');
    }
}

// ============================================
// DISPLAY WEATHER
// ============================================

function displayWeather(currentData, forecastData, cityName, country, containerId) {
    const current = currentData;
    const icon = getWeatherIcon(current.weather[0].main);

    let html = `
        <div class="current-weather-card">
            <div class="weather-icon">${icon}</div>
            <div class="temperature">${Math.round(current.main.temp)}°C</div>
            <div class="weather-condition">${current.weather[0].main}</div>
            <div class="weather-location">📍 ${cityName}, ${country}</div>
            <div class="feels-like">Feels like ${Math.round(current.main.feels_like)}°C</div>
        </div>

        <div class="detail-grid">
            <div class="detail-card">
                <div class="detail-icon">💧</div>
                <div class="detail-label">Humidity</div>
                <div class="detail-value">${current.main.humidity}%</div>
            </div>
            <div class="detail-card">
                <div class="detail-icon">🌍</div>
                <div class="detail-label">Pressure</div>
                <div class="detail-value">${current.main.pressure} hPa</div>
            </div>
            <div class="detail-card">
                <div class="detail-icon">💨</div>
                <div class="detail-label">Wind Speed</div>
                <div class="detail-value">${Math.round(current.wind.speed)} m/s</div>
            </div>
            <div class="detail-card">
                <div class="detail-icon">☁️</div>
                <div class="detail-label">Cloudiness</div>
                <div class="detail-value">${current.clouds.all}%</div>
            </div>
            <div class="detail-card">
                <div class="detail-icon">🌡️</div>
                <div class="detail-label">Feels Like</div>
                <div class="detail-value">${Math.round(current.main.feels_like)}°C</div>
            </div>
            <div class="detail-card">
                <div class="detail-icon">👁️</div>
                <div class="detail-label">Visibility</div>
                <div class="detail-value">${(current.visibility / 1000).toFixed(1)} km</div>
            </div>
        </div>

        <div class="forecast-section">
            <div class="forecast-title">⏰ Hourly Forecast (Next 24 Hours)</div>
            <div class="hourly-forecast">
                ${getHourlyForecast(forecastData.list)}
            </div>
        </div>

        <div class="forecast-section">
            <div class="forecast-title">📅 7-Day Forecast</div>
            <div class="daily-forecast">
                ${getDailyForecast(forecastData.list)}
            </div>
        </div>
    `;

    document.getElementById(containerId).innerHTML = html;
}

// Get hourly forecast HTML
function getHourlyForecast(forecastList) {
    const hourly = forecastList.slice(0, 8); // 8 * 3 hours = 24 hours

    return hourly.map(item => {
        const time = new Date(item.dt * 1000);
        const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        const icon = getWeatherIcon(item.weather[0].main);

        return `
            <div class="hourly-card">
                <div class="hourly-time">${timeStr}</div>
                <div class="hourly-icon">${icon}</div>
                <div class="hourly-temp">${Math.round(item.main.temp)}°</div>
            </div>
        `;
    }).join('');
}

// Get 7-day forecast HTML
function getDailyForecast(forecastList) {
    const dailyData = {};

    // Group forecast data by day
    forecastList.forEach(item => {
        const date = new Date(item.dt * 1000);
        const day = date.toLocaleDateString('en-US');

        if (!dailyData[day]) {
            dailyData[day] = {
                temps: [],
                weather: item.weather[0],
                dt: item.dt
            };
        }
        dailyData[day].temps.push(item.main.temp);
    });

    // Create daily cards
    return Object.entries(dailyData)
        .slice(0, 7)
        .map(([day, data]) => {
            const minTemp = Math.min(...data.temps);
            const maxTemp = Math.max(...data.temps);
            const dayName = new Date(data.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' });
            const icon = getWeatherIcon(data.weather.main);

            return `
                <div class="daily-card">
                    <div class="daily-day">${dayName}</div>
                    <div class="daily-icon">${icon}</div>
                    <div class="daily-temps">
                        <span class="temp-max">${Math.round(maxTemp)}°</span>
                        <span class="temp-min">${Math.round(minTemp)}°</span>
                    </div>
                </div>
            `;
        }).join('');
}

// Get weather icon
function getWeatherIcon(weatherCondition) {
    return weatherIcons[weatherCondition] || '🌡️';
}

// ============================================
// FAVORITES MANAGEMENT
// ============================================

function addToFavorites(cityName, country) {
    const favStr = `${cityName}, ${country}`;
    if (!favorites.includes(favStr)) {
        favorites.push(favStr);
        localStorage.setItem('weatherFavorites', JSON.stringify(favorites));
        updateFavoritesUI();
    }
}

function loadFavorite(favStr) {
    const [city] = favStr.split(',');
    document.getElementById('searchInput').value = city.trim();
    searchWeather();
}

function updateFavoritesUI() {
    const container = document.getElementById('favoritesContainer');

    if (favorites.length === 0) {
        container.innerHTML = '';
        return;
    }

    const html = `
        <p style="width: 100%; text-align: center; color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 10px;">⭐ Saved Favorites:</p>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;">
            ${favorites.map(fav => `
                <button class="fav-btn" onclick="loadFavorite('${fav}')">${fav}</button>
            `).join('')}
        </div>
    `;

    container.innerHTML = html;
}

// ============================================
// UI HELPERS
// ============================================

function showLoading(containerId) {
    document.getElementById(containerId).innerHTML = `
        <div class="loading-container">
            <div class="spinner"></div>
            <div class="loading-text">Fetching weather data...</div>
        </div>
    `;
}

function hideLoading(containerId) {
    document.getElementById(containerId).innerHTML = '';
}

function showError(message, containerId) {
    document.getElementById(containerId).innerHTML = `
        <div class="error-message">⚠️ ${message}</div>
    `;
    setTimeout(() => {
        document.getElementById(containerId).innerHTML = '';
    }, 5000);
}

function clearError(containerId) {
    document.getElementById(containerId).innerHTML = '';
}

function updateLastUpdate() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    document.getElementById('lastUpdate').textContent = timeStr;
}

// ============================================
// INITIALIZATION
// ============================================

window.addEventListener('load', () => {
    updateFavoritesUI();

    // Load London weather on startup
    document.getElementById('searchInput').value = 'London';
    searchWeather();

    // Allow Enter key to search
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchWeather();
        }
    });

    // Close autocomplete when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            document.getElementById('autocompleteList').classList.remove('show');
        }
    });
});

import { topSearches } from './mock_data.js';

// DOM Elements
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const chips = document.querySelectorAll('.chip');
const resultsSection = document.getElementById('results-section');
const loadingState = document.getElementById('loading-state');
const searchResults = document.getElementById('search-results');
const searchContent = document.getElementById('search-content');
const errorState = document.getElementById('error-state');
const shareBtn = document.getElementById('share-btn');
const toast = document.getElementById('toast');
const trendingSection = document.getElementById('trending-section');
const trendingGrid = document.getElementById('trending-grid');
const homeBtn = document.getElementById('home-btn');

// Settings Elements
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const themeRadios = document.getElementsByName('theme');
const featureCheckboxes = document.querySelectorAll('input[name="feature"]');

// State
let activeModifiers = new Set();
// NOTE: For local testing, add your API key here. For production, ensure restrictions are set.
const SERPER_API_KEY = '9005beb0f0747559353b40c4aeb4548fb0a730fd';
const searchCache = new Map();
let isSearching = false;

// Default Preferences
let userPrefs = {
    theme: 'auto',
    features: ['exact', 'pdf', 'youtube', 'drive', 'wiki', 'news', 'academic', 'related', 'intitle', 'before']
};

// Initialize Event Listeners
function init() {
    loadPreferences();

    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    chips.forEach(chip => {
        chip.addEventListener('click', () => toggleModifier(chip));
    });

    if (homeBtn) {
        homeBtn.addEventListener('click', handleHome);
    }

    if (shareBtn) {
        shareBtn.addEventListener('click', handleShare);
    }

    // Settings Event Listeners
    settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));

    // Close modal on clicking outside
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) settingsModal.classList.add('hidden');
    });

    themeRadios.forEach(radio => {
        radio.addEventListener('change', handleThemeChange);
    });

    featureCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', handleFeatureChange);
    });

    // Render the Top 50 right away
    renderTrendingCards();

    // Check URL parameters on load
    parseUrlParams();
}

// ---- Preferences & Settings ----

function loadPreferences() {
    const saved = localStorage.getItem('powerSearchPrefs');
    if (saved) {
        userPrefs = JSON.parse(saved);
    }
    applyTheme(userPrefs.theme);
    applyFeatures(userPrefs.features);

    // Sync UI to state
    themeRadios.forEach(r => r.checked = (r.value === userPrefs.theme));
    featureCheckboxes.forEach(cb => {
        cb.checked = userPrefs.features.includes(cb.value);
    });
}

function savePreferences() {
    localStorage.setItem('powerSearchPrefs', JSON.stringify(userPrefs));
}

function handleThemeChange(e) {
    const newTheme = e.target.value;
    userPrefs.theme = newTheme;
    savePreferences();
    applyTheme(newTheme);
}

function applyTheme(themeMode) {
    const htmlElement = document.documentElement;
    htmlElement.classList.remove('light', 'dark');
    if (themeMode === 'light') htmlElement.classList.add('light');
    if (themeMode === 'dark') htmlElement.classList.add('dark');
    // if auto, it remains classes, relying on @media queries
}

function handleFeatureChange() {
    // Rebuild features array based on checked boxes
    userPrefs.features = Array.from(featureCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    savePreferences();
    applyFeatures(userPrefs.features);
}

function applyFeatures(activeFeatures) {
    chips.forEach(chip => {
        const modifier = chip.dataset.modifier;
        if (activeFeatures.includes(modifier)) {
            chip.classList.remove('hidden');
        } else {
            chip.classList.add('hidden');
            // If we hide an active chip, untoggle it
            if (activeModifiers.has(modifier)) {
                toggleModifier(chip);
            }
        }
    });
}

// --------------------------------

// Render Trending Cards
function renderTrendingCards() {
    trendingGrid.innerHTML = '';

    // Only display top 10 instead of 50
    topSearches.slice(0, 10).forEach(item => {
        const card = document.createElement('div');
        card.classList.add('trending-card');
        card.innerHTML = `
            <h3 class="card-query">🔍 ${item.query}</h3>
            <p class="card-summary">${item.summary}</p>
        `;

        // When clicked, perform the search but pass the pre-computed summary
        card.addEventListener('click', () => {
            searchInput.value = item.query;
            handleSearch(false, item.summary);
        });

        trendingGrid.appendChild(card);
    });
}

// Handle Chip Clicks
function toggleModifier(chipElement) {
    const modifier = chipElement.dataset.modifier;

    if (activeModifiers.has(modifier)) {
        activeModifiers.delete(modifier);
        chipElement.classList.remove('active');
    } else {
        activeModifiers.add(modifier);
        chipElement.classList.add('active');
    }
}

// Build the final query string based on active modifiers (for Gemini)
function buildQuery(baseQuery) {
    let finalQuery = baseQuery;

    if (activeModifiers.has('exact')) {
        finalQuery = `"${finalQuery}"`;
    }
    if (activeModifiers.has('pdf')) {
        finalQuery += ' filetype:pdf';
    }
    if (activeModifiers.has('youtube')) {
        finalQuery += ' site:youtube.com';
    }
    if (activeModifiers.has('drive')) {
        finalQuery += ' site:drive.google.com';
    }
    if (activeModifiers.has('wiki')) {
        finalQuery += ' site:wikipedia.org';
    }
    if (activeModifiers.has('news')) {
        finalQuery += ' (site:news.google.com OR site:reuters.com OR site:apnews.com)';
    }
    if (activeModifiers.has('academic')) {
        finalQuery += ' (site:scholar.google.com OR site:edu)';
    }

    // Advanced search hacks
    if (activeModifiers.has('related')) {
        // Find URLs similar to a specific input
        finalQuery = `related:${finalQuery}`;
    }
    if (activeModifiers.has('intitle')) {
        // Force the resulting pages to have the query exactly in their HTML <title>
        finalQuery = `intitle:${finalQuery}`;
    }
    if (activeModifiers.has('before')) {
        // Filter out recent noise by fetching older content
        finalQuery += ` before:2023-01-01`;
    }

    return finalQuery;
}

// Update the URL without reloading the page
function updateUrl(query) {
    const url = new URL(window.location);
    url.searchParams.set('q', query);

    if (activeModifiers.size > 0) {
        url.searchParams.set('modifiers', Array.from(activeModifiers).join(','));
    } else {
        url.searchParams.delete('modifiers');
    }

    window.history.pushState({}, '', url);
}

// Handle Home button click
function handleHome() {
    // Clear search input
    searchInput.value = '';
    
    // Remove query parameters from URL without reloading
    const url = new URL(window.location);
    url.searchParams.delete('q');
    url.searchParams.delete('modifiers');
    window.history.pushState({}, '', url);
    
    // Reset UI visibility
    resultsSection.classList.add('hidden');
    loadingState.classList.add('hidden');
    searchResults.classList.add('hidden');
    errorState.classList.add('hidden');
    
    // Show trending feed again
    trendingSection.classList.remove('hidden');
}

// Handle Search Submission
// Optional prepopulatedSummary parameter allows us to instantly load a mock card
async function handleSearch(skipUrlUpdate = false, prepopulatedSummary = null) {
    if (isSearching) return;

    const baseQuery = searchInput.value.trim();
    if (!baseQuery) return;

    if (!skipUrlUpdate) {
        updateUrl(baseQuery);
    }

    const finalQuery = buildQuery(baseQuery);

    // Hide trending section
    trendingSection.classList.add('hidden');

    // Show Loading State
    resultsSection.classList.remove('hidden');
    loadingState.classList.remove('hidden');
    searchResults.classList.add('hidden');
    errorState.classList.add('hidden');

    // If it's a click from the trending cards, show instantly
    if (prepopulatedSummary) {
        // slight artificial delay just to show loading state briefly for effect
        setTimeout(() => {
            displayResults(prepopulatedSummary);
        }, 300);
        return;
    }

    // Check Cache before making an API call
    if (searchCache.has(finalQuery)) {
        displayResults(searchCache.get(finalQuery));
        return;
    }

    isSearching = true;
    try {
        const resultData = await fetchSerperResults(finalQuery);
        searchCache.set(finalQuery, resultData);
        displayResults(resultData);
    } catch (error) {
        console.error("Search failed:", error);
        handleFallback(error, finalQuery);
    } finally {
        isSearching = false;
    }
}

// Fetch real Google Results from Serper.dev API
async function fetchSerperResults(query) {
    if (!SERPER_API_KEY) {
        throw new Error("Missing Serper API Key.");
    }

    const endpoint = `https://google.serper.dev/search`;

    const requestBody = {
        q: query,
        num: 15 // Fetch top 15 results
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'X-API-KEY': SERPER_API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        throw new Error(`API returned status: ${response.status}`);
    }

    const data = await response.json();
    return data;
}

// Render JSON from Serper API to HTML
function displayResults(data) {
    let htmlContent = '';

    // If Google returned an Answer Box snippet
    if (data.answerBox) {
        htmlContent += `
            <div class="result-card answer-box">
                <h3 class="result-title">${data.answerBox.title}</h3>
                <p class="result-snippet">${data.answerBox.snippet || data.answerBox.answer}</p>
                ${data.answerBox.link ? `<a href="${data.answerBox.link}" target="_blank" class="result-link">Read more</a>` : ''}
            </div>
        `;
    }

    // Render Organic Results
    if (data.organic && data.organic.length > 0) {
        data.organic.forEach(result => {
            htmlContent += `
                <div class="result-card">
                    <a href="${result.link}" target="_blank" class="result-link-wrapper">
                        <h3 class="result-title">${result.title}</h3>
                    </a>
                    <div class="result-url">${result.link}</div>
                    <p class="result-snippet">${result.snippet}</p>
                </div>
            `;
        });
    } else if (!data.answerBox) {
        htmlContent = `<p>No results found for this search.</p>`;
    }

    searchContent.innerHTML = htmlContent;

    loadingState.classList.add('hidden');
    searchResults.classList.remove('hidden');
}

// Fallback to standard Google Search (Instant, Silent Redirect)
function handleFallback(errorObj, fallbackQuery = null) {
    // Determine the query to use (prioritize the one with modifiers if passed)
    const queryToUse = fallbackQuery || searchInput.value.trim();
    if (!queryToUse) return;

    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(queryToUse)}`;
    
    // Use location.replace so the failed search state isn't saved in browser history,
    // avoiding the immediate redirect loop if the user clicks "Back"
    window.location.replace(searchUrl);
}

// Parse URL Parameters
function parseUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get('q');
    const modifiersAttr = urlParams.get('modifiers');

    if (q) {
        // Hide trending section if deep linked
        trendingSection.classList.add('hidden');

        searchInput.value = q;

        if (modifiersAttr) {
            const mods = modifiersAttr.split(',');
            mods.forEach(mod => {
                const chip = document.querySelector(`.chip[data-modifier="${mod}"]`);
                if (chip) {
                    activeModifiers.add(mod);
                    chip.classList.add('active');
                }
            });
        }

        // Trigger search automatically
        handleSearch(true);
    }
}

// Handle Share button click
function handleShare() {
    const url = window.location.href;

    navigator.clipboard.writeText(url).then(() => {
        showToast("Link copied to clipboard!");
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.remove('hidden');

    // Small delay to allow element to render before adding show class
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.classList.add('hidden'), 300); // match transition duration
    }, 3000);
}

// Run init when DOM is ready
document.addEventListener('DOMContentLoaded', init);

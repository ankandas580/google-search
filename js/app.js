// Paste your key from Google AI Studio between the quotes below
const API_KEY = "AIzaSyD7c1VqovNhZYC1vwURhHY-ey61exMmm0"; 

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsContainer = document.getElementById('resultsContainer');

// Chip Toggle Logic
document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', function() {
        this.classList.toggle('active');
    });
});

searchBtn.addEventListener('click', async () => {
    const query = searchInput.value.trim();
    if (!query) return;

    // Prepare search tricks
    let modifiers = "";
    if (document.getElementById('chipReddit').classList.contains('active')) modifiers += " site:reddit.com";
    if (document.getElementById('chipPDF').classList.contains('active')) modifiers += " filetype:pdf";
    if (document.getElementById('chipYT').classList.contains('active')) modifiers += " site:youtube.com";
    
    let finalQuery = query;
    if (document.getElementById('chipExact').classList.contains('active')) finalQuery = `"${query}"`;
    finalQuery += modifiers;

    searchBtn.innerText = "Searching...";
    resultsContainer.innerHTML = "<div class='result-item'>AI is browsing the web for you...</div>";

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `Search Google for: ${finalQuery}. Summarize the answer and provide 3-5 key source links.` }] }],
                tools: [{ googleSearch: {} }]
            })
        });

        const data = await response.json();
        const aiText = data.candidates[0].content.parts[0].text;

        resultsContainer.innerHTML = `
            <div class="result-item">
                <div class="ai-header">✨ AI Overview</div>
                <div>${aiText.replace(/\n/g, '<br>')}</div>
            </div>
            <p style="text-align:center;">
                <a href="https://www.google.com/search?q=${encodeURIComponent(finalQuery)}" target="_blank" style="color:var(--accent); text-decoration:none;">Open in Google Search →</a>
            </p>
        `;

    } catch (error) {
        console.error(error);
        resultsContainer.innerHTML = "<div class='result-item'>API Limit reached. Redirecting to Google...</div>";
        setTimeout(() => {
            window.location.href = `https://www.google.com/search?q=${encodeURIComponent(finalQuery)}`;
        }, 1500);
    } finally {
        searchBtn.innerText = "Search";
    }
});

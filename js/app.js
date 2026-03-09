const API_KEY = "AIzaSyD7c1VqovNhZYC1vwURhHY-ey61exMmm0"; 

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsContainer = document.getElementById('resultsContainer');

// Chip Toggle functionality
document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('active'));
});

searchBtn.addEventListener('click', async () => {
    const query = searchInput.value.trim();
    if (!query) return;

    // Apply "Tricks" (Filters)
    let filters = "";
    if (document.getElementById('chipReddit').classList.contains('active')) filters += " site:reddit.com";
    if (document.getElementById('chipPDF').classList.contains('active')) filters += " filetype:pdf";
    if (document.getElementById('chipYT').classList.contains('active')) filters += " site:youtube.com";
    
    let finalQuery = document.getElementById('chipExact').classList.contains('active') ? `"${query}"` : query;
    finalQuery += filters;

    searchBtn.innerText = "Searching...";
    resultsContainer.innerHTML = "<div class='result-item'>AI is browsing the web...</div>";

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `Search for: ${finalQuery}. Summarize the answer and list source links.` }] }],
                tools: [{ googleSearch: {} }] 
            })
        });

        const data = await response.json();
        const aiResponse = data.candidates[0].content.parts[0].text;
        
        resultsContainer.innerHTML = `
            <div class="result-item">
                <div class="ai-title">✨ AI Overview</div>
                <div class="result-snippet">${aiResponse.replace(/\n/g, '<br>')}</div>
            </div>
            <p style="text-align:center;"><a href="https://www.google.com/search?q=${encodeURIComponent(finalQuery)}" target="_blank" style="color:var(--accent); text-decoration:none;">See all results on Google →</a></p>
        `;
    } catch (error) {
        resultsContainer.innerHTML = "<div class='result-item'>Error. Redirecting...</div>";
        window.location.href = `https://www.google.com/search?q=${encodeURIComponent(finalQuery)}`;
    } finally {
        searchBtn.innerText = "Search";
    }
});

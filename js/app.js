const API_KEY = "AIzaSyAD7c1VqovNhZYC1vwURhHY-ey61exMmm0";

document.getElementById('searchBtn').addEventListener('click', async () => {
    const query = document.getElementById('searchInput').value;
    const results = document.getElementById('resultsContainer');
    
    results.innerHTML = "Thinking...";

    try {
        // We use v1beta for the latest search features
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `Search for: ${query}` }] }],
                tools: [{ googleSearch: {} }] 
            })
        });

        const data = await response.json();
        console.log("API Response:", data); // Check your browser console for this!

        if (data.candidates) {
            results.innerHTML = `<div class="result-item">${data.candidates[0].content.parts[0].text}</div>`;
        } else {
            results.innerHTML = "Error: Check Console for details.";
        }
    } catch (e) {
        results.innerHTML = "Connection failed.";
        console.error(e);
    }
});

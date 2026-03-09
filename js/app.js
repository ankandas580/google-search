// This script just handles the visual clicking of the buttons so you can test the UI.
// There is ZERO backend or API code in here right now.

const chips = document.querySelectorAll('.chip');
const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');

// Make the chips turn purple when clicked
chips.forEach(chip => {
    chip.addEventListener('click', function() {
        this.classList.toggle('active');
    });
});

// A dummy search button click effect
searchBtn.addEventListener('click', () => {
    if(searchInput.value.trim() === "") {
        alert("Type something in the search bar first!");
    } else {
        searchBtn.innerText = "Searching...";
        setTimeout(() => {
            searchBtn.innerText = "Search";
            alert("UI looks good! Ready to connect the backend when you are.");
        }, 800);
    }
});

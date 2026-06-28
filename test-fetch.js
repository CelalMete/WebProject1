// test-fetch.js
const url = 'rapidapi.com'; // e.g., https://horology-api.p.rapidapi.com/watches/rolex
const options = {
    method: 'GET',
    headers: {
        'X-RapidAPI-Key': 'd0c7e2a094msha766446627229a1p1ef8e2jsn1bde45cea62b', // Get this from your RapidAPI dashboard
        'X-RapidAPI-Host': 'watch-database1.p.rapidapi.com' // e.g., horology-api.p.rapidapi.com
    }
};

async function fetchWatchData() {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        
        // Output the raw JSON payload to the terminal
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("Fetch failed:", error);
    }
}

fetchWatchData();
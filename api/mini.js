// api/mini.js - Vercel serverless function to proxy NYT Mini API
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { date } = req.query;
        
        if (!date) {
            res.status(400).json({ error: 'Date parameter is required (YYYY-MM-DD format)' });
            return;
        }

        console.log(`Fetching NYT Mini for date: ${date}`);
        
        // CORRECTED: Use the proper NYT puzzle endpoint
        const nytUrl = `https://www.nytimes.com/svc/crosswords/v6/puzzle/mini/${date}.json`;
        
        const response = await fetch(nytUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Referer': 'https://www.nytimes.com/crosswords/game/mini',
            }
        });
        
        if (!response.ok) {
            console.error(`NYT API error: ${response.status} ${response.statusText}`);
            
            if (response.status === 404) {
                res.status(404).json({ 
                    error: 'Puzzle not found for this date',
                    message: 'The NYT Mini might not be available for this date'
                });
                return;
            }
            
            res.status(response.status).json({ 
                error: `NYT API returned ${response.status}: ${response.statusText}` 
            });
            return;
        }
        
        const json = await response.json();
        console.log(`Successfully fetched puzzle for ${date}`);
        
        // Send the JSON response
        res.status(200).json(json);
        
    } catch (error) {
        console.error('Error fetching NYT Mini:', error);
        res.status(500).json({ 
            error: 'Failed to fetch puzzle data',
            details: error.message 
        });
    }
}
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
        
        // Try the games-assets endpoint which is often more reliable
        const nytUrl = `https://www.nytimes.com/games-assets/v2/mini/${date}.json`;
        
        const response = await fetch(nytUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'Referer': 'https://www.nytimes.com/crosswords/game/mini',
                'Origin': 'https://www.nytimes.com'
            }
        });
        
        if (!response.ok) {
            console.error(`NYT API error: ${response.status} ${response.statusText}`);
            
            // Try alternative endpoint
            console.log('Trying alternative endpoint...');
            const altUrl = `https://www.nytimes.com/svc/crosswords/v2/puzzle/mini/${date}.json`;
            
            const altResponse = await fetch(altUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': '*/*',
                    'Referer': 'https://www.nytimes.com/crosswords'
                }
            });
            
            if (!altResponse.ok) {
                res.status(404).json({ 
                    error: 'Unable to fetch puzzle from NYT',
                    message: 'The NYT API may have changed or the puzzle may not be available for this date',
                    tried: [nytUrl, altUrl]
                });
                return;
            }
            
            const altData = await altResponse.json();
            res.status(200).json(altData);
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
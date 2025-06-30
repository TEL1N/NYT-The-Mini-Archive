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

        // Convert date format from YYYY-MM-DD to YYYY/MM/DD for the URL
        const dateParts = date.split('-');
        const urlDate = `${dateParts[0]}/${parseInt(dateParts[1])}/${parseInt(dateParts[2])}`;

        console.log(`Fetching NYT Mini for date: ${date} (URL format: ${urlDate})`);
        
        // This is the format that works with the embedded puzzle data
        const nytUrl = `https://www.nytimes.com/crosswords/game/mini/${urlDate}`;
        
        const response = await fetch(nytUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });
        
        if (!response.ok) {
            console.error(`NYT page returned: ${response.status}`);
            res.status(404).json({ 
                error: 'Unable to fetch puzzle from NYT',
                message: 'The puzzle may not be available for this date'
            });
            return;
        }
        
        const html = await response.text();
        
        // Extract the puzzle data from the HTML
        // NYT embeds the puzzle data in a script tag
        const puzzleMatch = html.match(/window\.gameData\s*=\s*({.*?})\s*;/s);
        
        if (!puzzleMatch) {
            // Try alternative pattern
            const altMatch = html.match(/"gameData":\s*({.*?}),\s*"/s);
            if (!altMatch) {
                console.error('Could not find puzzle data in HTML');
                res.status(404).json({ 
                    error: 'Puzzle data not found',
                    message: 'Could not extract puzzle data from NYT page'
                });
                return;
            }
            
            const gameData = JSON.parse(altMatch[1]);
            res.status(200).json(gameData);
            return;
        }
        
        const gameData = JSON.parse(puzzleMatch[1]);
        console.log(`Successfully extracted puzzle for ${date}`);
        
        res.status(200).json(gameData);
        
    } catch (error) {
        console.error('Error fetching NYT Mini:', error);
        
        // Return a more structured demo puzzle as fallback
        const [year, month, day] = req.query.date.split('-');
        res.status(200).json({
            meta: {
                publishedAt: req.query.date,
                title: `Mini Crossword - Demo`
            },
            board: {
                cells: [
                    {x: 0, y: 0, answer: "P", number: 1},
                    {x: 1, y: 0, answer: "I"},
                    {x: 2, y: 0, answer: "A"},
                    {x: 3, y: 0, answer: "N"},
                    {x: 4, y: 0, answer: "O"},
                    // ... add more cells as needed
                ]
            },
            clues: {
                across: [
                    {number: 1, text: "Musical keyboard instrument"},
                    {number: 6, text: "Taken ___"},
                    // ... more clues
                ],
                down: [
                    {number: 1, text: "Parking areas"},
                    {number: 2, text: "Not in favor of"},
                    // ... more clues
                ]
            }
        });
    }
}
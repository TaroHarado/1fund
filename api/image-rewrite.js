// Vercel serverless function to handle /_next/image requests
// Rewrites Next.js image optimization URLs to assets folder

const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'Missing url parameter' });
    }

    // Decode the URL parameter (e.g., %2Fimages%2Fexchanges%2Faster.png -> /images/exchanges/aster.png)
    const imageUrl = decodeURIComponent(url);

    // Extract filename from path (e.g., /images/exchanges/aster.png -> aster)
    const filenameMatch = imageUrl.match(/\/([^/]+)\.(png|jpg|jpeg|webp)$/i);

    if (!filenameMatch) {
      return res.status(400).json({ error: 'Invalid image URL format' });
    }

    const filename = filenameMatch[1].toLowerCase(); // Convert to lowercase
    const assetPath = path.join(process.cwd(), 'assets', `${filename}.webp`);

    // Check if file exists
    if (!fs.existsSync(assetPath)) {
      console.error(`Asset not found: ${assetPath}, original: ${imageUrl}`);
      return res.status(404).json({ error: 'Image not found' });
    }

    // Read and serve the file
    const fileBuffer = await fs.promises.readFile(assetPath);
    
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.status(200).send(fileBuffer);

  } catch (error) {
    console.error('Error in image-rewrite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}


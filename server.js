const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3001;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

// Route mapping for Next.js static export
const routeMap = {
  '/': 'index.html',
  '/api-docs': 'api-docs.html',
  '/charts': 'charts.html',
  '/backtester': 'backtester.html',
  '/funding/historical': 'funding/historical.html',
};

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function serveFile(filePath, res) {
  const fullPath = path.join(__dirname, filePath);
  
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      console.error(`Error serving file ${filePath}:`, err.message);
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(`<h1>404 - File Not Found</h1><p>Requested: ${filePath}</p>`);
      return;
    }
    
    const contentType = getContentType(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;
  
  // Log request for debugging
  console.log(`${req.method} ${pathname}`);
  
  // Remove trailing slash except for root
  if (pathname !== '/' && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }
  
  // Handle Next.js image optimization API - redirect to assets folder
  if (pathname === '/_next/image' && parsedUrl.query.url) {
    try {
      // Decode the URL parameter (e.g., %2Fimages%2Fexchanges%2Faster.png -> /images/exchanges/aster.png)
      const imageUrl = decodeURIComponent(parsedUrl.query.url);
      
      // Extract filename from path (e.g., /images/exchanges/aster.png -> aster)
      const filenameMatch = imageUrl.match(/\/([^/]+)\.(png|jpg|jpeg|webp)$/i);
      
      if (filenameMatch) {
        const filename = filenameMatch[1].toLowerCase(); // Convert to lowercase
        const assetPath = `assets/${filename}.webp`;
        const fullAssetPath = path.join(__dirname, assetPath);
        
        // Check if file exists in assets folder
        fs.stat(fullAssetPath, (err, stats) => {
          if (!err && stats.isFile()) {
            console.log(`Image redirect: ${imageUrl} -> /${assetPath}`);
            serveFile(assetPath, res);
          } else {
            console.error(`Asset not found: ${assetPath}, original: ${imageUrl}`);
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(`<h1>404 - Image Not Found</h1><p>Asset: ${assetPath}</p>`);
          }
        });
        return;
      }
    } catch (err) {
      console.error('Error parsing image URL:', err);
    }
  }
  
  // Handle static files from _next directory
  if (pathname.startsWith('/_next/')) {
    const filePath = pathname.substring(1); // Remove leading slash
    serveFile(filePath, res);
    return;
  }
  
  // Handle assets folder
  if (pathname.startsWith('/assets/')) {
    const filePath = pathname.substring(1); // Remove leading slash
    serveFile(filePath, res);
    return;
  }
  
  // Handle other static files (images, fonts, etc.)
  if (pathname.includes('.')) {
    const filePath = pathname.substring(1); // Remove leading slash
    serveFile(filePath, res);
    return;
  }
  
  // Check route map first
  if (routeMap[pathname]) {
    serveFile(routeMap[pathname], res);
    return;
  }
  
  // Try to serve the file directly
  const filePath = pathname === '/' ? 'index.html' : pathname.substring(1);
  const fullPath = path.join(__dirname, filePath);
  
  fs.stat(fullPath, (err, stats) => {
    if (!err && stats.isFile()) {
      serveFile(filePath, res);
    } else {
      // Try adding .html extension
      const htmlPath = filePath + '.html';
      const fullHtmlPath = path.join(__dirname, htmlPath);
      
      fs.stat(fullHtmlPath, (err, stats) => {
        if (!err && stats.isFile()) {
          serveFile(htmlPath, res);
        } else {
          // Fallback to index.html for client-side routing
          console.log(`Route not found: ${pathname}, serving index.html`);
          serveFile('index.html', res);
        }
      });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log('Press Ctrl+C to stop the server');
});


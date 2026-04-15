const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const { getFreePort } = require('./portManager');
const { openBrowser } = require('./browser');

let serverInstance = null;
let activePort = null;
let wss = null;
let watcher = null;
let debounceTimer = null;

// ─────────────────────────────────────────────────────────────────────────────
// The WebSocket client snippet injected into every HTML response.
// The port value is baked in at server-start time.
// ─────────────────────────────────────────────────────────────────────────────
function getClientScript(port) {
    return `<script>
/* AirGrove Live Server */
(function(){
  function connect(){
    var ws=new WebSocket('ws://localhost:${port}');
    ws.onopen=function(){console.log('[AirGrove] Live reload connected ✓');};
    ws.onmessage=function(e){
      var d=JSON.parse(e.data);
      if(d.t==='css'){
        document.querySelectorAll('link[rel="stylesheet"]').forEach(function(l){
          l.href=l.href.split('?')[0]+'?_lv='+Date.now();
        });
        console.log('[AirGrove] CSS hot-swapped');
      } else {
        console.log('[AirGrove] Reloading…');
        location.reload();
      }
    };
    ws.onclose=function(){setTimeout(connect,1500);};
  }
  connect();
})();
</script>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Inject the client script before </body>.
// Falls back to appending if </body> is missing.
// ─────────────────────────────────────────────────────────────────────────────
function inject(html, port) {
    const script = getClientScript(port);
    return html.includes('</body>')
        ? html.replace('</body>', script + '</body>')
        : html + script;
}

// ─────────────────────────────────────────────────────────────────────────────
// Broadcast helper
// ─────────────────────────────────────────────────────────────────────────────
function broadcast(type) {
    if (!wss) return;
    const msg = JSON.stringify({ t: type });
    let n = 0;
    wss.clients.forEach(function (client) {
        if (client.readyState === 1) { client.send(msg); n++; }
    });
    if (n) console.log('[Live Server] Broadcast "' + type + '" → ' + n + ' client(s)');
}

// ─────────────────────────────────────────────────────────────────────────────
// startServer
// ─────────────────────────────────────────────────────────────────────────────
async function startServer(projectPath, activeFilePath = null) {
    if (serverInstance) {
        await openBrowser(activePort, projectPath, activeFilePath);
        return activePort;
    }

    activePort = await getFreePort();
    const app = express();

    // ── Step 1: HTML injection middleware (MUST come before express.static) ───
    //
    // WHY: express.static uses the `send` npm package internally, which pipes
    // files directly using res.end() — it NEVER calls res.send(). Overriding
    // res.send() cannot intercept those responses.
    //
    // FIX: We manually intercept .html requests, read the file ourselves,
    // inject the WS script, and respond. express.static handles everything else.
    //
    app.use(function (req, res, next) {
        // Resolve the URL to a file path
        let urlPath = req.path;
        if (!urlPath || urlPath === '/') urlPath = '/index.html';

        // Bare path with no extension → try /index.html inside that dir
        if (!path.extname(urlPath)) {
            urlPath = urlPath.replace(/\/$/, '') + '/index.html';
        }

        // Only handle HTML
        const ext = path.extname(urlPath).toLowerCase();
        if (ext !== '.html' && ext !== '.htm') return next();

        const filePath = path.join(projectPath, urlPath);
        if (!fs.existsSync(filePath)) return next();

        try {
            let html = fs.readFileSync(filePath, 'utf8');
            html = inject(html, activePort);

            const buf = Buffer.from(html, 'utf8');
            console.log('[Live Server] Serving + injecting', urlPath, '(' + buf.length + ' bytes)');

            res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8',
                'Content-Length': buf.length,
                'Cache-Control': 'no-store, no-cache'
            });
            res.end(buf);
        } catch (err) {
            console.error('[Live Server] Injection error:', err.message);
            next();
        }
    });

    // ── Step 2: Serve static assets (CSS, JS, images…) ──────────────────────
    app.use(express.static(projectPath, { index: false }));

    // ── Step 3: HTTP + WebSocket server ──────────────────────────────────────
    serverInstance = http.createServer(app);
    wss = new WebSocketServer({ server: serverInstance });

    wss.on('connection', function (ws) {
        console.log('[Live Server] Browser WebSocket connected');
        ws.on('close', function () { console.log('[Live Server] Browser WebSocket closed'); });
        ws.on('error', function (e) { console.error('[Live Server] WS error:', e.message); });
    });

    // ── Step 4: File watcher (chokidar) ──────────────────────────────────────
    watcher = chokidar.watch(projectPath, {
        ignored: [
            /(^|[/\\])\../,          // dotfiles
            /node_modules/,
            /\.(swp|tmp|bak)$/       // editor temp files
        ],
        ignoreInitial: true,
        persistent: true,
        awaitWriteFinish: {
            stabilityThreshold: 80,  // fire after file hasn't changed for 80ms
            pollInterval: 30
        }
    });

    const handleFileEvent = (filePath, eventType) => {
        const ext = path.extname(filePath).toLowerCase();
        const type = (ext === '.css' || ext === '.scss' || ext === '.less') ? 'css' : 'reload';
        console.log(`[Live Server] File ${eventType}:`, path.basename(filePath), '→', type);

        // Debounce: ignore rapid successive changes
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () { broadcast(type); }, 150);
    };

    watcher.on('change', (path) => handleFileEvent(path, 'changed'));
    watcher.on('add', (path) => handleFileEvent(path, 'added'));
    watcher.on('unlink', (path) => handleFileEvent(path, 'deleted'));

    watcher.on('error', function (err) {
        console.error('[Live Server] Watcher error:', err);
    });

    // ── Step 5: Listen ────────────────────────────────────────────────────────
    return new Promise(function (resolve, reject) {
        serverInstance.on('error', function (err) {
            console.error('[Live Server] Failed to start:', err.message);
            stopServer();
            reject(err);
        });

        serverInstance.listen(activePort, async function () {
            console.log('[Live Server] ✓ http://localhost:' + activePort);
            await openBrowser(activePort, projectPath, activeFilePath);
            resolve(activePort);
        });
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// triggerReload — called by IPC when user saves with Ctrl+S in AirGrove.
// File watcher handles saves too; this gives a faster, parallel signal.
// ─────────────────────────────────────────────────────────────────────────────
function triggerReload() {
    clearTimeout(debounceTimer);
    broadcast('reload');
}

// ─────────────────────────────────────────────────────────────────────────────
// stopServer
// ─────────────────────────────────────────────────────────────────────────────
function stopServer() {
    clearTimeout(debounceTimer);
    debounceTimer = null;

    if (watcher) { watcher.close(); watcher = null; }
    if (wss) { wss.close(); wss = null; }
    if (serverInstance) {
        serverInstance.close();
        serverInstance = null;
        activePort = null;
    }
    console.log('[Live Server] Stopped.');
}

function getPort() { return activePort; }

module.exports = { startServer, stopServer, getPort, triggerReload };

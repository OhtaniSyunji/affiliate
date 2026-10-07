const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const unique = crypto.randomBytes(12).toString('hex');
    cb(null, `${unique}${ext}`);
  }
});

const upload = multer({ storage });

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(__dirname));

function makeId() {
  return crypto.randomBytes(10).toString('hex');
}

function getBaseUrl(req) {
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
  const forwardedHost = (req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();

  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        candidates.push(net.address);
      }
    }
  }

  const preferredIp = candidates.find((ip) => !ip.startsWith('169.254.')) || candidates[0] || '127.0.0.1';
  const hostFromRequest = forwardedHost || req.get('host') || `${preferredIp}:${PORT}`;

  const finalHost = hostFromRequest.includes('localhost') || hostFromRequest.includes('127.0.0.1')
    ? `${preferredIp}:${PORT}`
    : hostFromRequest;

  return `${proto}://${finalHost}`;
}

app.post('/api/create', upload.single('image'), (req, res) => {
  const { targetUrl } = req.body;

  if (!targetUrl) {
    return res.status(400).json({ error: '飛ばしたいサイトのURLが必要です。' });
  }

  if (!req.file) {
    return res.status(400).json({ error: '画像が必要です。' });
  }

  const imagePath = `/uploads/${req.file.filename}`;
  const id = makeId();
  const record = {
    id,
    targetUrl,
    imagePath,
    createdAt: new Date().toISOString()
  };

  fs.writeFileSync(path.join(dataDir, `${id}.json`), JSON.stringify(record, null, 2));

  res.json({
    url: `${getBaseUrl(req)}/share/${id}`,
    id
  });
});

app.get('/share/:id', (req, res) => {
  const filePath = path.join(dataDir, `${req.params.id}.json`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('URLが見つかりませんでした。');
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const baseUrl = getBaseUrl(req);
  const imageUrl = `${baseUrl}${data.imagePath}`;

  res.send(`
    <!DOCTYPE html>
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>affiliateURL</title>
        <meta property="og:type" content="website" />
        <meta property="og:title" content="affiliateURL" />
        <meta property="og:description" content="再生ボタン付きの画像リンクです" />
        <meta property="og:url" content="${baseUrl}/share/${data.id}" />
        <meta property="og:image" content="${imageUrl}" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="affiliateURL" />
        <meta name="twitter:description" content="再生ボタン付きの画像リンクです" />
        <meta name="twitter:image" content="${imageUrl}" />
        <style>
          :root {
            --bg: #f4f7fb;
            --panel: #fff;
            --primary: #1f6feb;
            --primary-dark: #0e4bb3;
            --text: #1d2433;
            --muted: #68768d;
            --border: #dfe7f3;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: Arial, sans-serif;
            background: linear-gradient(180deg, #eef4ff 0%, var(--bg) 100%);
            color: var(--text);
            display: grid;
            place-items: center;
            min-height: 100vh;
          }
          .page {
            width: min(92vw, 620px);
            padding: 24px;
          }
          .card {
            background: var(--panel);
            border-radius: 24px;
            border: 1px solid var(--border);
            box-shadow: 0 18px 38px rgba(25, 42, 68, 0.12);
            padding: 24px;
          }
          .image-box {
            width: 100%;
            position: relative;
            display: block;
            border-radius: 22px;
            overflow: hidden;
            box-shadow: 0 12px 24px rgba(31, 111, 235, 0.12);
            background: linear-gradient(135deg, #dfeeff, #f4f8ff);
          }
          .image-box img {
            width: 100%;
            height: auto;
            display: block;
          }
          .play-button {
            position: absolute;
            left: 50%;
            top: 50%;
            width: 90px;
            height: 90px;
            transform: translate(-50%, -50%);
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.9);
            box-shadow: 0 12px 26px rgba(0,0,0,0.15);
            pointer-events: none;
          }
          .play-button::before {
            content: "";
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-28%, -50%);
            width: 0;
            height: 0;
            border-top: 18px solid transparent;
            border-bottom: 18px solid transparent;
            border-left: 30px solid var(--primary);
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="card">
            <a href="${data.targetUrl}" target="_blank" rel="noopener noreferrer" class="image-box">
              <img src="${data.imagePath}" alt="affiliate image" />
              <div class="play-button" aria-hidden="true"></div>
            </a>
          </div>
        </div>
      </body>
    </html>
  `);
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`LAN access: http://$(ipconfig getifaddr en0):${PORT}`);
});

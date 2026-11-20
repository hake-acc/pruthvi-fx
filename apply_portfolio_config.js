const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'portfolio.config.js');
if (!fs.existsSync(configPath)) {
  console.log('No portfolio.config.js found.');
  process.exit(0);
}

const config = require(configPath);
console.log(`Applying portfolio configuration (mode: ${config.mode || 'custom'})...`);

const publicDir = path.join(__dirname, 'public');
const rootDir = __dirname;

// 1. Update HTML files
function updateHtmlFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let html = fs.readFileSync(filePath, 'utf8');

  if (config.personal) {
    if (config.personal.name) {
      html = html.replace(/<title>.*?<\/title>/gi, `<title>${config.personal.name} ✲ Portfolio</title>`);
      html = html.replace(/content="Pacôme Pertant"/g, `content="${config.personal.name}"`);
    }
    if (config.personal.email) {
      html = html.replace(/mailto:pertantpacome@gmail\.com/g, `mailto:${config.personal.email}`);
      html = html.replace(/pertantpacome@gmail\.com/g, config.personal.email);
    }
    if (config.personal.role) {
      html = html.replace(/motion &amp; sound designer based in paris/g, config.personal.role);
      html = html.replace(/motion and sound designer based in Paris/g, config.personal.role);
    }
  }

  fs.writeFileSync(filePath, html, 'utf8');
}

updateHtmlFile(path.join(publicDir, 'index.html'));
updateHtmlFile(path.join(rootDir, 'index.html'));
updateHtmlFile(path.join(rootDir, 'about.html'));
updateHtmlFile(path.join(publicDir, 'about', 'index.html'));

console.log('HTML files synced.');

// 2. Update Payload if custom projects or data provided
const payloadPath = path.join(publicDir, '_payload.json');
if (fs.existsSync(payloadPath) && config.personal) {
  try {
    let payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));

    // Update email in payload strings
    if (config.personal.email) {
      payload = payload.map(item => {
        if (typeof item === 'string' && item === 'pertantpacome@gmail.com') {
          return config.personal.email;
        }
        return item;
      });
    }

    // Update project titles / data if defined
    if (Array.isArray(config.projects)) {
      config.projects.forEach((proj, idx) => {
        payload = payload.map(item => {
          if (typeof item === 'string') {
            if (item === `paths-of-life` && proj.slug && idx === 0) return proj.slug;
            if (item === `Paths of life` && proj.title && idx === 0) return proj.title;
          }
          return item;
        });
      });
    }

    fs.writeFileSync(payloadPath, JSON.stringify(payload));
    if (fs.existsSync(path.join(publicDir, 'about', '_payload.json'))) {
      fs.writeFileSync(path.join(publicDir, 'about', '_payload.json'), JSON.stringify(payload));
    }
    console.log('Payload synchronized successfully.');
  } catch (e) {
    console.log('Payload update notice:', e.message);
  }
}

console.log('Sync complete! Changes will be visible immediately at http://localhost:3000/');

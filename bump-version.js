const fs = require('fs');
const manifestPath = 'manifest.json';

try {
  // Read the current manifest.json
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  // Split version into major, minor, patch
  const versionParts = manifest.version.split('.').map(Number);
  // Increment the patch number
  versionParts[2]++;
  // Update version and write back
  manifest.version = versionParts.join('.');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Version bumped to ${manifest.version}`);
} catch (error) {
  console.error('Error bumping version:', error);
  process.exit(1);
}

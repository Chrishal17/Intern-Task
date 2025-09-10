// build.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building project...');

try {
  // Clean dist directory
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true });
  }
  
  // Run TypeScript compiler
  execSync('tsc', { stdio: 'inherit' });
  
  // Copy package.json to dist
  const packageJson = require('./package.json');
  const distPackage = {
    name: packageJson.name,
    version: packageJson.version,
    main: packageJson.main,
    dependencies: packageJson.dependencies,
    engines: packageJson.engines
  };
  
  fs.writeFileSync(
    'dist/package.json',
    JSON.stringify(distPackage, null, 2)
  );
  
  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}
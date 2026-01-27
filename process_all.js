const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Define folders
const rootDir = __dirname;
const mdDir = path.join(rootDir, 'songs_md');
const songsDir = path.join(rootDir, 'songs');
const pdfDir = path.join(rootDir, 'tabs');

// Ensure folders exist
for (const dir of [mdDir, songsDir, pdfDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}

// Get all .md files from songs_md
const mdFiles = fs.readdirSync(mdDir).filter(file => file.endsWith('.md'));

// Function to execute a command and return a Promise
function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${command}`);
        console.error(stderr);
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

async function main() {
  try {
    // Convert all .md files to HTML
    for (const file of mdFiles) {
      const mdPath = path.join(mdDir, file);
      const outFile = path.basename(file, ".md") + ".html";
      const outPath = path.join(songsDir, outFile);
      console.log(`Converting ${file} to HTML...`);
      await runCommand(`node md_to_html.js "${mdPath}" "${outPath}"`);
    }

    // Move all .html files to the 'songs' folder
    //const htmlFiles = fs.readdirSync(rootDir).filter(file => file.endsWith('.html'));
    //for (const file of htmlFiles) {
    //  const oldPath = path.join(rootDir, file);
    //  const newPath = path.join(songsDir, file);
    //  fs.renameSync(oldPath, newPath);
    //  console.log(`Moved ${file} to songs/`);
    //}

    // Run indexing.js (keeps index.html in rootDir)
    console.log('Running indexing.js...');
    await runCommand('node indexing.js');

    console.log('All tasks completed successfully!');
  } catch (err) {
    console.error('An error occurred:', err);
  }
}

main();

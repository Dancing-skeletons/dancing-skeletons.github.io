const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Define folders
const rootDir = __dirname;
const mdDir_ukulele = path.join(rootDir,'ukulele', 'songs_md');
const songsDir_ukulele = path.join(rootDir, 'ukulele', 'songs');
const pdfDir_ukulele = path.join(rootDir, 'ukulele', 'tabs');

// Ensure folders exist
for (const dir of [mdDir_ukulele, songsDir_ukulele, pdfDir_ukulele]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}

// Get all .md files from songs_md
const mdFiles_ukulele = fs.readdirSync(mdDir_ukulele).filter(file => file.endsWith('.md'));


const mdDir_guitar = path.join(rootDir,'guitar', 'songs_md');
const songsDir_guitar = path.join(rootDir, 'guitar', 'songs');
const pdfDir_guitar = path.join(rootDir, 'guitar', 'tabs');

// Ensure folders exist
for (const dir of [mdDir_guitar, songsDir_guitar, pdfDir_guitar]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}

// Get all .md files from songs_md
const mdFiles_guitar = fs.readdirSync(mdDir_guitar).filter(file => file.endsWith('.md'));


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
    for (const file of mdFiles_ukulele) {
      const mdPath = path.join(mdDir_ukulele, file);
      const outFile = path.basename(file, ".md") + ".html";
      const outPath = path.join(songsDir_ukulele, outFile);
      console.log(`Converting ${file} to HTML...`);
      await runCommand(`node md_to_html.js "${mdPath}" "${outPath}"`);
    }
    for (const file of mdFiles_guitar) {
      const mdPath = path.join(mdDir_guitar, file);
      const outFile = path.basename(file, ".md") + ".html";
      const outPath = path.join(songsDir_guitar, outFile);
      console.log(`Converting ${file} to HTML...`);
      await runCommand(`node md_to_html.js "${mdPath}" "${outPath}"`);
    }

    // Run indexing.js (keeps index.html in rootDir)
    console.log('Running indexing.js...');
    await runCommand('node indexing.js');

    console.log('All tasks completed successfully!');
  } catch (err) {
    console.error('An error occurred:', err);
  }
}

main();

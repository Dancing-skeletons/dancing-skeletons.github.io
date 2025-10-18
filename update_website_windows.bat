@echo off
node process_all.js
git add .
git commit -m "update"
git push -u origin master

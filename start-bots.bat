@echo off
cd /d "d:\audio bot"
pm2 start "d:\audio bot\ecosystem.config.js"
pm2 save
exit /b 0

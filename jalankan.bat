@echo off
echo.
echo  ================================
echo   RWP Hutama Karya - Development
echo  ================================
echo.
echo  Membuka browser di http://localhost:3000
echo  Gunakan Chrome (bukan Brave)
echo.
echo  Tekan Ctrl+C untuk menghentikan server.
echo.

cd /d "%~dp0web"
npm run dev
pause

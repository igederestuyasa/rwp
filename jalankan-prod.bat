@echo off
echo.
echo  ================================
echo   RWP Hutama Karya - Production
echo  ================================
echo.
echo  [1/2] Build sedang berjalan... (ini bisa 1-2 menit)
echo.

cd /d "%~dp0web"
npm run build

if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Build gagal. Cek error di atas.
    pause
    exit /b 1
)

echo.
echo  [2/2] Build selesai. Menjalankan server...
echo.
echo  Buka browser di http://localhost:3000
echo  Gunakan Chrome (bukan Brave)
echo.
echo  Tekan Ctrl+C untuk menghentikan server.
echo.

npm run start
pause

@echo off
rem Actualiza NextPlayer con los valores de mercado actuales de Transfermarkt
rem y publica el resultado. Doble clic para correrlo; "actualizar-datos.cmd /auto"
rem lo corre sin pausas (para una tarea programada de Windows).
setlocal
cd /d "%~dp0"
set AUTO=%~1

echo.
echo === NextPlayer: actualizar datos desde Transfermarkt ===
echo.

git pull --rebase --autostash || goto :error
if not exist node_modules (
  echo [1/3] Instalando dependencias, solo la primera vez. Tarda un par de minutos...
  call npm ci --no-audit --no-fund || goto :error
)
echo [2/3] Descargando la base y consultando Transfermarkt. Tarda unos 30 minutos, no cierres la ventana...
call npm run data:tm || goto :error
echo [3/3] Subiendo los datos a GitHub...

git add -f public/data/players.json data/transfermarkt.json
git diff --cached --quiet && (
  echo No hubo cambios en los datos.
  goto :end
)
git commit -m "Actualiza valores desde Transfermarkt" || goto :error
git push || goto :error
echo.
echo Listo. Netlify publica los cambios en un par de minutos.

:end
if /i not "%AUTO%"=="/auto" pause
exit /b 0

:error
echo.
echo Algo fallo. Revisa el mensaje de arriba.
if /i not "%AUTO%"=="/auto" pause
exit /b 1

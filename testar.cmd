@echo off
setlocal
cd /d "%~dp0"
title Puck Rivals - Teste local

where node >nul 2>&1
if errorlevel 1 goto sem_node
where npm.cmd >nul 2>&1
if errorlevel 1 goto sem_node

if exist "node_modules\vite\bin\vite.js" goto validar
echo Instalando dependencias...
call npm.cmd ci --cache .npm-cache
if errorlevel 1 goto erro

:validar
echo.
echo Executando testes...
call npm.cmd test
if errorlevel 1 goto erro
echo.
echo Verificando build...
call npm.cmd run build
if errorlevel 1 goto erro
echo.
echo Abrindo o jogo em http://localhost:5173
echo Para encerrar o servidor, pressione Ctrl+C nesta janela.
start "" "http://localhost:5173"
call npm.cmd run dev -- --port 5173 --strictPort
if errorlevel 1 goto erro
exit /b 0

:sem_node
echo Node.js e npm nao encontrados. Instale o Node.js 22.12 ou superior.
pause
exit /b 1

:erro
echo.
echo Nao foi possivel concluir. Confira a mensagem acima.
pause
exit /b 1

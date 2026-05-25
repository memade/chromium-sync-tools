@echo off
setlocal

set "ROOT=%~dp0..\..\.."
set "CHROME=%ROOT%\src\out\release\chrome.exe"
set "URL=https://www.google.com/search?q=martell^&hl=zh-CN^&num=10"
set "OUTPUT=%~dp0google.html"

"%CHROME%" ^
  --headless=new ^
  --dump-dom ^
  --timeout=60000 ^
  --disable-gpu ^
  --disable-extensions ^
  --disable-sync ^
  --disable-component-update ^
  --no-first-run ^
  --no-default-browser-check ^
  --incognito ^
  --disable-blink-features=AutomationControlled ^
  --window-size=1280,800 ^
  --user-data-dir="%TEMP%\chrome_user_data" ^
  "%URL%" > "%OUTPUT%" 2>nul

exit /b %ERRORLEVEL%

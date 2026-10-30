@echo off
setlocal
title JAAD ERP - Fix Duplicate HR Layout
echo.
echo JAAD ERP - Duplicate HR layout repair
echo This script only disables an extra layout directly inside the HR route.
echo It does not change the main app layout, HR page, database, or styling.
echo.

set "FOUND=0"

if exist "src\app\(app)\hr\layout.tsx" (
  set "FOUND=1"
  echo Found: src\app\(app)\hr\layout.tsx
  if exist "src\app\(app)\hr\layout.tsx.disabled" (
    echo Backup target already exists. Not overwriting it.
    echo Rename that .disabled file manually if you want to run this again.
    goto :NEXT
  )
  copy "src\app\(app)\hr\layout.tsx" "src\app\(app)\hr\layout.tsx.disabled" >nul
  if errorlevel 1 (
    echo ERROR: Could not back up the nested HR layout.
    pause
    exit /b 1
  )
  del "src\app\(app)\hr\layout.tsx"
  echo Disabled duplicate nested HR layout.
)

:NEXT
if exist "src\app\hr\layout.tsx" (
  set "FOUND=1"
  echo Found: src\app\hr\layout.tsx
  if exist "src\app\hr\layout.tsx.disabled" (
    echo Backup target already exists. Not overwriting it.
    goto :DONE
  )
  copy "src\app\hr\layout.tsx" "src\app\hr\layout.tsx.disabled" >nul
  if errorlevel 1 (
    echo ERROR: Could not back up the nested HR layout.
    pause
    exit /b 1
  )
  del "src\app\hr\layout.tsx"
  echo Disabled duplicate HR layout.
)

:DONE
if "%FOUND%"=="0" (
  echo.
  echo No nested HR layout.tsx was found in either standard location.
  echo No files were changed.
  echo The duplicate shell must be rendered by another component or route.
  echo In that case, send src\app\(app)\layout.tsx and any HR-specific layout file.
  echo.
  pause
  exit /b 2
)

echo.
echo Repair applied. The original layout file was preserved as .tsx.disabled.
echo Now stop the dev server with Ctrl+C, then run: npm run dev
echo Then hard-refresh the browser with Ctrl+Shift+R.
echo.
pause

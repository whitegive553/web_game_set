@echo off
echo Starting AI Agent Service (Dev Mode)...
echo.

where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python not found
    exit /b 1
)

if not exist "venv\" (
    echo Creating Python virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing Python dependencies...
pip install -r requirements.txt

echo.
echo Starting FastAPI service on http://localhost:8000 ...
echo.
uvicorn main:app --reload --host 0.0.0.0 --port 8000

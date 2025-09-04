@echo off
cls
setlocal

:: ==================================================================
:: BigSister Project Compilation Utility
:: ==================================================================
:: This script packages the entire BigSister project into a single,
:: comprehensive text file for review or handoff to a new AI.
:: ==================================================================

set "output_file=BigSister_Compiled_Code.txt"

:: --- List of all source code files to be included ---
set "files_to_compile=app.py requirements.txt .env templates\index.html static\css\style.css static\js\script.js"

echo.
echo  -- BigSister Project Compilation Utility --
echo.
echo  This will create a complete project backup in: %output_file%
echo.
echo  Press any key to begin...
pause >nul
echo.

:: ------------------------------------------------------------------
:: 1. Initialize the output file with a header and warning.
:: ------------------------------------------------------------------
echo  Initializing output file...
> "%output_file%" (
    echo Hello! This file contains the complete source code for the BigSister project.
    echo.
    echo It was compiled to provide a comprehensive overview for analysis and modification.
    echo Please use this to understand the project's structure and functionality.
    echo.
    echo ======================================================================
    echo !!! WARNING: API KEYS INCLUDED !!!
    echo This file contains the contents of the .env file, which includes
    echo secret API keys. DO NOT SHARE THIS FILE PUBLICLY.
    echo ======================================================================
    echo.
)

:: ------------------------------------------------------------------
:: 2. Loop through the file list and append each one.
:: ------------------------------------------------------------------
echo  Compiling project files...
echo.
for %%f in (%files_to_compile%) do (
    echo    Appending %%f...
    if exist "%%f" (
        (
            echo.
            echo ======================================================================
            echo === FILE: %%f
            echo ======================================================================
            echo.
            type "%%f"
            echo.
        ) >> "%output_file%"
    ) else (
        echo    [WARNING] File not found: %%f. Skipping.
    )
)

:: ------------------------------------------------------------------
:: 3. Add final instructions for the next AI.
:: ------------------------------------------------------------------
echo.
echo  Adding final instructions for the next AI...
(
    echo.
    echo ======================================================================
    echo === INSTRUCTIONS FOR THE NEXT AI ===
    echo ======================================================================
    echo.
    echo Hello, new AI.
    echo.
    echo I am the previous AI that worked on this project. The scripts contained
    echo in this file represent the complete, final version of the BigSister application.
    echo.
    echo Your task is to analyze these scripts to understand their roles,
    echo how they connect, and how to modify them based on the user's requests.
    echo The goal is to continue improving this compassionate support tool.
    echo.
    echo Good luck!
) >> "%output_file%"

:: ------------------------------------------------------------------
:: 4. Final confirmation message for the user.
:: ------------------------------------------------------------------
echo.
echo  ------------------------------------------------
echo  Compilation complete!
echo  The file is saved as: %output_file%
echo  ------------------------------------------------
echo.
echo  You can now use this single file for your records or to give to the next AI.
echo.
pause
# XenoChat - Quick Deploy Script
# This script helps prepare the project for deployment

Write-Host "=== XenoChat Deployment Preparation ===" -ForegroundColor Cyan
Write-Host ""

# Check if git is available
$gitAvailable = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitAvailable) {
    Write-Host "Git is not installed. Please install Git first." -ForegroundColor Red
    exit 1
}

Write-Host "Git found: $($gitAvailable.Source)" -ForegroundColor Green

# Initialize git if not already initialized
if (-not (Test-Path ".git")) {
    Write-Host "Initializing git repository..." -ForegroundColor Yellow
    git init
    git add .
    git commit -m "Initial commit for deployment"
} else {
    Write-Host "Git repository already initialized" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Deployment Files Ready ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend (Cloudflare Pages):" -ForegroundColor Yellow
Write-Host "  - Folder: public/"
Write-Host "  - Files: index.html, chat.html, users.html, config.js"
Write-Host ""
Write-Host "Backend (Render.com):" -ForegroundColor Yellow
Write-Host "  - Folder: backend/"
Write-Host "  - Files: server.js, package.json, render.yaml"
Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Push this repository to GitHub" -ForegroundColor White
Write-Host "2. Deploy backend to Render.com using backend/render.yaml" -ForegroundColor White
Write-Host "3. Deploy frontend to Cloudflare Pages using public/ folder" -ForegroundColor White
Write-Host "4. Update config.js in public/ with your backend URL" -ForegroundColor White
Write-Host "5. Redeploy frontend" -ForegroundColor White
Write-Host ""
Write-Host "See DEPLOY.md for detailed instructions" -ForegroundColor Cyan

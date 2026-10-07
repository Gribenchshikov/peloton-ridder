param(
    [Parameter(Mandatory=$true)]
    [string]$Message
)

$ErrorActionPreference = "Stop"

$Root = "C:\GDrive\_CloudGDrive\development\peloton-ridder"
$App  = Join-Path $Root "app"

Write-Host ""
Write-Host "=== 1. Production build ===" -ForegroundColor Cyan

Set-Location $App

npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "BUILD FAILED. Deploy cancelled." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "BUILD OK" -ForegroundColor Green


Write-Host ""
Write-Host "=== 2. Git status ===" -ForegroundColor Cyan

Set-Location $Root

git status --short

if ($LASTEXITCODE -ne 0) {
    Write-Host "Git error. Deploy cancelled." -ForegroundColor Red
    exit $LASTEXITCODE
}


Write-Host ""
Write-Host "=== 3. Git add ===" -ForegroundColor Cyan

git add .

if ($LASTEXITCODE -ne 0) {
    Write-Host "git add failed." -ForegroundColor Red
    exit $LASTEXITCODE
}


Write-Host ""
Write-Host "=== 4. Git commit ===" -ForegroundColor Cyan

git diff --cached --quiet

if ($LASTEXITCODE -eq 0) {
    Write-Host "No changes to commit." -ForegroundColor Yellow
    exit 0
}

git commit -m $Message

if ($LASTEXITCODE -ne 0) {
    Write-Host "git commit failed." -ForegroundColor Red
    exit $LASTEXITCODE
}


Write-Host ""
Write-Host "=== 5. Git push ===" -ForegroundColor Cyan

git push

if ($LASTEXITCODE -ne 0) {
    Write-Host "git push failed." -ForegroundColor Red
    exit $LASTEXITCODE
}


Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "PUSH COMPLETED" -ForegroundColor Green
Write-Host "GitHub Actions will deploy TEST site." -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
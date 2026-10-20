param(
    [Parameter(Mandatory=$true)]
    [string]$Message
)

$ErrorActionPreference = "Stop"

$Root = "C:\dev\peloton-ridder"
$App  = Join-Path $Root "app"
$Site = "https://test.peloton-ridder.kz/ru"

# ------------------------------------------------------------
# 1. LOCAL BUILD
# ------------------------------------------------------------

Write-Host ""
Write-Host "=== 1. Production build ===" -ForegroundColor Cyan

Set-Location $App

npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "BUILD FAILED - deploy cancelled" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "BUILD OK" -ForegroundColor Green


# ------------------------------------------------------------
# 2. GIT STATUS
# ------------------------------------------------------------

Write-Host ""
Write-Host "=== 2. Git status ===" -ForegroundColor Cyan

Set-Location $Root

git status --short

if ($LASTEXITCODE -ne 0) {
    Write-Host "Git error. Deploy cancelled." -ForegroundColor Red
    exit $LASTEXITCODE
}


# ------------------------------------------------------------
# 3. GIT ADD
# ------------------------------------------------------------

Write-Host ""
Write-Host "=== 3. Git add ===" -ForegroundColor Cyan

git add .

if ($LASTEXITCODE -ne 0) {
    Write-Host "git add failed." -ForegroundColor Red
    exit $LASTEXITCODE
}


# ------------------------------------------------------------
# 4. GIT COMMIT
# ------------------------------------------------------------

Write-Host ""
Write-Host "=== 4. Git commit ===" -ForegroundColor Cyan

git diff --cached --quiet

if ($LASTEXITCODE -eq 0) {
    Write-Host "No changes to commit. Continuing." -ForegroundColor Yellow
}
elseif ($LASTEXITCODE -eq 1) {
    git commit -m $Message
    if ($LASTEXITCODE -ne 0) {
        Write-Host "git commit failed." -ForegroundColor Red
        exit $LASTEXITCODE
    }
}
else {
    Write-Host "git diff failed." -ForegroundColor Red
    exit 1
}


# ------------------------------------------------------------
# 5. GIT PUSH
# ------------------------------------------------------------

Write-Host ""
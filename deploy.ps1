param(
    [Parameter(Mandatory=$true)]
    [string]$Message
)

$ErrorActionPreference = "Stop"

$Root = "C:\GDrive\_CloudGDrive\development\peloton-ridder"
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
    Write-Host "No changes to commit." -ForegroundColor Yellow
    exit 0
}

git commit -m $Message

if ($LASTEXITCODE -ne 0) {
    Write-Host "git commit failed." -ForegroundColor Red
    exit $LASTEXITCODE
}


# ------------------------------------------------------------
# 5. GIT PUSH
# ------------------------------------------------------------

Write-Host ""
Write-Host "=== 5. Git push ===" -ForegroundColor Cyan

git push

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "PUSH FAILED" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "PUSH OK" -ForegroundColor Green


# ------------------------------------------------------------
# 6. FIND GITHUB ACTIONS RUN
# ------------------------------------------------------------

Write-Host ""
Write-Host "=== 6. Waiting for GitHub Actions ===" -ForegroundColor Cyan

$CommitSha = (git rev-parse HEAD).Trim()

Write-Host "Commit: $CommitSha"
Write-Host "Waiting for workflow to appear..."

$RunId = $null

for ($i = 1; $i -le 30; $i++) {

    $RunId = gh run list `
        --workflow docker.yml `
        --commit $CommitSha `
        --limit 1 `
        --json databaseId `
        --jq '.[0].databaseId'

    if ($RunId) {
        break
    }

    Start-Sleep -Seconds 2
}

if (-not $RunId) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "GITHUB ACTIONS RUN NOT FOUND" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    exit 1
}

Write-Host "GitHub Actions Run: $RunId" -ForegroundColor Cyan


# ------------------------------------------------------------
# 7. WAIT FOR DEPLOY
# ------------------------------------------------------------

Write-Host ""
Write-Host "=== 7. Build & Deploy ===" -ForegroundColor Cyan
Write-Host ""

gh run watch $RunId --exit-status

if ($LASTEXITCODE -ne 0) {

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "DEPLOY FAILED" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red

    Write-Host ""
    Write-Host "Showing failed GitHub Actions logs..."
    Write-Host ""

    gh run view $RunId --log-failed

    exit 1
}


# ------------------------------------------------------------
# 8. CHECK REAL WEBSITE
# ------------------------------------------------------------

Write-Host ""
Write-Host "=== 8. Checking website ===" -ForegroundColor Cyan

$SiteOK = $false

for ($i = 1; $i -le 10; $i++) {

    try {

        $Response = Invoke-WebRequest `
            -Uri $Site `
            -Method Head `
            -TimeoutSec 15 `
            -UseBasicParsing

        if ($Response.StatusCode -ge 200 -and $Response.StatusCode -lt 400) {
            $SiteOK = $true
            break
        }

    }
    catch {
        Write-Host "Site not ready yet... attempt $i/10"
    }

    Start-Sleep -Seconds 3
}


# ------------------------------------------------------------
# RESULT
# ------------------------------------------------------------

Write-Host ""

if (-not $SiteOK) {

    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "DEPLOY COMPLETED, BUT SITE CHECK FAILED" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host $Site

    exit 1
}

Write-Host "========================================" -ForegroundColor Green
Write-Host "DEPLOY SUCCESSFUL" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Commit : $CommitSha"
Write-Host "Run ID : $RunId"
Write-Host "Site   : $Site"
Write-Host ""
Write-Host "Site responded successfully." -ForegroundColor Green
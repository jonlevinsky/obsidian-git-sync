param(
    [string]$VaultPath = "J:\obsidian-git-sync"
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $VaultPath

Write-Host "Hledam zmeny v repozitari..." -ForegroundColor Cyan

git add -A
$changes = git status --porcelain

if ($changes) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    git commit -m "vault backup: $timestamp"
    Write-Host "Commitnuto: vault backup: $timestamp" -ForegroundColor Green
    Write-Host ""
    Write-Host "Zmenene soubory:" -ForegroundColor Yellow
    $changes
    Write-Host ""

    git push
    Write-Host "Push dokoncen." -ForegroundColor Green
} else {
    Write-Host "Zadne zmeny - vse je commitnute." -ForegroundColor Green
}

Write-Host "Hotovo." -ForegroundColor Cyan

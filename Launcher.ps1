$Host.UI.RawUI.WindowTitle = "가챠 투자 분석기"
Set-Location $PSScriptRoot

# Node.js 확인
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[오류] Node.js가 설치되어 있지 않습니다." -ForegroundColor Red
    Write-Host "       https://nodejs.org 에서 설치 후 다시 실행하세요." -ForegroundColor Yellow
    Read-Host "`n엔터를 눌러 종료"
    exit 1
}

# 패키지 설치 (최초 1회)
if (-not (Test-Path "node_modules")) {
    Write-Host "패키지 설치 중... (최초 1회, 잠시 기다려주세요)" -ForegroundColor Yellow
    npm install --silent
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[오류] npm install 실패" -ForegroundColor Red
        Read-Host "`n엔터를 눌러 종료"
        exit 1
    }
    Write-Host ""
}

# .env 경고 (비차단)
if (-not (Test-Path ".env")) {
    Write-Host "[알림] .env 없음 - GPT 메타 업데이트 비활성화" -ForegroundColor Yellow
    Write-Host "       (.env.example 참고하여 .env 생성 시 활성화)" -ForegroundColor DarkYellow
    Write-Host ""
}

# 서버 시작
Write-Host "[1/2] Node API 서버 시작... (포트 3001)" -ForegroundColor Cyan
$script:nodeProc = Start-Process node -ArgumentList "server.js" `
    -WindowStyle Hidden -PassThru

Write-Host "[2/2] 정적 서버 시작... (포트 8080)" -ForegroundColor Cyan
$script:httpProc = Start-Process cmd `
    -ArgumentList '/c npx --yes http-server . -p 8080 -c-1 --silent' `
    -WindowStyle Hidden -PassThru

# 종료 함수
function Stop-Servers {
    if ($script:nodeProc -and -not $script:nodeProc.HasExited) {
        $null = taskkill /T /F /PID $script:nodeProc.Id 2>&1
    }
    if ($script:httpProc -and -not $script:httpProc.HasExited) {
        $null = taskkill /T /F /PID $script:httpProc.Id 2>&1
    }
}

# 창 X 버튼 종료 처리 (CTRL_CLOSE_EVENT = 2)
$ctrlCode = @"
using System;
using System.Runtime.InteropServices;
public class ConsoleCtrl {
    public delegate bool HandlerDelegate(int sig);
    [DllImport("kernel32.dll")]
    public static extern bool SetConsoleCtrlHandler(HandlerDelegate h, bool add);
}
"@
try {
    Add-Type -TypeDefinition $ctrlCode -ErrorAction Stop
    $script:ctrlDelegate = [ConsoleCtrl+HandlerDelegate]{
        param($sig)
        if ($sig -ge 2) { Stop-Servers }
        return $false
    }
    [ConsoleCtrl]::SetConsoleCtrlHandler($script:ctrlDelegate, $true) | Out-Null
} catch {}

Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Stop-Servers } | Out-Null

# 초기화 대기 후 브라우저 오픈
Write-Host "초기화 대기 중..." -ForegroundColor DarkGray
Start-Sleep -Seconds 3
Start-Process "http://localhost:8080"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  실행 중" -ForegroundColor Green
Write-Host "  앱  : http://localhost:8080" -ForegroundColor White
Write-Host "  API : http://localhost:3001" -ForegroundColor White
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  이 창을 닫거나 엔터를 누르면 모든 서버가 종료됩니다." -ForegroundColor Yellow
Write-Host ""

try {
    $null = Read-Host
} finally {
    Write-Host "서버 종료 중..." -ForegroundColor Yellow
    Stop-Servers
    Write-Host "완료." -ForegroundColor Green
    Start-Sleep -Seconds 1
}
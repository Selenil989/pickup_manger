# 스타레일(Honkai: Star Rail) 가챠기록 링크 추출 → 클립보드 복사
# 사용법: 게임에서 워프 → '기록 보기'를 한 번 연 뒤 아래를 PowerShell에 붙여넣기
#   iex(irm 'https://raw.githubusercontent.com/Selenil989/pickup_manger/master/tools/get_link_hsr.ps1')
# 하는 일: 게임 로컬 캐시에서 getGachaLog 링크(authkey 포함, ~24h 만료, 읽기전용)를 찾아 클립보드에 복사.
# 원격 서버로 아무것도 보내지 않음 — 순수 로컬 읽기 + 클립보드.

$ErrorActionPreference = 'SilentlyContinue'

# 1) Player.log 에서 게임 설치 경로(StarRail_Data) 찾기
$log = "$env:USERPROFILE\AppData\LocalLow\Cognosphere\Star Rail\Player.log"
if (-not (Test-Path $log)) { $log = "$env:USERPROFILE\AppData\LocalLow\miHoYo\崩坏：星穹铁道\Player.log" }
$dataDir = $null
if (Test-Path $log) {
  $t = Get-Content $log -Raw
  $mm = [regex]::Match($t, '([A-Za-z]:[\\/][^\r\n:]*?StarRail_Data)')
  if ($mm.Success) { $dataDir = $mm.Groups[1].Value }
}
if (-not $dataDir) {
  Write-Host "`n[X] 게임 경로를 못 찾았어요 — 스타레일을 한 번 실행했는지 확인하세요.`n" -ForegroundColor Red
  return
}

# 2) webCaches\*\Cache\Cache_Data\data_2 (최신) 찾기
$data2 = Get-ChildItem (Join-Path $dataDir 'webCaches') -Recurse -Filter 'data_2' |
         Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $data2) {
  Write-Host "`n[X] 게임 캐시를 못 찾았어요 — 게임에서 '워프 기록'을 한 번 연 뒤 다시 실행하세요.`n" -ForegroundColor Red
  return
}

# 3) 캐시에서 getGachaLog 링크 추출 (마지막 = 최신)
$bytes = [System.IO.File]::ReadAllBytes($data2.FullName)
$text  = [System.Text.Encoding]::ASCII.GetString($bytes) -replace "`0", ""
$urls  = [regex]::Matches($text, 'https://[^\x00-\x1F"'' ]*getGachaLog[^\x00-\x1F"'' ]*')
if ($urls.Count -eq 0) {
  Write-Host "`n[X] 링크를 못 찾았어요 — 게임에서 '워프 기록 보기'를 연 직후 다시 실행하세요.`n" -ForegroundColor Red
  return
}
$url = $urls[$urls.Count - 1].Value

Set-Clipboard $url
Write-Host "`n[OK] 가챠 링크가 클립보드에 복사됐어요! PickupManger 앱에 붙여넣으세요.`n" -ForegroundColor Green

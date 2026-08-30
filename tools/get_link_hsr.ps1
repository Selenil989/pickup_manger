# 스타레일(Honkai: Star Rail) 가챠기록 링크 추출 → 클립보드 복사
# 사용법: 게임에서 워프 → '기록 보기'를 한 번 연 뒤 아래를 PowerShell에 붙여넣기
#   iex(irm 'https://raw.githubusercontent.com/Selenil989/pickup_manger/master/tools/get_link_hsr.ps1')
# 하는 일: 게임 로컬 캐시에서 getGachaLog 링크(authkey 포함, ~24h 만료, 읽기전용)를 찾아 클립보드에 복사.
# 원격 서버로 아무것도 보내지 않음 — 순수 로컬 읽기 + 클립보드. 게임이 켜져 있어도 읽힘(공유 읽기).

$ErrorActionPreference = 'SilentlyContinue'

# 게임이 파일을 잠그고 있어도 읽도록 FileShare.ReadWrite 로 연다
function Read-BytesShared($path) {
  try {
    $fs = [System.IO.File]::Open($path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
    $len = [int]$fs.Length
    $buf = New-Object byte[] $len
    $off = 0
    while ($off -lt $len) { $r = $fs.Read($buf, $off, $len - $off); if ($r -le 0) { break }; $off += $r }
    $fs.Dispose()
    return $buf
  } catch { return $null }
}

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

# 2) webCaches 아래 모든 캐시 데이터 파일(data_0~3 등) 수집 (최신 수정 순)
$cacheData = Get-ChildItem (Join-Path $dataDir 'webCaches') -Recurse -Directory -Filter 'Cache_Data'
$files = @()
foreach ($cd in $cacheData) { $files += Get-ChildItem $cd.FullName -File }
$files = $files | Sort-Object LastWriteTime -Descending
if (-not $files) {
  Write-Host "`n[X] 게임 캐시를 못 찾았어요 — 게임에서 '워프 기록'을 한 번 연 뒤 다시 실행하세요.`n" -ForegroundColor Red
  return
}

# 3) 캐시들에서 getGachaLog 링크 추출 (게임이 잠그고 있어도 공유 읽기)
$rx = [regex]'https://[^\x00-\x1F"'' ]*(?:getGachaLog|getLdGachaLog)[^\x00-\x1F"'' ]*'
$found = @()
$anyAuthkey = 0
foreach ($f in $files) {
  $bytes = Read-BytesShared $f.FullName
  if (-not $bytes) { continue }
  $txt = [System.Text.Encoding]::GetEncoding('ISO-8859-1').GetString($bytes)
  foreach ($m in $rx.Matches($txt)) { $found += $m.Value }
  if ($txt -match 'authkey=') { $anyAuthkey++ }
}

if ($found.Count -eq 0) {
  Write-Host "`n[X] 가챠 링크를 못 찾았어요." -ForegroundColor Red
  if ($anyAuthkey -gt 0) {
    Write-Host "    (authkey는 캐시에 있는데 getGachaLog 형태가 아니에요 — 이 메시지를 개발자에게 알려주세요: authkey $anyAuthkey개 발견)" -ForegroundColor Yellow
  } else {
    Write-Host "    게임에서 '워프 기록 보기'를 연 직후 다시 실행하세요." -ForegroundColor Yellow
  }
  Write-Host ""
  return
}

# 여러 개면 마지막(가장 최근 파일의 마지막) — 함수가 gacha_type/end_id는 덮어쓰므로 아무 거나 authkey만 살아있으면 됨
$url = $found[$found.Count - 1]
Set-Clipboard $url
Write-Host "`n[OK] 가챠 링크가 클립보드에 복사됐어요! PickupManger 앱에 붙여넣으세요.`n" -ForegroundColor Green

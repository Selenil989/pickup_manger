// 배포 헬퍼 — 자산 버전(?v=)을 현재 시각으로 갱신해 캐시를 무효화하고 커밋·푸시한다.
// 사용: node deploy.js ["커밋 메시지"]
// 이렇게 하면 style.css / app.js 등이 배포 즉시 반영됨(하드 리프레시 불필요).
const fs = require('fs');
const { execSync } = require('child_process');

const v = new Date().toISOString().replace(/\D/g, '').slice(0, 14); // yyyymmddhhmmss
let html = fs.readFileSync('index.html', 'utf8');
if (!/\?v=\d+/.test(html)) {
  console.error('index.html 자산 링크에 ?v= 가 없습니다. 링크에 ?v=1 을 먼저 붙여주세요.');
  process.exit(1);
}
html = html.replace(/\?v=\d+/g, '?v=' + v);
fs.writeFileSync('index.html', html);

const msg = (process.argv.slice(2).join(' ') || 'chore: deploy') + ' (v' + v + ')';
execSync('git add -A', { stdio: 'inherit' });
execSync('git commit -F -', { input: msg, stdio: ['pipe', 'inherit', 'inherit'] });
execSync('git push origin master', { stdio: 'inherit' });
console.log('✅ 배포 완료: v' + v);

const CONFIG = {
  durationMs: 30_000,
  spawnMaxMs: 1200,
  spawnMinMs: 450,
  popMinMs: 600,
  popMaxMs: 1100,
  background: 'assets/bg.png',
  celebrities: [
    { img: 'assets/celeb_25.png', points: 25, weight: 0.55 },
    { img: 'assets/celeb_50.png', points: 50, weight: 0.30 },
    { img: 'assets/celeb_100.png', points: 100, weight: 0.15 },
  ],
  icecreamCursor: 'assets/icecream.png',
  stainImg: 'assets/stain.png',
  splashImg: 'assets/splash.png',
  stainDurationMsMin: 1000,
  stainDurationMsMax: 2000,
  splashDurationMs: 260,
};

const gridEl = document.getElementById('grid');
const timeEl = document.getElementById('time');
const scoreEl = document.getElementById('score');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const splashLayer = document.getElementById('splash-layer');
const endOverlay = document.getElementById('endOverlay');
const bigScore = document.getElementById('bigScore');
const playAgainBtn = document.getElementById('playAgainBtn');

let score = 0;
let gameStart = 0;
let gameTimerId = null;
let spawnTimerId = null;
let running = false;
let lastHole = -1;

// Background
gridEl.style.backgroundImage = `url('${CONFIG.background}')`;

// Cursor (desktop only inside grid)
gridEl.addEventListener('pointerenter', () => { gridEl.style.cursor = `url('${CONFIG.icecreamCursor}') 16 16, pointer`; });
gridEl.addEventListener('pointerleave', () => { gridEl.style.cursor = 'auto'; });

function choiceWeighted(items){ const total=items.reduce((s,it)=>s+(it.weight??1),0); let r=Math.random()*total; for(const it of items){const w=it.weight??1; if((r-=w)<=0) return it;} return items[0]; }
const fmt=(ms)=> (Math.max(0,ms)/1000).toFixed(1);
const setTimeLeft=(ms)=> timeEl.textContent=fmt(ms);
const updateScore=(add)=>{ score+=add; scoreEl.textContent=String(score); };

function randHole(){ const idx=Math.floor(Math.random()*9); if(idx===lastHole) return randHole(); lastHole=idx; return idx; }

function makeSplashAt(x, y){
  const rect = gridEl.getBoundingClientRect();
  const sx = x - rect.left;
  const sy = y - rect.top;
  const s = document.createElement('img');
  s.src = CONFIG.splashImg; s.alt=''; s.className='splash';
  s.style.left = `${sx}px`; s.style.top = `${sy}px`;
  splashLayer.appendChild(s);
  requestAnimationFrame(()=> s.classList.add('show'));
  setTimeout(()=>{ s.classList.add('fade'); setTimeout(()=> s.remove(), 220); }, CONFIG.splashDurationMs);
}

function spawnOne(now){
  const elapsed=now-gameStart;
  const progress=Math.min(1, elapsed/CONFIG.durationMs);
  const interval=Math.round(CONFIG.spawnMaxMs - progress*(CONFIG.spawnMaxMs-CONFIG.spawnMinMs));

  const holeIdx=randHole();
  const hole=gridEl.querySelector(`.hole[data-idx="${holeIdx}"] .mask`);
  const celeb=choiceWeighted(CONFIG.celebrities);

  const wrap=document.createElement('div');
  wrap.className='popup'; wrap.setAttribute('role','button');
  wrap.setAttribute('aria-label',`Celebrity worth ${celeb.points} points popped up`);

  const img=document.createElement('img');
  img.src=celeb.img; img.alt=`${celeb.points}pt celeb`; img.draggable=false;

  const stain=document.createElement('img');
  stain.src=CONFIG.stainImg; stain.alt=''; stain.className='stain'; stain.draggable=false;

  wrap.appendChild(img); wrap.appendChild(stain);
  hole.appendChild(wrap);
  requestAnimationFrame(()=> wrap.classList.add('up'));

  let hit=false;
  const handleHit=(e)=>{
    if(hit||!running) return;
    hit=true;
    wrap.classList.add('stained');
    updateScore(celeb.points);
    const cx = e.clientX ?? (e.touches && e.touches[0]?.clientX);
    const cy = e.clientY ?? (e.touches && e.touches[0]?.clientY);
    if (cx!=null && cy!=null) makeSplashAt(cx, cy);
    const stay=Math.round(CONFIG.stainDurationMsMin + Math.random()*(CONFIG.stainDurationMsMax-CONFIG.stainDurationMsMin));
    setTimeout(()=>{ wrap.classList.add('hit'); wrap.classList.remove('up'); setTimeout(()=> wrap.remove(), 180); }, stay);
  };
  wrap.addEventListener('pointerdown', handleHit);
  wrap.addEventListener('click', handleHit);

  const popStay=Math.round(CONFIG.popMaxMs - progress*(CONFIG.popMaxMs-CONFIG.popMinMs));
  setTimeout(()=>{ if(!hit){ wrap.classList.remove('up'); setTimeout(()=> wrap.remove(), 160); } }, popStay);

  if(running) spawnTimerId=setTimeout(()=> spawnOne(performance.now()), interval);
}

function showEndOverlay(){ bigScore.textContent=`Score: ${score}`; endOverlay.classList.remove('hidden'); endOverlay.setAttribute('aria-hidden','false'); }
function hideEndOverlay(){ endOverlay.classList.add('hidden'); endOverlay.setAttribute('aria-hidden','true'); }

function startGame(){
  if(running) return;
  hideEndOverlay();
  running=true;
  score=0; scoreEl.textContent='0';
  startBtn.disabled=true; resetBtn.disabled=false;
  document.querySelectorAll('.popup').forEach(n=>n.remove());
  splashLayer.innerHTML='';
  gameStart=performance.now();
  setTimeLeft(CONFIG.durationMs);
  const tick=()=>{
    const now=performance.now();
    const left=CONFIG.durationMs - (now-gameStart);
    setTimeLeft(left);
    if(left<=0){ endGame(); } else { gameTimerId=requestAnimationFrame(tick); }
  };
  gameTimerId=requestAnimationFrame(tick);
  spawnOne(gameStart);
}

function endGame(){
  running=false;
  startBtn.disabled=false; resetBtn.disabled=false;
  if(gameTimerId) cancelAnimationFrame(gameTimerId);
  if(spawnTimerId) clearTimeout(spawnTimerId);
  setTimeout(()=>{ document.querySelectorAll('.popup').forEach(n=>n.remove()); splashLayer.innerHTML=''; }, 200);
  showEndOverlay();
}

function resetGame(){
  if(gameTimerId) cancelAnimationFrame(gameTimerId);
  if(spawnTimerId) clearTimeout(spawnTimerId);
  running=false;
  startBtn.disabled=false; resetBtn.disabled=true;
  score=0; scoreEl.textContent='0';
  setTimeLeft(CONFIG.durationMs);
  document.querySelectorAll('.popup').forEach(n=>n.remove());
  splashLayer.innerHTML='';
}

startBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', resetGame);
playAgainBtn.addEventListener('click', ()=>{ resetGame(); startGame(); });

(function preload(){
  const imgs=[CONFIG.background, CONFIG.icecreamCursor, CONFIG.stainImg, CONFIG.splashImg, 'assets/endcard.png', ...CONFIG.celebrities.map(c=>c.img)];
  imgs.forEach(src=>{ const i=new Image(); i.src=src; });
})();

window.addEventListener('keydown', (e)=>{ if(e.code==='Space' && !running) startGame(); });

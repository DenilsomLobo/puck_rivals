import Phaser from 'phaser';
import './style.css';
import './pieces.css';
import './fullscreen.css';
import './cover.css';
import { themes, modes, cover } from './art.js';
import { ArenaScene } from './games/ArenaScene.js';
import { Fullscreen } from './ui/Fullscreen.js';

const $ = id => document.getElementById(id);
let theme = 'neon', mode = 'pong', opponent = 'ai', difficulty = 'normal', limit = 7;
let game, scene, muted = true, audio;
// Disponível apenas no servidor iniciado pelos testes; removido na build de produção.
if (import.meta.env.MODE === 'e2e') window.__arenaForTest = () => scene;
document.body.dataset.theme = theme;
document.querySelector('#app').innerHTML = `
<header><a class="brand" href="./" aria-label="Puck Rivals, início"><span class="crown">♛</span> PUCK <b>RIVALS</b></a><span class="header-tag">TRÊS ARENAS PARA JOGAR.</span><button id="sound" class="icon-button" aria-pressed="false">♫ <span>Som desligado</span></button></header>
<main><section id="menu">
<div class="hero"><img class="cover" src="${cover}" alt="Puck Rivals: título artístico central cercado por mesas de Classic Pong, Air Hockey e Sling Puck"><div class="hero-shade"></div><div class="hero-copy"><span class="pill">ARCADE DE MESA • JOGUE GRÁTIS</span><h1>Escolha sua arena.<br><em>Desperte seu rival.</em></h1><p>Contra um amigo ou contra a IA.<br>A próxima grande jogada é sua.</p><a class="hero-link" href="#selection">PREPARE SUA PARTIDA <span>↓</span></a></div><span class="hero-corner"></span></div>
<div id="selection" class="selection"><div class="section-heading"><div><span class="eyebrow">01 / O DESAFIO</span><h2>Qual é o seu jogo?</h2></div><span class="section-note">Três maneiras de vencer. Escolha a sua.</span></div>
<div class="mode-grid">${Object.entries(modes).map(([id, m], i) => `<button class="mode-card" data-mode="${id}" aria-pressed="${id === mode}"><img class="card-table" src="${themes[['neon', 'cartoon', 'wood'][i]].table}" alt=""><div class="card-shade"></div><span class="mode-number">0${i + 1}</span><div class="mini-pieces ${id}"><img src="${id === 'hockey' ? themes.cartoon.striker : themes[['neon', 'cartoon', 'wood'][i]].paddle}" alt=""><img src="${themes[['neon', 'cartoon', 'wood'][i]].ball}" alt=""></div><div class="card-copy"><span class="eyebrow">${m.tag}</span><h3>${m.name}</h3><p>${m.description}</p></div><span class="card-check">✓</span></button>`).join('')}</div>
<div class="workbench"><div class="theme-section"><div class="section-heading"><div><span class="eyebrow">02 / SEU UNIVERSO</span><h2>Entre no clima.</h2></div></div><div class="theme-grid" role="group" aria-label="Tema visual">${Object.entries(themes).map(([id, t]) => `<button class="theme-card" data-theme="${id}" aria-pressed="${id === theme}"><img src="${t.table}" alt=""><span>${t.name}</span><b>✓</b></button>`).join('')}</div><div class="theme-caption"><span id="theme-title">${themes[theme].title}</span><p id="theme-description">${themes[theme].caption}</p></div></div>
<div class="match-settings"><span class="eyebrow">03 / A RIVALIDADE</span><h2>Quem vai encarar?</h2><div class="segmented" aria-label="Adversário"><button data-opponent="ai" aria-pressed="true">✦ Contra a IA</button><button data-opponent="local" aria-pressed="false">♟ Dupla local</button></div><div id="difficulty-group"><span class="field-label">DIFICULDADE</span><div class="segmented small" aria-label="Dificuldade"><button data-difficulty="easy" aria-pressed="false">Fácil</button><button data-difficulty="normal" aria-pressed="true">Normal</button><button data-difficulty="hard" aria-pressed="false">Difícil</button></div></div><div id="limit-group" class="limit-row"><span class="field-label">PONTOS PARA VENCER</span><div class="segmented small"><button data-limit="7" aria-pressed="true">7</button><button data-limit="11" aria-pressed="false">11</button></div></div><p id="rule" class="rule">${modes[mode].rule}</p><button id="play" class="play-button">JOGAR AGORA <span>➜</span></button><span class="under-play">Sua próxima vitória está na mesa.</span></div></div></div>
</section><section id="match" hidden><div class="match-bar"><button id="back" class="icon-button">← <span>Menu</span></button><div class="match-identity"><span id="match-title"></span><small id="match-detail"></small></div><button id="pause" class="icon-button">Ⅱ <span>Pausar</span></button></div><div class="scoreboard"><div class="player-name"><i></i><span id="p1-name">VOCÊ</span></div><div><strong id="score-left">0</strong><span id="score-divider">:</span><strong id="score-right">0</strong><small id="score-caption"></small></div><div class="player-name rival"><span id="p2-name">IA</span><i></i></div></div><div id="canvas-wrap"><div id="game"></div><div id="loading">Preparando a arena…</div><div id="overlay" hidden role="dialog" aria-modal="true" aria-labelledby="message"><span id="overlay-symbol">Ⅱ</span><h2 id="message"></h2><p id="result-detail"></p><button id="resume" class="play-button">CONTINUAR ➜</button><button id="rematch" class="play-button">REVANCHE ↻</button><button id="result-menu" class="icon-button">Voltar ao menu</button></div></div><div class="control-panel"><p id="controls"></p><label>Transparência do controle <input id="opacity" type="range" min="15" max="100" value="60" aria-label="Opacidade do controle"></label></div><p class="rotate">↻ No celular, jogue na horizontal para aproveitar melhor a arena.</p></section>
</main><footer><span class="brand small-brand">♛ PUCK <b>RIVALS</b></span><span>FEITO PARA RIVAIS. JOGADO ENTRE AMIGOS.</span><span></span></footer>`;

const matchActions = document.createElement('div');
matchActions.className = 'match-actions';
$('pause').before(matchActions);
matchActions.innerHTML = '<button id="fullscreen" class="icon-button" type="button" aria-label="Tela cheia" aria-pressed="false">⛶ <span>Tela cheia</span></button>';
matchActions.append($('pause'));
const fullscreen = new Fullscreen($('match'), $('fullscreen'), () => game?.scale.refresh());

function sound(type) {
  if (muted) return;
  try {
    audio ??= new AudioContext(); audio.resume();
    const osc = audio.createOscillator(), gain = audio.createGain(), now = audio.currentTime;
    osc.type = theme === 'neon' ? 'triangle' : 'sine'; osc.frequency.setValueAtTime({ hit: 400, launch: 230, score: 720, win: 960, click: 340 }[type] || 300, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + .17); gain.gain.setValueAtTime(.045, now); gain.gain.exponentialRampToValueAtTime(.001, now + .2);
    osc.connect(gain); gain.connect(audio.destination); osc.start(); osc.stop(now + .21);
  } catch { /* A partida continua caso o dispositivo não ofereça áudio. */ }
}
function bindChoice(attribute, callback) {
  document.querySelectorAll(`[data-${attribute}]`).forEach(button => button.onclick = () => {
    document.querySelectorAll(`[data-${attribute}]`).forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    callback(button.dataset[attribute]); sound('click');
  });
}
bindChoice('mode', value => { mode = value; $('rule').textContent = modes[mode].rule; $('limit-group').hidden = mode === 'sling'; });
bindChoice('theme', value => { theme = value; document.body.dataset.theme = theme; $('theme-title').textContent = themes[theme].title; $('theme-description').textContent = themes[theme].caption; });
bindChoice('opponent', value => { opponent = value; $('difficulty-group').hidden = value !== 'ai'; });
bindChoice('difficulty', value => { difficulty = value; });
bindChoice('limit', value => { limit = Number(value); });
$('sound').onclick = () => { muted = !muted; $('sound').innerHTML = `♫ <span>Som ${muted ? 'desligado' : 'ligado'}</span>`; $('sound').setAttribute('aria-pressed', String(!muted)); sound('click'); };
function score(points) { $('score-left').textContent = points[0]; $('score-right').textContent = points[1]; }
function showOverlay(message, finished = false) {
  $('message').textContent = message; $('overlay-symbol').textContent = finished ? '♛' : 'Ⅱ'; $('overlay').hidden = false;
  $('resume').hidden = finished; $('rematch').hidden = !finished; $('pause').disabled = finished;
  $('result-detail').textContent = finished ? mode === 'sling' ? 'Todos os discos do vencedor atravessaram a abertura.' : `Placar final: ${$('score-left').textContent} × ${$('score-right').textContent}` : 'Respire. A próxima jogada espera por você.';
  (finished ? $('rematch') : $('resume')).focus();
}
function pause() { if (!scene || scene.sim.winner !== null || $('match').hidden) return; scene.setPaused(true); showOverlay('Uma pausa na rivalidade.'); }
function startMatch() {
  document.body.dataset.mode = mode;
  game?.destroy(true); scene = null;
  $('menu').hidden = true; $('match').hidden = false; $('overlay').hidden = true; $('pause').disabled = false; $('loading').hidden = false;
  $('match-title').textContent = modes[mode].name; $('match-detail').textContent = `${themes[theme].name} · ${opponent === 'ai' ? `IA ${{ easy: 'fácil', normal: 'normal', hard: 'difícil' }[difficulty]}` : 'Dupla local'}`;
  $('p1-name').textContent = opponent === 'ai' ? 'VOCÊ' : 'JOGADOR 1'; $('p2-name').textContent = opponent === 'ai' ? 'IA' : 'JOGADOR 2';
  $('score-caption').textContent = mode === 'sling' ? 'DISCOS NO SEU LADO · ZERE PARA VENCER' : `PRIMEIRO A ${limit} PONTOS`;
  $('opacity').closest('label').hidden = mode === 'sling';
  $('controls').innerHTML = mode === 'sling' ? '<b>PUXE & SOLTE</b> Azul / 1: esquerda · Coral / 2: direita. A cor muda ao atravessar a abertura. Puxe um disco do seu lado para sua borda e solte.' : '<b>ARRASTE & REBATA</b> Arraste o círculo transparente em qualquer direção. Teclado: WASD · Jogador 2: setas.';
  score(mode === 'sling' ? [5, 5] : [0, 0]);
  const arena = new ArenaScene({ theme, mode, ai: opponent === 'ai', difficulty, limit }, {
    ready: active => { scene = active; $('loading').hidden = true; scene.hud.setAlpha(Number($('opacity').value) / 100); fullscreen.resize(); }, score, sound, pause,
    win: side => { sound('win'); showOverlay(side === 0 ? opponent === 'ai' ? 'Você venceu!' : 'Jogador 1 venceu!' : opponent === 'ai' ? 'A IA venceu!' : 'Jogador 2 venceu!', true); },
    error: message => { $('loading').textContent = message; },
  });
  game = new Phaser.Game({ type: Phaser.AUTO, parent: 'game', width: 1000, height: 560, transparent: true, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: arena, input: { activePointers: 4 }, render: { antialias: true }, audio: { noAudio: true } });
  window.scrollTo({ top: 0 }); sound('click');
}
async function menu() { await fullscreen.exit(); game?.destroy(true); game = null; scene = null; $('match').hidden = true; $('menu').hidden = false; $('play').focus(); }
$('play').onclick = startMatch; $('back').onclick = menu; $('result-menu').onclick = menu; $('pause').onclick = pause;
$('resume').onclick = () => { scene.setPaused(false); $('overlay').hidden = true; $('pause').focus(); };
$('rematch').onclick = startMatch;
$('opacity').oninput = () => scene?.hud.setAlpha(Number($('opacity').value) / 100);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('blur', pause);

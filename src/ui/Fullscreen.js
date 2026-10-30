/** Amplia a partida sem alterar o canvas lógico, as coordenadas ou a simulação. */
export class Fullscreen {
  constructor(root, button, onResize) {
    this.root = root; this.button = button; this.onResize = onResize;
    this.fallback = false; this.savedOverflow = null; this.pendingFrame = null;
    this.button.onclick = () => this.toggle();
    document.addEventListener('fullscreenchange', () => this.sync());
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.fallback) {
        event.preventDefault(); event.stopImmediatePropagation(); this.exit();
      }
    }, true);
    window.addEventListener('resize', () => this.resize());
    this.observer = new ResizeObserver(() => this.resize());
    for (const node of [root, root.querySelector('.match-bar'), root.querySelector('.scoreboard')]) if (node) this.observer.observe(node);
    this.sync();
  }
  get expanded() { return this.fallback || document.fullscreenElement === this.root; }
  async toggle() {
    if (this.expanded) return this.exit();
    // Chamado diretamente pelo clique, conforme exigido pela Fullscreen API.
    if (document.fullscreenEnabled && this.root.requestFullscreen) {
      try { await this.root.requestFullscreen(); this.sync(); return; }
      catch { /* Alguns navegadores mobile só permitem a ampliação dentro da página. */ }
    }
    this.fallback = true; this.sync();
  }
  async exit() {
    this.fallback = false;
    if (document.fullscreenElement === this.root) {
      try { await document.exitFullscreen(); } catch { /* O navegador pode já ter saído via Esc. */ }
    }
    this.sync();
  }
  sync() {
    const expanded = this.expanded;
    this.root.classList.toggle('is-expanded', expanded);
    this.button.setAttribute('aria-pressed', String(expanded));
    const label = expanded ? 'Sair da tela cheia' : 'Tela cheia';
    this.button.setAttribute('aria-label', label); this.button.title = label;
    this.button.innerHTML = `${expanded ? '⊡' : '⛶'} <span>${label}</span>`;
    if (expanded && this.savedOverflow === null) {
      this.savedOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    } else if (!expanded && this.savedOverflow !== null) {
      document.body.style.overflow = this.savedOverflow; this.savedOverflow = null;
    }
    this.resize();
  }
  resize() {
    cancelAnimationFrame(this.pendingFrame);
    this.pendingFrame = requestAnimationFrame(() => {
      if (this.expanded) {
        const style = getComputedStyle(this.root);
        const width = this.root.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        const height = this.root.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
          - this.root.querySelector('.match-bar').offsetHeight - this.root.querySelector('.scoreboard').offsetHeight;
        this.root.style.setProperty('--expanded-board-width', `${Math.floor(Math.max(1, Math.min(width, height * 1000 / 560)))}px`);
      } else this.root.style.removeProperty('--expanded-board-width');
      requestAnimationFrame(() => this.onResize());
    });
  }
}

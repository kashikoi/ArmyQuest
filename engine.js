// engine.js — Army Quest core engine.
// Classic (non-module) script namespaced under window.AQ. Handles the 320x200
// EGA display, Sierra-style UI (score/rank bar, command prompt, modal popups),
// toggle-walk player, depth sorting, collision, input, room transitions, and
// Save/Restore to localStorage. No external dependencies.

(function () {
  const AQ = (window.AQ = window.AQ || {});

  // -------------------------------------------------------------------------
  // Virtual display layout (classic AGI is 320x200; scaled up with crisp pixels)
  // -------------------------------------------------------------------------
  const VW = 320;
  const VH = 200;
  const TOP_BAR_H = 12;
  const VIEW_Y = TOP_BAR_H;              // viewport top (y = 12)
  const VIEW_H = 160;                    // viewport height
  const VIEW_BOTTOM = VIEW_Y + VIEW_H;   // y = 172
  const PROMPT_Y = VIEW_BOTTOM;          // command prompt top (y = 172)
  const PROMPT_H = VH - PROMPT_Y;        // 28 px

  const EGA = AQ.EGA; // 16-color palette, defined in gfx.js

  const PLAYER_SPEED = 38;            // virtual pixels per second
  const WALK_FRAME_TIME = 0.15;       // seconds per walk-cycle frame
  const SAVE_KEY = 'armyquest.save.v1';

  // Movement keyed by KeyboardEvent.code so the numeric keypad is movement
  // while top-row number keys stay available for typing.
  const MOVE_KEYS = {
    ArrowUp:    { dx: 0,  dy: -1, facing: 'up' },    Numpad8: { dx: 0,  dy: -1, facing: 'up' },
    ArrowDown:  { dx: 0,  dy: 1,  facing: 'down' },  Numpad2: { dx: 0,  dy: 1,  facing: 'down' },
    ArrowLeft:  { dx: -1, dy: 0,  facing: 'left' },  Numpad4: { dx: -1, dy: 0,  facing: 'left' },
    ArrowRight: { dx: 1,  dy: 0,  facing: 'right' }, Numpad6: { dx: 1,  dy: 0,  facing: 'right' },
    Numpad7:    { dx: -1, dy: -1, facing: 'up' },    Numpad9: { dx: 1,  dy: -1, facing: 'up' },
    Numpad1:    { dx: -1, dy: 1,  facing: 'down' },  Numpad3: { dx: 1,  dy: 1,  facing: 'down' },
  };

  class Engine {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false; // keep upscaling crisp

      this.score = 0;
      this.maxScore = 250;
      this.rank = 'Civilian';

      this.inventory = [];
      this.input = '';
      this.modal = { visible: false, lines: [], onDismiss: null };
      this.clock = 0;

      // Player ("ego"). Position is the FEET point (bottom-center).
      this.player = {
        x: 160, y: 150,
        dir: { dx: 0, dy: 0 },
        facing: 'down',
        frame: 0, animTime: 0, moving: false,
        skin: EGA.brown, hair: EGA.black, shoes: EGA.darkgray,
        shirt: EGA.brightcyan, pants: EGA.brightblue, // pajamas to start
        sleeves: 'long', belt: false,
      };

      // Death / game-over state (Sierra style: die, then RESTORE or RESTART).
      this.inputLocked = false;
      this.deathTimer = 0;
      this.deathText = '';
      this.gameOver = false;

      this.room = null;
      window.addEventListener('keydown', (e) => this.onKeyDown(e));
    }

    // ---------------------------------------------------------------------
    // Room management
    // ---------------------------------------------------------------------
    changeRoom(room) {
      this.room = room;
      if (room.enter) room.enter(this);
      if (room.startX != null) {
        this.player.x = room.startX;
        this.player.y = room.startY;
        this.player.facing = room.startFacing || 'down';
      }
      this.player.dir = { dx: 0, dy: 0 };
    }

    // ---------------------------------------------------------------------
    // Game loop
    // ---------------------------------------------------------------------
    start() {
      this.last = performance.now();
      requestAnimationFrame(this.loop);
    }

    loop = (ts) => {
      const dt = Math.min(0.05, (ts - this.last) / 1000);
      this.last = ts;
      this.clock += dt;
      this.update(dt);
      this.render();
      requestAnimationFrame(this.loop);
    };

    update(dt) {
      if (this.modal.visible) return; // paused while a popup is up

      if (this.deathTimer > 0) {
        this.deathTimer -= dt;
        if (this.deathTimer <= 0) {
          this.deathTimer = 0;
          this.showModal(this.deathText, () => { this.gameOver = true; });
          return;
        }
      }

      if (this.room && this.room.update) this.room.update(this, dt);
      if (this.modal.visible) return;

      const p = this.player;
      if (p.dead || this.inputLocked) { p.moving = false; p.frame = 0; return; }
      const { dx, dy } = p.dir;
      if (dx === 0 && dy === 0) { p.moving = false; p.frame = 0; p.animTime = 0; return; }
      p.moving = true;

      const len = Math.hypot(dx, dy) || 1;
      const step = PLAYER_SPEED * dt;
      const mx = (dx / len) * step;
      const my = (dy / len) * step;
      const nx = p.x + mx, ny = p.y + my;

      // Full move, then slide along one axis if blocked (control lines).
      if (this.canStand(nx, ny)) { p.x = nx; p.y = ny; }
      else if (this.canStand(nx, p.y)) { p.x = nx; }
      else if (this.canStand(p.x, ny)) { p.y = ny; }

      p.animTime += dt;
      if (p.animTime > WALK_FRAME_TIME) {
        p.animTime -= WALK_FRAME_TIME;
        p.frame = (p.frame + 1) % AQ.sprites.JACK_FRAMES;
      }
    }

    // Collision test against walkable floor + obstacle rects. (x,y) is feet.
    canStand(x, y) {
      const f = this.room.floor;
      if (x < f.x || x > f.x + f.w || y < f.y || y > f.y + f.h) return false;
      for (const o of this.room.obstacles || []) {
        if (x > o.x && x < o.x + o.w && y > o.y && y < o.y + o.h) return false;
      }
      return true;
    }

    isNear(hotspot) {
      const p = this.player;
      const reach = hotspot.reach || 42;
      return Math.hypot(p.x - hotspot.x, p.y - hotspot.y) <= reach;
    }

    // ---------------------------------------------------------------------
    // Input
    // ---------------------------------------------------------------------
    onKeyDown(e) {
      const { code, key } = e;

      if (this.modal.visible) {
        if (code === 'Enter' || code === 'NumpadEnter') { e.preventDefault(); this.dismissModal(); }
        return;
      }

      // Sierra function keys: F5 save, F7 restore.
      if (code === 'F5') { e.preventDefault(); this.saveGame(); return; }
      if (code === 'F7') { e.preventDefault(); this.restoreGame(); return; }

      const mv = MOVE_KEYS[code];
      if (mv) { e.preventDefault(); this.setMove(mv); return; }
      if (code === 'Numpad5') { e.preventDefault(); this.stopPlayer(); return; }

      if (code === 'Enter' || code === 'NumpadEnter') { e.preventDefault(); this.submitCommand(); return; }
      if (code === 'Backspace') { e.preventDefault(); this.input = this.input.slice(0, -1); return; }

      if (code === 'Space') {
        e.preventDefault();
        if (this.input.length === 0) this.stopPlayer();
        else this.input += ' ';
        return;
      }

      if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        this.input += key.toLowerCase();
      }
    }

    setMove(mv) {
      const p = this.player;
      if (p.dead || this.inputLocked) return;
      if (p.dir.dx === mv.dx && p.dir.dy === mv.dy) { p.dir = { dx: 0, dy: 0 }; }
      else { p.dir = { dx: mv.dx, dy: mv.dy }; p.facing = mv.facing; }
    }

    stopPlayer() { this.player.dir = { dx: 0, dy: 0 }; }

    // ---------------------------------------------------------------------
    // Command handling
    // ---------------------------------------------------------------------
    submitCommand() {
      const raw = this.input.trim();
      this.input = '';
      if (!raw) return;

      const parsed = AQ.parse(raw);

      if (this.player.dead || this.gameOver) {
        if (parsed.verb === 'restore') return this.restoreGame();
        if (parsed.verb === 'restart') return this.restartGame();
        this.showModal("You're dead, soldier. Type RESTORE to load a saved game or RESTART to begin again.");
        return;
      }

      switch (parsed.verb) {
        case 'restart':   return this.restartGame();
        case 'inventory': return this.showInventory();
        case 'save':      return this.saveGame();
        case 'restore':   return this.restoreGame();
        case 'help':      return this.showHelp();
      }

      if (!parsed.verb) {
        this.showModal(`I don't know how to "${parsed.firstWord || raw}".`);
        return;
      }

      const handled = this.room.handleCommand ? this.room.handleCommand(parsed, this) : false;
      if (!handled) this.showModal("You can't do that right now.");
    }

    showInventory() {
      if (this.inventory.length === 0) { this.showModal("You aren't carrying anything."); return; }
      this.showModal('You are carrying: ' + this.inventory.join(', ') + '.');
    }

    showHelp() {
      this.showModal(
        "COMMANDS: look / read / open / take / wear / talk / inventory (i).  " +
        "MOVE: arrow keys or numpad (same key or 5/Space to stop).  " +
        "SAVE: F5 or type 'save'.  RESTORE: F7 or type 'restore'.  RESTART: type 'restart'."
      );
    }

    addScore(n) { this.score = Math.min(this.maxScore, this.score + n); }

    // ---------------------------------------------------------------------
    // Save / Restore (localStorage — the Sierra way)
    // ---------------------------------------------------------------------
    saveGame() {
      if (this.player.dead || this.gameOver) { this.showModal("You can't save the game when you're dead!"); return; }
      const r = this.room;
      const data = {
        v: 1,
        roomId: r ? r.id : 'room1',
        score: this.score,
        rank: this.rank,
        inventory: this.inventory.slice(),
        player: {
          x: this.player.x, y: this.player.y, facing: this.player.facing,
          shirt: this.player.shirt, pants: this.player.pants,
          sleeves: this.player.sleeves, belt: this.player.belt,
        },
        roomState: r && r.serialize ? r.serialize() : {},
      };
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        this.showModal('Game saved. Your progress stays safe in this browser.');
      } catch (err) {
        this.showModal('Could not save the game (browser storage unavailable).');
      }
    }

    hasSavedGame() {
      try { return !!localStorage.getItem(SAVE_KEY); } catch (err) { return false; }
    }

    restoreGame() {
      let data = null;
      try { data = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (err) { data = null; }
      if (!data) { this.showModal('No saved game found.'); return; }

      const make = (AQ.ROOMS && AQ.ROOMS[data.roomId]) || AQ.ROOMS.room1;
      const room = make();
      this.changeRoom(room);
      if (room.restore && data.roomState) room.restore(data.roomState);

      this.score = data.score || 0;
      this.rank = data.rank || 'Civilian';
      this.inventory = data.inventory || [];
      this.clearDeath();
      if (data.player) Object.assign(this.player, data.player);
      this.player.dir = { dx: 0, dy: 0 };

      this.showModal('Game restored. Welcome back, soldier.');
    }

    restartGame() {
      this.clearDeath();
      this.score = 0;
      this.rank = 'Civilian';
      this.inventory = [];
      this.changeRoom(AQ.createRoom1());
      this.showModal("Let's try that again. Jack wakes up in his bedroom on the big day...");
    }

    // ---------------------------------------------------------------------
    // Death (rooms call killPlayer; the death popup follows after a beat)
    // ---------------------------------------------------------------------
    killPlayer(text, delay = 1.4) {
      const p = this.player;
      if (p.dead) return;
      p.dead = true;
      this.inputLocked = true;
      this.stopPlayer();
      this.deathText = text;
      this.deathTimer = delay;
    }

    clearDeath() {
      this.player.dead = false;
      this.inputLocked = false;
      this.deathTimer = 0;
      this.gameOver = false;
    }

    // ---------------------------------------------------------------------
    // Modal popups (white box, red double border, pauses until ENTER)
    // ---------------------------------------------------------------------
    showModal(text, onDismiss) {
      this.modal.lines = wrapText(text, 36);
      this.modal.visible = true;
      this.modal.onDismiss = onDismiss || null;
      this.stopPlayer();
    }

    dismissModal() {
      this.modal.visible = false;
      const cb = this.modal.onDismiss;
      this.modal.onDismiss = null;
      if (cb) cb();
    }

    // ---------------------------------------------------------------------
    // Rendering
    // ---------------------------------------------------------------------
    render() {
      const ctx = this.ctx;

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, VIEW_Y, VW, VIEW_H);
      ctx.clip();

      this.room.drawBackground(ctx, this);

      const drawables = [
        ...(this.room.depthObjects || []),
        { sortY: this.player.y, draw: (c) => this.drawPlayer(c) },
      ];
      drawables.sort((a, b) => a.sortY - b.sortY);
      for (const d of drawables) d.draw(ctx, this);

      ctx.restore();

      this.drawTopBar(ctx);
      this.drawPrompt(ctx);
      if (this.modal.visible) this.drawModal(ctx);
    }

    drawTopBar(ctx) {
      ctx.fillStyle = EGA.blue;
      ctx.fillRect(0, 0, VW, TOP_BAR_H);
      ctx.fillStyle = EGA.white;
      ctx.font = '8px monospace';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${this.score} of ${this.maxScore}`, 4, 2);
      ctx.textAlign = 'right';
      ctx.fillText(`Rank: ${this.rank}`, VW - 4, 2);
      ctx.textAlign = 'left';
    }

    drawPrompt(ctx) {
      ctx.fillStyle = EGA.black;
      ctx.fillRect(0, PROMPT_Y, VW, PROMPT_H);
      ctx.fillStyle = EGA.darkgray;
      ctx.fillRect(0, PROMPT_Y, VW, 1);
      ctx.fillStyle = EGA.white;
      ctx.font = '8px monospace';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      const cursor = (Math.floor(this.clock * 2) % 2 === 0) ? '_' : ' ';
      ctx.fillText('>' + this.input + cursor, 4, PROMPT_Y + 10);
    }

    drawModal(ctx) {
      const lines = this.modal.lines;
      const charW = 5, lineH = 10, pad = 8;
      const textW = Math.max(...lines.map((l) => l.length)) * charW;
      const boxW = Math.min(VW - 24, Math.max(textW, 80) + pad * 2);
      const boxH = lines.length * lineH + pad * 2 + 12;
      const bx = Math.round((VW - boxW) / 2);
      const by = Math.round(VIEW_Y + (VIEW_H - boxH) / 2);

      ctx.fillStyle = EGA.brightred; ctx.fillRect(bx - 3, by - 3, boxW + 6, boxH + 6);
      ctx.fillStyle = EGA.white;     ctx.fillRect(bx - 1, by - 1, boxW + 2, boxH + 2);
      ctx.fillStyle = EGA.brightred; ctx.fillRect(bx, by, boxW, boxH);
      ctx.fillStyle = EGA.white;     ctx.fillRect(bx + 2, by + 2, boxW - 4, boxH - 4);

      ctx.fillStyle = EGA.black;
      ctx.font = '8px monospace';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'center';
      let ty = by + pad;
      for (const l of lines) { ctx.fillText(l, VW / 2, ty); ty += lineH; }
      ctx.fillStyle = EGA.red;
      ctx.fillText('[ Press ENTER ]', VW / 2, by + boxH - pad - 2);
      ctx.textAlign = 'left';
    }

    // Jack's hand-pixeled sprite (sprites.js), drawn relative to his feet (x, y).
    drawPlayer(ctx) {
      const p = this.player;
      const x = Math.round(p.x), y = Math.round(p.y);
      const S = AQ.sprites;

      // Dithered contact shadow keeps the palette strictly EGA.
      ctx.fillStyle = AQ.gfx.dither(ctx, null, EGA.black, 'checker');
      ctx.fillRect(x - 5, y - 1, 11, 1);
      ctx.fillRect(x - 7, y, 15, 1);
      ctx.fillRect(x - 5, y + 1, 11, 1);

      const facing = ['up', 'down', 'left', 'right'].includes(p.facing) ? p.facing : 'down';
      const img = S.getJackFrame(p, facing, p.moving ? p.frame : 0);
      if (p.dead) {
        // Knocked flat: rotate the standing frame 90 degrees (stays pixel-exact).
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-Math.PI / 2);
        ctx.drawImage(img, -4, -S.JACK_H / 2);
        ctx.restore();
        return;
      }
      ctx.drawImage(img, x - S.JACK_W / 2, y - S.JACK_H + 1);
    }
  }

  // Word-wrap helper for popup text.
  function wrapText(text, max) {
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      if ((cur + ' ' + w).trim().length > max) { if (cur) lines.push(cur.trim()); cur = w; }
      else cur += ' ' + w;
    }
    if (cur.trim()) lines.push(cur.trim());
    return lines;
  }

  // Export engine + shared constants on the AQ namespace.
  Object.assign(AQ, {
    VW, VH, TOP_BAR_H, VIEW_Y, VIEW_H, VIEW_BOTTOM, PROMPT_Y, PROMPT_H, EGA, Engine,
  });
})();

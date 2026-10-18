// rooms/room1_bedroom.js — Level 1, Room 1: Jack's Bedroom.
// Oak Creek, Iowa, 1989. Classic (non-module) script namespaced under window.AQ.

(function () {
  const AQ = (window.AQ = window.AQ || {});
  const EGA = AQ.EGA;
  const VIEW_Y = AQ.VIEW_Y, VIEW_BOTTOM = AQ.VIEW_BOTTOM, VW = AQ.VW;

  const WALL_BOTTOM = 70; // y where the back wall meets the floor

  function createRoom1() {
    const room = {
      id: 'room1',
      name: "Jack's Bedroom",

      startX: 160, startY: 150, startFacing: 'up',

      floor: { x: 10, y: 72, w: 300, h: 96 },

      // Invisible control lines: furniture the player cannot walk through.
      obstacles: [
        { x: 10,  y: 104, w: 70, h: 54 }, // bed
        { x: 118, y: 90,  w: 70, h: 34 }, // desk
        { x: 238, y: 104, w: 62, h: 48 }, // dresser
      ],

      doorZone: { x: 138, y: 72, w: 44, h: 9 },

      hotspots: {
        desk:     { x: 153, y: 107, reach: 60 },
        brochure: { x: 140, y: 100, reach: 60 },
        wallet:   { x: 170, y: 100, reach: 60 },
        dresser:  { x: 269, y: 128, reach: 55 },
        bed:      { x: 45,  y: 130, reach: 60 },
        door:     { x: 158, y: 72,  reach: 60 },
      },

      // Puzzle / progression state.
      dressed: false,
      hasWallet: false,
      dresserOpen: false,
      readDone: false,
      _doorHandled: false,

      enter, update, drawBackground, handleCommand, serialize, restore,
    };

    // Depth-sorted furniture. sortY is the base line used against the player's
    // feet-Y so Jack can walk behind the desk and in front of the bed/dresser.
    room.depthObjects = [
      { sortY: 158, draw: (ctx) => drawBed(ctx) },
      { sortY: 124, draw: (ctx) => drawDesk(ctx, room) },
      { sortY: 152, draw: (ctx) => drawDresser(ctx, room) },
    ];

    return room;
  }

  // -------------------------------------------------------------------------
  // Lifecycle + save state
  // -------------------------------------------------------------------------
  function enter(engine) {
    // Jack starts in his pajamas every time this room loads fresh.
    engine.player.shirt = EGA.brightcyan;
    engine.player.pants = EGA.brightblue;
  }

  function serialize() {
    return {
      dressed: this.dressed, hasWallet: this.hasWallet,
      dresserOpen: this.dresserOpen, readDone: this.readDone,
    };
  }

  function restore(s) {
    this.dressed = !!s.dressed;
    this.hasWallet = !!s.hasWallet;
    this.dresserOpen = !!s.dresserOpen;
    this.readDone = !!s.readDone;
  }

  // Called every frame: watch for the player walking into the door.
  function update(engine) {
    const p = engine.player;
    const z = this.doorZone;
    const inZone = p.x > z.x && p.x < z.x + z.w && p.y > z.y && p.y < z.y + z.h;

    if (inZone && !this._doorHandled) {
      this._doorHandled = true;
      engine.stopPlayer();
      p.y = z.y + z.h + 6; // nudge back onto the floor so the popup fires once

      if (!this.dressed) {
        engine.showModal("You can't go down to the Recruiting Office in your pajamas! Get dressed first.");
      } else if (!this.hasWallet) {
        engine.showModal("You pat your pockets and freeze - no wallet. You can't enlist without your ID. Grab it off the desk first.");
      } else {
        engine.changeRoom(AQ.createRoom2());
      }
    }

    if (!inZone) this._doorHandled = false;
  }

  // -------------------------------------------------------------------------
  // Command handling (verb/noun)
  // -------------------------------------------------------------------------
  function handleCommand(parsed, engine) {
    const { verb, noun } = parsed;
    const say = (t) => { engine.showModal(t); return true; };

    switch (verb) {
      case 'look': return look.call(this, noun, engine, say);
      case 'open': return open.call(this, noun, engine, say);
      case 'take': return take.call(this, noun, engine, say);
      case 'wear': return wear.call(this, noun, engine, say);
      case 'talk': return say("There's no one here to talk to. Mom's downstairs making breakfast.");
      case 'use':
        if (noun === 'door') return goDoor.call(this, engine, say);
        if (noun === 'dresser') return open.call(this, 'dresser', engine, say);
        return false;
      case 'go':
      case 'close':
        if (noun === 'door') return goDoor.call(this, engine, say);
        return say('Walk there with the arrow keys.');
      default:
        return false;
    }
  }

  function look(noun, engine, say) {
    if (!noun || noun === 'room') {
      return say("Your cramped childhood bedroom. A bed sits against the left wall, a dresser to the right, and a desk in the middle beneath an Army poster. A door leads to the hallway.");
    }
    switch (noun) {
      case 'desk':     return say("A cluttered wooden desk. An Army recruitment brochure lies on top, next to your wallet.");
      case 'brochure': return readBrochure.call(this, engine, say);
      case 'dresser':  return say(this.dresserOpen
        ? "The open dresser holds a clean pair of blue jeans and a white t-shirt."
        : "A wooden dresser with two drawers. They're shut.");
      case 'wallet':   return say(this.hasWallet
        ? "You've already got your wallet tucked safely in your pocket."
        : "Your worn leather wallet, holding your ID. It's sitting on the desk.");
      case 'bed':      return say("Your unmade bed. Tempting... but today is the day you change your life.");
      case 'poster':   return say("A recruitment poster: a soldier salutes beneath the words 'BE ALL YOU CAN BE.'");
      case 'window':   return say("Through the window, the quiet streets of Oak Creek, Iowa stretch out under a 1989 autumn sky.");
      case 'door':     return say("The door to the upstairs hallway. The stairs lead down and out to Main Street.");
      case 'clothes':  return say(this.dresserOpen
        ? "Blue jeans and a white t-shirt, fresh from the dresser."
        : "You'll need to find some clothes. Try the dresser.");
      default:         return say("You don't see anything special about that.");
    }
  }

  function readBrochure(engine, say) {
    if (!this.readDone) {
      this.readDone = true;
      engine.addScore(1);
      return say("ARMY RECRUITMENT: 'Serve your country. See the world. Become more than you ever imagined.' A spark lights in your chest. (+1)");
    }
    return say("You've already read the brochure. Your mind is made up.");
  }

  function open(noun, engine, say) {
    if (noun === 'dresser') {
      if (!engine.isNear(this.hotspots.dresser)) return say("You aren't close enough.");
      if (this.dresserOpen) return say("The dresser is already open.");
      this.dresserOpen = true;
      return say("You pull open the dresser drawers. Inside: a clean pair of blue jeans and a white t-shirt.");
    }
    if (noun === 'door') return goDoor.call(this, engine, say);
    if (noun === 'window') return say("The window is painted shut. It won't budge.");
    return false;
  }

  function take(noun, engine, say) {
    if (noun === 'wallet') {
      if (this.hasWallet) return say("You already have your wallet.");
      if (!engine.isNear(this.hotspots.wallet)) return say("You aren't close enough.");
      this.hasWallet = true;
      engine.inventory.push('wallet (ID)');
      engine.addScore(2);
      return say("You pocket your wallet. You'll need your ID at the Recruiting Office. (+2)");
    }
    if (noun === 'brochure') {
      if (!engine.isNear(this.hotspots.brochure)) return say("You aren't close enough.");
      return say("You leave the brochure on the desk. Reading it was enough.");
    }
    if (noun === 'clothes') return wear.call(this, 'clothes', engine, say);
    return false;
  }

  function wear(noun, engine, say) {
    if (noun && noun !== 'clothes') return false;
    if (this.dressed) return say("You're already dressed in your jeans and t-shirt.");
    if (!this.dresserOpen) return say("You rummage around but can't find clean clothes. Maybe check the dresser.");
    if (!engine.isNear(this.hotspots.dresser)) return say("You aren't close enough to the dresser.");

    this.dressed = true;
    engine.player.shirt = EGA.brightred; // t-shirt
    engine.player.pants = EGA.blue;      // blue jeans
    engine.addScore(2);
    return say("You shed your pajamas and pull on the blue jeans and t-shirt. Much better. (+2)");
  }

  function goDoor(engine, say) {
    if (!this.dressed) return say("You can't go down to the Recruiting Office in your pajamas! Get dressed first.");
    if (!this.hasWallet) return say("You can't enlist without your ID. Grab your wallet off the desk first.");
    engine.changeRoom(AQ.createRoom2());
    return true;
  }

  // -------------------------------------------------------------------------
  // Room art (EGA box/polygon fills)
  // -------------------------------------------------------------------------
  function drawBackground(ctx) {
    ctx.fillStyle = EGA.blue;
    ctx.fillRect(0, VIEW_Y, VW, WALL_BOTTOM - VIEW_Y);
    ctx.fillStyle = EGA.brightblue;
    ctx.fillRect(0, VIEW_Y, VW, 2);

    ctx.fillStyle = EGA.brown;
    ctx.fillRect(0, WALL_BOTTOM, VW, VIEW_BOTTOM - WALL_BOTTOM);
    ctx.fillStyle = EGA.darkgray;
    ctx.fillRect(0, WALL_BOTTOM - 2, VW, 2);
    ctx.fillStyle = EGA.red;
    ctx.fillRect(95, 132, 110, 30);
    ctx.fillStyle = EGA.brightred;
    ctx.fillRect(100, 136, 100, 22);

    drawWindow(ctx);
    drawPoster(ctx);
    drawDoor(ctx);
  }

  function drawWindow(ctx) {
    ctx.fillStyle = EGA.white;      ctx.fillRect(18, 22, 60, 36);
    ctx.fillStyle = EGA.brightcyan; ctx.fillRect(20, 24, 56, 28);
    ctx.fillStyle = EGA.green;      ctx.fillRect(20, 48, 56, 8);
    ctx.fillStyle = EGA.white;      ctx.fillRect(46, 24, 2, 32);
    ctx.fillRect(20, 38, 56, 2);
  }

  function drawPoster(ctx) {
    ctx.fillStyle = EGA.green;  ctx.fillRect(210, 22, 46, 36);
    ctx.fillStyle = EGA.yellow; ctx.fillRect(210, 22, 46, 2);
    ctx.fillRect(210, 56, 46, 2);
    ctx.fillStyle = EGA.darkgray; ctx.fillRect(228, 30, 10, 14);
    ctx.fillStyle = EGA.yellow;   ctx.fillRect(224, 26, 4, 4);
    ctx.fillStyle = EGA.white;
    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ARMY', 233, 48);
    ctx.textAlign = 'left';
  }

  function drawDoor(ctx) {
    ctx.fillStyle = EGA.darkgray; ctx.fillRect(133, 16, 51, 54);
    ctx.fillStyle = EGA.brown;    ctx.fillRect(136, 18, 45, 52);
    ctx.fillStyle = EGA.darkgray;
    ctx.fillRect(141, 23, 35, 1); ctx.fillRect(141, 23, 1, 18); ctx.fillRect(175, 23, 1, 18); ctx.fillRect(141, 40, 35, 1);
    ctx.fillRect(141, 46, 35, 1); ctx.fillRect(141, 46, 1, 18); ctx.fillRect(175, 46, 1, 18);
    ctx.fillStyle = EGA.yellow; ctx.fillRect(176, 44, 3, 3);
  }

  function drawBed(ctx) {
    ctx.fillStyle = EGA.brown;      ctx.fillRect(12, 118, 66, 40);
    ctx.fillStyle = EGA.brightblue; ctx.fillRect(14, 122, 62, 20);
    ctx.fillStyle = EGA.blue;       ctx.fillRect(14, 136, 62, 6);
    ctx.fillStyle = EGA.white;      ctx.fillRect(16, 114, 24, 12);
    ctx.fillStyle = EGA.darkgray;   ctx.fillRect(12, 150, 6, 8); ctx.fillRect(72, 150, 6, 8);
  }

  function drawDesk(ctx, room) {
    ctx.fillStyle = EGA.brown;    ctx.fillRect(118, 96, 70, 10);
    ctx.fillStyle = EGA.darkgray; ctx.fillRect(118, 106, 70, 2);
    ctx.fillStyle = EGA.brown; ctx.fillRect(122, 106, 4, 18); ctx.fillRect(180, 106, 4, 18);

    ctx.fillStyle = EGA.white; ctx.fillRect(132, 90, 16, 8);
    ctx.fillStyle = EGA.green; ctx.fillRect(133, 91, 14, 2);
    ctx.fillStyle = EGA.red;   ctx.fillRect(133, 94, 9, 1);
    ctx.fillRect(133, 96, 11, 1);

    if (!room.hasWallet) {
      ctx.fillStyle = EGA.darkgray; ctx.fillRect(160, 91, 14, 6);
      ctx.fillStyle = EGA.brown;    ctx.fillRect(161, 92, 12, 4);
      ctx.fillStyle = EGA.yellow;   ctx.fillRect(165, 93, 3, 2);
    }
  }

  function drawDresser(ctx, room) {
    ctx.fillStyle = EGA.brown;    ctx.fillRect(240, 106, 58, 46);
    ctx.fillStyle = EGA.darkgray; ctx.fillRect(240, 124, 58, 1);

    if (room.dresserOpen) {
      ctx.fillStyle = EGA.darkgray; ctx.fillRect(238, 110, 62, 12);
      ctx.fillStyle = EGA.black;    ctx.fillRect(240, 111, 58, 2);
      ctx.fillStyle = EGA.white;    ctx.fillRect(244, 113, 22, 6);
      ctx.fillStyle = EGA.blue;     ctx.fillRect(268, 113, 24, 6);
    } else {
      ctx.fillStyle = EGA.yellow; ctx.fillRect(252, 114, 6, 2); ctx.fillRect(280, 114, 6, 2);
    }
    ctx.fillStyle = EGA.yellow;   ctx.fillRect(252, 138, 6, 2); ctx.fillRect(280, 138, 6, 2);
    ctx.fillStyle = EGA.darkgray; ctx.fillRect(240, 150, 58, 2);
  }

  // Register in the namespace + room registry (used by Save/Restore).
  AQ.createRoom1 = createRoom1;
  (AQ.ROOMS = AQ.ROOMS || {}).room1 = createRoom1;
})();

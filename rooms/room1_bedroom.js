// rooms/room1_bedroom.js — Level 1, Room 1: Jack's Bedroom.
// Oak Creek, Iowa, 1989. Classic (non-module) script namespaced under window.AQ.

(function () {
  const AQ = (window.AQ = window.AQ || {});
  const EGA = AQ.EGA;
  const G = AQ.gfx;
  const VIEW_Y = AQ.VIEW_Y, VIEW_BOTTOM = AQ.VIEW_BOTTOM, VW = AQ.VW;

  const WALL_BOTTOM = 82;          // y where the back wall meets the floor
  const BACK_L = 16, BACK_R = 304; // back-wall corners (side walls recede)
  const SIDE_DROP = 14;            // how far the side walls' floor line drops

  function createRoom1() {
    const room = {
      id: 'room1',
      name: "Jack's Bedroom",

      startX: 160, startY: 150, startFacing: 'up',

      floor: { x: 18, y: 84, w: 284, h: 84 },

      // Invisible control lines: furniture footprints (padded for Jack's width).
      obstacles: [
        { x: 6,   y: 110, w: 100, h: 42 }, // bed
        { x: 196, y: 82,  w: 96,  h: 18 }, // desk
        { x: 243, y: 142, w: 68,  h: 16 }, // dresser
      ],

      doorZone: { x: 142, y: 84, w: 36, h: 5 },

      hotspots: {
        desk:     { x: 244, y: 102, reach: 44 },
        brochure: { x: 219, y: 102, reach: 40 },
        wallet:   { x: 246, y: 102, reach: 40 },
        dresser:  { x: 277, y: 160, reach: 50 },
        bed:      { x: 56,  y: 156, reach: 50 },
        door:     { x: 160, y: 86,  reach: 36 },
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
      { sortY: 151, draw: (ctx) => drawBed(ctx) },
      { sortY: 99,  draw: (ctx) => drawDesk(ctx, room) },
      { sortY: 156, draw: (ctx) => drawDresser(ctx, room) },
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
    engine.player.sleeves = 'long';
    engine.player.belt = false;
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
      p.y = z.y + z.h + 8; // nudge back onto the floor so the popup fires once

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
      return say("Your cramped childhood bedroom. A bed sits against the left wall, a dresser stands to the right, and your desk is tucked beneath an Army poster on the far wall. A door leads to the hallway.");
    }
    switch (noun) {
      case 'desk':     return say("A cluttered wooden desk with a green banker's lamp. An Army recruitment brochure lies on top, next to your wallet.");
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
    engine.player.shirt = EGA.white;     // white t-shirt
    engine.player.pants = EGA.blue;      // blue jeans
    engine.player.sleeves = 'short';
    engine.player.belt = true;
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
  // Room art — strict 16-color EGA, Sierra-style dithering, 1px outlines.
  // Furniture tops are lit (brown); fronts are darker "mahogany" (red/brown
  // dither) with black outlines so everything reads clearly against the floor.
  // -------------------------------------------------------------------------
  const K = EGA.black;
  const wood = (ctx) => G.dither(ctx, EGA.brown, EGA.red, 'checker');      // dark wood front
  const shadow = (ctx) => G.dither(ctx, null, K, 'checker');

  function drawBackground(ctx) {
    drawFloor(ctx);
    drawWalls(ctx);
    drawWindow(ctx);
    drawDoor(ctx);
    drawPoster(ctx);
    drawSunbeam(ctx);
    drawRug(ctx);
  }

  function drawFloor(ctx) {
    G.rect(ctx, 0, WALL_BOTTOM, VW, VIEW_BOTTOM - WALL_BOTTOM, EGA.brown);

    // Floorboards converge toward a vanishing point above the room.
    const vpx = 160, vpy = -60;
    const lanes = [];
    for (let x0 = -200; x0 <= 520; x0 += 24) lanes.push(x0);
    const laneX = (x0, y) => vpx + (x0 - vpx) * (y - vpy) / (VIEW_BOTTOM - vpy);
    ctx.fillStyle = EGA.red;
    for (const x0 of lanes) {
      for (let y = WALL_BOTTOM; y < VIEW_BOTTOM; y++) ctx.fillRect(Math.round(laneX(x0, y)), y, 1, 1);
    }
    // Staggered butt joints between boards.
    lanes.forEach((x0, i) => {
      for (const base of [96, 128, 156]) {
        const y = base + ((i * 13) % 17) - 8;
        if (y <= WALL_BOTTOM + 2 || y >= VIEW_BOTTOM) continue;
        const xa = Math.round(laneX(x0, y)), xb = Math.round(laneX(x0 + 24, y));
        G.rect(ctx, xa, y, xb - xa, 1, EGA.red);
      }
    });
  }

  function drawWalls(ctx) {
    // Back wall: blue wallpaper with a dotted pattern + darker corners.
    G.rect(ctx, BACK_L, VIEW_Y, BACK_R - BACK_L, WALL_BOTTOM - VIEW_Y,
      G.dither(ctx, EGA.blue, EGA.brightblue, 'wallpaper'));
    // Crown molding.
    G.rect(ctx, BACK_L, VIEW_Y, BACK_R - BACK_L, 1, EGA.white);
    G.rect(ctx, BACK_L, VIEW_Y + 1, BACK_R - BACK_L, 1, EGA.lightgray);
    G.rect(ctx, BACK_L, VIEW_Y + 2, BACK_R - BACK_L, 1, G.dither(ctx, EGA.blue, K, 'checker'));

    // Side walls recede into shadow.
    const sideFill = G.dither(ctx, EGA.blue, K, 'sparse');
    G.poly(ctx, [[0, VIEW_Y], [BACK_L, VIEW_Y], [BACK_L, WALL_BOTTOM], [0, WALL_BOTTOM + SIDE_DROP]], sideFill);
    G.poly(ctx, [[BACK_R, VIEW_Y], [VW, VIEW_Y], [VW, WALL_BOTTOM + SIDE_DROP], [BACK_R, WALL_BOTTOM]], sideFill);
    G.rect(ctx, BACK_L, VIEW_Y, 1, WALL_BOTTOM - VIEW_Y, K);
    G.rect(ctx, BACK_R - 1, VIEW_Y, 1, WALL_BOTTOM - VIEW_Y, K);

    // Baseboards.
    G.rect(ctx, BACK_L, WALL_BOTTOM - 6, BACK_R - BACK_L, 1, EGA.white);
    G.rect(ctx, BACK_L, WALL_BOTTOM - 5, BACK_R - BACK_L, 4, EGA.lightgray);
    G.rect(ctx, BACK_L, WALL_BOTTOM - 1, BACK_R - BACK_L, 1, EGA.darkgray);
    const sideBoard = G.dither(ctx, EGA.lightgray, EGA.darkgray, 'checker');
    G.poly(ctx, [[0, WALL_BOTTOM + SIDE_DROP - 7], [BACK_L, WALL_BOTTOM - 6], [BACK_L, WALL_BOTTOM], [0, WALL_BOTTOM + SIDE_DROP]], sideBoard);
    G.poly(ctx, [[BACK_R, WALL_BOTTOM - 6], [VW, WALL_BOTTOM + SIDE_DROP - 7], [VW, WALL_BOTTOM + SIDE_DROP], [BACK_R, WALL_BOTTOM]], sideBoard);
    G.line(ctx, 0, WALL_BOTTOM + SIDE_DROP, BACK_L, WALL_BOTTOM, K);
    G.line(ctx, BACK_R - 1, WALL_BOTTOM, VW - 1, WALL_BOTTOM + SIDE_DROP, K);
  }

  function drawWindow(ctx) {
    // Outdoor view: autumn morning in Oak Creek.
    G.rect(ctx, 43, 25, 51, 35, EGA.brightcyan);
    G.rect(ctx, 50, 29, 10, 2, EGA.white); G.rect(ctx, 48, 31, 15, 2, EGA.white);
    G.rect(ctx, 76, 27, 8, 2, EGA.white); G.rect(ctx, 74, 29, 12, 1, EGA.white);
    G.rect(ctx, 43, 46, 51, 14, EGA.green);
    G.rect(ctx, 43, 46, 51, 1, G.dither(ctx, EGA.green, EGA.brightcyan, 'checker'));
    // Neighbor's house.
    G.poly(ctx, [[70, 40], [79, 33], [88, 40]], EGA.red);
    G.rect(ctx, 72, 40, 14, 9, EGA.white);
    G.rect(ctx, 76, 43, 3, 6, EGA.brown);
    G.rect(ctx, 81, 42, 3, 3, EGA.cyan);
    // Autumn maple.
    G.rect(ctx, 54, 44, 2, 8, EGA.darkgray);
    G.poly(ctx, [[47, 42], [50, 35], [55, 33], [61, 36], [63, 42], [58, 46], [51, 46]], EGA.brown);
    G.rect(ctx, 50, 37, 10, 7, G.dither(ctx, null, EGA.yellow, 'sparse'));
    G.rect(ctx, 43, 52, 51, 8, G.dither(ctx, EGA.green, EGA.brightgreen, 'rare'));

    // Frame, sashes, glass glints.
    const frame = EGA.white;
    G.rect(ctx, 40, 22, 57, 3, frame); G.rect(ctx, 40, 60, 57, 2, frame);
    G.rect(ctx, 40, 22, 3, 40, frame); G.rect(ctx, 94, 22, 3, 40, frame);
    G.rect(ctx, 67, 25, 3, 35, frame); G.rect(ctx, 43, 41, 51, 2, frame);
    G.rect(ctx, 43, 43, 51, 1, EGA.lightgray);
    G.rect(ctx, 96, 23, 1, 39, EGA.lightgray);
    for (const [gx, gy] of [[46, 27], [72, 27], [46, 45], [72, 45]]) {
      G.rect(ctx, gx, gy, 1, 1, EGA.white); G.rect(ctx, gx + 1, gy + 1, 1, 1, EGA.white);
      G.rect(ctx, gx + 3, gy, 1, 1, EGA.white);
    }
    // Sill.
    G.rect(ctx, 37, 62, 63, 1, EGA.white);
    G.rect(ctx, 37, 63, 63, 2, EGA.lightgray);
    G.rect(ctx, 38, 65, 61, 1, shadow(ctx));

    // Curtain rod + red curtains with tie-backs.
    G.rect(ctx, 30, 19, 77, 2, EGA.darkgray);
    G.rect(ctx, 29, 18, 3, 4, EGA.yellow); G.rect(ctx, 105, 18, 3, 4, EGA.yellow);
    drawCurtain(ctx, 31, false);
    drawCurtain(ctx, 106, true);
  }

  function drawCurtain(ctx, x, flip) {
    const sx = flip ? -1 : 1;
    const pts = [[x, 21], [x + sx * 13, 21], [x + sx * 9, 40], [x + sx * 5, 46], [x + sx * 11, 66], [x, 66]];
    G.poly(ctx, flip ? pts.map(([px, py]) => [px + 1, py]) : pts, EGA.red);
    // Folds.
    for (const off of [2, 5, 8]) {
      for (let y = 22; y < 66; y++) {
        if (y > 41 && y < 47 && off > 4) continue;
        if ((y + off) % 7 === 0) continue;
        G.rect(ctx, x + sx * off + (flip ? 0 : 0), y, 1, 1, off === 5 ? EGA.brightred : G.dither(ctx, EGA.red, EGA.brightred, 'checker'));
      }
    }
    // Outline edge + tie-back.
    G.line(ctx, x + sx * 13 + (flip ? 1 : 0), 21, x + sx * 9 + (flip ? 1 : 0), 40, K);
    G.line(ctx, x + sx * 5, 46, x + sx * 11, 66, K);
    G.rect(ctx, flip ? x - 6 : x, 66, 7, 1, K);
    G.rect(ctx, flip ? x - 6 : x, 43, 7, 2, EGA.yellow);
  }

  function drawDoor(ctx) {
    // Casing.
    G.rect(ctx, 132, 16, 56, WALL_BOTTOM - 16, EGA.lightgray);
    G.rect(ctx, 132, 16, 56, 1, EGA.white);
    G.rect(ctx, 132, 16, 1, WALL_BOTTOM - 16, EGA.white);
    G.rect(ctx, 187, 16, 1, WALL_BOTTOM - 16, EGA.darkgray);
    G.rect(ctx, 188, 17, 1, WALL_BOTTOM - 17, shadow(ctx));
    // Slab.
    G.rect(ctx, 135, 19, 50, WALL_BOTTOM - 19, K);
    G.rect(ctx, 136, 20, 48, WALL_BOTTOM - 20, EGA.brown);
    // Four recessed panels: shadowed top/left bevel, darker inset field.
    for (const [px, py, pw, ph] of [[141, 25, 17, 20], [162, 25, 17, 20], [141, 51, 17, 25], [162, 51, 17, 25]]) {
      G.rect(ctx, px, py, pw, ph, EGA.red);
      G.rect(ctx, px + 2, py + 2, pw - 3, ph - 3, EGA.brown);
      G.rect(ctx, px + 4, py + 4, pw - 7, ph - 7, G.dither(ctx, EGA.brown, EGA.red, 'sparse'));
    }
    G.rect(ctx, 136, 20, 48, 1, EGA.red);
    // Brass knob on a dark backplate.
    G.rect(ctx, 178, 47, 3, 6, EGA.darkgray);
    G.rect(ctx, 177, 48, 4, 3, EGA.yellow);
    G.rect(ctx, 180, 50, 1, 1, EGA.brown);
    // Light switch.
    G.box(ctx, 193, 44, 5, 8, EGA.white, EGA.darkgray);
    G.rect(ctx, 195, 46, 1, 2, EGA.lightgray);
  }

  // Bust of a saluting soldier for the recruitment poster.
  const POSTER_ART = [
    '.....hhhhhh.....',
    '....hhhhhhhh....',
    '...hhhhhhhhhh...',
    '..hhhhhhhhhhhh..',
    '.....FFFFFF.FF..',
    '.....FKFFKFFFF..',
    '.....FFFFFFUU...',
    '......FFFFUU....',
    '...UUUUUUUUU....',
    '..UUUUUUUUUUUU..',
    '.UUUYUUUUUUUUUU.',
    '.UUUUUUUUUUUUUU.',
  ];

  function drawPoster(ctx) {
    const x = 222, y = 21, w = 42, h = 38;
    G.rect(ctx, x + 1, y + 1, w, h, shadow(ctx));
    G.box(ctx, x, y, w, h, EGA.green, K);
    G.rect(ctx, x + 2, y + 2, w - 4, 1, EGA.yellow);
    G.rect(ctx, x + 2, y + h - 3, w - 4, 1, EGA.yellow);
    // Star burst behind the soldier.
    G.rect(ctx, x + 6, y + 6, 3, 1, EGA.yellow); G.rect(ctx, x + 7, y + 5, 1, 3, EGA.yellow);
    G.rect(ctx, x + 33, y + 8, 3, 1, EGA.yellow); G.rect(ctx, x + 34, y + 7, 1, 3, EGA.yellow);
    G.bitmap(ctx, POSTER_ART, x + 13, y + 6,
      { h: K, F: EGA.brown, K: K, U: EGA.darkgray, Y: EGA.yellow });
    // "ARMY" in a white pixel font.
    const tw = G.textWidth('ARMY');
    const tx = x + Math.round((w - tw) / 2);
    G.pixelText(ctx, 'ARMY', tx, y + 25, EGA.white);
    G.rect(ctx, x + 9, y + 32, 24, 1, G.dither(ctx, null, EGA.yellow, 'checker'));
    // Thumbtacks.
    for (const [tx2, ty2] of [[x + 1, y + 1], [x + w - 2, y + 1]]) G.rect(ctx, tx2, ty2, 1, 1, EGA.brightred);
  }

  function drawSunbeam(ctx) {
    G.poly(ctx, [[46, WALL_BOTTOM + 2], [96, WALL_BOTTOM + 2], [136, 118], [82, 118]],
      G.dither(ctx, null, EGA.yellow, 'rare'));
  }

  // Five-point star woven into the rug.
  const STAR = [
    '......#......',
    '.....###.....',
    '#############',
    '..#########..',
    '...#######...',
    '..####.####..',
    '.###.....###.',
  ];

  function drawRug(ctx) {
    const outer = [[110, 113], [210, 113], [224, 160], [96, 160]];
    G.poly(ctx, [[109, 112], [211, 112], [225, 161], [95, 161]], K);
    G.poly(ctx, outer, EGA.green);
    G.poly(ctx, [[114, 116], [206, 116], [218, 157], [102, 157]], EGA.yellow);
    G.poly(ctx, [[115, 117], [205, 117], [217, 156], [103, 156]], EGA.green);
    G.poly(ctx, [[118, 119], [202, 119], [213, 154], [107, 154]], G.dither(ctx, EGA.green, K, 'rare'));
    G.bitmap(ctx, STAR, 154, 132, { '#': EGA.yellow });
    // Fringe.
    for (let fx = 111; fx < 210; fx += 2) G.rect(ctx, fx, 111, 1, 1, EGA.white);
    for (let fx = 97; fx < 224; fx += 2) G.rect(ctx, fx, 161, 1, 2, EGA.white);
  }

  function drawBed(ctx) {
    // Shadow on the floor.
    G.rect(ctx, 14, 146, 88, 5, shadow(ctx));

    // Headboard (left) and footboard (right) posts.
    G.box(ctx, 11, 94, 10, 54, wood(ctx), K);
    G.rect(ctx, 10, 92, 12, 3, K); G.rect(ctx, 11, 93, 10, 1, EGA.brown);
    G.rect(ctx, 13, 98, 1, 46, EGA.brown);
    G.box(ctx, 94, 108, 8, 40, wood(ctx), K);
    G.rect(ctx, 93, 106, 10, 3, K); G.rect(ctx, 94, 107, 8, 1, EGA.brown);
    G.rect(ctx, 96, 111, 1, 34, EGA.brown);

    // Mattress top (white sheet) + side.
    G.poly(ctx, [[21, 112], [94, 112], [94, 131], [21, 131]], EGA.white);
    G.rect(ctx, 21, 131, 73, 6, G.dither(ctx, EGA.white, EGA.lightgray, 'checker'));
    // Rumpled blanket.
    G.poly(ctx, [[42, 112], [94, 112], [94, 131], [40, 131], [38, 122]], EGA.brightblue);
    G.rect(ctx, 40, 131, 54, 9, EGA.blue);
    for (const fx of [50, 63, 77, 88]) G.rect(ctx, fx, 131, 1, 9, EGA.brightblue);
    G.line(ctx, 46, 118, 60, 124, EGA.blue); G.line(ctx, 64, 115, 82, 122, EGA.blue);
    G.line(ctx, 70, 127, 90, 125, EGA.blue);
    G.line(ctx, 42, 113, 38, 122, K); G.line(ctx, 38, 122, 40, 131, K);
    G.rect(ctx, 40, 140, 54, 1, K);
    // Turned-down sheet edge.
    G.line(ctx, 43, 114, 40, 122, EGA.lightgray);
    // Pillow.
    G.box(ctx, 22, 112, 16, 11, EGA.white, K);
    G.rect(ctx, 23, 120, 14, 2, EGA.lightgray);
    G.rect(ctx, 28, 115, 4, 1, EGA.lightgray);
    // Bed rail + feet.
    G.rect(ctx, 21, 137, 73, 1, K);
    G.rect(ctx, 21, 138, 73, 5, wood(ctx));
    G.rect(ctx, 21, 143, 73, 1, K);
    G.rect(ctx, 21, 138, 73, 1, EGA.brown);
    G.rect(ctx, 11, 148, 4, 3, K); G.rect(ctx, 97, 148, 4, 3, K);
  }

  function drawDesk(ctx, room) {
    // Shadow + back legs under the desk.
    G.rect(ctx, 204, WALL_BOTTOM, 82, 16, shadow(ctx));
    G.rect(ctx, 210, 76, 3, 8, K); G.rect(ctx, 276, 76, 3, 8, K);

    // Lamp (behind the items, against the wall).
    G.rect(ctx, 270, 55, 2, 13, EGA.darkgray);
    G.poly(ctx, [[263, 55], [281, 55], [278, 49], [266, 49]], K);
    G.poly(ctx, [[264, 54], [280, 54], [277, 50], [267, 50]], EGA.green);
    G.rect(ctx, 268, 51, 8, 1, EGA.brightgreen);
    G.rect(ctx, 265, 55, 14, 1, EGA.yellow);
    G.poly(ctx, [[265, 56], [279, 56], [284, 70], [260, 70]], G.dither(ctx, null, EGA.yellow, 'rare'));

    // Top surface (lit) with outline.
    G.poly(ctx, [[205, 64], [283, 64], [287, 76], [201, 76]], K);
    G.poly(ctx, [[206, 65], [282, 65], [285, 75], [203, 75]], EGA.brown);
    G.rect(ctx, 205, 70, 80, 1, G.dither(ctx, null, EGA.red, 'sparse'));
    G.rect(ctx, 266, 67, 10, 3, EGA.darkgray); G.rect(ctx, 267, 66, 8, 1, EGA.lightgray);

    // Apron with a drawer.
    G.box(ctx, 201, 76, 87, 8, wood(ctx), K);
    G.rect(ctx, 202, 77, 85, 1, EGA.brown);
    G.box(ctx, 232, 77, 24, 6, EGA.brown, K);
    G.rect(ctx, 243, 79, 3, 2, EGA.yellow);

    // Front legs.
    G.box(ctx, 202, 83, 5, 16, wood(ctx), K);
    G.box(ctx, 282, 83, 5, 16, wood(ctx), K);
    G.rect(ctx, 203, 84, 1, 14, EGA.brown); G.rect(ctx, 283, 84, 1, 14, EGA.brown);

    // Recruitment brochure: bright white tri-fold with green header.
    G.box(ctx, 212, 66, 17, 8, EGA.white, K);
    G.rect(ctx, 213, 67, 15, 2, EGA.green);
    G.rect(ctx, 214, 70, 7, 1, EGA.red); G.rect(ctx, 214, 72, 9, 1, EGA.red);
    G.rect(ctx, 224, 69, 3, 4, EGA.lightgray);
    G.rect(ctx, 213, 74, 16, 1, shadow(ctx));

    // Wallet: black leather, stitched, with a brass glint so it reads at a glance.
    if (!room.hasWallet) {
      G.box(ctx, 240, 67, 12, 7, EGA.darkgray, K);
      G.rect(ctx, 241, 68, 10, 1, EGA.lightgray);
      G.rect(ctx, 246, 68, 1, 5, K);
      G.rect(ctx, 249, 70, 1, 1, EGA.yellow);
      G.rect(ctx, 241, 74, 11, 1, shadow(ctx));
    }
  }

  function drawDresser(ctx, room) {
    // Shadow on the floor.
    G.rect(ctx, 248, 152, 58, 4, shadow(ctx));

    // Top surface + front body.
    G.poly(ctx, [[252, 108], [302, 108], [306, 117], [248, 117]], K);
    G.poly(ctx, [[253, 109], [301, 109], [304, 116], [250, 116]], EGA.brown);
    G.box(ctx, 249, 116, 56, 37, wood(ctx), K);
    G.rect(ctx, 250, 117, 54, 1, EGA.brown);

    // Items on top: alarm clock (red LED) and a framed photo.
    G.box(ctx, 257, 102, 12, 9, EGA.darkgray, K);
    G.rect(ctx, 259, 104, 8, 4, K);
    G.rect(ctx, 260, 105, 1, 2, EGA.brightred); G.rect(ctx, 262, 105, 1, 1, EGA.brightred);
    G.rect(ctx, 262, 107, 1, 1, EGA.brightred); G.rect(ctx, 264, 105, 2, 1, EGA.brightred);
    G.rect(ctx, 265, 106, 1, 1, EGA.brightred);
    G.box(ctx, 285, 98, 10, 13, EGA.brightcyan, EGA.yellow);
    G.rect(ctx, 284, 97, 12, 1, K); G.rect(ctx, 284, 111, 12, 1, K);
    G.rect(ctx, 289, 101, 3, 3, EGA.brown); G.rect(ctx, 288, 104, 5, 6, EGA.brightmagenta);
    G.rect(ctx, 288, 100, 5, 2, EGA.yellow);

    // Drawers.
    const drawer = (dy, h) => {
      G.box(ctx, 253, dy, 48, h, EGA.brown, K);
      G.rect(ctx, 254, dy + h - 2, 46, 1, EGA.red);
      for (const kx of [263, 289]) {
        G.rect(ctx, kx, dy + Math.floor(h / 2) - 1, 3, 2, EGA.yellow);
        G.rect(ctx, kx + 2, dy + Math.floor(h / 2), 1, 1, EGA.brown);
      }
    };
    drawer(130, 10);
    drawer(141, 10);

    if (room.dresserOpen) {
      // Top drawer pulled out toward the viewer.
      G.rect(ctx, 252, 118, 50, 9, K);
      if (!room.dressed) {
        G.box(ctx, 255, 119, 20, 6, EGA.white, EGA.lightgray);
        G.rect(ctx, 256, 121, 18, 1, EGA.lightgray);
        G.box(ctx, 277, 119, 22, 6, EGA.blue, K);
        G.rect(ctx, 278, 120, 20, 1, EGA.brightblue);
        G.rect(ctx, 287, 121, 1, 3, EGA.brightblue);
      } else {
        // Folded pajamas left behind.
        G.box(ctx, 258, 119, 18, 6, EGA.brightcyan, EGA.cyan);
        G.box(ctx, 279, 119, 18, 6, EGA.brightblue, EGA.blue);
      }
      G.rect(ctx, 251, 126, 52, 1, K);
      G.rect(ctx, 251, 127, 1, 4, K); G.rect(ctx, 302, 127, 1, 4, K);
      drawer(126, 10);
    } else {
      drawer(119, 10);
    }

    // Kick plate + feet.
    G.rect(ctx, 250, 152, 54, 1, K);
    G.rect(ctx, 250, 153, 5, 3, K); G.rect(ctx, 299, 153, 5, 3, K);
  }

  // Register in the namespace + room registry (used by Save/Restore).
  AQ.createRoom1 = createRoom1;
  (AQ.ROOMS = AQ.ROOMS || {}).room1 = createRoom1;
})();

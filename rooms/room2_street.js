// rooms/room2_street.js — Level 1, Room 2: Oak Creek Main Street.
// Two-way traffic with a signalized crosswalk. Jaywalking, or stepping off the
// curb without the WALK signal, gets Jack flattened (Sierra-style death).
// Classic (non-module) script namespaced under window.AQ.

(function () {
  const AQ = (window.AQ = window.AQ || {});
  const EGA = AQ.EGA;
  const G = AQ.gfx;
  const VIEW_Y = AQ.VIEW_Y, VIEW_BOTTOM = AQ.VIEW_BOTTOM, VW = AQ.VW;
  const K = EGA.black;

  // Street geometry (virtual pixels).
  const BUILDING_BOTTOM = 84;
  const ROAD_TOP = 100, ROAD_BOTTOM = 146, CENTER_Y = 123;
  const CROSS = { x: 200, w: 32 };
  const CAR_L = 68, CAR_H = 27;
  const KILLER_SPEED = 170;

  // US right-hand traffic seen from the south sidewalk: the near lane drives
  // right (east), the far lane drives left (west). stopX = stop line for fronts.
  const LANES = {
    far:  { dir: -1, base: 118, top: ROAD_TOP, bottom: CENTER_Y, stopX: CROSS.x + CROSS.w + 4 },
    near: { dir: 1,  base: 142, top: CENTER_Y, bottom: ROAD_BOTTOM, stopX: CROSS.x - 4 },
  };

  // Signal cycle. Cars stop on red; pedestrians may only START crossing on WALK.
  const PHASES = [
    { car: 'green',  ped: 'dont',  t: 7 },
    { car: 'yellow', ped: 'dont',  t: 2.5 },
    { car: 'red',    ped: 'dont',  t: 2 },
    { car: 'red',    ped: 'walk',  t: 6 },
    { car: 'red',    ped: 'flash', t: 3.5 },
  ];

  const CAR_COLORS = [EGA.red, EGA.blue, EGA.green, EGA.cyan, EGA.yellow, EGA.white,
    EGA.lightgray, EGA.magenta, EGA.brightred, EGA.brown, EGA.brightblue];

  const POLES = {
    near: { x: 190, base: 156, top: 108 },
    far:  { x: 242, base: 94,  top: 46 },
  };

  const DOORS = [
    { id: 'barber', x: 20,  w: 16, text: "A hand-lettered sign on Floyd's door: 'BACK AT 10.' Your Army haircut will come soon enough." },
    { id: 'office', x: 106, w: 22, text: "You stand before the U.S. Army Recruiting Office, heart pounding. This is it. (The Recruiting Office is coming in the next iteration!)" },
    { id: 'parlor', x: 208, w: 18, text: "Through the glass you spot Sarah wiping down the counter. She smiles and waves. You've got somewhere to be first... but maybe later." },
    { id: 'diner',  x: 282, w: 16, text: "The Main Street Diner smells of coffee and hash browns. Tempting, but you're too nervous to eat." },
  ];

  const DEATH_JAYWALK =
    "HONK! SCREEEECH! THUD!  Jack Vance's military career ends before it begins - " +
    "flattened on Main Street. Jaywalking in Oak Creek is a bad idea. " +
    "Use the crosswalk and wait for the WALK signal.  ** GAME OVER **  " +
    "Type RESTORE or RESTART.";
  const DEATH_AGAINST_LIGHT =
    "HONK! THUD!  The little red hand meant DON'T WALK, Jack. Uncle Sam needs " +
    "soldiers who can follow simple orders.  ** GAME OVER **  " +
    "Type RESTORE or RESTART.";

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function createRoom2() {
    return {
      id: 'room2',
      name: 'Oak Creek Street',
      startX: 30, startY: 160, startFacing: 'right',

      floor: { x: 4, y: 86, w: 312, h: 82 },
      obstacles: [
        { x: POLES.near.x - 4, y: POLES.near.base - 5, w: 9, h: 7 },
        { x: POLES.far.x - 4,  y: POLES.far.base - 5,  w: 9, h: 7 },
        { x: 52,  y: 155, w: 13, h: 7 },  // hydrant
        { x: 277, y: 157, w: 17, h: 7 },  // mailbox
      ],

      cars: [],
      phase: 0, phaseT: 0,
      spawnT: { far: 0.3, near: 1.2 },
      doomed: false, wasOnRoad: false, legalCross: false, crossScored: false,
      _zone: null,

      get depthObjects() {
        const list = [
          { sortY: POLES.far.base,  draw: (ctx, e) => drawSignalPole(ctx, POLES.far, this, e) },
          { sortY: POLES.near.base, draw: (ctx, e) => drawSignalPole(ctx, POLES.near, this, e) },
          { sortY: 160, draw: drawHydrant },
          { sortY: 162, draw: drawMailbox },
        ];
        for (const c of this.cars) list.push({ sortY: LANES[c.lane].base, draw: (ctx) => drawCar(ctx, c) });
        return list;
      },

      serialize() { return { crossScored: this.crossScored }; },
      restore(s) { this.crossScored = !!s.crossScored; },

      enter, update, handleCommand, drawBackground,
    };
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------
  function enter(engine) {
    this.cars = [];
    this.phase = 0; this.phaseT = 0;
    this.spawnT = { far: 0.3, near: 1.2 };
    this.doomed = false; this.wasOnRoad = false; this.legalCross = false;
    // Pre-roll the simulation so the street is already busy.
    for (let i = 0; i < 160; i++) stepTraffic(this, null, 0.05);

    engine.showModal(
      "You step out onto Main Street, Oak Creek. Morning traffic rumbles past in both directions. " +
      "The Recruiting Office is across the street - cross at the crosswalk, and only on the WALK signal."
    );
  }

  function update(engine, dt) {
    const p = engine.player;
    stepTraffic(this, p, dt);

    if (!p.dead) {
      checkPedestrian(this, engine);
      checkCollisions(this, engine);
      checkZones(this, engine);
    }
  }

  // -------------------------------------------------------------------------
  // Traffic simulation
  // -------------------------------------------------------------------------
  const front = (c) => (LANES[c.lane].dir > 0 ? c.x + c.L : c.x);
  const rear = (c) => (LANES[c.lane].dir > 0 ? c.x : c.x + c.L);
  const inLane = (lane, y) => y > lane.top && y <= lane.bottom;
  const onRoad = (y) => y > ROAD_TOP && y < ROAD_BOTTOM;
  const inCrosswalk = (x) => x >= CROSS.x - 1 && x <= CROSS.x + CROSS.w + 1;

  function stepTraffic(room, p, dt) {
    room.phaseT += dt;
    if (room.phaseT >= PHASES[room.phase].t) {
      room.phaseT = 0;
      room.phase = (room.phase + 1) % PHASES.length;
    }
    const sig = PHASES[room.phase].car;
    const jackInCross = p && !p.dead && onRoad(p.y) && inCrosswalk(p.x);

    for (const laneId in LANES) {
      const lane = LANES[laneId];
      // Leading (most downstream) car first so followers can queue behind it.
      const cars = room.cars.filter((c) => c.lane === laneId)
        .sort((a, b) => (front(b) - front(a)) * lane.dir);

      let ahead = null;
      for (const car of cars) {
        let move = car.speed * dt;
        if (!car.killer) {
          const f = front(car);
          const toLine = (lane.stopX - f) * lane.dir;
          const mustStop = sig === 'red' || jackInCross || (sig === 'yellow' && toLine > 10);
          if (mustStop && toLine >= 0) move = Math.min(move, toLine);
          if (ahead) move = Math.min(move, Math.max(0, (rear(ahead) - f) * lane.dir - 8));
          // Ordinary drivers never hit a pedestrian (or drive over a fallen one).
          if (p && inLane(lane, p.y)) {
            const dj = (p.x - lane.dir * 7 - f) * lane.dir;
            if (dj >= 0) move = Math.min(move, dj);
          }
        }
        car.x += lane.dir * Math.max(0, move);
        if (car.honk > 0) car.honk -= dt;
        ahead = car;
      }

      // Spawn new cars upstream, off-screen.
      room.spawnT[laneId] -= dt;
      if (room.spawnT[laneId] <= 0) {
        const x0 = lane.dir > 0 ? -CAR_L - 2 : VW + 2;
        const blocked = room.cars.some((c) => c.lane === laneId && Math.abs(c.x - x0) < CAR_L + 10);
        if (blocked) room.spawnT[laneId] = 0.5;
        else {
          room.cars.push({
            lane: laneId, x: x0, L: CAR_L, speed: rand(55, 80),
            color: pick(CAR_COLORS), kind: Math.random() < 0.3 ? 'pickup' : 'sedan',
            killer: false, honk: 0,
          });
          room.spawnT[laneId] = rand(1.6, 4.5);
        }
      }
    }

    // Despawn cars that have left the screen.
    room.cars = room.cars.filter((c) => {
      const dir = LANES[c.lane].dir;
      return dir > 0 ? c.x < VW + 4 : c.x + c.L > -4;
    });
  }

  // Jaywalking, or stepping off the curb without WALK, dooms Jack.
  function checkPedestrian(room, engine) {
    const p = engine.player;
    const road = onRoad(p.y);
    if (road && !room.doomed) {
      if (!inCrosswalk(p.x)) doom(room, engine, DEATH_JAYWALK);
      else if (!room.wasOnRoad) {
        if (PHASES[room.phase].ped === 'walk') room.legalCross = true;
        else doom(room, engine, DEATH_AGAINST_LIGHT);
      }
    }
    room.wasOnRoad = road;

    // Points for a safe, legal crossing (once).
    if (!road && room.legalCross) {
      if (p.y <= ROAD_TOP && !room.crossScored) {
        room.crossScored = true;
        engine.addScore(3);
      }
      room.legalCross = false;
    }
  }

  function doom(room, engine, text) {
    const p = engine.player;
    room.doomed = true;
    room.deathText = text;
    engine.inputLocked = true;
    engine.stopPlayer();

    const laneId = p.y <= CENTER_Y ? 'far' : 'near';
    const lane = LANES[laneId];
    p.facing = lane.dir > 0 ? 'left' : 'right'; // turn toward the oncoming car

    // The nearest car upstream of Jack becomes the killer; otherwise send one in.
    const upstream = room.cars
      .filter((c) => c.lane === laneId && (p.x - front(c)) * lane.dir > 0)
      .sort((a, b) => (front(b) - front(a)) * lane.dir);
    let car = upstream[0];
    if (!car) {
      car = { lane: laneId, x: lane.dir > 0 ? -CAR_L - 2 : VW + 2, L: CAR_L,
        color: pick(CAR_COLORS), kind: 'sedan' };
      room.cars.push(car);
    }
    car.killer = true;
    car.speed = KILLER_SPEED;
    car.honk = 1.2;
  }

  function checkCollisions(room, engine) {
    const p = engine.player;
    for (const c of room.cars) {
      if (!inLane(LANES[c.lane], p.y)) continue;
      if (p.x + 5 > c.x + 2 && p.x - 5 < c.x + c.L - 2) {
        engine.killPlayer(room.deathText || DEATH_JAYWALK);
        return;
      }
    }
  }

  // Storefront doors on the far sidewalk and the street's left/right ends.
  function checkZones(room, engine) {
    const p = engine.player;
    let zone = null;
    if (p.y < 91) zone = DOORS.find((d) => p.x > d.x && p.x < d.x + d.w) || null;
    if (p.x < 8 || p.x > VW - 8) zone = { id: 'edge' };

    if (zone && room._zone !== zone.id) {
      engine.stopPlayer();
      if (zone.id === 'edge') {
        p.x += p.x < VW / 2 ? 8 : -8;
        engine.showModal("That way leads out of town. The Recruiting Office is right here on Main Street.");
      } else {
        p.y += 6;
        engine.showModal(zone.text);
      }
    }
    room._zone = zone ? zone.id : null;
  }

  // -------------------------------------------------------------------------
  // Commands
  // -------------------------------------------------------------------------
  function handleCommand(parsed, engine) {
    const { verb, noun } = parsed;
    const say = (t) => { engine.showModal(t); return true; };
    const ph = PHASES[this.phase];

    switch (verb) {
      case 'look': return look.call(this, noun, ph, say);
      case 'push':
        if (noun && noun !== 'button' && noun !== 'light') return false;
        if (!nearPole(engine.player)) return say("You aren't close enough to a crosswalk button.");
        // A real beg button: shortens the wait while cars have green.
        if (this.phase === 0) this.phaseT = Math.max(this.phaseT, PHASES[0].t - 1.5);
        return say("You press the crosswalk button. *Click.* Somewhere inside the signal box, a relay hums. Wait for the WALK signal.");
      case 'wait': return say("You wait, watching the traffic and the signals.");
      case 'go':
        if (noun === 'street' || noun === 'crosswalk') {
          return say("Walk over to the crosswalk and wait for the WALK signal before stepping off the curb.");
        }
        return say('Walk there with the arrow keys.');
      case 'talk':
        if (noun === 'parlor') return say("Sarah is inside the ice cream parlor, across the street.");
        return say("Nobody out here but traffic.");
      case 'take': return say("You can't take that.");
      default: return false;
    }
  }

  function look(noun, ph, say) {
    switch (noun || 'street') {
      case 'room':
      case 'street':
        return say("Main Street, Oak Creek. Across the road: Floyd's Barber Shop, the U.S. Army Recruiting Office, the ice cream parlor and the Main Street Diner. A signalized crosswalk spans the road.");
      case 'crosswalk':
        return say("Freshly painted white stripes. A signal on each corner tells pedestrians when to WALK - and the red hand says when DON'T.");
      case 'light': {
        const ped = ph.ped === 'walk' ? 'a white walking man: WALK.'
          : ph.ped === 'flash' ? "a flashing red hand: finish crossing, but don't start."
          : "a steady red hand: DON'T WALK.";
        return say(`The traffic light is ${ph.car.toUpperCase()}. The pedestrian signal shows ${ped}`);
      }
      case 'button': return say("A worn chrome button on the signal pole, marked PUSH FOR WALK SIGNAL.");
      case 'car': return say("Big American steel, 1989 edition. These drivers aren't slowing down for anyone outside the crosswalk.");
      case 'office': return say("The U.S. Army Recruiting Office. A poster in the window promises adventure. That's where you're headed.");
      case 'parlor': return say("The ice cream parlor where Sarah works. Pink-and-white awning, best malts in the county.");
      case 'barber': return say("Floyd's Barber Shop. The striped pole isn't spinning yet.");
      case 'diner': return say("The Main Street Diner. Smells like coffee and hash browns.");
      case 'hydrant': return say("A red fire hydrant. The dogs of Oak Creek love it.");
      case 'sidewalk': return say("Cracked concrete, warm in the morning sun.");
      default: return say("You don't see anything special about that.");
    }
  }

  function nearPole(p) {
    return Object.values(POLES).some((pl) => Math.hypot(p.x - pl.x, p.y - pl.base) <= 30);
  }

  // -------------------------------------------------------------------------
  // Art
  // -------------------------------------------------------------------------
  function drawBackground(ctx) {
    drawSky(ctx);
    drawBarber(ctx);
    drawOffice(ctx);
    drawParlor(ctx);
    drawDiner(ctx);
    drawStreet(ctx);
  }

  function drawSky(ctx) {
    G.rect(ctx, 0, VIEW_Y, VW, BUILDING_BOTTOM - VIEW_Y, EGA.brightcyan);
    G.rect(ctx, 20, 16, 16, 2, EGA.white); G.rect(ctx, 16, 18, 26, 2, EGA.white);
    G.rect(ctx, 196, 15, 14, 2, EGA.white); G.rect(ctx, 192, 17, 24, 2, EGA.white);
    // Treetops and a water tower peeking over the rooftops.
    G.poly(ctx, [[0, 32], [10, 24], [24, 26], [40, 22], [56, 28], [64, 32]], EGA.green);
    G.poly(ctx, [[170, 36], [180, 28], [194, 30], [204, 34], [206, 38], [170, 38]], EGA.green);
    G.rect(ctx, 271, 21, 2, 6, EGA.darkgray); G.rect(ctx, 283, 21, 2, 6, EGA.darkgray);
    G.box(ctx, 266, 15, 24, 7, EGA.lightgray, EGA.darkgray);
    G.poly(ctx, [[266, 16], [278, 12], [290, 16]], EGA.darkgray);
    // Alleys between buildings.
    for (const [ax, aw] of [[62, 4], [172, 4], [258, 4]]) {
      G.rect(ctx, ax, 30, aw, BUILDING_BOTTOM - 30, G.dither(ctx, EGA.darkgray, K, 'checker'));
    }
  }

  function bricks(ctx, x, y, w, h, base, mortar) {
    G.rect(ctx, x, y, w, h, base);
    for (let by = y + 3; by < y + h; by += 4) {
      G.rect(ctx, x, by, w, 1, mortar);
      const off = ((by - y) / 4) % 2 ? 0 : 4;
      for (let bx = x + off; bx < x + w; bx += 8) G.rect(ctx, bx, by - 3, 1, 3, mortar);
    }
  }

  function sign(ctx, x, y, w, h, bg, text, fg, border = K) {
    G.box(ctx, x, y, w, h, bg, border);
    G.pixelText(ctx, text, x + Math.round((w - G.textWidth(text)) / 2), y + Math.round((h - 5) / 2), fg);
  }

  function glassWindow(ctx, x, y, w, h) {
    G.box(ctx, x, y, w, h, EGA.brightcyan, EGA.lightgray);
    G.rect(ctx, x, y + h, w, 1, K);
    G.rect(ctx, x + 2, y + 2, 1, 1, EGA.white); G.rect(ctx, x + 3, y + 3, 1, 1, EGA.white);
    G.rect(ctx, x + 5, y + 2, 1, 1, EGA.white);
  }

  function drawBarber(ctx) {
    bricks(ctx, 0, 30, 62, BUILDING_BOTTOM - 30, EGA.red, G.dither(ctx, EGA.red, EGA.darkgray, 'checker'));
    G.rect(ctx, 0, 30, 62, 3, EGA.lightgray); G.rect(ctx, 0, 33, 62, 1, K);
    sign(ctx, 6, 37, 50, 10, K, 'BARBER', EGA.white, EGA.lightgray);
    glassWindow(ctx, 38, 54, 20, 22);
    G.box(ctx, 21, 56, 14, 28, EGA.darkgray, K);
    G.rect(ctx, 23, 58, 10, 10, EGA.brightcyan);
    G.rect(ctx, 31, 70, 2, 2, EGA.yellow);
    // Barber pole.
    G.rect(ctx, 6, 54, 6, 2, EGA.lightgray);
    G.rect(ctx, 6, 74, 6, 2, EGA.lightgray);
    for (let y = 56; y < 74; y++) {
      for (let x = 7; x < 11; x++) G.rect(ctx, x, y, 1, 1, (x + y) % 4 < 2 ? EGA.red : EGA.white);
    }
    G.rect(ctx, 6, 56, 1, 18, K); G.rect(ctx, 11, 56, 1, 18, K);
  }

  function drawOffice(ctx) {
    const x = 66, w = 106, top = 22;
    G.rect(ctx, x, top, w, BUILDING_BOTTOM - top, EGA.lightgray);
    for (let y = top + 6; y < BUILDING_BOTTOM; y += 6) {
      G.rect(ctx, x, y, w, 1, EGA.darkgray);
      const off = ((y - top) / 6) % 2 ? 0 : 6;
      for (let bx = x + off; bx < x + w; bx += 12) G.rect(ctx, bx, y - 5, 1, 5, EGA.darkgray);
    }
    G.rect(ctx, x, top, w, 2, EGA.white); G.rect(ctx, x, top + 2, w, 1, K);
    // Flag on the roof.
    G.rect(ctx, 118, 12, 1, 10, EGA.darkgray);
    for (let r = 0; r < 7; r++) G.rect(ctx, 119, 13 + r, 14, 1, r % 2 ? EGA.white : EGA.red);
    G.rect(ctx, 119, 13, 6, 4, EGA.blue);
    G.rect(ctx, 120, 14, 1, 1, EGA.white); G.rect(ctx, 122, 14, 1, 1, EGA.white); G.rect(ctx, 121, 15, 1, 1, EGA.white);

    G.box(ctx, x + 6, 27, w - 12, 18, EGA.blue, K);
    G.rect(ctx, x + 7, 28, w - 14, 1, EGA.brightblue);
    const t1 = 'U.S. ARMY', t2 = 'RECRUITING';
    G.pixelText(ctx, t1, x + Math.round((w - G.textWidth(t1)) / 2), 30, EGA.white);
    G.pixelText(ctx, t2, x + Math.round((w - G.textWidth(t2)) / 2), 37, EGA.yellow);

    // Windows with recruitment posters.
    for (const wx of [72, 132]) {
      glassWindow(ctx, wx, 50, 32, 26);
      G.box(ctx, wx + 10, 54, 12, 16, EGA.green, K);
      G.rect(ctx, wx + 15, 56, 3, 1, EGA.yellow); G.rect(ctx, wx + 16, 55, 1, 3, EGA.yellow);
      G.rect(ctx, wx + 14, 60, 5, 5, K);
      G.rect(ctx, wx + 12, 67, 8, 1, EGA.white);
    }
    // Glass door.
    G.box(ctx, 108, 50, 18, BUILDING_BOTTOM - 50, EGA.brightcyan, K);
    G.rect(ctx, 109, 51, 16, 2, EGA.darkgray);
    G.rect(ctx, 116, 51, 2, BUILDING_BOTTOM - 51, EGA.darkgray);
    G.rect(ctx, 110, 66, 5, 1, EGA.lightgray); G.rect(ctx, 119, 66, 5, 1, EGA.lightgray);
    G.rect(ctx, 111, 55, 1, 1, EGA.white); G.rect(ctx, 120, 55, 1, 1, EGA.white);
  }

  function drawParlor(ctx) {
    const x = 176, w = 82, top = 34;
    G.rect(ctx, x, top, w, BUILDING_BOTTOM - top, EGA.white);
    for (let y = top + 3; y < BUILDING_BOTTOM; y += 3) G.rect(ctx, x, y, w, 1, EGA.lightgray);
    G.rect(ctx, x, top, w, 1, K);
    // Giant cone on the roof.
    G.poly(ctx, [[236, 28], [246, 28], [241, 36]], EGA.brown);
    G.rect(ctx, 237, 29, 8, 1, EGA.yellow); G.rect(ctx, 239, 31, 4, 1, EGA.yellow);
    G.poly(ctx, [[235, 28], [236, 23], [241, 20], [246, 23], [247, 28]], EGA.brightmagenta);
    G.rect(ctx, 239, 22, 2, 1, EGA.white);
    sign(ctx, 183, 37, 50, 10, EGA.brightmagenta, 'ICE CREAM', EGA.white);
    // Striped awning with a scalloped edge.
    for (let ax = x + 2; ax < x + w - 2; ax++) {
      const c = Math.floor((ax - x) / 4) % 2 ? EGA.white : EGA.brightmagenta;
      G.rect(ctx, ax, 49, 1, 5, c);
      if ((ax - x) % 4 !== 0) G.rect(ctx, ax, 54, 1, 1, c);
    }
    G.rect(ctx, x + 1, 48, w - 2, 1, K);
    glassWindow(ctx, 181, 57, 24, 21);
    glassWindow(ctx, 229, 57, 24, 21);
    G.rect(ctx, 182, 72, 22, 5, EGA.brightmagenta); G.rect(ctx, 230, 72, 22, 5, EGA.brightmagenta);
    G.box(ctx, 209, 57, 17, BUILDING_BOTTOM - 57, EGA.brightcyan, EGA.magenta);
    G.rect(ctx, 210, 70, 15, 1, EGA.magenta);
    G.rect(ctx, 222, 72, 2, 2, EGA.yellow);
  }

  function drawDiner(ctx) {
    bricks(ctx, 262, 26, 58, BUILDING_BOTTOM - 26, EGA.brown, EGA.red);
    G.rect(ctx, 262, 26, 58, 2, EGA.lightgray); G.rect(ctx, 262, 28, 58, 1, K);
    sign(ctx, 268, 32, 46, 11, EGA.red, 'DINER', EGA.yellow, K);
    glassWindow(ctx, 298, 52, 18, 24);
    glassWindow(ctx, 266, 52, 14, 24);
    G.box(ctx, 283, 56, 14, 28, EGA.red, K);
    G.rect(ctx, 285, 58, 10, 9, EGA.brightcyan);
    G.rect(ctx, 293, 70, 2, 2, EGA.yellow);
  }

  function drawStreet(ctx) {
    // Far sidewalk.
    G.rect(ctx, 0, BUILDING_BOTTOM, VW, ROAD_TOP - BUILDING_BOTTOM, EGA.lightgray);
    G.rect(ctx, 0, BUILDING_BOTTOM, VW, 1, G.dither(ctx, EGA.lightgray, K, 'checker'));
    for (let x = 8; x < VW; x += 20) G.rect(ctx, x, BUILDING_BOTTOM + 1, 1, ROAD_TOP - BUILDING_BOTTOM - 3, EGA.darkgray);
    G.rect(ctx, 0, ROAD_TOP - 2, VW, 1, EGA.white);
    G.rect(ctx, 0, ROAD_TOP - 1, VW, 1, EGA.darkgray);

    // Asphalt.
    G.rect(ctx, 0, ROAD_TOP, VW, ROAD_BOTTOM - ROAD_TOP, G.dither(ctx, EGA.darkgray, K, 'rare'));
    G.rect(ctx, 0, ROAD_TOP, VW, 1, K);

    // Center line (double yellow, broken at the crosswalk).
    for (const [x0, x1] of [[0, CROSS.x - 6], [CROSS.x + CROSS.w + 6, VW]]) {
      G.rect(ctx, x0, CENTER_Y - 1, x1 - x0, 1, EGA.yellow);
      G.rect(ctx, x0, CENTER_Y + 1, x1 - x0, 1, EGA.yellow);
    }

    // Crosswalk stripes + stop lines.
    for (let y = ROAD_TOP + 2; y < ROAD_BOTTOM - 1; y += 5) G.rect(ctx, CROSS.x, y, CROSS.w, 3, EGA.white);
    G.rect(ctx, LANES.near.stopX + 1, CENTER_Y + 2, 2, ROAD_BOTTOM - CENTER_Y - 2, EGA.white);
    G.rect(ctx, LANES.far.stopX - 3, ROAD_TOP + 1, 2, CENTER_Y - ROAD_TOP - 2, EGA.white);

    // Near curb + sidewalk + grass strip.
    G.rect(ctx, 0, ROAD_BOTTOM, VW, 1, K);
    G.rect(ctx, 0, ROAD_BOTTOM + 1, VW, 2, EGA.white);
    G.rect(ctx, 0, ROAD_BOTTOM + 3, VW, VIEW_BOTTOM - ROAD_BOTTOM - 3, EGA.lightgray);
    for (let x = 14; x < VW; x += 26) G.rect(ctx, x, ROAD_BOTTOM + 3, 1, 21, EGA.darkgray);
    G.rect(ctx, 0, ROAD_BOTTOM + 13, VW, 1, EGA.darkgray);
    G.rect(ctx, 0, VIEW_BOTTOM - 4, VW, 4, G.dither(ctx, EGA.green, EGA.brightgreen, 'sparse'));
    G.rect(ctx, 0, VIEW_BOTTOM - 4, VW, 1, EGA.green);
  }

  const WALK_MAN = ['..#..', '.###.', '#.#.#', '..#..', '.#.#.', '.#.#.', '#...#'];
  const HAND = ['.#.#.', '.####', '#####', '#####', '#####', '.###.', '.###.'];

  function drawSignalPole(ctx, pole, room, engine) {
    const { x, base, top } = pole;
    const ph = PHASES[room.phase];
    G.rect(ctx, x - 2, base - 1, 6, 2, K);
    G.rect(ctx, x, top + 16, 2, base - top - 16, EGA.darkgray);
    G.rect(ctx, x, top + 16, 1, base - top - 16, K);

    // Car signal: red / yellow / green.
    G.box(ctx, x - 3, top, 8, 17, EGA.darkgray, K);
    const lamp = (ly, on, color) => G.rect(ctx, x - 1, ly, 4, 4, on ? color : K);
    lamp(top + 2, ph.car === 'red', EGA.brightred);
    lamp(top + 7, ph.car === 'yellow', EGA.yellow);
    lamp(top + 12, ph.car === 'green', EGA.brightgreen);

    // Pedestrian signal + push button.
    G.box(ctx, x - 4, top + 19, 10, 10, K, EGA.darkgray);
    const blinkOn = Math.floor(engine.clock * 2.5) % 2 === 0;
    if (ph.ped === 'walk') G.bitmap(ctx, WALK_MAN, x - 2, top + 20 + 1, { '#': EGA.white });
    else if (ph.ped === 'dont' || blinkOn) G.bitmap(ctx, HAND, x - 2, top + 21, { '#': EGA.brightred });
    G.box(ctx, x - 1, top + 32, 4, 4, EGA.yellow, K);
  }

  function drawHydrant(ctx) {
    G.rect(ctx, 52, 159, 14, 2, G.dither(ctx, null, K, 'checker'));
    G.poly(ctx, [[54, 146], [56, 143], [61, 143], [63, 146]], K);
    G.rect(ctx, 56, 144, 5, 2, EGA.red);
    G.box(ctx, 54, 146, 10, 14, EGA.red, K);
    G.box(ctx, 51, 149, 16, 5, EGA.red, K);
    G.rect(ctx, 56, 147, 1, 12, EGA.brightred);
    G.rect(ctx, 58, 151, 2, 1, EGA.lightgray);
    G.rect(ctx, 53, 159, 12, 2, K);
  }

  function drawMailbox(ctx) {
    G.rect(ctx, 277, 161, 18, 2, G.dither(ctx, null, K, 'checker'));
    G.rect(ctx, 280, 150, 3, 12, K); G.rect(ctx, 289, 150, 3, 12, K);
    G.poly(ctx, [[278, 132], [281, 128], [291, 128], [294, 132]], K);
    G.rect(ctx, 280, 129, 12, 3, EGA.blue);
    G.box(ctx, 278, 131, 17, 20, EGA.blue, K);
    G.rect(ctx, 280, 133, 13, 1, EGA.brightblue);
    G.rect(ctx, 281, 136, 11, 1, K);
    G.pixelText(ctx, 'US', 283, 141, EGA.white);
  }

  // --- Cars ---------------------------------------------------------------
  const WHEEL = [
    '..KKKKK..',
    '.KKKKKKK.',
    'KKKgggKKK',
    'KKgLLLgKK',
    'KKgLLLgKK',
    'KKgLLLgKK',
    'KKKgggKKK',
    '.KKKKKKK.',
    '..KKKKK..',
  ];

  function carBody(g, c) {
    G.box(g, 1, 12, 66, 10, c, K);
    G.rect(g, 2, 16, 64, 1, EGA.lightgray);
    G.rect(g, 64, 13, 2, 3, EGA.yellow);
    G.rect(g, 2, 13, 2, 3, EGA.brightred);
    G.rect(g, 62, 19, 6, 3, EGA.lightgray); G.rect(g, 0, 19, 6, 3, EGA.lightgray);
    for (const cx of [14, 53]) {
      G.poly(g, [[cx - 6, 22], [cx - 5, 17], [cx + 6, 17], [cx + 7, 22]], K);
      G.bitmap(g, WHEEL, cx - 4, 18, { K: K, g: EGA.darkgray, L: EGA.lightgray });
    }
  }

  function drawSedanArt(g, c) {
    G.poly(g, [[15, 13], [21, 3], [45, 3], [55, 13]], K);
    G.poly(g, [[17, 13], [22, 4], [44, 4], [53, 13]], c);
    G.poly(g, [[20, 12], [24, 6], [32, 6], [32, 12]], EGA.brightcyan);
    G.poly(g, [[35, 12], [35, 6], [43, 6], [49, 12]], EGA.brightcyan);
    G.rect(g, 25, 7, 1, 1, EGA.white); G.rect(g, 38, 7, 1, 1, EGA.white);
    carBody(g, c);
    G.rect(g, 33, 13, 1, 8, K);
    G.rect(g, 28, 14, 3, 1, K); G.rect(g, 45, 14, 3, 1, K);
  }

  function drawPickupArt(g, c) {
    G.poly(g, [[35, 13], [40, 3], [51, 3], [57, 13]], K);
    G.poly(g, [[37, 13], [41, 4], [50, 4], [55, 13]], c);
    G.poly(g, [[40, 12], [43, 6], [49, 6], [53, 12]], EGA.brightcyan);
    G.rect(g, 44, 7, 1, 1, EGA.white);
    G.box(g, 1, 8, 35, 6, c, K);
    G.rect(g, 2, 9, 33, 1, G.dither(g, c, K, 'checker'));
    carBody(g, c);
    G.rect(g, 36, 13, 1, 8, K);
    G.rect(g, 44, 14, 3, 1, K);
  }

  const carCache = new Map();
  function carImage(color, kind, dir) {
    const key = `${color}|${kind}|${dir}`;
    let c = carCache.get(key);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = CAR_L; c.height = CAR_H;
    const g = c.getContext('2d');
    if (dir < 0) { g.translate(CAR_L, 0); g.scale(-1, 1); }
    (kind === 'pickup' ? drawPickupArt : drawSedanArt)(g, color);
    carCache.set(key, c);
    return c;
  }

  function drawCar(ctx, car) {
    const lane = LANES[car.lane];
    const x = Math.round(car.x), y = lane.base - CAR_H + 1;
    G.rect(ctx, x + 3, lane.base, CAR_L - 6, 2, G.dither(ctx, null, K, 'checker'));
    ctx.drawImage(carImage(car.color, car.kind, lane.dir), x, y);
    if (car.honk > 0) {
      const bx = x + (lane.dir > 0 ? CAR_L - 16 : -8), by = y - 10;
      G.box(ctx, bx, by, 25, 9, EGA.yellow, K);
      G.pixelText(ctx, 'HONK!', bx + 3, by + 2, K);
    }
  }

  AQ.createRoom2 = createRoom2;
  (AQ.ROOMS = AQ.ROOMS || {}).room2 = createRoom2;
})();

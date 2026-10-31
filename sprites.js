// sprites.js — Hand-pixeled sprite for Jack (the player), classic script.
// 16x42 frames assembled from head/torso/legs parts. Colors are swappable via
// letter codes so outfits (pajamas -> jeans & t-shirt) recolor the same art.
//
//  K outline  H hair   F skin   k skin shade  M mouth
//  S shirt    s shirt shade     A/a forearm (skin if short sleeves, else shirt/shade)
//  P pants    p pants accent    W shoes  B belt  Y buckle

(function () {
  const AQ = (window.AQ = window.AQ || {});
  const EGA = AQ.EGA;

  const W = 16, H = 42;

  // --- Heads (12 rows) ----------------------------------------------------
  const HEAD_DOWN = [
    '.....KKKKKK.....',
    '....KHHHHHHK....',
    '...KHHHHHHHHK...',
    '...KHHHHHHHHK...',
    '...KHHFFFFHHK...',
    '..KFHFFFFFFHFK..',
    '..KFFKFFFFKFFK..',
    '...KFFFFFFFFK...',
    '...KFFFkkFFFK...',
    '....KFFMMFFK....',
    '.....KFFFFK.....',
    '......KFFK......',
  ];
  const HEAD_UP = [
    '.....KKKKKK.....',
    '....KHHHHHHK....',
    '...KHHHHHHHHK...',
    '...KHHHHHHHHK...',
    '...KHHHHHHHHK...',
    '..KFHHHHHHHHFK..',
    '..KFHHHHHHHHFK..',
    '...KHHHHHHHHK...',
    '...KHHHHHHHHK...',
    '....KHHHHHHK....',
    '.....KFFFFK.....',
    '......KFFK......',
  ];
  const HEAD_SIDE = [
    '.....KKKKK......',
    '....KHHHHHHK....',
    '...KHHHHHHHHK...',
    '...KHHHHHHHHK...',
    '...KHHHHHFFFK...',
    '...KHHHFFFFFK...',
    '...KHHkFFFKFK...',
    '...KHFFFFFFFFK..',
    '....KFFFFFFFK...',
    '....KFFFFFMK....',
    '.....KFFFFK.....',
    '......KFFK......',
  ];

  // --- Torsos (12 rows) ---------------------------------------------------
  const TORSO_DOWN = [
    '....KKSFFSKK....',
    '..KKSSSFFSSSKK..',
    '.KSSSSSSSSSSSSK.',
    '.KSSSSSSSSSSSSK.',
    '.KSsKSSSSSSKsSK.',
    '.KAsKSSSSSSKsAK.',
    '.KAAKSSSSSSKAAK.',
    '.KAAKSSSSSSKAAK.',
    '.KAAKsSSSSsKAAK.',
    '.KFFKsSSSSsKFFK.',
    '.KFFKBBYYBBKFFK.',
    '..KK.KPPPPK.KK..',
  ];
  const TORSO_UP = [
    '....KKSSSSKK....',
    '..KKSSSSSSSSKK..',
    '.KSSSSSSSSSSSSK.',
    '.KSSSSSSSSSSSSK.',
    '.KSsKSSSSSSKsSK.',
    '.KAsKSSSSSSKsAK.',
    '.KAAKSSsSSSKAAK.',
    '.KAAKSSsSSSKAAK.',
    '.KAAKsSSSSsKAAK.',
    '.KFFKsSSSSsKFFK.',
    '.KFFKBBBBBBKFFK.',
    '..KK.KPPPPK.KK..',
  ];
  const TORSO_SIDE = [
    '.....KSSSSK.....',
    '....KSSSSSSK....',
    '....KSsssSSSK...',
    '....KSsssSSSK...',
    '....KSsssSSSK...',
    '....KSKaaKSSK...',
    '....KSKaaKSSK...',
    '....KSKaaKSSK...',
    '....KsKaaKsSK...',
    '....KBKFFKBBK...',
    '....KPKFFKPPK...',
    '.....KPKKPPK....',
  ];
  const TORSO_SIDE_FWD = [
    '.....KSSSSK.....',
    '....KSSSSSSK....',
    '....KSSsssSSK...',
    '....KSSSsssSK...',
    '....KSSSSsssK...',
    '....KSSSSKaaK...',
    '....KSSSSSKaaK..',
    '....KsSSSSKaaK..',
    '....KssSSSSKaaK.',
    '....KBBBBBBKFFK.',
    '....KPPPPPPKFFK.',
    '.....KPPPPPKKK..',
  ];
  const TORSO_SIDE_BACK = [
    '.....KSSSSK.....',
    '....KSSSSSSK....',
    '....KsssSSSSK...',
    '...KsssSSSSSK...',
    '...KssSSSSSSK...',
    '..KaaKSSSSSSK...',
    '..KaaKSSSSSSK...',
    '.KaaKsSSSSSSK...',
    '.KaaKssSSSSSK...',
    '.KFFKBBBBBBBK...',
    '.KFFKPPPPPPPK...',
    '..KKKKPPPPPK....',
  ];

  // --- Legs (18 rows) -----------------------------------------------------
  const LEGS_STAND = [
    '....KPPPPPPK....',
    '....KPPPPPPK....',
    '....KPPKKPPK....',
    '....KPPKKPPK....',
    '....KPPKKPPK....',
    '....KPPKKPPK....',
    '....KPpKKpPK....',
    '....KPpKKpPK....',
    '....KPPKKPPK....',
    '....KPPKKPPK....',
    '....KPPKKPPK....',
    '....KPPKKPPK....',
    '....KPPKKPPK....',
    '....KPPKKPPK....',
    '....KPPKKPPK....',
    '....KWWKKWWK....',
    '...KWWWKKWWWK...',
    '...KKKKKKKKKK...',
  ];
  // Front/back step: screen-left foot lifted (mirror for the other step).
  const LEGS_STEP = [
    '....KPPPPPPK....',
    '....KPPPPPPK....',
    '....KPPKKPPK....',
    '....KPPKKPPK....',
    '....KPPKKPPK....',
    '....KPPKKPPK....',
    '....KPpKKpPK....',
    '....KPpKKpPK....',
    '....KPPKKPPK....',
    '....KPPKKPPK....',
    '....KPPKKPPK....',
    '....KPPKKPPK....',
    '....KPPKKPPK....',
    '....KWWKKPPK....',
    '...KWWWKKPPK....',
    '...KKKKKKPPK....',
    '........KWWWK...',
    '........KKKKK...',
  ];
  const LEGS_SIDE_PASS = [
    '.....KPPPPK.....',
    '.....KPPPPK.....',
    '.....KPPPPK.....',
    '.....KPPPPK.....',
    '.....KPPPPK.....',
    '.....KpPPPK.....',
    '.....KpPPPK.....',
    '.....KPPPPK.....',
    '.....KPPPPK.....',
    '.....KPPPPK.....',
    '.....KPPPPK.....',
    '.....KPPPPK.....',
    '.....KPPPPK.....',
    '.....KPPPPK.....',
    '.....KPPPPK.....',
    '.....KWWWWKK....',
    '.....KWWWWWWK...',
    '.....KKKKKKKK...',
  ];
  const LEGS_SIDE_STRIDE = [
    '.....KPPPPK.....',
    '.....KPPPPPK....',
    '....KPPKKPPK....',
    '....KPPK.KPPK...',
    '...KPPK..KPPK...',
    '...KPPK..KPPK...',
    '...KpPK...KpPK..',
    '..KPPK....KPPK..',
    '..KpPK....KpPK..',
    '..KPPK.....KPPK.',
    '..KPPK.....KPPK.',
    '.KPPK......KPPK.',
    '.KPPK......KPPK.',
    '.KPPK......KPPK.',
    '.KPPK......KPPK.',
    '.KPPK......KPPK.',
    '.KWWWK.....KWWWK',
    '.KKKKK.....KKKKK',
  ];

  const mirror = (rows) => rows.map((r) => r.split('').reverse().join(''));
  const frame = (...parts) => [].concat(...parts);

  // 4-frame walk cycles; frame 0 is the standing pose.
  const FRAMES = {
    down: [
      frame(HEAD_DOWN, TORSO_DOWN, LEGS_STAND),
      frame(HEAD_DOWN, TORSO_DOWN, LEGS_STEP),
      frame(HEAD_DOWN, TORSO_DOWN, LEGS_STAND),
      frame(HEAD_DOWN, TORSO_DOWN, mirror(LEGS_STEP)),
    ],
    up: [
      frame(HEAD_UP, TORSO_UP, LEGS_STAND),
      frame(HEAD_UP, TORSO_UP, mirror(LEGS_STEP)),
      frame(HEAD_UP, TORSO_UP, LEGS_STAND),
      frame(HEAD_UP, TORSO_UP, LEGS_STEP),
    ],
    right: [
      frame(HEAD_SIDE, TORSO_SIDE, LEGS_SIDE_PASS),
      frame(HEAD_SIDE, TORSO_SIDE_BACK, LEGS_SIDE_STRIDE),
      frame(HEAD_SIDE, TORSO_SIDE, LEGS_SIDE_PASS),
      frame(HEAD_SIDE, TORSO_SIDE_FWD, LEGS_SIDE_STRIDE),
    ],
  };
  FRAMES.left = FRAMES.right.map(mirror);

  for (const dir in FRAMES) {
    for (const f of FRAMES[dir]) {
      if (f.length !== H || f.some((r) => r.length !== W)) console.warn('Bad sprite frame:', dir);
    }
  }

  // Darker (or accent) companion color for shading each outfit color.
  const SHADE = {
    [EGA.white]: EGA.lightgray, [EGA.brightcyan]: EGA.cyan, [EGA.brightblue]: EGA.blue,
    [EGA.blue]: EGA.brightblue, [EGA.brightred]: EGA.red, [EGA.lightgray]: EGA.darkgray,
    [EGA.brightgreen]: EGA.green, [EGA.green]: EGA.darkgray, [EGA.yellow]: EGA.brown,
  };
  const shade = (c) => SHADE[c] || EGA.darkgray;

  const cache = new Map();

  // Returns a cached 16x42 canvas for the given facing/frame/outfit.
  function getJackFrame(p, facing, idx) {
    const key = [facing, idx, p.skin, p.hair, p.shirt, p.pants, p.shoes, p.sleeves, p.belt].join('|');
    let c = cache.get(key);
    if (c) return c;
    const map = {
      K: EGA.black, H: p.hair, F: p.skin, k: EGA.red, M: EGA.red,
      S: p.shirt, s: shade(p.shirt),
      A: p.sleeves === 'short' ? p.skin : p.shirt,
      a: p.sleeves === 'short' ? p.skin : shade(p.shirt),
      P: p.pants, p: shade(p.pants), W: p.shoes,
      B: p.belt ? EGA.black : p.shirt, Y: p.belt ? EGA.yellow : p.shirt,
    };
    c = document.createElement('canvas');
    c.width = W; c.height = H;
    AQ.gfx.bitmap(c.getContext('2d'), FRAMES[facing][idx], 0, 0, map);
    cache.set(key, c);
    return c;
  }

  AQ.sprites = { JACK_W: W, JACK_H: H, JACK_FRAMES: 4, getJackFrame };
})();

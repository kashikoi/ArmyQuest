// parser.js — Sierra-style Verb/Noun text parser with synonym matching.
// Classic (non-module) script: everything is namespaced under window.AQ.

(function () {
  const AQ = (window.AQ = window.AQ || {});

  // Canonical verb -> accepted synonyms.
  const VERB_SYNONYMS = {
    look:      ['look', 'examine', 'read', 'inspect', 'see', 'view', 'l'],
    take:      ['take', 'get', 'grab', 'pick', 'pickup'],
    open:      ['open'],
    close:     ['close', 'shut'],
    wear:      ['wear', 'dress', 'put', 'don'],
    talk:      ['talk', 'speak', 'ask', 'say'],
    use:       ['use'],
    go:        ['go', 'walk', 'enter', 'exit', 'move', 'cross'],
    push:      ['push', 'press', 'hit'],
    wait:      ['wait', 'stand'],
    inventory: ['inventory', 'inv', 'i'],
    save:      ['save'],
    restore:   ['restore', 'load'],
    restart:   ['restart', 'reset'],
    help:      ['help', 'commands', 'info'],
  };

  // Canonical noun -> accepted synonyms (so "drawer" and "dresser" both work).
  const NOUN_SYNONYMS = {
    room:     ['room', 'around', 'bedroom'],
    dresser:  ['dresser', 'drawer', 'drawers', 'wardrobe', 'bureau'],
    desk:     ['desk', 'table', 'workdesk'],
    brochure: ['brochure', 'pamphlet', 'flyer', 'leaflet', 'recruitment'],
    wallet:   ['wallet', 'billfold', 'id'],
    clothes:  ['clothes', 'clothing', 'outfit', 'jeans', 'shirt', 'tshirt', 't-shirt', 'dressed'],
    bed:      ['bed'],
    poster:   ['poster', 'picture'],
    door:     ['door', 'hallway', 'out', 'outside'],
    window:   ['window'],
    street:   ['street', 'road', 'main'],
    crosswalk:['crosswalk', 'crossing', 'zebra'],
    light:    ['light', 'lights', 'signal', 'signals', 'stoplight', 'walk'],
    button:   ['button'],
    car:      ['car', 'cars', 'traffic', 'truck', 'pickup'],
    office:   ['office', 'recruiting', 'recruiter', 'army'],
    parlor:   ['parlor', 'ice', 'icecream', 'cream', 'shop', 'sarah'],
    barber:   ['barber', 'barbershop'],
    diner:    ['diner', 'restaurant'],
    hydrant:  ['hydrant'],
    sidewalk: ['sidewalk', 'curb'],
  };

  // Words that carry no meaning for the parser.
  const STOP_WORDS = new Set(['the', 'a', 'an', 'at', 'to', 'on', 'in', 'my', 'with', 'of', 'into']);

  const VERB_LOOKUP = buildLookup(VERB_SYNONYMS);
  const NOUN_LOOKUP = buildLookup(NOUN_SYNONYMS);

  function buildLookup(map) {
    const out = {};
    for (const canon in map) {
      for (const w of map[canon]) out[w] = canon;
    }
    return out;
  }

  function parse(input) {
    const words = input.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const meaningful = words.filter((w) => !STOP_WORDS.has(w));

    const firstWord = meaningful[0] || '';
    const verb = VERB_LOOKUP[firstWord] || null;

    // First recognizable noun after the verb (fall back to the raw word).
    let noun = null;
    for (let k = 1; k < meaningful.length; k++) {
      const w = meaningful[k];
      noun = NOUN_LOOKUP[w] || w;
      if (noun) break;
    }

    return { raw: input.trim(), words: meaningful, verb, noun, firstWord };
  }

  AQ.parse = parse;
})();

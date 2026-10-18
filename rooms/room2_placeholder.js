// rooms/room2_placeholder.js — Placeholder for Room 2: Oak Creek Street.
// Classic (non-module) script namespaced under window.AQ.

(function () {
  const AQ = (window.AQ = window.AQ || {});
  const EGA = AQ.EGA;
  const VIEW_Y = AQ.VIEW_Y, VIEW_BOTTOM = AQ.VIEW_BOTTOM, VW = AQ.VW;

  function createRoom2() {
    return {
      id: 'room2',
      name: 'Oak Creek Street',
      startX: 40, startY: 150, startFacing: 'right',

      floor: { x: 10, y: 120, w: 300, h: 48 },
      obstacles: [],
      depthObjects: [],

      serialize() { return {}; },
      restore() {},

      enter(engine) {
        engine.showModal("ROOM 2: OAK CREEK STREET  (Placeholder). You step out onto Main Street. The Recruiting Office waits down the block - and Sarah at the ice cream parlor. To be built in the next iteration!");
      },

      handleCommand(parsed, engine) {
        const say = (t) => { engine.showModal(t); return true; };
        if (parsed.verb === 'look') {
          return say('Oak Creek, Iowa. A sleepy 1989 Main Street. (This area is still under construction.)');
        }
        return say('There is nothing more to do here yet - this room is a placeholder.');
      },

      drawBackground(ctx) {
        ctx.fillStyle = EGA.brightcyan; ctx.fillRect(0, VIEW_Y, VW, 70 - VIEW_Y);
        ctx.fillStyle = EGA.darkgray;   ctx.fillRect(20, 40, 50, 30);
        ctx.fillStyle = EGA.brown;      ctx.fillRect(90, 48, 60, 22);
        ctx.fillStyle = EGA.red;        ctx.fillRect(170, 36, 55, 34);
        ctx.fillStyle = EGA.blue;       ctx.fillRect(245, 44, 55, 26);
        ctx.fillStyle = EGA.darkgray;   ctx.fillRect(0, 70, VW, 50);
        ctx.fillStyle = EGA.yellow;     ctx.fillRect(0, 93, VW, 2);
        ctx.fillStyle = EGA.lightgray;  ctx.fillRect(0, 120, VW, VIEW_BOTTOM - 120);
        ctx.fillStyle = EGA.white; ctx.font = '8px monospace'; ctx.textAlign = 'center';
        ctx.fillText('OAK CREEK', VW / 2, 24);
        ctx.textAlign = 'left';
      },
    };
  }

  AQ.createRoom2 = createRoom2;
  (AQ.ROOMS = AQ.ROOMS || {}).room2 = createRoom2;
})();

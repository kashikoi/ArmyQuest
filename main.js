// main.js — Army Quest I bootstrap (classic script).
// Loads after parser/engine/rooms, starts the game, and offers to resume a save.

(function () {
  const AQ = window.AQ;

  const canvas = document.getElementById('game');
  const engine = new AQ.Engine(canvas);

  engine.changeRoom(AQ.createRoom1());
  engine.start();

  if (engine.hasSavedGame()) {
    engine.showModal(
      "ARMY QUEST I: In Pursuit of the Eagle.  A saved game was found.  " +
      "Type 'restore' (or press F7) to continue, or just start walking to begin anew."
    );
  } else {
    engine.showModal(
      "ARMY QUEST I: In Pursuit of the Eagle.  Oak Creek, Iowa - 1989.  " +
      "Jack Vance, 18, wakes up on the morning he'll change his life forever.  " +
      "Walk with the arrow keys; type commands and press ENTER. (Type 'help' for commands.)"
    );
  }
})();

Hooks.on("canvasReady", () => {
  if (!game.combat?.started || game.settings.get("hurry-up", "showOnUpdateCombatOnly")) return;
  const token = canvas.tokens.get(game?.combat?.current?.tokenId);
  const actor = token?.actor;
  if (actor?.hasPlayerOwner && !game.settings.get("hurry-up", "disable")) {
    CombatTimer.start();
  }
});

Hooks.on("updateCombat", (combat, updates) => {
  if (!game.combat?.started){
    game.combatTimer?.close(true);
    return;
  }
  if (("turn" in updates || "round" in updates) && !game.settings.get("hurry-up", "disable")) {
    const token = canvas.tokens.get(game?.combat?.current?.tokenId);
    const actor = token?.actor;
    if (game.settings.get("hurry-up", "runForNPC") || actor?.hasPlayerOwner) {
      CombatTimer.start();
    } else {
      game.combatTimer?.close(true);
    }
  }
});

Hooks.on("deleteCombat", (combat, updates) => {
    game.combatTimer?.close(true);
});

Hooks.on("pauseGame", (paused) => {
    const timePaused = Date.now();
    if (game.combatTimer) {
      game.combatTimer?.updatePaused(paused, timePaused);
    }
});

let HurryUpSocket;

Hooks.once("socketlib.ready", () => {
  HurryUpSocket = socketlib.registerModule("hurry-up");
  HurryUpSocket.register("StartTimer", CombatTimer.socketTimer);
});
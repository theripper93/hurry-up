Hooks.on("canvasReady", () => {
  if (!game.combat?.started) return;
  const token = canvas.tokens.get(game?.combat?.current?.tokenId);
  const actor = token?.actor;
  if (actor?.hasPlayerOwner && !game.settings.get("hurry-up", "disable")) {
    CombatTimer.Start();
  }
});

Hooks.on("updateCombat", (combat, updates) => {
  if (!game.combat?.started){
    game.combatTimer?.close(true);
    return;
  }
  if ("turn" in updates && !game.settings.get("hurry-up", "disable")) {
    const token = canvas.tokens.get(game?.combat?.current?.tokenId);
    const actor = token?.actor;
    if (game.settings.get("hurry-up", "runForNPC") || actor?.hasPlayerOwner) {
      CombatTimer.Start();
    } else {
      game.combatTimer?.close(true);
    }
  }
});

Hooks.on("deleteCombat", (combat, updates) => {
    game.combatTimer?.close(true);
});

let HurryUpSocket;

Hooks.once("socketlib.ready", () => {
  HurryUpSocket = socketlib.registerModule("hurry-up");
  HurryUpSocket.register("StartTimer", CombatTimer.socketTimer);
});
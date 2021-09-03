Hooks.on("canvasReady", () => {
  if (!game.combat?.started) return;
  const token = canvas.tokens.get(game?.combat?.current?.tokenId);
  const actor = token?.actor;
  if (actor?.hasPlayerOwner) {
    CombatTimer.Start();
  }
});

Hooks.on("updateCombat", (combat, updates) => {
  if (!game.combat?.started){
    game.combatTimer?.close(true);
    return;
  }
  if ("turn" in updates) {
    const token = canvas.tokens.get(game?.combat?.current?.tokenId);
    const actor = token?.actor;
    if (actor?.hasPlayerOwner) {
      CombatTimer.Start();
    } else {
      game.combatTimer?.close(true);
    }
  }
});

Hooks.on("deleteCombat", (combat, updates) => {
    game.combatTimer?.close(true);
});
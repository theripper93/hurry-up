Hooks.once("init", async function () {});

Hooks.once("init", async function () {

  game.settings.register("hurry-up", "disable", {
    name: game.i18n.localize("hp.settings.disable.name"),
    hint: game.i18n.localize("hp.settings.disable.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register("hurry-up", "timerDuration", {
    name: game.i18n.localize("hp.settings.timerDuration.name"),
    hint: game.i18n.localize("hp.settings.timerDuration.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 300,
    onChange: (sett) => {
      if(game.combatTimer) game.combatTimer.time = sett;
    }
  });

  game.settings.register("hurry-up", "style", {
    name: game.i18n.localize("hp.settings.style.name"),
    hint: game.i18n.localize("hp.settings.style.hint"),
    scope: "client",
    config: true,
    type: String,
    choices: {
        "digits": "Digits",
        "circle": "Circle",
        "sand": "Sand"
    },
    default: "digits",
    onChange: () => {
      if(game.combatTimer) game.combatTimer.renderTemplate();
    }
  });

  game.settings.register("hurry-up", "countup", {
    name: game.i18n.localize("hp.settings.countup.name"),
    hint: game.i18n.localize("hp.settings.countup.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register("hurry-up", "overtime", {
    name: game.i18n.localize("hp.settings.overtime.name"),
    hint: game.i18n.localize("hp.settings.overtime.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register("hurry-up", "size", {
    name: game.i18n.localize("hp.settings.size.name"),
    hint: game.i18n.localize("hp.settings.size.hint"),
    scope: "client",
    config: true,
    type: Number,
    range: {
        min:5,
        max:15,
        step:0.5,
    },
    default: 8,
    onChange: (sett) => {
      document.documentElement.style.setProperty(
        "--hurry-up-font-size",
        sett + "em"
      );
    }
  });

  game.settings.register("hurry-up", "posTop", {
        name: game.i18n.localize("hp.settings.posTop.name"),
        hint: game.i18n.localize("hp.settings.posTop.hint"),
        scope: 'client',
        config: true,
        type: String,
        default: 2,
        requiresReload: false,
        onChange: () => {
          game.combatTimer.position.top;
        }
  });

  game.settings.register("hurry-up", "posLeft", {
        name: game.i18n.localize("hp.settings.posLeft.name"),
        hint: game.i18n.localize("hp.settings.posLeft.hint"),
        scope: 'client',
        config: true,
        type: String,
        default: 310,
        requiresReload: true,
        onChange: () => {
          game.combatTimer.position.left;
        }
  });

  game.settings.register("hurry-up", "windowless", {
    name: game.i18n.localize("hp.settings.windowless.name"),
    hint: game.i18n.localize("hp.settings.windowless.hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => {
      if(game.combatTimer) game.combatTimer.updateWindowless();
    }
  });

  game.settings.register("hurry-up", "critical", {
    name: game.i18n.localize("hp.settings.critical.name"),
    hint: game.i18n.localize("hp.settings.critical.hint"),
    scope: "world",
    config: true,
    type: Number,
    range: {
        min:1,
        max:100,
        step:1,
    },
    default: 10,
  });

  game.settings.register("hurry-up", "secondsInsteadOfPercentage", {
    name: game.i18n.localize("hp.settings.secondsInsteadOfPercentage.name"),
    hint: game.i18n.localize("hp.settings.secondsInsteadOfPercentage.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register("hurry-up", "goNext", {
    name: game.i18n.localize("hp.settings.goNext.name"),
    hint: game.i18n.localize("hp.settings.goNext.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register("hurry-up", "runForNPC", {
    name: game.i18n.localize("hp.settings.runForNpc.name"),
    hint: game.i18n.localize("hp.settings.runForNpc.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });
  
  game.settings.register("hurry-up", "showOnUpdateCombatOnly", {
    name: game.i18n.localize("hp.settings.showOnUpdateCombatOnly.name"),
    hint: game.i18n.localize("hp.settings.showOnUpdateCombatOnly.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register("hurry-up", "critSoundPath", {
    name: game.i18n.localize("hp.settings.critSoundPath.name"),
    hint: game.i18n.localize("hp.settings.critSoundPath.hint"),
    scope: "world",
    config: true,
    type: String,
    default: "modules/hurry-up/sounds/tick1.mp3",
    filePicker: "audio",
  });

  game.settings.register("hurry-up", "endSoundPath", {
    name: game.i18n.localize("hp.settings.endSoundPath.name"),
    hint: game.i18n.localize("hp.settings.endSoundPath.hint"),
    scope: "world",
    config: true,
    type: String,
    default: "modules/hurry-up/sounds/Ping1.mp3",
    filePicker: "audio",
  });

  game.settings.register("hurry-up", "soundVol", {
    name: game.i18n.localize("hp.settings.soundVol.name"),
    hint: game.i18n.localize("hp.settings.soundVol.hint"),
    scope: "world",
    config: true,
    type: Number,
    range: {
        min:0,
        max:1,
        step:0.05,
    },
    default: 0.8,
  });
});

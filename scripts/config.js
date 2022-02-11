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

  game.settings.register("hurry-up", "size", {
    name: game.i18n.localize("hp.settings.size.name"),
    hint: game.i18n.localize("hp.settings.size.hint"),
    scope: "world",
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

  game.settings.register("hurry-up", "goNext", {
    name: game.i18n.localize("hp.settings.goNext.name"),
    hint: game.i18n.localize("hp.settings.goNext.hint"),
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

  game.settings.register("hurry-up", "runForNPC", {
    name: game.i18n.localize("hp.settings.runForNpc.name"),
    hint: game.i18n.localize("hp.settings.runForNpc.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });


});

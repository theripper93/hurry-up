Hooks.once("init", async function () {});

Hooks.once("init", async function () {
  game.settings.register("hurry-up", "timerDuration", {
    name: game.i18n.localize("hp.settings.timerDuration.name"),
    hint: game.i18n.localize("hp.settings.timerDuration.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 300,
  });
  game.settings.register("hurry-up", "size", {
    name: game.i18n.localize("hp.settings.size.name"),
    hint: game.i18n.localize("hp.settings.size.hint"),
    scope: "world",
    config: true,
    type: Number,
    range: {
        min:3,
        max:15,
        step:0.5,
    },
    default: 6,
    onChange: (sett) => {
      document.documentElement.style.setProperty(
        "--hurry-up-font-size",
        sett + "em"
      );
    }
  });
});

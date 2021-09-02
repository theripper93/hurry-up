class CombatTimer extends Application {
  constructor(time) {
    super();
    this.time = time;
    this.started = false;
  }

  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      title: "Combat Timer",
      id: "combat-timer",
      template: `modules/hurry-up/templates/hurry-up.hbs`,
      resizable: false,
      draggable: true,
      "min-width": 0,
      //dragDrop: [{ dragSelector: null, dropSelector: null }],
    };
  }

  async startTimer() {
    this.currentTime = this.time;
    this.started = true;
    while (this.currentTime && this.started > 0) {
      if (!game?.paused) {
        this.currentTime--;
        this.updateTime();
      }
      await this.sleep(1000);
    }
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  updateTime() {
    const minutes = Math.floor(this.currentTime / 60);
    const seconds = this.currentTime % 60;
    $(this.element)
      .find(".combat-timer-timer-text")
      .text(
        `${minutes < 10 ? "0" + minutes : minutes}:${
          seconds < 10 ? "0" + seconds : seconds
        }`
      );
    const percent = (this.currentTime / this.time) * 100;
    $(this.element).find(".combat-timer-bar").css("width", `${percent}%`);
    if (percent <= 10) {
      $(this.element)
        .find(".combat-timer-bar")
        .css("background-color", "rgba(255, 0, 0, 0.26)");
      $(this.element).find(".combat-timer-timer-text").addClass("blinking");
    }
  }

  activateListeners(html) {
    super.activateListeners(html);
    document.documentElement.style.setProperty(
      "--hurry-up-font-size",
      game.settings.get("hurry-up", "size") + "em"
    );
    this.currentTime = this.time;
    this.updateTime();
    html.find(".header-button").remove();
  }

  getData() {
    return {};
  }

  setPosition(html) {
    super.setPosition(html);
    this.element.css({
      width: "auto",
      height: "auto",
    });
    this.element.find(".header-button").remove();
  }

  close() {
    this.started = false;
    super.close();
  }

  static Start(time = game.settings.get("hurry-up", "timerDuration")) {
    game.combatTimer = new CombatTimer(time).render(true).startTimer();
  }
}

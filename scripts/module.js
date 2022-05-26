class CombatTimer extends Application {

  constructor(options, time, selfDestruct = false) {
    super(options);
    this.time = time;
    this.started = false;
    this.selfDestruct = selfDestruct;
    this.sleepTimer = undefined;
    this.timeNow = Date.now();
    this.timeStarted = this.timeNow;
    this.timePaused = this.timeNow;
    this.timeElapsed = 0;
    this.timeRemaining = 0;
    this.baseColor = getComputedStyle(document.documentElement).getPropertyValue("--hurry-up-base-color"); 
    this.criticalColor = "rgba(255, 0, 0, 0.5)";
    this.barColor = getComputedStyle(document.documentElement).getPropertyValue("--hurry-up-bar-color");
    this.barCriticalColor = "rgba(255, 0, 0, 0.2)"; 
  }

  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      title: "CT",
      id: "hurry-up",
      resizable: false,
      draggable: true,
      "min-width": 0,
      //dragDrop: [{ dragSelector: null, dropSelector: null }],
    };
  }

  async startTimer() {
    this.reset();
    this.started = true;
    this.timeRemaining = this.time * 1000;
    if (game?.paused) {
      this.timeStarted = this.timePaused;
    } else {
      this.timeStarted = Date.now();
    }
    this.sleepTimer = setInterval(this.updateTime.bind(this), 100)
  }

  reset() {
    clearInterval(this.sleepTimer);
    this.started = false;
    this.onCriticalEnd();
    this.timeElapsed = 0;
    switch (game.settings.get("hurry-up", "style")) {
      case "digits":
        $(this.element)
          .find(".hurry-up-bar")
          .css("background-color", this.baseColor);
        $(this.element).find(".hurry-up-timer-text").removeClass("blinking");
        break;
      case "circle":
        $(this.element).find("#hurry-up-canvas").removeClass("blinking");
        break;
    }
  }

  async onEnd() {
    this.reset();
    if (this.timeRemaining > 0) return;
    if (game.settings.get("hurry-up", "goNext") && game.user.isGM) {
      game.combat?.nextTurn()
    }
    const soundP = game.settings.get("hurry-up", "endSoundPath")
    if (soundP) AudioHelper.play(
        {src: soundP, autoplay:true, volume: game.settings.get("hurry-up", "soundVol"), loop: false},
        false
      );
    if (this.selfDestruct) this.close();
  }

  async sleep(ms) {
    return new Promise((resolve) => this.sleepTimer = setTimeout(resolve, ms));
  }
  
  updatePaused(paused, timePaused) {
    this.timePaused = timePaused;
    if (paused) {
      this.critSound?.pause();
      this.timeElapsed = this.timePaused - this.timeStarted;
    } else {
      if (this.isCritical) this.onCritical();
      this.timeStarted = this.timePaused - this.timeElapsed;
    }
  }

  updateTime() {
    if (!game?.paused) {
      this.timeNow = Date.now();
      this.timeElapsed = this.timeNow - this.timeStarted;
      this.timeRemaining = this.time - Math.floor(this.timeElapsed / 1000);
      switch (game.settings.get("hurry-up", "style")) {
        case "digits":
            this.updateDigits();
          break;
        case "circle":
            this.updateCircle();
          break; 
      }
      if (!this.started || this.timeRemaining <= 0) {
        this.onEnd();
        return;
      }
      this.checkCritical();
    }
  }

  updateDigits() {
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = Math.floor(this.timeRemaining % 60);
    $(this.element)
      .find(".hurry-up-timer-text")
      .text(`${minutes < 10 ? "0" + minutes : minutes}:${seconds < 10 ? "0" + seconds : seconds}`);
    const percent = (this.timeRemaining / this.time) * 100;
    $(this.element).find(".hurry-up-bar").css("width", `${percent}%`);
  }

  updateCircle() {
    let timePercentage = this.timeElapsed / (this.time * 1000);
    let circleAngle = (timePercentage > 1) ? 360 : timePercentage * 360;
    let canvasSize = game.settings.get("hurry-up", "size") * 15;
    let halfCanvasSize = canvasSize / 2;
    let radius = halfCanvasSize - 5;
    let canvas = document.getElementById("hurry-up-canvas");
    canvas.setAttribute("height", canvasSize);
    canvas.setAttribute("width", canvasSize);
    let context = canvas.getContext("2d");
    let sAngle = ((circleAngle / 360 * 2) - 0.5) * Math.PI;
    let eAngle = 1.5 * Math.PI;
    context.clearRect(0, 0, canvasSize, canvasSize);
    context.beginPath();
    context.fillStyle = (this.isCritical) ? this.criticalColor : this.baseColor;
    context.moveTo(halfCanvasSize, halfCanvasSize);
    context.arc(halfCanvasSize, halfCanvasSize, radius, sAngle, eAngle);
    context.shadowOffsetX = 2;
    context.shadowOffsetY = 2;
    context.shadowColor = "rgba(0, 0, 0, 0.75)";
    context.shadowBlur = 2;
    context.fill();
    context.closePath();
  };

  updateWindowless() {
      const windowAppElement = document.getElementById("hurry-up");
      const windowHeaderElement = windowAppElement.getElementsByClassName("window-header");
      if (game.settings.get("hurry-up", "windowless")) {
        windowAppElement.classList.add("windowless");
        windowHeaderElement[0].classList.add("windowless");
      } else {
        windowAppElement.classList.remove("windowless");
        windowHeaderElement[0].classList.remove("windowless");
      }
  }

  checkCritical() { 
    if (!this.isCritical) {
      if (game.settings.get("hurry-up", "secondsInsteadOfPercentage")) {
        if (this.thisRemaining <= game.settings.get("hurry-up", "critical")) {
          this.isCritical = true;
        }
      } else {
        const percent = (this.timeRemaining / this.time) * 100;
        if (percent <= game.settings.get("hurry-up", "critical")) {
          this.isCritical = true;
        }
      }
      if (this.isCritical) {
        this.onCritical();
        switch (game.settings.get("hurry-up", "style")) {
          case "digits":
            $(this.element).find(".hurry-up-bar").css("background-color", this.barCriticalColor);
            $(this.element).find(".hurry-up-timer-text").addClass("blinking");
            break;
          case "circle":
            $(this.element).find("#hurry-up-canvas").addClass("blinking");
        }
      }
    }
  }

  async onCritical() {
    this.critSound?.stop();
    const soundP = game.settings.get("hurry-up", "critSoundPath")
    if (soundP) this.critSound = await AudioHelper.play(
        {src: soundP, autoplay:true , volume: game.settings.get("hurry-up", "soundVol"), loop: true},
        false
      )
  }

  async onCriticalEnd() {
    this.isCritical = false;
    this.critSound?.stop();
  }

  activateListeners(html) {
    super.activateListeners(html);
    document.documentElement.style.setProperty(
      "--hurry-up-font-size", game.settings.get("hurry-up", "size") + "em"
    );
    html.find(".header-button").remove();
    if (!this.positioned){
      this.positioned = true;
      const top = 2
      const left = window.innerWidth - this.element.width() - 310;
      this.element.css({"top": top, "left": left});
      this.position.top = top;
      this.position.left = left;
    }
    this.updateWindowless();
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
    this.critSound?.stop();
    super.close();
  }

  static setTemplate() {
    let template;
    switch(game.settings.get("hurry-up", "style")) {
      case "digits":
       template = `modules/hurry-up/templates/hurry-up-digits.hbs`
        break;
      case "circle":
        template = `modules/hurry-up/templates/hurry-up-circle.hbs`
        break;
    }
    return template;
  }

  renderTemplate() {
   game.combatTimer._render(true, {template: CombatTimer.setTemplate()}) 
  }

  static start(time = game.settings.get("hurry-up", "timerDuration")) {
    if (!game.combatTimer) {
      game.combatTimer = new CombatTimer({template: CombatTimer.setTemplate()}, time)
    } else {
      game.combatTimer._render(true, {template: CombatTimer.setTemplate()}).startTimer
    }
    game.combatTimer.render(true).startTimer();
  }

  static socketTimer(time){
    new CombatTimer({template: CombatTimer.setTemplate()}, time, true).render(true).startTimer();
  }

  static Create(time){
    HurryUpSocket.executeForEveryone("StartTimer", time)
  }
}

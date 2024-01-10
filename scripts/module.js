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
    this.hasEnded = false;
    this.baseColor = getComputedStyle(document.documentElement).getPropertyValue("--hurry-up-base-color"); 
    this.criticalColor = "rgba(255, 0, 0, 0.75)";
    this.barColor = getComputedStyle(document.documentElement).getPropertyValue("--hurry-up-bar-color");
    this.barCriticalColor = "rgba(255, 0, 0, 0.2)";
    this.glassColor = getComputedStyle(document.documentElement).getPropertyValue("--hurry-up-glass-color"); 
    this.sandFrame = 0;
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
    this.timeRemaining = this.time;
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
    this.hasEnded = false;
    const countup = game.settings.get("hurry-up", "countup");
    switch (game.settings.get("hurry-up", "style")) {
      case "digits":
        $(this.element)
          .find(".hurry-up-bar")
          .css("background-color", this.barColor, "width", "0%" ? countup : "100%");
        $(this.element).find(".hurry-up-timer-text").removeClass("blinking");
        break;
      case "circle":
      case "sand":
        $(this.element).find("#hurry-up-canvas").removeClass("blinking");
        break;
    }
  }

  async onEnd() {
    if (this.timeRemaining > 0) return;
    this.reset();
    if (game.settings.get("hurry-up", "goNext") && game.user.isGM) {
      game.combat?.nextTurn()
    }
    this.endSound()
    if (this.selfDestruct) this.close();
  }

  async sleep(ms) {
    return new Promise((resolve) => this.sleepTimer = setTimeout(resolve, ms));
  }

  async endSound() {
    const soundP = game.settings.get("hurry-up", "endSoundPath")
    if (soundP) AudioHelper.play(
        {src: soundP, autoplay:true, volume: game.settings.get("hurry-up", "soundVol"), loop: false},
        false
      );
  }
  
  updatePaused(paused, timePaused) {
    this.timePaused = timePaused;
    if (paused) {
      if (this.critSound?.playing) this.critSound?.pause();
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
        case "sand":
            this.updateSand(); 
      }
      this.checkCritical();
      const ot = game.settings.get("hurry-up", "overtime");
      if (!this.started || (this.timeRemaining <= 0 && !ot)) {
        this.onEnd();
        return;
      }
      if (this.timeRemaining <= 0 && !this.hasEnded)  {
        this.endSound();
        this.hasEnded = true;
      }
    }
  }

  updateDigits() {
    const countup = game.settings.get("hurry-up", "countup");
    const minutes = Math.max(Math.floor((countup ? this.timeElapsed/1000 : this.timeRemaining) / 60), 0);
    const seconds = Math.max(Math.floor((countup ? this.timeElapsed/1000 : this.timeRemaining) % 60), 0);

    $(this.element).find(".window-header").css("width", "inherit");
    $(this.element)
      .find(".hurry-up-timer-text")
      .text(`${minutes < 10 ? "0" + minutes : minutes}:${seconds < 10 ? "0" + seconds : seconds}`);
    let percent = Math.min(Math.max((this.timeRemaining / this.time) * 100, 0), 100);
    if (countup) percent = 100 - percent;
    $(this.element).find(".hurry-up-bar").css("width", `${percent}%`);
    // TODO: Fix initial state on countup to not have reset animation on first tick
  }

  updateCircle() {
    const timePercentage = Math.min(Math.max(this.timeElapsed / (this.time * 1000), 0), 1);
    const circleAngle = timePercentage * 360;
    const canvasSize = game.settings.get("hurry-up", "size") * 15;
    const halfCanvasSize = canvasSize / 2;
    const radius = halfCanvasSize - 5;
    const canvas = document.getElementById("hurry-up-canvas");
    canvas.setAttribute("height", canvasSize);
    canvas.setAttribute("width", canvasSize);
    canvas.style.width = "inherit";
    $(this.element).find(".window-header").css("width", "inherit");
    const context = canvas.getContext("2d");
    const sAngle = ((circleAngle / 360 * 2) - 0.5) * Math.PI;
    const eAngle = 1.5 * Math.PI;
    context.clearRect(0, 0, canvasSize, canvasSize);
    context.beginPath();
    context.fillStyle = (this.isCritical || this.timeRemaining <=0) ? this.criticalColor : this.baseColor;
    context.moveTo(halfCanvasSize, halfCanvasSize);
    if (this.timeRemaining > 0) {
      if (game.settings.get("hurry-up", "countup")) {
        context.arc(halfCanvasSize, halfCanvasSize, radius, eAngle, sAngle);
      } else {
        context.arc(halfCanvasSize, halfCanvasSize, radius, sAngle, eAngle);
      }
    } else {
      if (game.settings.get("hurry-up", "countup")) context.arc(halfCanvasSize, halfCanvasSize, radius, 0, 2*Math.PI);
    }
    context.shadowOffsetX = 2;
    context.shadowOffsetY = 2;
    context.shadowColor = "rgba(0, 0, 0, 0.75)";
    context.shadowBlur = 2;
    context.fill();
    context.closePath();
  };

  updateSand() {
    const canvasHeight = game.settings.get("hurry-up", "size") * 20;
    const canvasWidth = canvasHeight / 2;
    const canvasHalfHeight = canvasHeight / 2;
    const canvasHalfWidth = canvasWidth / 2;
    const canvasMargin = (canvasHeight * 0.025 > 5) ? 5 : Math.round(canvasHeight * 0.025);
    const glassMargin = canvasMargin * 2;
    let timePercentage = Math.min(Math.max(this.timeElapsed / (this.time * 1000), 0), 1);
    const maxIncrement = canvasHeight / 10 * 3;
    const increment = maxIncrement * timePercentage;
    const canvas = document.getElementById("hurry-up-canvas");
    const context = canvas.getContext("2d");
    canvas.setAttribute("height", canvasHeight);
    canvas.setAttribute("width", canvasWidth);
    //Fix for Google Chrome
    canvas.style.width = canvasWidth + "px";
    $(this.element).find(".window-header").css("width", canvasWidth);
    //
    context.restore();
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    //Glass
    context.shadowOffsetX = 2;
    context.shadowOffsetY = 2;
    context.shadowColor = "rgba(0, 0, 0, 1)";
    context.shadowBlur = 2;
    context.beginPath();
    context.moveTo(canvasHalfWidth, canvasMargin);
    context.bezierCurveTo(
      canvasWidth / 10 * 9 - canvasMargin, canvasMargin,
      canvasWidth  - canvasMargin, canvasHeight / 10,
      canvasWidth - canvasMargin, canvasHeight / 10 * 2);
    context.quadraticCurveTo(
      canvasWidth - canvasMargin, canvasHeight / 10 * 3,
      canvasWidth / 20 * 11, canvasHalfHeight);
    context.quadraticCurveTo(
      canvasWidth - canvasMargin, canvasHeight / 10 * 7,
      canvasWidth - canvasMargin, canvasHeight / 10 * 8);
    context.bezierCurveTo(
      canvasWidth - canvasMargin, canvasHeight / 10 * 9,
      canvasWidth / 10 * 9 - canvasMargin, canvasHeight - canvasMargin,
      canvasHalfWidth, canvasHeight - canvasMargin);
    context.bezierCurveTo(
      canvasWidth / 10 + canvasMargin, canvasHeight - canvasMargin,
      canvasMargin, canvasHeight / 10 * 9,
      canvasMargin, canvasHeight / 10 * 8);
    context.quadraticCurveTo(
      canvasMargin, canvasHeight / 10 * 7,
      canvasWidth / 20 * 9, canvasHalfHeight);
    context.quadraticCurveTo(
      canvasMargin, canvasHeight / 10 * 3,
      canvasMargin, canvasHeight / 10 * 2);
    context.bezierCurveTo(
      canvasMargin, canvasHeight / 10,
      canvasWidth / 10 + canvasMargin, canvasMargin,
      canvasHalfWidth, canvasMargin);
    context.fillStyle = this.glassColor;
    context.fill();
    context.closePath();
    context.save();
    // Clip
    context.beginPath();
    context.shadowColor = "rgba(0, 0, 0, 0)";
    context.moveTo(canvasHalfWidth, glassMargin);
    context.bezierCurveTo(
      (canvasWidth / 4 * 3) - glassMargin, glassMargin,
      canvasWidth  - glassMargin, canvasHeight / 10, 
      canvasWidth - glassMargin, canvasHeight / 10 * 2
    );
    context.quadraticCurveTo(
      canvasWidth - glassMargin, canvasHeight / 10 * 3,
      canvasHalfWidth, canvasHalfHeight);
    context.quadraticCurveTo(
      canvasWidth - glassMargin, canvasHeight / 10 * 7,
      canvasWidth - glassMargin, canvasHeight / 10 * 8);
    context.bezierCurveTo(
      canvasWidth - glassMargin, canvasHeight / 10 * 9,
      canvasWidth / 10 * 9 - glassMargin, canvasHeight - glassMargin,
      canvasHalfWidth, canvasHeight - glassMargin);
    context.bezierCurveTo(
      canvasWidth / 10 + glassMargin, canvasHeight - glassMargin,
      glassMargin, canvasHeight / 10 * 9,
      glassMargin, canvasHeight / 10 * 8);
    context.quadraticCurveTo(
      glassMargin, canvasHeight / 10 * 7,
      canvasHalfWidth, canvasHalfHeight);
    context.quadraticCurveTo(
      glassMargin, canvasHeight / 10 * 3,
      glassMargin, canvasHeight / 10 * 2);
    context.bezierCurveTo(
      glassMargin, canvasHeight / 10,
      canvasWidth / 4 + glassMargin, glassMargin,
      canvasWidth / 2, glassMargin);
    context.clip();
    //Sand top
    context.beginPath();
    context.shadowColor = "rgba(0, 0, 0, 0)";
    context.moveTo(0, canvasHeight / 10 * 2 + increment);
    context.lineTo(canvasWidth, canvasHeight / 10 * 2 + increment)
    context.lineTo(canvasWidth, canvasHalfHeight);
    context.lineTo(0, canvasHalfHeight);
    context.lineTo(0, 0);
    context.fillStyle = (this.isCritical) ? this.criticalColor : this.baseColor;
    context.fill();
    context.closePath();
    //Sand bottom
    context.beginPath();
    context.moveTo(0, canvasHeight - glassMargin - increment);
    context.lineTo(canvasWidth, canvasHeight - glassMargin - increment)
    context.lineTo(canvasWidth, canvasHeight);
    context.lineTo(0, canvasHeight);
    context.lineTo(0, canvasHeight - glassMargin - increment);
    context.fillStyle = (this.isCritical || this.timeRemaining < 0) ? this.criticalColor : this.baseColor;
    context.fill();
    context.closePath();
    //Line
    if (increment < maxIncrement) {
      context.beginPath();
      if (this.sandFrame%2 == 0) {
        context.lineDashOffset = 0;
      } else {
        context.lineDashOffset = 2;
      }
      context.setLineDash([2, 2]);
      context.lineWidth = 1;
      context.lineCap = "round";
      context.moveTo(canvasHalfWidth, canvasHalfHeight);
      context.lineTo(canvasHalfWidth, canvasHeight - glassMargin - increment);
      context.strokeStyle = (this.isCritical) ? this.criticalColor : this.baseColor;
      context.stroke();
      context.closePath();
      this.sandFrame++;
    }
  }

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
    if (this.timeRemaining < 0) {
      this.onCriticalEnd();
      switch (game.settings.get("hurry-up", "style")) {
        case "digits":
          $(this.element).find(".hurry-up-timer-text").removeClass("blinking");
          break;
        case "circle":
          $(this.element).find("#hurry-up-canvas").removeClass("blinking");
      }
      return;
    }

    if (!this.isCritical) {
      if (game.settings.get("hurry-up", "secondsInsteadOfPercentage")) {
        if (this.timeRemaining <= game.settings.get("hurry-up", "critical")) {
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
      const top = game.settings.get("hurry-up", "posTop") ?? 2
      const left = (window.innerWidth - this.element.width() - game.settings.get("hurry-up", "posLeft")) ?? (window.innerWidth - this.element.width() - 310);
      this.element.css({"top": top, "left": left});
      this.position.top = top;
      this.position.left = left;
    }
    
    switch (game.settings.get("hurry-up", "style")) {
      case "digits":
          this.updateDigits();
        break;
      case "circle":
          this.updateCircle();
        break; 
      case "sand":
          this.updateSand(); 
        break;
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
    clearInterval(this.sleepTimer);
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
      case "sand":
        template = `modules/hurry-up/templates/hurry-up-canvas.hbs`
        break;
    }
    return template;
  }

  renderTemplate() {
    game.combatTimer._render(true, {template: CombatTimer.setTemplate()});
  }

  static start(time = game.settings.get("hurry-up", "timerDuration")) {
    if (!game.combatTimer) game.combatTimer = new CombatTimer({template: CombatTimer.setTemplate()}, time);
    if (!game.combatTimer.rendered) game.combatTimer.render(true);
    game.combatTimer.startTimer();
  }

  static socketTimer(time){
    new CombatTimer({template: CombatTimer.setTemplate()}, time, true).render(true).startTimer();
  }

  static Create(time){
    HurryUpSocket.executeForEveryone("StartTimer", time)
  }
}

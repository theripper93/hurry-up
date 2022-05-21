class CombatTimer extends Application {
  constructor(time,selfDestruct = false) {
    super();
    this.time = time;
    this.started = false;
    this.selfDestruct = selfDestruct;
    this.sleepTimeout = undefined;
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
    
    this.reset();
    this.currentTime = this.time;
    this.started = true;
    while (this.started && this.currentTime > 0) {
      await this.sleep(1000);
      if (!game?.paused) {
        this.currentTime--;
        this.updateTime();
        this.checkCritical();
      }
    }
    this.onEnd();
  }

  reset(){
    clearTimeout(this.sleepTimeout);
    this.started = false;
    this.isCritical = false;
    $(this.element)
    .find(".combat-timer-bar")
    .css("background-color", "rgba(255, 255, 255, 0.089)");
    $(this.element).find(".combat-timer-timer-text").removeClass("blinking");
  }

  async onEnd(){
    this.isCritical = false;
    this.started = false;
    this.onCriticalEnd();
    if(this.currentTime) return;
    if(game.settings.get("hurry-up", "goNext") && game.user.isGM){
      game.combat?.nextTurn()
    }
    const soundP = game.settings.get("hurry-up", "endSoundPath")
    if(soundP) AudioHelper.play({src: soundP, autoplay:true, volume: game.settings.get("hurry-up", "soundVol"), loop: false}, false);
    if(this.selfDestruct) this.close();
  }

  async onCritical(){
    this.critSound?.stop();
    const soundP = game.settings.get("hurry-up", "critSoundPath")
    if(soundP) this.critSound = await AudioHelper.play({src: soundP, autoplay:true , volume: game.settings.get("hurry-up", "soundVol"), loop: true}, false);
  }

  async onCriticalEnd(){
    this.critSound?.stop();
  }

  async sleep(ms) {
    return new Promise((resolve) => this.sleepTimeout = setTimeout(resolve, ms));
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
  }

  checkCritical(){
   let isCurrentCritical = false;
   const secondsInsteadOfPercentage = game.settings.get("hurry-up", "secondsInsteadOfPercentage");
   if(secondsInsteadOfPercentage)
   {
      if(this.currentTime <= game.settings.get("hurry-up", "critical"))
      {
         isCurrentCritical = true;
      }
   }else{
      const percent = (this.currentTime / this.time) * 100;
      if (percent <= game.settings.get("hurry-up", "critical")) {
        isCurrentCritical = true;
      }
   }
   
   if(isCurrentCritical)
   {
      if(!this.isCritical){
         this.isCritical = true;
         this.onCritical();
      }
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
    if(!this.positioned){
      this.positioned = true;
      const top = 2
      const left = window.innerWidth - this.element.width() - 310;
      this.element.css({"top": top, "left": left});
      this.position.top = top;
      this.position.left = left;
    }
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

  static Start(time = game.settings.get("hurry-up", "timerDuration")) {
    if(!game.combatTimer) game.combatTimer = new CombatTimer(time)
    game.combatTimer.render(true).startTimer();
  }
  static socketTimer(time){
    new CombatTimer(time,true).render(true).startTimer();
  }
  static Create(time){
    HurryUpSocket.executeForEveryone("StartTimer",time)
  }
}

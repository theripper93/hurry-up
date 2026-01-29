import {Socket} from "../lib/socket.js";
import { HandlebarsApplication, mergeClone, randomID, l } from "../lib/utils.js";

export class CombatTimer extends HandlebarsApplication {

    static timerInstances = {};
    constructor(id) {
        const options = game.settings.get("hurry-up", "timersData")[id];
        const overrideOptions = {};
        if (options.isSecondary) {
            overrideOptions.position = {
                top: window.innerHeight / 2,
                left: window.innerWidth / 2,
            };
            overrideOptions.id = id;
            if (options.name) {
                overrideOptions.classes = ["named"];
                overrideOptions.window = { title: options.name };
            }
        }
        super(overrideOptions);
        this.mainName = l("COMBAT.Turn");
        this.started = false;
        this.sleepTimer = undefined;
        this.setupTimer(false);
        this.sandFrame = 0;
        CombatTimer.timerInstances[this.options.id] = this;
        this.startTimer();
    }

    setupColors() {
        this.color ||= getComputedStyle(this.element).color;
        this.glassColor = getComputedStyle(this.element).color;
        this.criticalColor = "rgba(255, 0, 0, 0.75)";
        this.barCriticalColor = "rgb(255, 0, 0)";
    }

    setupTimer(render = false) {
        const currentTimersData = game.settings.get("hurry-up", "timersData") ?? {};
        const timerData = currentTimersData[this.options.id];
        this.timeNow = game.time.serverTime;
        this.name = timerData.name;
        this.isSecondary = timerData.isSecondary;
        this.time = timerData.time ?? game.settings.get("hurry-up", "timerDuration");
        this.color = timerData.color;
        this.style = timerData.style ?? game.settings.get("hurry-up", "style") ?? "digits";
        this.countup = game.settings.get("hurry-up", "countup");
        if (timerData.startedAt) {
            this.startedAt = timerData.startedAt;
            this.manuallyPaused = timerData.manuallyPaused ?? false;
            this.pausedAt = timerData.pausedAt ?? this.timeNow;
            this.pausedFor = timerData.pausedFor ?? 0;

            const isCurrentlyPaused = game?.paused || this.manuallyPaused;
            if (isCurrentlyPaused) {
                this.pausedFor = this.pausedFor + game.time.serverTime - this.pausedAt;
                this.pausedAt = this.timeNow;
                this.timeElapsed = this.pausedAt - this.startedAt - this.pausedFor;
            } else {
                this.timeElapsed = this.timeNow - this.startedAt - this.pausedFor;
            }
            this.timeRemaining = this.time - Math.floor(this.timeElapsed / 1000);
            this.timeRemaining = Math.max(this.timeRemaining, 0);
        } else {
            this.startedAt = this.timeNow;
            this.manuallyPaused = false;
            this.pausedAt = this.isPaused() ? this.timeNow : undefined;
            this.pausedFor = 0;
            this.timeElapsed = 0;
            this.timeRemaining = this.time;
        }
        this.hasEnded = this.timeRemaining <= 0;
        if(render) this.render();
    }

    static reset(id) {
        const currentTimersData = game.settings.get("hurry-up", "timersData") ?? {};
        const timerData = currentTimersData[id];

        timerData.startedAt = game.time.serverTime;
        timerData.pausedAt = undefined;
        const isCurrentlyPaused = game?.paused || timerData.manuallyPaused;
        if (isCurrentlyPaused) {
            timerData.pausedAt = game.time.serverTime;
        }
        timerData.pausedFor = 0;

        game.settings.set("hurry-up", "timersData", currentTimersData);
    }

    static async setPause(id, paused, manual = true) {
        const currentTimersData = game.settings.get("hurry-up", "timersData") ?? {};
        const timerData = currentTimersData[id];
        
        if (manual) {
            timerData.manuallyPaused = paused;
        }
        const isCurrentlyPaused = game?.paused || timerData.manuallyPaused;
        const isEnteringPause = isCurrentlyPaused && !timerData.pausedAt;
        const isExitingPause = !isCurrentlyPaused && !!timerData.pausedAt;
        if (isEnteringPause) {
            timerData.pausedAt = game.time.serverTime;
        }
        if (isExitingPause) {
            timerData.pausedFor = timerData.pausedFor + game.time.serverTime - timerData.pausedAt;
            timerData.pausedAt = undefined;
        }
        await game.settings.set("hurry-up", "timersData", currentTimersData);
    }

    isPaused() {
        return game?.paused || this.manuallyPaused;
    }

    isManuallyPaused() {
        return this.manuallyPaused;
    }

    isSecondaryTimer() {
        return this.isSecondary;
    }

    _configureRenderParts(...args) {
        const parts = super._configureRenderParts(...args);
        let template;
        switch (this.style) {
            case "digits":
                template = `modules/hurry-up/templates/hurry-up-digits.hbs`;
                break;
            case "circle":
            case "sand":
                template = `modules/hurry-up/templates/hurry-up-canvas.hbs`;
                break;
        }
        parts.content.template = template;
        return parts;
    }

    static get DEFAULT_OPTIONS() {
        return mergeClone(super.DEFAULT_OPTIONS, {
            tag: "div",
            id: "hurry-up",
            classes: ["hurry-up"],
            window: {
                title: "",
                minimizable: true,
                resizable: false,
                preventEscapeClose: true,
                savePosition: true,
            },
            position: {
                width: "auto",
                height: "auto",
            }
        });
    }

    static get PARTS() {
        return {
            content: {
                template: "",
            },
        };
    }

    startTimer(reset = false) {
        if(reset) CombatTimer.reset(this.options.id);
        this.started = true;
        this.sleepTimer = setInterval(this.updateTime.bind(this), 100);
    }

    async onEnd() {
        this.endSound();
        if (game.settings.get("hurry-up", "goNext") && game.user.isGM && !this.isSecondary) {
            game.combat?.nextTurn();
        }
    }

    async sleep(ms) {
        return new Promise((resolve) => (this.sleepTimer = setTimeout(resolve, ms)));
    }

    async endSound() {
        this.critSound?.stop();
        const soundP = game.settings.get("hurry-up", "endSoundPath");
        if (soundP) foundry.audio.AudioHelper.play({ src: soundP, autoplay: true, volume: game.settings.get("hurry-up", "soundVol"), loop: false }, false);
    }

    updateVisuals() {
        switch (this.style) {
            case "digits":
                this.updateDigits();
                break;
            case "circle":
                this.updateCircle();
                break;
            case "sand":
                this.updateSand();
        }
    }

    updateTime(forceRender = false) {
        if (!this.element) return;
        if (!this.isPaused()) {
            this.timeNow = game.time.serverTime;
            this.timeElapsed = this.timeNow - this.startedAt - this.pausedFor;
            this.timeRemaining = this.time - Math.floor(this.timeElapsed / 1000);
            this.timeRemaining = Math.max(this.timeRemaining, 0);
        } else {
            if (this.critSound?.playing) this.critSound?.pause();
        }

        if (!this.isPaused() || forceRender) {
            this.updateVisuals();
            this.checkCritical();
            if (this.timeRemaining <= 0 && !this.hasEnded) {
                this.onEnd();
                this.hasEnded = true;
            }
            const name = this.isSecondary ? this.name : this.mainName;
            if (this.minimized || this.style !== "digits") {
                this._updateFrame({window: {title: `${name ? name + " - " : ""}${this.getFormattedTime()}`}});
            } else {
                this._updateFrame({window: {title: name}});
            }
        }
    }

    getFormattedTime() {
        const time = (this.countup ? this.timeElapsed / 1000 : this.timeRemaining);
        const hours = Math.floor(time / 3600);
        const minutes = Math.floor((time % 3600) / 60);
        const seconds = Math.floor(time % 60);
        return `${hours > 0 ? `${hours}`.padStart(2, "0") + ":" : ""}${`${minutes}`.padStart(2, "0")}:${`${seconds}`.padStart(2, "0")}`;
    }

    updateDigits() {
        if (!this.element) return;

        this.element
            .querySelector(".hurry-up-timer-text")
            .textContent = this.getFormattedTime();
        let percent = Math.min(Math.max((this.timeRemaining / this.time) * 100, 0), 100);
        if (this.countup) percent = 100 - percent;
        this.element.querySelector(".hurry-up-bar").style.width = `${percent}%`;


        // TODO: Fix initial state on countup to not have reset animation on first tick
    }

    updateCircle() {
        if (!this.element) return;
        const timePercentage = Math.min(Math.max(this.timeElapsed / (this.time * 1000), 0), 1);
        const circleAngle = timePercentage * 360;
        const canvasSize = game.settings.get("hurry-up", "size") * 20;
        const halfCanvasSize = canvasSize / 2;
        const radius = halfCanvasSize - 5;
        const canvas = this.element.querySelector(".hurry-up-canvas");
        canvas.setAttribute("height", canvasSize);
        canvas.setAttribute("width", canvasSize);
        // canvas.style.width = "inherit";
        // this.element.querySelector(".window-header").style.width = "inherit";
        const context = canvas.getContext("2d");
        const sAngle = ((circleAngle / 360) * 2 - 0.5) * Math.PI;
        const eAngle = 1.5 * Math.PI;
        context.clearRect(0, 0, canvasSize, canvasSize);

        context.fillStyle = this.glassColor;
        context.moveTo(halfCanvasSize, halfCanvasSize);
        context.beginPath();
        context.arc(halfCanvasSize, halfCanvasSize, radius, 0, 2 * Math.PI);
        context.globalAlpha = 0.2;
        context.lineWidth = 1;
        context.strokeStyle = this.glassColor;
        context.stroke();
        context.globalAlpha = 0.1;
        context.fill();
        context.globalAlpha = 1;
        context.closePath();

        context.beginPath();
        context.fillStyle = this.isCritical || this.timeRemaining <= 0 ? this.criticalColor : this.color;
        context.moveTo(halfCanvasSize, halfCanvasSize);
        if (this.timeRemaining > 0) {
            if (game.settings.get("hurry-up", "countup")) {
                context.arc(halfCanvasSize, halfCanvasSize, radius, eAngle, sAngle);
            } else {
                context.arc(halfCanvasSize, halfCanvasSize, radius, sAngle, eAngle);
            }
        } else {
            if (game.settings.get("hurry-up", "countup")) context.arc(halfCanvasSize, halfCanvasSize, radius, 0, 2 * Math.PI);
        }
        context.shadowOffsetX = 2;
        context.shadowOffsetY = 2;
        context.shadowColor = "rgba(0, 0, 0, 0.75)";
        context.shadowBlur = 2;
        context.fill();
        context.closePath();
    }

    updateSand() {
        if (!this.element) return;
        // const canvasHeight = game.settings.get("hurry-up", "size") * 20;
        const canvasWidth = game.settings.get("hurry-up", "size") * 20;
        const canvasHeight = canvasWidth * 2;
        const canvasHalfHeight = canvasHeight / 2;
        const canvasHalfWidth = canvasWidth / 2;
        const canvasMargin = canvasHeight * 0.025 > 5 ? 5 : Math.round(canvasHeight * 0.025);
        const glassMargin = canvasMargin * 2;
        const timePercentage = Math.min(Math.max(this.timeElapsed / (this.time * 1000), 0), 1);
        const maxIncrement = (canvasHeight / 10) * 3;
        const increment = maxIncrement * timePercentage;
        const canvas = this.element.querySelector(".hurry-up-canvas");
        const context = canvas.getContext("2d");
        canvas.setAttribute("height", canvasHeight);
        canvas.setAttribute("width", canvasWidth);
        //Fix for Google Chrome
        canvas.style.width = canvasWidth + "px";
        this.element.querySelector(".window-header").style.width = canvasWidth;
        // this.element.querySelector(".window-content").style.alignItems = "center";
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
        context.bezierCurveTo((canvasWidth / 10) * 9 - canvasMargin, canvasMargin, canvasWidth - canvasMargin, canvasHeight / 10, canvasWidth - canvasMargin, (canvasHeight / 10) * 2);
        context.quadraticCurveTo(canvasWidth - canvasMargin, (canvasHeight / 10) * 3, (canvasWidth / 20) * 11, canvasHalfHeight);
        context.quadraticCurveTo(canvasWidth - canvasMargin, (canvasHeight / 10) * 7, canvasWidth - canvasMargin, (canvasHeight / 10) * 8);
        context.bezierCurveTo(canvasWidth - canvasMargin, (canvasHeight / 10) * 9, (canvasWidth / 10) * 9 - canvasMargin, canvasHeight - canvasMargin, canvasHalfWidth, canvasHeight - canvasMargin);
        context.bezierCurveTo(canvasWidth / 10 + canvasMargin, canvasHeight - canvasMargin, canvasMargin, (canvasHeight / 10) * 9, canvasMargin, (canvasHeight / 10) * 8);
        context.quadraticCurveTo(canvasMargin, (canvasHeight / 10) * 7, (canvasWidth / 20) * 9, canvasHalfHeight);
        context.quadraticCurveTo(canvasMargin, (canvasHeight / 10) * 3, canvasMargin, (canvasHeight / 10) * 2);
        context.bezierCurveTo(canvasMargin, canvasHeight / 10, canvasWidth / 10 + canvasMargin, canvasMargin, canvasHalfWidth, canvasMargin);
        context.globalAlpha = 0.2;
        context.lineWidth = 1;
        context.strokeStyle = this.glassColor;
        context.stroke();
        context.fillStyle = this.glassColor;
        context.globalAlpha = 0.1;
        context.fill();
        context.globalAlpha = 1;
        context.closePath();
        context.save();
        // Clip
        context.beginPath();
        context.shadowColor = "rgba(0, 0, 0, 0)";
        context.moveTo(canvasHalfWidth, glassMargin);
        context.bezierCurveTo((canvasWidth / 4) * 3 - glassMargin, glassMargin, canvasWidth - glassMargin, canvasHeight / 10, canvasWidth - glassMargin, (canvasHeight / 10) * 2);
        context.quadraticCurveTo(canvasWidth - glassMargin, (canvasHeight / 10) * 3, canvasHalfWidth, canvasHalfHeight);
        context.quadraticCurveTo(canvasWidth - glassMargin, (canvasHeight / 10) * 7, canvasWidth - glassMargin, (canvasHeight / 10) * 8);
        context.bezierCurveTo(canvasWidth - glassMargin, (canvasHeight / 10) * 9, (canvasWidth / 10) * 9 - glassMargin, canvasHeight - glassMargin, canvasHalfWidth, canvasHeight - glassMargin);
        context.bezierCurveTo(canvasWidth / 10 + glassMargin, canvasHeight - glassMargin, glassMargin, (canvasHeight / 10) * 9, glassMargin, (canvasHeight / 10) * 8);
        context.quadraticCurveTo(glassMargin, (canvasHeight / 10) * 7, canvasHalfWidth, canvasHalfHeight);
        context.quadraticCurveTo(glassMargin, (canvasHeight / 10) * 3, glassMargin, (canvasHeight / 10) * 2);
        context.bezierCurveTo(glassMargin, canvasHeight / 10, canvasWidth / 4 + glassMargin, glassMargin, canvasWidth / 2, glassMargin);
        context.clip();
        //Sand top
        context.beginPath();
        context.shadowColor = "rgba(0, 0, 0, 0)";
        context.moveTo(0, (canvasHeight / 10) * 2 + increment);
        context.lineTo(canvasWidth, (canvasHeight / 10) * 2 + increment);
        context.lineTo(canvasWidth, canvasHalfHeight);
        context.lineTo(0, canvasHalfHeight);
        context.lineTo(0, 0);
        context.fillStyle = this.isCritical ? this.criticalColor : this.color;
        context.fill();
        context.closePath();
        //Sand bottom
        context.beginPath();
        context.moveTo(0, canvasHeight - glassMargin - increment);
        context.lineTo(canvasWidth, canvasHeight - glassMargin - increment);
        context.lineTo(canvasWidth, canvasHeight);
        context.lineTo(0, canvasHeight);
        context.lineTo(0, canvasHeight - glassMargin - increment);
        context.fillStyle = this.isCritical || this.timeRemaining < 0 ? this.criticalColor : this.color;
        context.fill();
        context.closePath();
        //Line
        if (increment < maxIncrement) {
            context.beginPath();
            if (this.sandFrame % 2 == 0) {
                context.lineDashOffset = 0;
            } else {
                context.lineDashOffset = 2;
            }
            context.setLineDash([2, 2]);
            context.lineWidth = 1;
            context.lineCap = "round";
            context.moveTo(canvasHalfWidth, canvasHalfHeight);
            context.lineTo(canvasHalfWidth, canvasHeight - glassMargin - increment);
            context.strokeStyle = this.isCritical ? this.criticalColor : this.color;
            context.stroke();
            context.closePath();
            this.sandFrame++;
        }
    }

    updateWindowless() {
        // const windowAppElement = document.querySelector(".hurry-up");
        const windowHeaderElement = this.element.getElementsByClassName("window-header");
        if (!windowHeaderElement.length) return;
        if (game.settings.get("hurry-up", "windowless")) {
            this.element.classList.add("windowless");
            windowHeaderElement[0].classList.add("windowless");
        } else {
            this.element.classList.remove("windowless");
            windowHeaderElement[0].classList.remove("windowless");
        }
    }

    checkCritical() {
        if (this.timeRemaining <= 0) {
            this.onCriticalEnd();
            this.setCriticalStyle();
            return;
        }

        if (!this.isCritical) {
            if(this.hasEnded) return;
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
            if (this.timeRemaining <= 2) this.isCritical = true;

            if (this.isCritical) {
                this.onCritical();
                this.setCriticalStyle();
            }
        }
    }

    setCriticalStyle() {
        if(this.isCritical) {
            switch (this.style) {
                case "digits":
                    this.element.querySelector(".hurry-up-bar").style.backgroundColor = this.barCriticalColor;
                    this.element.querySelector(".hurry-up-timer-text").classList.add("blinking");
                    break;
                case "circle":
                    this.element.querySelector(".hurry-up-canvas").classList.add("blinking");
            }
        } else {
            switch (this.style) {
                case "digits":
                    this.element.querySelector(".hurry-up-bar").style.backgroundColor = this.color;
                    this.element.querySelector(".hurry-up-timer-text").classList.remove("blinking");
                    break;
                case "circle":
                    this.element.querySelector(".hurry-up-canvas").classList.remove("blinking");
            }
        }
    }

    async onCritical() {
        this.critSound?.stop();
        const soundP = game.settings.get("hurry-up", "critSoundPath");
        if (soundP) this.critSound = await foundry.audio.AudioHelper.play({ src: soundP, autoplay: true, volume: game.settings.get("hurry-up", "soundVol"), loop: true }, false);
    }

    async onCriticalEnd() {
        this.isCritical = false;
        this.critSound?.stop();
    }

    async minimize() {
        super.minimize();
        this.updateTime(true);
    }

    async maximize() {
        super.maximize();
        this.updateTime(true);
    }

    _onRender(context, options) {
        super._onRender(context, options);
        this.isCritical = false;
        this.updateTime(true);
        this.checkCritical();
        const countup = game.settings.get("hurry-up", "countup");
        this.setupColors();
        switch (this.style) {
            case "digits":
                this.element.querySelector(".hurry-up-bar").style.backgroundColor = this.color;
                this.element.querySelector(".hurry-up-bar").style.width = "0%" ? countup : "100%";
                this.element.querySelector(".hurry-up-timer-text").classList.remove("blinking");
                break;
            case "circle":
            case "sand":
                this.element.querySelector(".hurry-up-canvas").classList.remove("blinking");
                break;
        }
        document.documentElement.style.setProperty("--hurry-up-font-size", game.settings.get("hurry-up", "size") + "em");
        this.updateWindowless();
        this.setCriticalStyle();
        if (this.manuallyPaused) this.element.classList.add("paused");
        else this.element.classList.remove("paused");
    }

    _onFirstRender(...args) {
        super._onFirstRender(...args);
        if (!game.user.isGM) return;
        new foundry.applications.ux.ContextMenu(
            this.element,
            ".window-content, .window-header",
            [
                {
                    condition: () => this.isManuallyPaused(),
                    name: `hp.contextMenu.unpause`,
                    icon: `<i class="fas fa-play"></i>`,
                    callback: () => CombatTimer.setPause(this.options.id, false),
                },
                {
                    condition: () => !this.isManuallyPaused(),
                    name: `hp.contextMenu.pause`,
                    icon: `<i class="fas fa-pause"></i>`,
                    callback: () => CombatTimer.setPause(this.options.id, true),
                },
                {
                    name: `hp.contextMenu.reset`,
                    icon: `<i class="fas fa-arrow-rotate-right"></i>`,
                    callback: () => this.startTimer(true),
                },
                {
                    condition: !!this.isSecondary,
                    name: `hp.contextMenu.close`,
                    icon: `<i class="fas fa-close"></i>`,
                    callback: () => {
                        CombatTimer.deleteTimer(this.options.id);
                    }
                }
            ],
            { jQuery: false, fixed: true }
        );
    }

    _prepareContext(...args) {
        return {};
    }

    setPosition(...args) {
        super.setPosition(...args);
        this.element.style.width = "auto";
        this.element.style.height = "auto";
    }

    _onClose(...args) {
        clearInterval(this.sleepTimer);
        this.started = false;
        this.critSound?.stop();
        game.combatTimer = null;
        if(!this.name && this.isSecondary) this.deletePosition();
        delete CombatTimer.timerInstances[this.options.id];
        return super._onClose(...args);
    }

    renderTemplate() {
        this.render(true);
        this.updateTime(true);
    }

    static start(options = {}) {
        if(!options.isSecondary) {
            if (!game.combatTimer) game.combatTimer = new CombatTimer(options);
            if (!game.combatTimer.rendered) game.combatTimer.render({ force: true});
            game.combatTimer.startTimer();
        } else {
            const combatTimer = new CombatTimer(options);
            combatTimer.render({ force: true});
            combatTimer.startTimer();
        }
    }

    static socketTimer({time, name}) {
        CombatTimer.start({ time, name, isSecondary: true });
    }

    static async createTimer(time, {name = "", isSecondary = true, color = null, paused = false, style = null} = {}) {
        time = Number.isFinite(time) ? time : game.settings.get("hurry-up", "timerDuration");
        const currentTimersData = game.settings.get("hurry-up", "timersData") ?? {};
        let id;
        if(isSecondary) {
            id = name ? `hurry-up-${name.slugify({strict: true})}` : `hurry-up-${randomID(10)}`;
            if (id in currentTimersData) return ui.notifications.error(`Timer with name ${name} already exists`);
        } else {
            id = "hurry-up";
            if (id in currentTimersData) return this.reset(id);
        }
        currentTimersData[id] = {
            id: id,
            isSecondary: isSecondary,
            name: name,
            time: time,
            startedAt: game.time.serverTime,
            pausedAt: paused || game?.paused ? game.time.serverTime : undefined,
            pausedFor: 0,
            manuallyPaused: paused,
            color: color,
            style: style
        };
        await game.settings.set("hurry-up", "timersData", currentTimersData);
        return currentTimersData;
    }

    static async deleteTimer(id) {
        const currentTimersData = game.settings.get("hurry-up", "timersData") ?? {};
        delete currentTimersData[id];
        return await game.settings.set("hurry-up", "timersData", currentTimersData);
    }

    static async checkAndCreateMainTimer() {
        if(game.settings.get("hurry-up", "disable")) return CombatTimer.deleteTimer("hurry-up");
        const token = canvas.tokens.get(game?.combat?.current?.tokenId);
        const actor = token?.actor;
        if (game.settings.get("hurry-up", "runForNPC") || actor?.hasPlayerOwner) {
            CombatTimer.createTimer(false);
        } else {
            CombatTimer.deleteTimer("hurry-up");
        }
    }

    static updateAndSync() {
        const timersData = game.settings.get("hurry-up", "timersData") ?? {};
        for (const timerData of Object.values(timersData)) {
            const timer = CombatTimer.timerInstances[timerData.id];
            if (timer) {
                timer.setupTimer(true);
            } else {
                new CombatTimer(timerData.id).render({ force: true});
            }
        }
        for (const timer of Object.values(CombatTimer.timerInstances)) {
            if (!timersData[timer.options.id]) {
                timer.close();
            }
        }
    }
}

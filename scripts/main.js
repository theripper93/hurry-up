import { CombatTimer } from "./app/CombatTimer.js";
import { registerSettings } from "./settings.js";
import { Socket } from "./lib/socket.js";
import { FormBuilder } from "./lib/formBuilder.js";
import "../scss/module.scss";

export const MODULE_ID = "hurry-up";

registerSettings();

Hooks.once("init", () => {
    Socket.register("StartTimer", CombatTimer.socketTimer);
    globalThis.CombatTimer = CombatTimer;
});

Hooks.on("ready", () => {
    CombatTimer.updateAndSync();
});

Hooks.on("updateCombat", (combat, updates) => {
    if (!game.user.isActiveGM) return;
    if (!game.combat?.started) return CombatTimer.deleteTimer("hurry-up");
    if (("turn" in updates || "round" in updates)) CombatTimer.checkAndCreateMainTimer();
});

Hooks.on("deleteCombat", (combat, updates) => {
    if (!game.user.isActiveGM) return;
    CombatTimer.deleteTimer("hurry-up");
});

Hooks.on("pauseGame", async (paused) => {
    if (!game.user.isActiveGM) return;
    for (const timer of Object.values(CombatTimer.timerInstances)) {
        await CombatTimer.setPause(timer.options.id, paused, false);
    }
});

Hooks.on("chatMessage", (chatLog, messageText, chatData) => {
    if (!game.user.isGM) return true;
    const match = messageText.match(/^\/(?:hurry|timer)(\?)?(?:\s+((?:\d+[:hms]?)+))?/i);
    
    if (match) {
        const paused = match[1] ? true : false;
        const time = match[2] ? parseTime(match[2].trim()) : undefined;

        if(match[2]) {
            CombatTimer.createTimer(time, {paused});
            return false;
        }

        const style = game.settings.get("hurry-up", "style");
        const styles = game.settings.settings.get("hurry-up.style").choices;
        const formBuilder = (new FormBuilder())
            .title("hp.create.title")
            .checkbox({name: "paused", label: "hp.create.paused", value: paused})
            .number({name: "time", label: "hp.create.time", value: time ?? game.settings.get("hurry-up", "timerDuration")})
            .text({name: "name", label: "hp.create.name", value: name})
            .color({name: "color", label: "hp.create.color", value: ""})
            .select({name: "timerStyle", label: "hp.settings.style.name", value: style, options: styles});
            
        formBuilder.render().then(data => {
            if(!data) return;
            if(!data.time || data.time <= 0) return ui.notifications.error("hp.create.timeError");
            CombatTimer.createTimer(
                parseTime(data.time), 
                {
                    name: data.name,
                    paused: !!data.paused,
                    color: data.color,
                    style: data.timerStyle
                }
            );
        });      

        return false;
    }
    
    return true;
});

function parseTime(input) {
    let hours = 0,
        minutes = 0,
        seconds = 0;

    const hmsRegex = /^(\d+)h(\d+)m(\d+)s$|^(\d+):(\d+):(\d+)$/;
    const msRegex = /^(\d+)m(\d+)s$|^(\d+):(\d+)$/;
    const hmRegex = /^(\d+)h(\d+)m$/;
    const hsRegex = /^(\d+)h(\d+)s$/;
    const hRegex = /^(\d+)h$/;
    const mRegex = /^(\d+)m$/;
    const sRegex = /^(\d+)s$/;

    if (hmsRegex.test(input)) {
        const match = input.match(hmsRegex);
        hours = parseInt(match[1] ?? match[4]);
        minutes = parseInt(match[2] ?? match[5]);
        seconds = parseInt(match[3] ?? match[6]);
    } else if (msRegex.test(input)) {
        const match = input.match(msRegex);
        minutes = parseInt(match[1] ?? match[3]);
        seconds = parseInt(match[2] ?? match[4]);
    } else if (hmRegex.test(input)) {
        const match = input.match(hmRegex);
        hours = parseInt(match[1]);
        minutes = parseInt(match[2]);
    } else if (hsRegex.test(input)) {
        const match = input.match(hsRegex);
        hours = parseInt(match[1]);
        seconds = parseInt(match[2]);
    } else if (hRegex.test(input)) {
        const match = input.match(hRegex);
        hours = parseInt(match[1]);
    } else if (mRegex.test(input)) {
        const match = input.match(mRegex);
        minutes = parseInt(match[1]);
    } else if (sRegex.test(input)) {
        const match = input.match(sRegex);
        seconds = parseInt(match[1]);
    } else {
        const int = parseInt(input);
        if (!isNaN(int)) {
            seconds = int;
        }
        return seconds;
    }

    return hours * 3600 + minutes * 60 + seconds;
}

import * as trRollLib from "./lib.js"

// Base class for group roll apps
class GroupRollApp extends Application {

    constructor(object, options) {
        super(options);
        this.tokList = [];
        this.mstList = {};
        this.groupRoll = "";
        this.flavor = "";
        this.groupOutcome = "";
        this.groupCheckIcon = "";
        this.tok2Show = "all";
        this.isV10 = trRollLib.minGen(10);
        // Update dialog display on changes to token selection
        Hooks.on("controlToken", async (object, controlled) => {
            let x = await canvas.tokens.controlled;
            this.commitValues();
            this.render();
        });
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.width = 600;
        options.resizable = true;
        return options;
    }

    commitValues() {
        // Ensure the DC, bonus and damage values from the form are committed to the object
        this.dc = this.element.find('input[name="input-dc"]').val();

        for (const t of this.tokList) {
            const value = this.element.find(`input[name="bon-${t.id}"]`).val();
            if (value)
                this.mstList[t.id].bon = t.bon = value;
        }

        const damage = this.element.find('input[name="grm-dmg-input"]').val();
        if (damage)
            this.dmg = damage;
    }

    doCheck(rollFunc) {
        this.commitValues();

        for (const t of this.tokList)
            this.mstList[t.id].roll = t.roll = rollFunc(Number(t.adv), Number(t.bon), Number(t.mod), t.luck);

        this.render();
    }

    doGroupCheck() {
        this.doCheck(trRollLib.chkRoll);
    }

    doPassiveCheck() {
        this.doCheck(trRollLib.chkPassive);
    }

    async sendRollsToChat() {
        const tokChatList = this.tok2Show === "all" ? this.tokList : ( this.tok2Show === "pass" ? this.tokList.filter(t => t.nat === 'grm-success') : this.tokList.filter(t => t.nat === 'grm-fumble' && t.roll instanceof Roll) );
        if (tokChatList.reduce((notready, t) => notready = (t.roll.dice && t.roll.dice.length > 0) ? notready : true, false)) return;
        const tokRolls = tokChatList.map(t => {
            let d = t.roll.dice[0];
            return {
                name: t.name,
                total: t.roll.total,
                formula: t.roll.result,
                faces: d.faces,
                nat: t.nat,
                chk: t.chk,
                rolls: d.results.map(r => {
                    return {
                        result: r.result,
                        classes: [
                            "d20",
                            r.rerolled ? "rerolled" : null,
                            r.exploded ? "exploded" : null,
                            r.discarded ? "discarded" : null,
                            (r.result === 1) ? "min" : null,
                            (r.result === 20) ? "max" : null
                        ].filter(c => c).join(" ")
                    }
                })
            };
        });
        const tooltip = await renderTemplate("modules/grouproll/templates/group-chat-tooltip.html", {
            tok: tokRolls
        });
        const content = await renderTemplate("modules/grouproll/templates/group-chat-roll.html", {
            flavor: this.flavor,
            total: this.groupRoll,
            groupoutcome: this.groupOutcome,
            groupcheck: this.groupCheckIcon,
            tooltip
        });

        let whisper = null;
        const rollMode = game.settings.get("core", "rollMode");
        if ((rollMode === "gmroll") || (rollMode === "blindroll"))
            whisper = game.users.contents.filter(u => u.isGM).map(u => u.id);
        else if (rollMode === "selfroll")
            whisper = game.user.id;

            const chatData = {
            user: game.user.id,
            content,
            whisper
        };
        ChatMessage.create(chatData);
    }

    async applyDamage(multiplier) {
        const value = Math.abs(this.element.find('input[name="grm-dmg-input"]').val());
        if (!value)
            return;

        const tokens = (this.tok2Show === "all" ? this.tokList : ( this.tok2Show === "pass" ? this.tokList.filter(t => t.nat === 'grm-success') : this.tokList.filter(t => t.nat === 'grm-fumble' && t.roll instanceof Roll) ));
        const promises = tokens.map(t => canvas.tokens.get(t.id)?.actor?.applyDamage(value, multiplier));
        return Promise.all(promises);
    }

    _getHeaderButtons() {
        let buttons = super._getHeaderButtons();
        buttons = [
            {
                label: "PCs",
                class: "grm-btn-select",
                title: "Select all player character tokens",
                icon: "fas fa-user-friends",
                onclick: ev => {
                    canvas.tokens.releaseAll();
                    canvas.tokens.ownedTokens.filter(t => t.actor && t.actor.hasPlayerOwner).map(t => t.control({ updateSight: true, releaseOthers: false }));
                    this.commitValues();
                    this.render();
                }
            },
            {
                label: "Pass",
                class: "grm-btn-pass",
                title: "Toggle display of tokens with successful rolls",
                icon: "fas fa-check",
                onclick: ev => {
                    if (this.tok2Show === "pass") {
                        this.tok2Show = "all";
                        ev.currentTarget.classList.remove("grm-success");
                    } else {
                        this.tok2Show = "pass";
                        ev.currentTarget.classList.add("grm-success");
                        ev.currentTarget.parentElement.querySelector(".grm-btn-fail").classList.remove("grm-fumble");
                    }
                    this.commitValues();
                    this.render();
                }
            },
            {
                label: "Fail",
                class: "grm-btn-fail",
                title: "Toggle display of tokens with failed rolls",
                icon: "fas fa-times",
                onclick: ev => {
                    if (this.tok2Show === "fail") {
                        this.tok2Show = "all";
                        ev.currentTarget.classList.remove("grm-fumble");
                    } else {
                        this.tok2Show = "fail";
                        ev.currentTarget.classList.add("grm-fumble");
                        ev.currentTarget.parentElement.querySelector(".grm-btn-pass").classList.remove("grm-success");
                    }
                    this.commitValues();
                    this.render();
                }
            },
            {
                label: "Reset",
                class: "grm-btn-reset",
                title: "Reset advantage, bonus, and roll values",
                icon: "fas fa-undo",
                onclick: ev => {
                    this.tok2Show = "all";
                    canvas.tokens.ownedTokens.map(t => this.mstList[t.id] = { adv: 0, bon: 0, roll: { total: "", result: "", terms: [{ total: 10 }] } });
                    ev.currentTarget.parentElement.querySelector(".grm-btn-fail").classList.remove("grm-fumble");
                    ev.currentTarget.parentElement.querySelector(".grm-btn-pass").classList.remove("grm-success");
                    this.render();
                }
            },
            {
                label: "Passive",
                class: "grm-btn-nodice",
                title: "Compute fixed outcomes without rolls",
                icon: "fas fa-lock",
                onclick: ev => this.doPassiveCheck()
            },
            {
                label: "Roll",
                class: "grm-btn-roll",
                title: "Roll for all selected tokens\nShift: " + (game.settings.get("grouproll", "send2chat") ? "Hide rolls from chat" : "Output rolls to chat") + "\nCtrl: Keep same rolls",
                icon: "fas fa-dice-d20",
                onclick: ev => {
                    if (!ev.ctrlKey) this.doGroupCheck();
                    if (ev.shiftKey !== game.settings.get("grouproll", "send2chat")) this.sendRollsToChat();
                }
            }
        ].concat(buttons);
        return buttons
    }

    /**
     * Render the outer application wrapper
     * @returns {Promise<jQuery>}   A promise resolving to the constructed jQuery object
     * @protected
     */
    async _renderOuter() {

        // Gather basic application data
        const classes = this.options.classes;
        const windowData = {
            id: this.id,
            classes: classes.join(" "),
            appId: this.appId,
            title: this.title,
            headerButtons: this._getHeaderButtons()
        };

        // Render the template and return the promise
        let html = await renderTemplate("modules/grouproll/templates/group-app-window.html", windowData);
        html = $(html);

        // Activate header button click listeners after a slight timeout to prevent immediate interaction
        setTimeout(() => {
            html.find(".header-button").click(event => {
                event.preventDefault();
                const button = windowData.headerButtons.find(b => event.currentTarget.classList.contains(b.class));
                button.onclick(event);
            });
        }, 500);

        // Make the outer window draggable
        const header = html.find("header")[0];
        new Draggable(this, html, header, this.options.resizable);

        // Make the outer window minimizable
        if ( this.options.minimizable ) {
            header.addEventListener("dblclick", this._onToggleMinimize.bind(this));
        }

        // Set the outer frame z-index
        if ( Object.keys(ui.windows).length === 0 ) _maxZ = 100 - 1;
        this.position.zIndex = Math.min(++_maxZ, 9999);
        html.css({zIndex: this.position.zIndex});
        ui.activeWindow = this;

        // Return the outer frame
        return html;
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Toggle advantage status
        html.find('.advantage-mode').click(event => {
            event.preventDefault();
            let field = $(event.currentTarget).siblings('input[type="hidden"]');
            let level = Number(field.val());
            let newLevel = (level === 1) ? -1 : level + 1;
            field.val(newLevel);
            for (const t of this.tokList) {
                t.adv = html.find(`input[name="adv-${t.id}"]`).val();
                this.mstList[t.id].adv = t.adv;
            };
            this.commitValues();
            this.render();
        });

        // Remove token from list
        html.find('.remove-token').click(event => {
            event.preventDefault();
            let field = $(event.currentTarget).siblings('input[type="hidden"]');
            let tokID = field.val();
            canvas.tokens.controlled.map(t => {
                if (t.id === tokID) t.release();
            });
            this.commitValues();
            this.render();
        });

        // Double click on a name to open the character sheet
        html.find(".grm-tbl-rows").on("dblclick", "div.grm-name-col", event => {
            const tokenId = event.currentTarget.getAttribute("value");
            const token = canvas.tokens.get(tokenId);
            token?.actor?.sheet?.render(true);
        });
    }

}

// Default Apps for DND 5e System
export class GroupSkillCheck extends GroupRollApp {

    constructor(object, options) {
        super(options);
        this.skillName = CONFIG._grouproll_module_skillcheck || "acr";
        this.abilityName = CONFIG._grouproll_module_skillability || "dex";
        this.flavor = (CONFIG.DND5E.skills[this.skillName].label || CONFIG.DND5E.skills[this.skillName]) + " (" + (CONFIG.DND5E.abilities[this.abilityName].label || CONFIG.DND5E.abilities[this.abilityName]) + ") Check";
        this.dc = "";
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = "group-skill-check";
        options.title = "Group Skill Check";
        options.template = "modules/grouproll/templates/group-skill-check.html";
        return options;
    }

    getData() {
        this.tokList = this.getTokenList(this.skillName, this.abilityName);
        let groupWins = (this.tokList.filter(t => t.nat === "grm-success").length / this.tokList.length) >= 0.5;
        this.groupRoll = trRollLib.midValue(this.tokList.map(t => t.roll.total));
        this.groupOutcome = "";
        this.groupCheckIcon = "";
        if (this.dc !== "" && !isNaN(this.dc)) {
            this.groupOutcome = groupWins ? "grm-success" : "grm-fumble";
            if (game.settings.get("grouproll", "passfail")) {
                this.groupCheckIcon = this.groupOutcome === "grm-success" ? "<i class='fas fa-check'></i>" : "<i class='fas fa-times'></i>";
            }
        }
        return {
            tok: this.tok2Show === "all" ? this.tokList : ( this.tok2Show === "pass" ? this.tokList.filter(t => t.nat === 'grm-success') : this.tokList.filter(t => t.nat === 'grm-fumble' && t.roll instanceof Roll) ),
            skl: this.skillName,
            abl: this.abilityName,
            skills: trRollLib.minSys('2.0.0') ? Object.fromEntries(Object.entries(CONFIG.DND5E.skills).map(([k,v]) => [k, v.label])) : CONFIG.DND5E.skills,
            abilities: trRollLib.minSys('2.2.0') ? Object.fromEntries(Object.entries(CONFIG.DND5E.abilities).map(([k,v]) => [k, v.label])) : CONFIG.DND5E.abilities,
            dc: this.dc,
            rollresult: this.groupRoll,
            rollgood: this.groupOutcome,
            rollicon: this.groupCheckIcon
        };
    }

    getTokenList(skillName, abilityName) {
        return canvas.tokens.controlled.map(t => {
            const dataPath = this.isV10 ? t.actor.system : t.actor.data.data;
            const flagPath = this.isV10 ? t.actor.flags : t.actor.data.flags;
            if (this.mstList[t.id] === undefined) this.mstList[t.id] = { adv: 0, bon: 0, roll: { total: "", result: "", terms: [{ total: 10 }] } };
            let m = this.mstList[t.id];
            let sklmod = dataPath.skills[skillName].total;
            let abilityDef = dataPath.skills[skillName].ability;
            if (abilityName !== abilityDef) sklmod = sklmod - dataPath.abilities[abilityDef].mod + dataPath.abilities[abilityName].mod;
            let tokRace = dataPath.details.race;
            let trtLuck = flagPath.dnd5e ? (flagPath.dnd5e.halflingLucky ? true : false) : false;
            let lucky = trtLuck ? true : (tokRace ? tokRace.toLowerCase().includes("halfling") : false);
            let advIcon = CONFIG._grouproll_module_advantageStatus[m.adv].icon;
            let advHover = CONFIG._grouproll_module_advantageStatus[m.adv].label;
            let natRoll = "";
            if (game.settings.get("grouproll", "critPassFail"))
                natRoll = m.roll.terms[0].total === 1 ? "grm-fumble" : (m.roll.terms[0].total === 20 ? "grm-success" : "");
            let checkIcon = "";
            if (this.dc !== "" && !isNaN(this.dc)) {
                if (natRoll === "") {
                    natRoll = m.roll.total >= this.dc ? "grm-success" : "grm-fumble";
                }
                if (game.settings.get("grouproll", "passfail")) {
                    checkIcon = natRoll === "grm-success" ? "<i class='fas fa-check'></i>" : "<i class='fas fa-times'></i>";
                }
            }
            return { id: t.id, name: t.name, adv: m.adv, icon: advIcon, hover: advHover, bon: m.bon, roll: m.roll, mod: sklmod, luck: lucky, nat: natRoll, chk: checkIcon };
        })
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Change skill or ability
        html.find('select').change(event => {
            let newSkill = html.find('[name="select-skill"]').val();
            let newAbility = html.find('[name="select-ability"]').val();
            if (this.skillName !== newSkill) {
                this.skillName = newSkill;
                this.abilityName = game.system.template.Actor.templates.creature.skills[this.skillName].ability;
            }
            else if (this.abilityName !== newAbility) this.abilityName = newAbility;
            CONFIG._grouproll_module_skillcheck = this.skillName;
            CONFIG._grouproll_module_skillability = this.abilityName;
            this.flavor = (CONFIG.DND5E.skills[this.skillName].label || CONFIG.DND5E.skills[this.skillName]) + " (" + (CONFIG.DND5E.abilities[this.abilityName].label || CONFIG.DND5E.abilities[this.abilityName]) + ") Check";
            this.commitValues();
            this.render();
        });

        // Change target DC
        html.find('input[name="input-dc"]').change(event => {
            let newDC = event.currentTarget.value;
            if (this.dc !== newDC) {
                this.dc = newDC;
            }
            this.commitValues();
            this.render();
        });
    }

}

export class GroupAbilityCheck extends GroupRollApp {

    constructor(object, options) {
        super(options);
        this.saveRoll = CONFIG._grouproll_module_saveroll ?? true;
        this.abilityName = CONFIG._grouproll_module_abilitycheck || "dex";
        this.flavor = (CONFIG.DND5E.abilities[this.abilityName].label || CONFIG.DND5E.abilities[this.abilityName]) + (this.saveRoll ? " Save" : " Check");
        this.dc = "";
        this.dmg = "";
        this.sortedEffects = [...CONFIG.statusEffects].sort((a, b) => {
            const labelA = game.i18n.localize(a.label);
            const labelB = game.i18n.localize(b.label);
            return labelA.localeCompare(labelB);
        });
        this.effect = this.sortedEffects[0].id;
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = "group-ability-check";
        options.title = "Group Saving Throw / Check";
        options.template = "modules/grouproll/templates/group-ability-check.html";
        return options;
    }

    getData() {
        this.tokList = this.getTokenList(this.saveRoll, this.abilityName);
        let groupWins = (this.tokList.filter(t => t.nat === "grm-success").length / this.tokList.length) >= 0.5;
        this.groupRoll = trRollLib.midValue(this.tokList.map(t => t.roll.total));
        this.groupOutcome = "";
        this.groupCheckIcon = "";
        if (this.dc !== "" && !isNaN(this.dc)) {
            this.groupOutcome = groupWins ? "grm-success" : "grm-fumble";
            if (game.settings.get("grouproll", "passfail")) {
                this.groupCheckIcon = this.groupOutcome === "grm-success" ? "<i class='fas fa-check'></i>" : "<i class='fas fa-times'></i>";
            }
        }
        return {
            tok: this.tok2Show === "all" ? this.tokList : ( this.tok2Show === "pass" ? this.tokList.filter(t => t.nat === 'grm-success') : this.tokList.filter(t => t.nat === 'grm-fumble' && t.roll instanceof Roll) ),
            sav: this.saveRoll,
            abl: this.abilityName,
            abilities: trRollLib.minSys('2.2.0') ? Object.fromEntries(Object.entries(CONFIG.DND5E.abilities).map(([k,v]) => [k, v.label])) : CONFIG.DND5E.abilities,
            dc: this.dc,
            rollresult: this.groupRoll,
            rollgood: this.groupOutcome,
            rollicon: this.groupCheckIcon,
            dmg: this.dmg,
            statusEffects: this.sortedEffects,
            effect: this.effect,
            ver10: trRollLib.minGen(10)
        };
    }

    getTokenList(saveRoll, abilityName) {
        return canvas.tokens.controlled.map(t => {
            const dataPath = this.isV10 ? t.actor.system : t.actor.data.data;
            const flagPath = this.isV10 ? t.actor.flags : t.actor.data.flags;
            if (this.mstList[t.id] === undefined) this.mstList[t.id] = { adv: 0, bon: 0, roll: { total: "", result: "", terms: [{ total: 10 }] } };
            let m = this.mstList[t.id];
            let ablmod = saveRoll ? dataPath.abilities[abilityName].save : dataPath.abilities[abilityName].mod;
            let tokRace = dataPath.details.race;
            let trtLuck = flagPath.dnd5e ? (flagPath.dnd5e.halflingLucky ? true : false) : false;
            let lucky = trtLuck ? true : (tokRace ? tokRace.toLowerCase().includes("halfling") : false);
            let advIcon = CONFIG._grouproll_module_advantageStatus[m.adv].icon;
            let advHover = CONFIG._grouproll_module_advantageStatus[m.adv].label;
            let natRoll = "";
            if (game.settings.get("grouproll", "critPassFail"))
                natRoll = m.roll.terms[0].total === 1 ? "grm-fumble" : (m.roll.terms[0].total === 20 ? "grm-success" : "");
            let checkIcon = "";
            if (this.dc !== "" && !isNaN(this.dc)) {
                if (natRoll === "") {
                    natRoll = m.roll.total >= this.dc ? "grm-success" : "grm-fumble";
                }
                if (game.settings.get("grouproll", "passfail")) {
                    checkIcon = natRoll === "grm-success" ? "<i class='fas fa-check'></i>" : "<i class='fas fa-times'></i>";
                }
            }
            return { id: t.id, name: t.name, adv: m.adv, icon: advIcon, hover: advHover, bon: m.bon, roll: m.roll, mod: ablmod, luck: lucky, nat: natRoll, chk: checkIcon };
        })
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Change ability
        html.find('select[name="select-ability"]').change(event => {
            let newAbility = event.currentTarget.value;
            if (this.abilityName !== newAbility) {
                this.abilityName = newAbility;
            }
            else if (this.abilityName !== newAbility) this.abilityName = newAbility;
            CONFIG._grouproll_module_abilitycheck = this.abilityName;
            CONFIG._grouproll_module_saveroll = this.saveRoll;
            this.flavor = (CONFIG.DND5E.abilities[this.abilityName].label || CONFIG.DND5E.abilities[this.abilityName]) + (this.saveRoll ? " Save" : " Check");
            this.commitValues();
            this.render();
        });

        // Toggle save roll
        html.find('input[type="checkbox"]').change(event => {
            this.saveRoll = event.target.checked;
            CONFIG._grouproll_module_saveroll = this.saveRoll;
            this.flavor = (CONFIG.DND5E.abilities[this.abilityName].label || CONFIG.DND5E.abilities[this.abilityName]) + (this.saveRoll ? " Save" : " Check");
            this.commitValues();
            this.render();
        });

        // Change target DC
        html.find('input[name="input-dc"]').change(event => {
            let newDC = event.currentTarget.value;
            if (this.dc !== newDC) {
                this.dc = newDC;
            }
            this.commitValues();
            this.render();
        });

        html.find('input[name="grm-dmg-input"]').keypress(event => {
            if (event.key === "Enter") {
                const value = this.element.find('input[name="grm-dmg-input"]').val();
                const multiplier = (value.startsWith("+") ? -1 : 1);
                this.applyDamage(multiplier);
            }
        });

        html.find("#grm-damage-buttons").on("click", "button.grm-dmg-button", event => {
            const multiplier = parseFloat(event.currentTarget.getAttribute("multiplier"));
            this.applyDamage(multiplier);
        });

        html.find('select[name="select-effect"]').change(event => {
            this.effect = event.currentTarget.value;
        });

        html.find("button.grm-effect-button").mousedown(event => {
            if ((event.which < 1) || (event.which > 3)) return;

            const active = !(event.shiftKey || (2 === event.which));
            const overlay = (3 === event.which);

            const effectData = CONFIG.statusEffects.find(e => e.id === this.effect);
            const tokens = (this.tok2Show === "all" ? this.tokList : ( this.tok2Show === "pass" ? this.tokList.filter(t => t.nat === 'grm-success') : this.tokList.filter(t => t.nat === 'grm-fumble' && t.roll instanceof Roll) ));

            const hasStatus = (actor, statusId) => {
                if (!isNewerVersion("11", game.version))
                    return actor.statuses.has(statusId);
                else
                    return actor.effects.some(e => e.getFlag("core", "statusId") === statusId);
            }

            for (const t of tokens) {
                const token = canvas.tokens.get(t.id);
                if (token) {
                    if (active !== hasStatus(token.actor,  effectData.id)) {
                        token.toggleEffect(effectData, { active, overlay });
                    }
                }
            }
        });
    }
}

// Apps for Pathfinder 2e System
export class GroupSkillCheckPF2E extends GroupRollApp {

    constructor(object, options) {
        super(options);
        // DEPRECATED for pf2e before v1.13
        let expandedSkills = Object.assign({ prc: "Perception" }, isNewerVersion('1.13', game.system.data.version) ? CONFIG.PF2E.skills : Object.fromEntries(Object.entries(CONFIG.PF2E.skills).map(([k, v]) => [k, game.i18n.localize(v)])));
        let allSorted = {};
        Object.keys(expandedSkills).sort().forEach(function (key) { allSorted[key] = expandedSkills[key]; });
        this.allSkills = allSorted;
        this.skillName = CONFIG._grouproll_module_skillcheck || "acr";
        this.abilityName = CONFIG._grouproll_module_skillability || "dex";
        // DEPRECATED for pf2e before v1.13
        this.flavor = this.allSkills[this.skillName] + " (" + (isNewerVersion('1.13', game.system.data.version) ? CONFIG.PF2E.abilities[this.abilityName] : game.i18n.localize(CONFIG.PF2E.abilities[this.abilityName])) + ") Check";
        // DEPRECATED for pf2e before v1.13
        this.skillTemplate = isNewerVersion('1.13', game.system.data.version)
            ? Object.assign({ prc: { value: 0, ability: "wis", armor: 0, rank: 0, item: 0, mod: 0, breakdown: "" } }, game.system.template.Actor.templates.common.skills)
            : Object.assign({ prc: { value: 0, ability: "wis", armor: 0, rank: 0, mod: 0 } }, game.system.template.Actor.character.skills);
        this.dc = "";
    }

    _getHeaderButtons() {
        let buttons = super._getHeaderButtons();
        buttons[4].label = "Skill DC";
        buttons[3].title = "Reset fortune, bonus, and roll values";
        return buttons
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.width = 600;
        options.id = "group-skill-check";
        options.title = "Group Skill Check";
        options.template = "modules/grouproll/templates/group-skill-check-pf2e.html";
        return options;
    }

    getData() {
        canvas.tokens.controlled.map(t => {
            if (t.actor.data.type === "npc") t.release();
        });
        this.tokList = this.getTokenList(this.skillName, this.abilityName);
        let groupWins = (this.tokList.filter(t => t.nat === "grm-success").length / this.tokList.length) >= 0.5;
        this.groupRoll = trRollLib.midValue(this.tokList.map(t => t.roll.total));
        this.groupOutcome = "";
        this.groupCheckIcon = "";
        if (this.dc !== "" && !isNaN(this.dc)) {
            this.groupOutcome = groupWins ? "grm-success" : "grm-fumble";
            if (game.settings.get("grouproll", "passfail")) {
                this.groupCheckIcon = this.groupOutcome === "grm-success" ? "<i class='fas fa-check'></i>" : "<i class='fas fa-times'></i>";
            }
        }
        return {
            tok: this.tok2Show === "all" ? this.tokList : ( this.tok2Show === "pass" ? this.tokList.filter(t => t.nat === 'grm-success') : this.tokList.filter(t => t.nat === 'grm-fumble' && t.roll instanceof Roll) ),
            skl: this.skillName,
            abl: this.abilityName,
            skills: this.allSkills,
            // DEPRECATED for pf2e before v1.13
            abilities: isNewerVersion('1.13', game.system.data.version) ? CONFIG.PF2E.abilities : Object.fromEntries(Object.entries(CONFIG.PF2E.abilities).map(([k, v]) => [k, game.i18n.localize(v)])),
            dc: this.dc,
            rollresult: this.groupRoll,
            rollgood: this.groupOutcome,
            rollicon: this.groupCheckIcon
        };
    }

    getTokenList(skillName, abilityName) {
        return canvas.tokens.controlled.map(t => {
            const dataPath = this.isV10 ? t.actor.system : t.actor.data.data;
            if (this.mstList[t.id] === undefined) this.mstList[t.id] = { adv: 0, bon: 0, roll: { total: "", result: "", terms: [{ total: 10 }] } };
            let m = this.mstList[t.id];
            let prcData = dataPath.attributes.perception;
            let tokenSkills = Object.assign({
                prc: {
                    value: prcData.value,
                    ability: prcData.ability,
                    armor: 0,
                    rank: prcData.rank,
                    item: prcData.item,
                    mod: dataPath.abilities[prcData.ability].mod,
                    breakdown: prcData.breakdown
                }
            }, dataPath.skills);
            let sklmod = tokenSkills[skillName].value;
            let abilityDef = tokenSkills[skillName].ability;
            if (abilityName !== abilityDef) sklmod = sklmod - dataPath.abilities[abilityDef].mod + dataPath.abilities[abilityName].mod;
            let lucky = false;
            let advIcon = CONFIG._grouproll_module_advantageStatus[m.adv].icon;
            let advHover = CONFIG._grouproll_module_advantageStatus[m.adv].label;
            let natRoll = "";
            if (game.settings.get("grouproll", "critPassFail"))
                natRoll = m.roll.terms[0].total === 1 ? "grm-fumble" : (m.roll.terms[0].total === 20 ? "grm-success" : "");
            let checkIcon = "";
            if (this.dc !== "" && !isNaN(this.dc)) {
                if (natRoll === "") {
                    natRoll = m.roll.total >= this.dc ? "grm-success" : "grm-fumble";
                }
                if (game.settings.get("grouproll", "passfail")) {
                    checkIcon = natRoll === "grm-success" ? "<i class='fas fa-check'></i>" : "<i class='fas fa-times'></i>";
                }
            }
            return { id: t.id, name: t.name, adv: m.adv, icon: advIcon, hover: advHover, bon: m.bon, roll: m.roll, mod: sklmod, luck: lucky, nat: natRoll, chk: checkIcon };
        })
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Change skill or ability
        html.find('select').change(event => {
            let newSkill = html.find('[name="select-skill"]').val();
            let newAbility = html.find('[name="select-ability"]').val();
            if (this.skillName !== newSkill) {
                this.skillName = newSkill;
                this.abilityName = this.skillTemplate[this.skillName].ability;
            }
            else if (this.abilityName !== newAbility) this.abilityName = newAbility;
            CONFIG._grouproll_module_skillcheck = this.skillName;
            CONFIG._grouproll_module_skillability = this.abilityName;
            // DEPRECATED for pf2e before v1.13
            this.flavor = this.allSkills[this.skillName] + " (" + (isNewerVersion('1.13', game.system.data.version) ? CONFIG.PF2E.abilities[this.abilityName] : game.i18n.localize(CONFIG.PF2E.abilities[this.abilityName])) + ") Check";
            this.commitValues();
            this.render();
        });

        // Change target DC
        html.find('input[name="input-dc"]').change(event => {
            let newDC = event.currentTarget.value;
            if (this.dc !== newDC) {
                this.dc = newDC;
            }
            this.commitValues();
            this.render();
        });
    }

}

export class GroupSavePF2E extends GroupRollApp {

    constructor(object, options) {
        super(options);
        this.abilityName = CONFIG._grouproll_module_abilitycheck || "fortitude";
        // DEPRECATED for pf2e before v1.13
        this.flavor = (isNewerVersion('1.13', game.system.data.version) ? CONFIG.PF2E.saves[this.abilityName] : game.i18n.localize(CONFIG.PF2E.saves[this.abilityName])) + " Save";
        this.dc = "";
    }

    _getHeaderButtons() {
        let buttons = super._getHeaderButtons();
        buttons[4].label = "Save DC";
        buttons[3].title = "Reset fortune, bonus, and roll values";
        return buttons
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.width = 600;
        options.id = "group-ability-check";
        options.title = "Group Saving Throw";
        options.template = "modules/grouproll/templates/group-ability-check-pf2e.html";
        return options;
    }

    getData() {
        this.tokList = this.getTokenList(this.abilityName);
        let groupWins = (this.tokList.filter(t => t.nat === "grm-success").length / this.tokList.length) >= 0.5;
        this.groupRoll = trRollLib.midValue(this.tokList.map(t => t.roll.total));
        this.groupOutcome = "";
        this.groupCheckIcon = "";
        if (this.dc !== "" && !isNaN(this.dc)) {
            this.groupOutcome = groupWins ? "grm-success" : "grm-fumble";
            if (game.settings.get("grouproll", "passfail")) {
                this.groupCheckIcon = this.groupOutcome === "grm-success" ? "<i class='fas fa-check'></i>" : "<i class='fas fa-times'></i>";
            }
        }
        return {
            tok: this.tok2Show === "all" ? this.tokList : ( this.tok2Show === "pass" ? this.tokList.filter(t => t.nat === 'grm-success') : this.tokList.filter(t => t.nat === 'grm-fumble' && t.roll instanceof Roll) ),
            abl: this.abilityName,
            // DEPRECATED for pf2e before v1.13
            abilities: isNewerVersion('1.13', game.system.data.version) ? CONFIG.PF2E.saves : Object.fromEntries(Object.entries(CONFIG.PF2E.saves).map(([k, v]) => [k, game.i18n.localize(v)])),
            dc: this.dc,
            rollresult: this.groupRoll,
            rollgood: this.groupOutcome,
            rollicon: this.groupCheckIcon
        };
    }

    getTokenList(abilityName) {
        return canvas.tokens.controlled.map(t => {
            const dataPath = this.isV10 ? t.actor.system : t.actor.data.data;
            if (this.mstList[t.id] === undefined) this.mstList[t.id] = { adv: 0, bon: 0, roll: { total: "", result: "", terms: [{ total: 10 }] } };
            let m = this.mstList[t.id];
            let ablmod = dataPath.saves[abilityName].value;
            let lucky = false;
            let advIcon = CONFIG._grouproll_module_advantageStatus[m.adv].icon;
            let advHover = CONFIG._grouproll_module_advantageStatus[m.adv].label;
            let natRoll = "";
            if (game.settings.get("grouproll", "critPassFail"))
                natRoll = m.roll.terms[0].total === 1 ? "grm-fumble" : (m.roll.terms[0].total === 20 ? "grm-success" : "");
            let checkIcon = "";
            if (this.dc !== "" && !isNaN(this.dc)) {
                if (natRoll === "") {
                    natRoll = m.roll.total >= this.dc ? "grm-success" : "grm-fumble";
                }
                if (game.settings.get("grouproll", "passfail")) {
                    checkIcon = natRoll === "grm-success" ? "<i class='fas fa-check'></i>" : "<i class='fas fa-times'></i>";
                }
            }
            return { id: t.id, name: t.name, adv: m.adv, icon: advIcon, hover: advHover, bon: m.bon, roll: m.roll, mod: ablmod, luck: lucky, nat: natRoll, chk: checkIcon };
        })
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Change ability
        html.find('select').change(event => {
            let newAbility = html.find('[name="select-ability"]').val();
            if (this.abilityName !== newAbility) {
                this.abilityName = newAbility;
            }
            else if (this.abilityName !== newAbility) this.abilityName = newAbility;
            CONFIG._grouproll_module_abilitycheck = this.abilityName;
            // DEPRECATED for pf2e before v1.13
            this.flavor = (isNewerVersion('1.13', game.system.data.version) ? CONFIG.PF2E.saves[this.abilityName] : game.i18n.localize(CONFIG.PF2E.saves[this.abilityName])) + " Save";
            this.commitValues();
            this.render();
        });

        // Change target DC
        html.find('input[name="input-dc"]').change(event => {
            let newDC = event.currentTarget.value;
            if (this.dc !== newDC) {
                this.dc = newDC;
            }
            this.commitValues();
            this.render();
        });
    }

}

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
        // Ensure the DC and bonus values from the form are committed to the object
        this.dc = this.element.find('input[name="input-dc"]').val();

        for (const t of this.tokList) {
            const value = this.element.find(`input[name="bon-${t.id}"]`).val();
            if (value)
                this.mstList[t.id].bon = t.bon = value;
        }
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
                title: "Select only tokens with successful rolls",
                icon: "fas fa-check",
                onclick: ev => {
                    this.tok2Show = this.tok2Show === "pass" ? "all" : "pass";
                    this.commitValues();
                    this.render();
                }
            },
            {
                label: "Fail",
                class: "grm-btn-fail",
                title: "Select only tokens with failed rolls",
                icon: "fas fa-times",
                onclick: ev => {
                    this.tok2Show = this.tok2Show === "fail" ? "all" : "fail";
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
                    this.commitValues();
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

    }

}

// Default Apps for DND 5e System
export class GroupSkillCheck extends GroupRollApp {

    constructor(object, options) {
        super(options);
        this.skillName = CONFIG._grouproll_module_skillcheck || "acr";
        this.abilityName = CONFIG._grouproll_module_skillability || "dex";
        this.flavor = (CONFIG.DND5E.skills[this.skillName].label || CONFIG.DND5E.skills[this.skillName]) + " (" + CONFIG.DND5E.abilities[this.abilityName] + ") Check";
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
            abilities: CONFIG.DND5E.abilities,
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
            let natRoll = m.roll.terms[0].total === 1 ? "grm-fumble" : (m.roll.terms[0].total === 20 ? "grm-success" : "");
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
            this.flavor = (CONFIG.DND5E.skills[this.skillName].label || CONFIG.DND5E.skills[this.skillName]) + " (" + CONFIG.DND5E.abilities[this.abilityName] + ") Check";
            this.commitValues();
            this.render();
        });

        // Change target DC
        html.find('.dc-value').change(event => {
            let newDC = html.find('input[name="input-dc"]').val();
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
        this.saveRoll = CONFIG._grouproll_module_saveroll || false;
        this.abilityName = CONFIG._grouproll_module_abilitycheck || "dex";
        this.flavor = CONFIG.DND5E.abilities[this.abilityName] + (this.saveRoll ? " Save" : " Check");
        this.dc = "";
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = "group-ability-check";
        options.title = "Group Ability Check";
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
            abilities: CONFIG.DND5E.abilities,
            dc: this.dc,
            rollresult: this.groupRoll,
            rollgood: this.groupOutcome,
            rollicon: this.groupCheckIcon
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
            let natRoll = m.roll.terms[0].total === 1 ? "grm-fumble" : (m.roll.terms[0].total === 20 ? "grm-success" : "");
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
            CONFIG._grouproll_module_saveroll = this.saveRoll;
            this.flavor = CONFIG.DND5E.abilities[this.abilityName] + (this.saveRoll ? " Save" : " Check");
            this.commitValues();
            this.render();
        });

        // Toggle save roll
        html.find('input[type="checkbox"]').change(event => {
            this.saveRoll = event.target.checked;
            CONFIG._grouproll_module_saveroll = this.saveRoll;
            this.flavor = CONFIG.DND5E.abilities[this.abilityName] + (this.saveRoll ? " Save" : " Check");
            this.commitValues();
            this.render();
        });

        // Change target DC
        html.find('.dc-value').change(event => {
            let newDC = html.find('input[name="input-dc"]').val();
            if (this.dc !== newDC) {
                this.dc = newDC;
            }
            this.commitValues();
            this.render();
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
            let natRoll = m.roll.terms[0].total === 1 ? "grm-fumble" : (m.roll.terms[0].total === 20 ? "grm-success" : "");
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
        html.find('.dc-value').change(event => {
            let newDC = html.find('input[name="input-dc"]').val();
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
            let natRoll = m.roll.terms[0].total === 1 ? "grm-fumble" : (m.roll.terms[0].total === 20 ? "grm-success" : "");
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
        html.find('.dc-value').change(event => {
            let newDC = html.find('input[name="input-dc"]').val();
            if (this.dc !== newDC) {
                this.dc = newDC;
            }
            this.commitValues();
            this.render();
        });
    }

}

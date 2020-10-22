// Advantage Types
CONFIG._grouproll_module_advantageStatus = {
  "-1": {
    "label": "Disadvantage",
    "icon": '<i class="fas fa-minus"></i>'
  },
  "0": {
    "label": "Normal",
    "icon": '<i class="far fa-circle"></i>'
  },
  "1": {
    "label": "Advantage",
    "icon": '<i class="fas fa-plus"></i>'
  }
};

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
    // Update dialog display on changes to token selection
    Hooks.on("controlToken", async (object, controlled) => {
      let x = await canvas.tokens.controlled;
      this.render();
    });
  }

  static get defaultOptions() {
    const options = super.defaultOptions;
    options.width = 550;
    options.height = "auto";
    options.resizable = false;
    return options;
  }

  doGroupCheck() {
    this.tokList = this.tokList.map(t => {
      t.roll = trRollLib.chkRoll(Number(t.adv), Number(t.bon), Number(t.mod), t.luck);
      this.mstList[t.id].roll = t.roll;
      return t;
    });
    this.render();
  }

  doPassiveCheck() {
    this.tokList = this.tokList.map(t => {
      t.roll = trRollLib.chkPassive(Number(t.adv), Number(t.bon), Number(t.mod));
      this.mstList[t.id].roll = t.roll;
      return t;
    });
    this.render();
  }

  async sendRollsToChat() {
    if(this.tokList.reduce((notready, t) => notready = (t.roll.dice && t.roll.dice.length > 0) ? notready : true, false)) return;
    // XXX: d.rolls and r.roll deprecated
    let tokRolls = ""
    if (isNewerVersion('0.7.0', game.data.version)) {
      tokRolls = this.tokList.map(t => {
        let d = t.roll.dice[0];
        return {
          name: t.name,
          total: t.roll.total,
          formula: t.roll.result,
          faces: d.faces,
          nat: t.nat,
          chk: t.chk,
          rolls: d.rolls.map(r => {
            return {
              result: r.roll,
              classes: [
                "d20",
                r.rerolled ? "rerolled" : null,
                r.exploded ? "exploded" : null,
                r.discarded ? "discarded": null,
                (r.roll === 1) ? "min" : null,
                (r.roll === 20) ? "max" : null
              ].filter(c => c).join(" ")
            }
          })
        };
      });
    } else {
      tokRolls = this.tokList.map(t => {
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
                r.discarded ? "discarded": null,
                (r.result === 1) ? "min" : null,
                (r.result === 20) ? "max" : null
              ].filter(c => c).join(" ")
            }
          })
        };
      });
    }
    let tooltip = await renderTemplate("modules/grouproll/templates/group-chat-tooltip.html",{
      tok: tokRolls
    });
    let content = await renderTemplate("modules/grouproll/templates/group-chat-roll.html", {
      flavor: this.flavor,
      total: this.groupRoll,
      groupoutcome: this.groupOutcome,
      groupcheck: this.groupCheckIcon,
      tooltip: tooltip
    });
    let chatData = {
			user: game.user._id,
			content: content,
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
          // XXX: isPC deprecated
          if (isNewerVersion('0.7.2', game.data.version)) {
            canvas.tokens.ownedTokens.filter(t => t.actor && t.actor.isPC).map(t => t.control({updateSight: true, releaseOthers: false}));
          } else {
            canvas.tokens.ownedTokens.filter(t => t.actor && t.actor.hasPlayerOwner).map(t => t.control({updateSight: true, releaseOthers: false}));
          }
          this.render();
        }
      },
      {
        label: "Pass",
        class: "grm-btn-pass",
        title: "Select only tokens with successful rolls",
        icon: "fas fa-check",
        onclick: ev => {
          this.tokList.filter(t => t.nat !== 'grm-success').map(t => canvas.tokens.get(t.id).release());
          this.render();
        }
      },
      {
        label: "Fail",
        class: "grm-btn-fail",
        title: "Select only tokens with failed rolls",
        icon: "fas fa-times",
        onclick: ev => {
          this.tokList.filter(t => (t.nat !== 'grm-fumble') || !(t.roll instanceof Roll)).map(t => canvas.tokens.get(t.id).release());
          this.render();
        }
      },
      {
        label: "Reset",
        class: "grm-btn-reset",
        title: "Reset advantage, bonus, and roll values",
        icon: "fas fa-undo",
        onclick: ev => {
          // XXX: Roll.parts deprecated
          if (isNewerVersion('0.7.0', game.data.version)) {
            canvas.tokens.ownedTokens.map(t => this.mstList[t.id] = {adv: 0, bon: 0, roll: {total: "", result: "", parts: [{total: 10}]}});
          } else {
            canvas.tokens.ownedTokens.map(t => this.mstList[t.id] = {adv: 0, bon: 0, roll: {total: "", result: "", terms: [{total: 10}]}});
          }
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
        title: "Roll for all selected tokens\nShift: Output rolls to chat\nCtrl: Keep same rolls",
        icon: "fas fa-dice-d20",
        onclick: ev => {
          if (!ev.ctrlKey) this.doGroupCheck();
          if (ev.shiftKey) this.sendRollsToChat();
        }
      }
    ].concat(buttons);
    return buttons
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Change roll bonus
    html.find('.bonus-value').change(event => {
      this.tokList = this.tokList.map(t => {
        t.bon = html.find('input[name="bon-' + t.id + '"]').val();
        this.mstList[t.id].bon = t.bon;
        return t;
      });
      this.render();
    });

    // Toggle advantage status
    html.find('.advantage-mode').click(event => {
      event.preventDefault();
      let field = $(event.currentTarget).siblings('input[type="hidden"]');
      let level = Number(field.val());
      let newLevel = ( level === 1 ) ? -1 : level + 1;
      field.val(newLevel);
      this.tokList = this.tokList.map(t => {
        t.adv = html.find('input[name="adv-' + t.id + '"]').val();
        this.mstList[t.id].adv = t.adv;
        return t;
      });
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
      this.render();
    });

  }

}

// Default Apps for DND 5e System
class GroupSkillCheck extends GroupRollApp {

  constructor(object, options) {
    super(options);
    this.skillName = CONFIG._grouproll_module_skillcheck || "acr";
    this.abilityName = CONFIG._grouproll_module_skillability || "dex";
    this.flavor = CONFIG.DND5E.skills[this.skillName] + " (" + CONFIG.DND5E.abilities[this.abilityName] + ") Check";
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
      tok: this.tokList,
      skl: this.skillName,
      abl: this.abilityName,
      skills: CONFIG.DND5E.skills,
      abilities: CONFIG.DND5E.abilities,
      dc: this.dc,
      rollresult: this.groupRoll,
      rollgood: this.groupOutcome,
      rollicon: this.groupCheckIcon 
    };
  }

  getTokenList(skillName, abilityName) {
    return canvas.tokens.controlled.map(t => {
      if (this.mstList[t.id] === undefined) {
        // XXX: Roll.parts deprecated
        if (isNewerVersion('0.7.0', game.data.version)) {
          this.mstList[t.id] = {adv: 0, bon: 0, roll: {total: "", result: "", parts: [{total: 10}]}};
        } else {
          this.mstList[t.id] = {adv: 0, bon: 0, roll: {total: "", result: "", terms: [{total: 10}]}};
        }
      }
      let m = this.mstList[t.id];
      let sklmod = t.actor.data.data.skills[skillName].total;
      let abilityDef = t.actor.data.data.skills[skillName].ability;
      if ( abilityName !== abilityDef ) sklmod = sklmod - t.actor.data.data.abilities[abilityDef].mod + t.actor.data.data.abilities[abilityName].mod;
      let tokRace = t.actor.data.data.details.race;
      let trtLuck = t.actor.data.flags.dnd5e ? (t.actor.data.flags.dnd5e.halflingLucky ? true : false) : false;
      let lucky = trtLuck ? true : (tokRace ? tokRace.toLowerCase().includes("halfling") : false);
      let advIcon = CONFIG._grouproll_module_advantageStatus[m.adv].icon;
      let advHover = CONFIG._grouproll_module_advantageStatus[m.adv].label;
      // XXX: Roll.parts deprecated
      let natRoll = ""
      if (isNewerVersion('0.7.0', game.data.version)) {
        natRoll = m.roll.parts[0].total === 1 ? "grm-fumble" : (m.roll.parts[0].total === 20 ? "grm-success" : "");
      } else {
        natRoll = m.roll.terms[0].total === 1 ? "grm-fumble" : (m.roll.terms[0].total === 20 ? "grm-success" : "");
      }
      let checkIcon = "";
      if (this.dc !== "" && !isNaN(this.dc)) {
        if (natRoll === "") {
          natRoll = m.roll.total >= this.dc ? "grm-success" : "grm-fumble";
        }
        if (game.settings.get("grouproll", "passfail")) {
          checkIcon = natRoll === "grm-success" ? "<i class='fas fa-check'></i>" : "<i class='fas fa-times'></i>";
        }
      }
      return {id: t.id, name: t.name, adv: m.adv, icon: advIcon, hover: advHover, bon: m.bon, roll: m.roll, mod: sklmod, luck: lucky, nat: natRoll, chk: checkIcon};
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
        // DEPRECATED: for dnd5e before v0.94
        if (isNewerVersion('0.94', game.system.data.version)) this.abilityName = game.system.template.Actor.templates.common.skills[this.skillName].ability;
        else this.abilityName = game.system.template.Actor.templates.creature.skills[this.skillName].ability;
      }
      else if (this.abilityName !== newAbility) this.abilityName = newAbility;
      CONFIG._grouproll_module_skillcheck = this.skillName;
      CONFIG._grouproll_module_skillability = this.abilityName;
      this.flavor = CONFIG.DND5E.skills[this.skillName] + " (" + CONFIG.DND5E.abilities[this.abilityName] + ") Check";
      this.render();
    });

    // Change target DC
    html.find('.dc-value').change(event => {
      let newDC = html.find('input[name="input-dc"]').val();
      if (this.dc !== newDC) {
        this.dc = newDC;
      }
      this.render();
    });
  }

}

class GroupAbilityCheck extends GroupRollApp {

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
      tok: this.tokList,
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
      if (this.mstList[t.id] === undefined) {
        // XXX: Roll.parts deprecated
        if (isNewerVersion('0.7.0', game.data.version)) {
          this.mstList[t.id] = {adv: 0, bon: 0, roll: {total: "", result: "", parts: [{total: 10}]}};
        } else {
          this.mstList[t.id] = {adv: 0, bon: 0, roll: {total: "", result: "", terms: [{total: 10}]}};
        }
      }
      let m = this.mstList[t.id];
      let ablmod = saveRoll ? t.actor.data.data.abilities[abilityName].save : t.actor.data.data.abilities[abilityName].mod;
      let tokRace = t.actor.data.data.details.race;
      let trtLuck = t.actor.data.flags.dnd5e ? (t.actor.data.flags.dnd5e.halflingLucky ? true : false) : false;
      let lucky = trtLuck ? true : (tokRace ? tokRace.toLowerCase().includes("halfling") : false);
      let advIcon = CONFIG._grouproll_module_advantageStatus[m.adv].icon;
      let advHover = CONFIG._grouproll_module_advantageStatus[m.adv].label;
      // XXX: Roll.parts deprecated
      let natRoll = ""
      if (isNewerVersion('0.7.0', game.data.version)) {
        natRoll = m.roll.parts[0].total === 1 ? "grm-fumble" : (m.roll.parts[0].total === 20 ? "grm-success" : "");
      } else {
        natRoll = m.roll.terms[0].total === 1 ? "grm-fumble" : (m.roll.terms[0].total === 20 ? "grm-success" : "");
      }
      let checkIcon = "";
      if (this.dc !== "" && !isNaN(this.dc)) {
        if (natRoll === "") {
          natRoll = m.roll.total >= this.dc ? "grm-success" : "grm-fumble";
        }
        if (game.settings.get("grouproll", "passfail")) {
          checkIcon = natRoll === "grm-success" ? "<i class='fas fa-check'></i>" : "<i class='fas fa-times'></i>";
        }
      }
      return {id: t.id, name: t.name, adv: m.adv, icon: advIcon, hover: advHover, bon: m.bon, roll: m.roll, mod: ablmod, luck: lucky, nat: natRoll, chk: checkIcon};
    })
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Change ability
    html.find('select').change(event => {
      let newAbility = html.find('[name="select-ability"]').val();
      if (this.abilityName !== newAbility) {
        this.abilityName = newAbility;
        this.saveRoll = false;
      }
      else if (this.abilityName !== newAbility) this.abilityName = newAbility;
      CONFIG._grouproll_module_abilitycheck = this.abilityName;
      CONFIG._grouproll_module_saveroll = this.saveRoll;
      this.flavor = CONFIG.DND5E.abilities[this.abilityName] + (this.saveRoll ? " Save" : " Check");
      this.render();
    });

    // Toggle save roll
    html.find('input[type="checkbox"]').change(event => {
      this.saveRoll = event.target.checked;
      CONFIG._grouproll_module_saveroll = this.saveRoll;
      this.flavor = CONFIG.DND5E.abilities[this.abilityName] + (this.saveRoll ? " Save" : " Check");
      this.render();
    });

    // Change target DC
    html.find('.dc-value').change(event => {
      let newDC = html.find('input[name="input-dc"]').val();
      if (this.dc !== newDC) {
        this.dc = newDC;
      }
      this.render();
    });
  }

}

// Apps for Pathfinder 2e System
class GroupSkillCheckPF2E extends GroupRollApp {

  constructor(object, options) {
    super(options);
    let expandedSkills = Object.assign({prc: "Perception"}, CONFIG.PF2E.skills);
    let allSorted = {};
    Object.keys(expandedSkills).sort().forEach(function(key) { allSorted[key] = expandedSkills[key]; });
    this.allSkills = allSorted;
    this.skillName = CONFIG._grouproll_module_skillcheck || "acr";
    this.abilityName = CONFIG._grouproll_module_skillability || "dex";
    this.flavor = this.allSkills[this.skillName] + " (" + CONFIG.PF2E.abilities[this.abilityName] + ") Check";
    this.skillTemplate = Object.assign({prc: {value: 0, ability: "wis", armor: 0, rank: 0, item: 0, mod: 0, breakdown: ""}}, game.system.template.Actor.templates.common.skills);
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
      tok: this.tokList,
      skl: this.skillName,
      abl: this.abilityName,
      skills: this.allSkills,
      abilities: CONFIG.PF2E.abilities,
      dc: this.dc,
      rollresult: this.groupRoll,
      rollgood: this.groupOutcome,
      rollicon: this.groupCheckIcon
    };
  }

  getTokenList(skillName, abilityName) {
    return canvas.tokens.controlled.map(t => {
      if (this.mstList[t.id] === undefined) {
        // XXX: Roll.parts deprecated
        if (isNewerVersion('0.7.0', game.data.version)) {
          this.mstList[t.id] = {adv: 0, bon: 0, roll: {total: "", result: "", parts: [{total: 10}]}};
        } else {
          this.mstList[t.id] = {adv: 0, bon: 0, roll: {total: "", result: "", terms: [{total: 10}]}};
        }
      }
      let m = this.mstList[t.id];
      let prcData = t.actor.data.data.attributes.perception;
      let tokenSkills = Object.assign({prc: {
        value: prcData.value,
        ability: prcData.ability,
        armor: 0,
        rank: prcData.rank,
        item: prcData.item,
        mod: t.actor.data.data.abilities[prcData.ability].mod,
        breakdown: prcData.breakdown
      }}, t.actor.data.data.skills);
      let sklmod = tokenSkills[skillName].value;
      let abilityDef = tokenSkills[skillName].ability;
      if ( abilityName !== abilityDef ) sklmod = sklmod - t.actor.data.data.abilities[abilityDef].mod + t.actor.data.data.abilities[abilityName].mod;
      let lucky = false;
      let advIcon = CONFIG._grouproll_module_advantageStatus[m.adv].icon;
      let advHover = CONFIG._grouproll_module_advantageStatus[m.adv].label;
      // XXX: Roll.parts deprecated
      let natRoll = ""
      if (isNewerVersion('0.7.0', game.data.version)) {
        natRoll = m.roll.parts[0].total === 1 ? "grm-fumble" : (m.roll.parts[0].total === 20 ? "grm-success" : "");
      } else {
        natRoll = m.roll.terms[0].total === 1 ? "grm-fumble" : (m.roll.terms[0].total === 20 ? "grm-success" : "");
      }
      let checkIcon = "";
      if (this.dc !== "" && !isNaN(this.dc)) {
        if (natRoll === "") {
          natRoll = m.roll.total >= this.dc ? "grm-success" : "grm-fumble";
        }
        if (game.settings.get("grouproll", "passfail")) {
          checkIcon = natRoll === "grm-success" ? "<i class='fas fa-check'></i>" : "<i class='fas fa-times'></i>";
        }
      }
      return {id: t.id, name: t.name, adv: m.adv, icon: advIcon, hover: advHover, bon: m.bon, roll: m.roll, mod: sklmod, luck: lucky, nat: natRoll, chk: checkIcon};
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
      this.flavor = this.allSkills[this.skillName] + " (" + CONFIG.PF2E.abilities[this.abilityName] + ") Check";
      this.render();
    });

    // Change target DC
    html.find('.dc-value').change(event => {
      let newDC = html.find('input[name="input-dc"]').val();
      if (this.dc !== newDC) {
        this.dc = newDC;
      }
      this.render();
    });
  }

}

class GroupSavePF2E extends GroupRollApp {

  constructor(object, options) {
    super(options);
    this.abilityName = CONFIG._grouproll_module_abilitycheck || "fortitude";
    this.flavor = CONFIG.PF2E.saves[this.abilityName] + " Save";
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
      tok: this.tokList,
      abl: this.abilityName,
      abilities: CONFIG.PF2E.saves,
      dc: this.dc,
      rollresult: this.groupRoll,
      rollgood: this.groupOutcome,
      rollicon: this.groupCheckIcon
    };
  }

  getTokenList(abilityName) {
    return canvas.tokens.controlled.map(t => {
      if (this.mstList[t.id] === undefined) {
        // XXX: Roll.parts deprecated
        if (isNewerVersion('0.7.0', game.data.version)) {
          this.mstList[t.id] = {adv: 0, bon: 0, roll: {total: "", result: "", parts: [{total: 10}]}};
        } else {
          this.mstList[t.id] = {adv: 0, bon: 0, roll: {total: "", result: "", terms: [{total: 10}]}};
        }
      }
      let m = this.mstList[t.id];
      let ablmod = t.actor.data.data.saves[abilityName].value;
      let lucky = false;
      let advIcon = CONFIG._grouproll_module_advantageStatus[m.adv].icon;
      let advHover = CONFIG._grouproll_module_advantageStatus[m.adv].label;
      // XXX: Roll.parts deprecated
      let natRoll = ""
      if (isNewerVersion('0.7.0', game.data.version)) {
        natRoll = m.roll.parts[0].total === 1 ? "grm-fumble" : (m.roll.parts[0].total === 20 ? "grm-success" : "");
      } else {
        natRoll = m.roll.terms[0].total === 1 ? "grm-fumble" : (m.roll.terms[0].total === 20 ? "grm-success" : "");
      }
      let checkIcon = "";
      if (this.dc !== "" && !isNaN(this.dc)) {
        if (natRoll === "") {
          natRoll = m.roll.total >= this.dc ? "grm-success" : "grm-fumble";
        }
        if (game.settings.get("grouproll", "passfail")) {
          checkIcon = natRoll === "grm-success" ? "<i class='fas fa-check'></i>" : "<i class='fas fa-times'></i>";
        }
      }
      return {id: t.id, name: t.name, adv: m.adv, icon: advIcon, hover: advHover, bon: m.bon, roll: m.roll, mod: ablmod, luck: lucky, nat: natRoll, chk: checkIcon};
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
      this.flavor = CONFIG.PF2E.saves[this.abilityName] + " Save";
      this.render();
    });

    // Change target DC
    html.find('.dc-value').change(event => {
      let newDC = html.find('input[name="input-dc"]').val();
      if (this.dc !== newDC) {
        this.dc = newDC;
      }
      this.render();
    });
  }

}

Hooks.once("ready", function() {
  if (game.system.id === "pf2e") {
    CONFIG._grouproll_module_advantageStatus[1].label = "Fortune";
    CONFIG._grouproll_module_advantageStatus[-1].label = "Misfortune";
  };
});

Hooks.on('getSceneControlButtons', controls => {
  controls[0].tools.push(
    {
      name: "skill",
      title: "Group Skill Check",
      icon: "fas fa-user-check",
      visible: game.user.isGM,
      onClick: () => {
        controls[0].activeTool = "select";
        if (game.system.id === "pf2e") return new GroupSkillCheckPF2E().render(true);
        else return new GroupSkillCheck().render(true);
      }
    },
    {
      name: "ability",
      title: game.system.id === "pf2e" ? "Group Saving Throw" : "Group Ability Check",
      icon: "fas fa-user-shield",
      visible: game.user.isGM,
      onClick: () => {
        controls[0].activeTool = "select";
        if (game.system.id === "pf2e") return new GroupSavePF2E().render(true);
        else return new GroupAbilityCheck().render(true);
      }
    }
  );
});

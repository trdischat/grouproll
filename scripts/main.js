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
    // Update dialog display on changes to token selection
    Hooks.on("controlToken", async (object, controlled) => {
      let x = await canvas.tokens.controlledTokens;
      this.render();
    });
  }

  static get defaultOptions() {
    const options = super.defaultOptions;
    options.width = 500;
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
    let tResults = this.tokList.map(t => t.roll.total);
    this.groupRoll = trRollLib.midValue(tResults);
    this.render();
  }

  doPassiveCheck() {
    this.tokList = this.tokList.map(t => {
      t.roll = trRollLib.chkPassive(Number(t.adv), Number(t.bon), Number(t.mod));
      this.mstList[t.id].roll = t.roll;
      return t;
    });
    let tResults = this.tokList.map(t => t.roll.total);
    this.groupRoll = trRollLib.midValue(tResults);
    this.render();
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
          canvas.tokens.ownedTokens.filter(t => t.actor && t.actor.isPC).map(t => t.control({updateSight: true, releaseOthers: false}));
          this.render();
        }
      },
      {
        label: "Reset",
        class: "grm-btn-reset",
        title: "Reset advantage, bonus, and roll values",
        icon: "fas fa-undo",
        onclick: ev => {
          canvas.tokens.ownedTokens.map(t => this.mstList[t.id] = {adv: 0, bon: 0, roll: {total: "", result: "", parts: [{total: 10}]}});
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
        title: "Roll for all selected tokens",
        icon: "fas fa-dice-d20",
        onclick: ev => this.doGroupCheck()
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
  }

}

// Default Apps for DND 5e System
class GroupSkillCheck extends GroupRollApp {

  constructor(object, options) {
    super(options);
    this.skillName = CONFIG._grouproll_module_skillcheck || "acr";
    this.abilityName = CONFIG._grouproll_module_skillability || "dex";
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
    return {
      tok: this.tokList,
      skl: this.skillName,
      abl: this.abilityName,
      skills: CONFIG.DND5E.skills,
      abilities: CONFIG.DND5E.abilities,
      rollresult: this.groupRoll
    };
  }

  getTokenList(skillName, abilityName) {
    return canvas.tokens.controlledTokens.map(t => {
      if (this.mstList[t.id] === undefined) {
        this.mstList[t.id] = {adv: 0, bon: 0, roll: {total: "", result: "", parts: [{total: 10}]}};
      }
      let m = this.mstList[t.id];
      let sklmod = t.actor.data.data.skills[skillName].mod;
      let abilityDef = t.actor.data.data.skills[skillName].ability;
      if ( abilityName !== abilityDef ) sklmod = sklmod - t.actor.data.data.abilities[abilityDef].mod + t.actor.data.data.abilities[abilityName].mod;
      let tokRace = t.actor.data.data.details.race;
      let trtLuck = t.actor.data.flags.dnd5e ? (t.actor.data.flags.dnd5e.halflingLucky ? true : false) : false;
      let lucky = trtLuck ? true : (tokRace ? tokRace.toLowerCase().includes("halfling") : false);
      let advIcon = CONFIG._grouproll_module_advantageStatus[m.adv].icon;
      let advHover = CONFIG._grouproll_module_advantageStatus[m.adv].label;
      let natRoll = m.roll.parts[0].total === 1 ? "grm-fumble" : (m.roll.parts[0].total === 20 ? "grm-success" : "");
      return {id: t.id, name: t.name, adv: m.adv, icon: advIcon, hover: advHover, bon: m.bon, roll: m.roll, mod: sklmod, luck: lucky, nat: natRoll};
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
        this.abilityName = game.system.template.Actor.templates.common.skills[this.skillName].ability;
      }
      else if (this.abilityName !== newAbility) this.abilityName = newAbility;
      CONFIG._grouproll_module_skillcheck = this.skillName;
      CONFIG._grouproll_module_skillability = this.abilityName;
      this.render();
    });
  }

}

class GroupAbilityCheck extends GroupRollApp {

  constructor(object, options) {
    super(options);
    this.saveRoll = CONFIG._grouproll_module_saveroll || false;
    this.abilityName = CONFIG._grouproll_module_abilitycheck || "dex";
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
    return {
      tok: this.tokList,
      sav: this.saveRoll,
      abl: this.abilityName,
      abilities: CONFIG.DND5E.abilities,
      rollresult: this.groupRoll
    };
  }

  getTokenList(saveRoll, abilityName) {
    return canvas.tokens.controlledTokens.map(t => {
      if (this.mstList[t.id] === undefined) {
        this.mstList[t.id] = {adv: 0, bon: 0, roll: {total: "", result: "", parts: [{total: 10}]}};
      }
      let m = this.mstList[t.id];
      let ablmod = saveRoll ? t.actor.data.data.abilities[abilityName].save : t.actor.data.data.abilities[abilityName].mod;
      let tokRace = t.actor.data.data.details.race;
      let trtLuck = t.actor.data.flags.dnd5e ? (t.actor.data.flags.dnd5e.halflingLucky ? true : false) : false;
      let lucky = trtLuck ? true : (tokRace ? tokRace.toLowerCase().includes("halfling") : false);
      let advIcon = CONFIG._grouproll_module_advantageStatus[m.adv].icon;
      let advHover = CONFIG._grouproll_module_advantageStatus[m.adv].label;
      let natRoll = m.roll.parts[0].total === 1 ? "grm-fumble" : (m.roll.parts[0].total === 20 ? "grm-success" : "");
      return {id: t.id, name: t.name, adv: m.adv, icon: advIcon, hover: advHover, bon: m.bon, roll: m.roll, mod: ablmod, luck: lucky, nat: natRoll};
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
      this.render();
    });

    // Toggle save roll
    html.find('input[type="checkbox"]').change(event => {
      this.saveRoll = event.target.checked;
      CONFIG._grouproll_module_saveroll = this.saveRoll;
      this.render();
    });
  }

}

// Apps for Pathfinder 2e System
class GroupSkillCheckPF2E extends GroupRollApp {

  constructor(object, options) {
    super(options);
    this.skillName = CONFIG._grouproll_module_skillcheck || "acr";
    this.abilityName = CONFIG._grouproll_module_skillability || "dex";
    this.skillTemplate = Object.assign({prc: {value: 0, ability: "wis", armor: 0, rank: 0, item: 0, mod: 0, breakdown: ""}}, game.system.template.Actor.templates.common.skills);
  }

  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();
    buttons[1].label = "Skill DC";
    buttons[1].title = "Reset fortune, bonus, and roll values";
    return buttons
  }

  static get defaultOptions() {
    const options = super.defaultOptions;
    options.id = "group-skill-check";
    options.title = "Group Skill Check";
    options.template = "modules/grouproll/templates/group-skill-check-pf2e.html";
    return options;
  }

  getData() {
    this.tokList = this.getTokenList(this.skillName, this.abilityName);
    let allSkills = Object.assign({prc: "Perception"}, CONFIG.PF2E.skills);
    let allSorted = {};
    Object.keys(allSkills).sort().forEach(function(key) { allSorted[key] = allSkills[key]; });
    return {
      tok: this.tokList,
      skl: this.skillName,
      abl: this.abilityName,
      skills: allSorted,
      abilities: CONFIG.PF2E.abilities,
      rollresult: this.groupRoll
    };
  }

  getTokenList(skillName, abilityName) {
    return canvas.tokens.controlledTokens.map(t => {
      if (this.mstList[t.id] === undefined) {
        this.mstList[t.id] = {adv: 0, bon: 0, roll: {total: "", result: "", parts: [{total: 10}]}};
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
      let natRoll = m.roll.parts[0].total === 1 ? "grm-fumble" : (m.roll.parts[0].total === 20 ? "grm-success" : "");
      return {id: t.id, name: t.name, adv: m.adv, icon: advIcon, hover: advHover, bon: m.bon, roll: m.roll, mod: sklmod, luck: lucky, nat: natRoll};
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
      this.render();
    });
  }

}

class GroupSavePF2E extends GroupRollApp {

  constructor(object, options) {
    super(options);
    this.abilityName = CONFIG._grouproll_module_abilitycheck || "fortitude";
  }

  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();
    buttons[1].label = "Save DC";
    return buttons
  }

	static get defaultOptions() {
	  const options = super.defaultOptions;
	  options.id = "group-ability-check";
	  options.title = "Group Saving Throw";
	  options.template = "modules/grouproll/templates/group-ability-check-pf2e.html";
	  return options;
  }

  getData() {
    this.tokList = this.getTokenList(this.abilityName);
    return {
      tok: this.tokList,
      abl: this.abilityName,
      abilities: CONFIG.PF2E.saves,
      rollresult: this.groupRoll
    };
  }

  getTokenList(abilityName) {
    return canvas.tokens.controlledTokens.map(t => {
      if (this.mstList[t.id] === undefined) {
        this.mstList[t.id] = {adv: 0, bon: 0, roll: {total: "", result: "", parts: [{total: 10}]}};
      }
      let m = this.mstList[t.id];
      let ablmod = t.actor.data.data.saves[abilityName].value;
      let lucky = false;
      let advIcon = CONFIG._grouproll_module_advantageStatus[m.adv].icon;
      let advHover = CONFIG._grouproll_module_advantageStatus[m.adv].label;
      let natRoll = m.roll.parts[0].total === 1 ? "grm-fumble" : (m.roll.parts[0].total === 20 ? "grm-success" : "");
      return {id: t.id, name: t.name, adv: m.adv, icon: advIcon, hover: advHover, bon: m.bon, roll: m.roll, mod: ablmod, luck: lucky, nat: natRoll};
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

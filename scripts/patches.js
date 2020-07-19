class trdisGRpatch {

  /* Allow limit on number of dice to reroll (e.g., a halfing rolling an attack 
   * with advantage would use '2d20r1=1kh' to roll two d20, reroll on a 1, but
   * only on one die, then keep the highest roll).
   */
  static halflingLuckPatch() {
    let newClass = Die;
    newClass = trPatchLib.patchMethod(newClass, "reroll", 0,
      `reroll(targets) {`,
      `reroll(targets, maxrerolls = 999) {`);
    if (!newClass) return;
    newClass = trPatchLib.patchMethod(newClass, "reroll", 6,
      `else if ( targets.includes(r.roll) ) return r.rerolled = true;`,
      `else if ( targets.includes(r.roll) && maxrerolls > 0 ) { maxrerolls--; return r.rerolled = true; }`);
    if (!newClass) return;
    Die.prototype.reroll = newClass.prototype.reroll;
    newClass = trPatchLib.patchMethod(newClass, "_applyReroll", 15,
      `this.reroll(target);`,
      `this.reroll(target, rr[3]);`);
    if (!newClass) return;
    Die.prototype._applyReroll = newClass.prototype._applyReroll;
    newClass.rgx = Die.rgx;
    newClass.rgx.reroll = /r(<=|>=|<|>)?([0-9]+)?(?:=([0-9]+))?/;
    Die.rgx = newClass.rgx;
  }

  /* Substitute "average" d20 roll for standard d20 ability and skill rolls.
   * Average of two d20 approximated using 2d10+1-1d2.
   */
  static v89_averageD20Patch() {
    let newFunc = trPatchLib.patchFunction(game.dnd5e.Dice5e.d20Roll, 52,
      `let roll = new Roll(parts.join(" + "), data).roll();`,
      `let roll = new Roll(parts.join(" + "), data).roll();
      if (!(flavor.includes("Attack Roll") || adv !== 0)) trRollLib.avgD20roll(roll);`);
    if (!newFunc) return;
    game.dnd5e.Dice5e.d20Roll = newFunc;
  }  

  static averageD20Patch() {
    let newFunc = trPatchLib.patchFunction(game.dnd5e.dice.d20Roll, 54,
      `let roll = new Roll(parts.join(" + "), data).roll();`,
      `let roll = new Roll(parts.join(" + "), data).roll();
      if (!(flavor.includes("Attack Roll") || adv !== 0)) trRollLib.avgD20roll(roll);`);
    if (!newFunc) return;
    trRollLib.MyD20Roll = newFunc;
  }  

  static checkRollsPatch() {
    let newClass = game.dnd5e.entities.Actor5e;
    newClass = trPatchLib.patchMethod(newClass, "rollSkill", 24,
    `return d20Roll(mergeObject(options, {`,
    `return trRollLib.MyD20Roll(mergeObject(options, {`);
    if (!newClass) return;
    game.dnd5e.entities.Actor5e.prototype.rollSkill = newClass.prototype.rollSkill;
    newClass = trPatchLib.patchMethod(newClass, "rollAbilityTest", 27,
    `return d20Roll(mergeObject(options, {`,
    `return trRollLib.MyD20Roll(mergeObject(options, {`);
    if (!newClass) return;
    game.dnd5e.entities.Actor5e.prototype.rollAbilityTest = newClass.prototype.rollAbilityTest;
    newClass = trPatchLib.patchMethod(newClass, "rollAbilitySave", 22,
    `return d20Roll(mergeObject(options, {`,
    `return trRollLib.MyD20Roll(mergeObject(options, {`);
    if (!newClass) return;
    game.dnd5e.entities.Actor5e.prototype.rollAbilitySave = newClass.prototype.rollAbilitySave;
  }

  static appTemplatePatch() {
    let newClass = Application;
    newClass = trPatchLib.patchMethod(newClass, "_renderOuter", 13,
    `let html = await renderTemplate("templates/app-window.html", windowData);`,
    `let html = await renderTemplate("modules/grouproll/templates/group-app-window.html", windowData);`);
    if (!newClass) return;
    Application.prototype._renderOuter = newClass.prototype._renderOuter;
  }

}

Hooks.once("ready", function() {
  if (game.settings.get("grouproll", "halflingLuckEnabled") && game.data.version != '0.7.0' ) trdisGRpatch.halflingLuckPatch();
  if (game.system.id === "dnd5e" && game.settings.get("grouproll", "averageRolls")) {
    if (game.system.data.version >= 0.9) {
      trdisGRpatch.averageD20Patch();
      trdisGRpatch.checkRollsPatch();
    } else {
      trdisGRpatch.v89_averageD20Patch();
    }
  }
  trdisGRpatch.appTemplatePatch();
});

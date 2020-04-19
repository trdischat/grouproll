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
    newClass = trPatchLib.patchMethod(newClass, "_applyReroll", 15,
      `this.reroll(target);`,
      `this.reroll(target, rr[3]);`);
    if (!newClass) return;
    newClass.rgx = Die.rgx;
    newClass.rgx.reroll = /r(<=|>=|<|>)?([0-9]+)?(?:=([0-9]+))?/;
    Die = newClass;
  }

  /* Substitute "average" d20 roll for standard d20 ability and skill rolls.
   * Average of two d20 approximated using 2d10+1-1d2.
   */
  static averageD20Patch() {
    let newFunc = trPatchLib.patchFunction(game.dnd5e.Dice5e.d20Roll, 51,
      `let roll = new Roll(parts.join(" + "), data).roll();`,
      `let roll = new Roll(parts.join(" + "), data).roll();
      if (!(flavor.includes("Attack Roll") || adv !== 0)) trRollLib.avgD20roll(roll);`);
    if (!newFunc) return;
    game.dnd5e.Dice5e.d20Roll = newFunc;
  }  

}

Hooks.once("ready", function() {
  if (CONFIG._tr5e_options_halflingLuckEnabled) trdisGRpatch.halflingLuckPatch();
  if (CONFIG._tr5e_options_averageRolls) trdisGRpatch.averageD20Patch();
});

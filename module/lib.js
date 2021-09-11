export const MODULE_ID = 'grouproll';

/** Class to send debug messages to console if enabled in DevMode module. */
export class debug {
  /**
   * Helper function to output debug messages to console if debug is enabled.
   * @param {boolean} force    True = output always, False = output only if debugging enabled.
   * @param  {...any} args     Arguments to pass through to console.log().
   */
  static log(force, ...args) {
      try {
          const enabled = game.modules.get('_dev-mode')?.api?.getPackageDebugValue(MODULE_ID);
          if (force || enabled) {
              console.log(MODULE_ID, '|', ...args);
          }
      } catch (e) {
          console.log(`ERROR: ${MODULE_ID} debug logging function failed`, e);
      }
  }
}

/**
 * Alternate median function that does not average the two middle values
 * @param {Array} Number   Roll results to evaluate
 * @return {Number}        "Median" roll
 */
export function midValue(rolls) {
    let midRoll = Math.ceil(rolls.length / 2) - 1;
    return rolls.sort(function (a, b) { return b - a })[midRoll];
}

/**
 * Substitute average of two d20 rolls for a single d20 roll.  2d10+1-1d2
 * is statistically equivalent and easier than actual averaging.
 * @param {Roll} d20Roll    Roll of 1d20 to be replaced
 */
export function avgD20roll(d20Roll) {
    let oldTotal = d20Roll.terms[0].total;
    let avgRoll = new Roll(`2d10-1dc`).evaluate({ async: false });
    let newTotal = avgRoll.total;
    if (d20Roll.terms[0].formula.includes("r1=1") && newTotal == 1) {
        let altRoll = avgRoll.reroll();
        newTotal = altRoll.total;
        d20Roll.terms[0].results = [{ result: 1, active: false, rerolled: true }, { result: newTotal, active: true }];
    } else {
        d20Roll.terms[0].results = [{ result: newTotal, active: true }];
    }
    d20Roll._total = d20Roll._total + newTotal - oldTotal;
    if (isNewerVersion('0.8.0', game.data.version)) d20Roll.results[0] = newTotal;
    debug.log(false, "avgD20roll | Old Total: " + oldTotal);
    debug.log(false, "avgD20roll | New Total: " + newTotal);
}

/**
 * Roll a skill check, or an ability check or save.  If option enabled,
 * will substitute average of two d20 rolls for a single d20 roll.
 * @param {Number} adv     1=advantage, -1=disadvantage, 0=normal
 * @param {Number} bon     Situational bonus
 * @param {Number} mod     Ability or skill modifier
 * @param {Boolean} lucky  Halfling luck
 * @return {Roll}          Ability or skill roll
 */
export function chkRoll(adv, bon, mod, lucky) {
    let rStr = ((adv === 0) ? "1" : "2") + "d20" + (lucky ? "r1=1" : "") + ((adv === 1) ? "kh" : ((adv === -1) ? "kl" : "")) + " + @bonus + @modifier";
    let rData = { bonus: bon, modifier: mod };
    let roll = new Roll(rStr, rData).evaluate({ async: false });
    if (adv === 0 && (game.settings.get("grouproll", "averageRolls") === "c" || game.settings.get("grouproll", "averageRolls") === "a")) avgD20roll(roll);
    return roll;
}

/**
 * ! This function is not used in this module at all !
 * Roll an attack roll.
 * @param {Number} adv     1=advantage, -1=disadvantage, 0=normal
 * @param {Number} bon     Situational bonus
 * @param {Number} mod     Attack or spellcasting ability modifier
 * @param {Boolean} lucky  Halfling luck
 * @return {Roll}          Attack roll
 */
export function hitRoll(adv, bon, mod, lucky) {
    let rStr = ((adv === 0) ? "1" : "2") + "d20" + (lucky ? "r1=1" : "") + ((adv === 1) ? "kh" : ((adv === -1) ? "kl" : "")) + " + @bonus + @modifier";
    let rData = { bonus: bon, modifier: mod };
    return new Roll(rStr, rData).evaluate({ async: false });
}

/**
 * Compute a passive skill check, or an ability check or save.
 * @param {Number} adv     1=advantage, -1=disadvantage, 0=normal
 * @param {Number} bon     Situational bonus
 * @param {Number} mod     Ability or skill modifier
 * @return {Roll}          Ability or skill roll
 */
export function chkPassive(adv, bon, mod) {
    var rStr = "@base + @bonus + @modifier";
    var rData = { base: (adv * 5) + 10, bonus: bon, modifier: mod };
    return new Roll(rStr, rData).evaluate({ async: false });
}

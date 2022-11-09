export const MODULE_ID = 'grouproll';

/**
 * Helper function to test game generation
 * @param {Number} val   Minimum generation (major version number)
 * @returns {Boolean}    True if game generation equals or exceed minimum
 */
export function minGen(val) {
    return val <= ( game.release?.generation || parseInt((game.version || game.data.version).split(".")[1]) );
} 

/**
 * Helper function to test game version
 * @param {String} val   Minimum version (full version string)
 * @returns {Boolean}    True if game version equals or exceeds minimum
 */
export function minVer(val) {
    return !(isNewerVersion(val, game.version || game.data.version));
} 

/**
 * Helper function to test game system version
 * @param {String} val   Minimum version (full version string)
 * @returns {Boolean}    True if game system version equals or exceeds minimum
 */
 export function minSys(val) {
    return !(isNewerVersion(val, game.system.version || game.system.data.version));
} 

/** Class to send debug messages to console if enabled in DevMode module. */
export class debug {
  /**
   * Getter tests if debug is enabled.
   * @return {boolean}        True if debug is enabled.
   */
  static get enabled() {
      return game.modules.get('_dev-mode')?.api?.getPackageDebugValue(MODULE_ID);
  }
  /**
   * Helper function to output debug messages to console if debug is enabled.
   * @param {boolean} force    True = output always, False = output only if debugging enabled.
   * @param  {...any} args     Arguments to pass through to console.log().
   */
  static log(force, ...args) {
      try {
          if (force || this.enabled) {
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
 * Substitute average of two d20 rolls for a single d20 roll.
 * 2d10-1dc is statistically equivalent and easier than actual averaging.
 * @param {Roll} d20Roll    Roll of 1d20 to be replaced
 */
export function avgD20roll(d20Roll) {
    let oldTotal = d20Roll.terms[0].total;
    let avgRoll = new Roll(`2d10-1dc`);
    avgRoll.evaluate({ async: false });
    let newTotal = avgRoll.total;
    if (d20Roll.terms[0].formula.includes("r1=1") && newTotal == 1) {
        let altRoll = avgRoll.reroll();
        newTotal = altRoll.total;
        d20Roll.terms[0].results = [{ result: 1, active: false, rerolled: true }, { result: newTotal, active: true }];
    } else {
        d20Roll.terms[0].results = [{ result: newTotal, active: true }];
    }
    d20Roll._total = d20Roll._total + newTotal - oldTotal;
    if (!(minVer('0.8.0'))) d20Roll.results[0] = newTotal;
    debug.log(false, "avgD20roll | Original Roll: " + oldTotal);
    debug.log(false, "avgD20roll | Averaged Roll: " + newTotal);
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
    let roll = new Roll(rStr, rData);
    roll.evaluate({ async: false });
    if (adv === 0 && (game.settings.get("grouproll", "averageRolls") === "c" || game.settings.get("grouproll", "averageRolls") === "a")) avgD20roll(roll);
    show3dDice(roll);
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
    let roll = new Roll(rStr, rData);
    return roll.evaluate({ async: false });
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
    let roll = new Roll(rStr, rData);
    return roll.evaluate({ async: false });
}

/**
 * Show the 3D dice for a roll.  The dice will only be shown to the relevant players/GMs depending on the current roll mode.
 */
export function show3dDice(roll) {
    if (!game.settings.get("grouproll", "diceSoNiceIntegration") || !game.modules.get('dice-so-nice')?.active)
        return;

    let showToOthers = false;
    let whisperList = null;

    const rollMode = game.settings.get("core", "rollMode");
    if (rollMode === "publicroll") {
        showToOthers = true;
    } else if ((rollMode === "gmroll") || (rollMode === "blindroll")) {
        showToOthers = true;
        whisperList = game.users.contents.filter(u => u.isGM).map(u => u.id);
    }

    return game.dice3d.showForRoll(roll, game.user, showToOthers, whisperList);
}
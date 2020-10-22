class trRollLib {

    static MyD20Roll() {}

    /**
     * Alternate median function that does not average the two middle values
     * @param {Array} Number   Roll results to evaluate
     * @return {Number}        "Median" roll
     */
    static midValue(rolls) {
        let midRoll = Math.ceil( rolls.length / 2 ) - 1;
        return rolls.sort(function(a, b){return b - a})[midRoll];
    }

    /**
     * Substitute average of two d20 rolls for a single d20 roll.  2d10+1-1d2
     * is statistically equivalent and easier than actual averaging.
     * @param {Roll} d20Roll    Roll of 1d20 to be replaced
     */
    static avgD20roll(d20Roll) {
        if (isNewerVersion('0.7.0', game.data.version)) {
            this.avgD20roll_old(d20Roll);
        } else {
            let oldTotal = d20Roll.terms[0].total;
            let avgRoll = new Roll(`2d10-1dc`).roll();
            let newTotal = avgRoll.total;
            if (d20Roll.terms[0].formula.includes("r") && newTotal == 1) {
                let altRoll = avgRoll.reroll();
                newTotal = altRoll.total;
                d20Roll.terms[0].results = [{result: 1, active: false, rerolled: true},{result: newTotal, active: true}];
            } else {
                d20Roll.terms[0].results = [{result: newTotal, active: true}];
            }
            d20Roll._total = d20Roll._total + newTotal - oldTotal;
            d20Roll.results[0] = newTotal;
        }
    }
    // DEPRECATED - avgd20roll function for FVTT through v0.6.6
    static avgD20roll_old(d20Roll) {
        let oldTotal = d20Roll.parts[0].total;
        let avgRoll = new Roll(`2d10+1-1d2`).roll();
        let newTotal = avgRoll.total;
        if (d20Roll.parts[0].formula.includes("r") && newTotal == 1) {
            let altRoll = avgRoll.reroll();
            newTotal = altRoll.total;
            d20Roll._dice[0].rolls = [{roll: 1, rerolled: true},{roll: newTotal}];
        } else {
            d20Roll._dice[0].rolls = [{roll: newTotal}];
        }
        d20Roll.parts[0].rolls = d20Roll._dice[0].rolls;
        d20Roll._total = d20Roll._total + newTotal - oldTotal;
        d20Roll._result = d20Roll.parts.slice(1).reduce((acc, val) => { return acc + " " + val; }, newTotal);
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
    static chkRoll(adv, bon, mod, lucky) {
        let luck = lucky ? (game.settings.get("grouproll", "halflingLuckEnabled") ? "r1=1" : "r1") : "";
        let rStr = ((adv === 0) ? "1" : "2") + "d20" + luck + ((adv === 1) ? "kh" : ((adv === -1) ? "kl" : "")) + " + @bonus + @modifier";
        let rData = {bonus: bon, modifier: mod};
        let roll = new Roll(rStr, rData).roll();
        if (game.settings.get("grouproll", "averageRolls") && adv === 0) this.avgD20roll(roll);
        return roll;
      }

    /**
     * Roll an attack roll.
     * @param {Number} adv     1=advantage, -1=disadvantage, 0=normal
     * @param {Number} bon     Situational bonus
     * @param {Number} mod     Attack or spellcasting ability modifier
     * @param {Boolean} lucky  Halfling luck
     * @return {Roll}          Attack roll
     */
    static hitRoll(adv, bon, mod, lucky) {
        let luck = lucky ? (game.settings.get("grouproll", "halflingLuckEnabled") ? "r1=1" : "r1") : "";
        let rStr = ((adv === 0) ? "1" : "2") + "d20" + luck + ((adv === 1) ? "kh" : ((adv === -1) ? "kl" : "")) + " + @bonus + @modifier";
        let rData = {bonus: bon, modifier: mod};
        return new Roll(rStr, rData).roll();
    }

    /**
     * Compute a passive skill check, or an ability check or save.
     * @param {Number} adv     1=advantage, -1=disadvantage, 0=normal
     * @param {Number} bon     Situational bonus
     * @param {Number} mod     Ability or skill modifier
     * @return {Roll}          Ability or skill roll
     */
    static chkPassive(adv, bon, mod) {
        var rStr = "@base + @bonus + @modifier";
        var rData = {base: (adv * 5) + 10, bonus: bon, modifier: mod};
        return new Roll(rStr, rData).roll();
    }

    static init() {
    }
}

/**
 * Configuration for optional settings.
 */
Hooks.once("init", function() {
    game.settings.register("grouproll", "passfail", {
        name: "Pass or Fail",
        hint: "Output PASS or FAIL icons rather than numbers when DC is set",
        scope: "world",
        type: Boolean,
        default: false,
        config: true,
        onChange: s => {}
    });
    game.settings.register("grouproll", "averageRolls", {
        name: "Average Rolls (House Rule)",
        hint: "Standard checks and saves use average of 2d20",
        scope: "world",
        type: Boolean,
        default: false,
        config: true,
        onChange: s => {}
    });
    game.settings.register("grouproll", "halflingLuckEnabled", {
        name: "Halfling Luck (D&D 5e)",
        hint: "Only reroll one die when using the Halfling Lucky trait",
        scope: "world",
        type: Boolean,
        default: true,
        config: false,
        onChange: s => {}
    });
    trRollLib.init;
});
  
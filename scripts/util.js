// Configure rolling behavior
CONFIG._tr5e_options_averageRolls = true;         // Set to false to use normal 1d20 roll rather than averaging 2d20
CONFIG._tr5e_options_halflingLuckEnabled = true;  // Set to true to apply Halfling Luck trait to d20 rolls

class tr5eLib {

    static patchClass(klass, func, line_number, line, new_line) {
        // Check in case the class/function had been deprecated/removed
        if (func === undefined)
            return;
        let funcStr = func.toString()
        let lines = funcStr.split("\n")
        if (lines[line_number].trim() == line.trim()) {
            lines[line_number] = lines[line_number].replace(line, new_line);
            let fixed = lines.join("\n")
            if (klass !== undefined) {
                let classStr = klass.toString()
                fixed = classStr.replace(funcStr, fixed)
            } else {
                if (!fixed.startsWith("function"))
                    fixed = "function " + fixed
                if (fixed.startsWith("function async"))
                    fixed = fixed.replace("function async", "async function");
            }
            return Function('"use strict";return (' + fixed + ')')();
        } else {
            console.log("Cannot patch function. It has wrong content at line ", line_number, " : ", lines[line_number].trim(), " != ", line.trim(), "\n", funcStr)
        }
    }

    static patchFunction(func, line_number, line, new_line) {
        return tr5eLib.patchClass(undefined, func, line_number, line, new_line)
    }
    static patchMethod(klass, func, line_number, line, new_line) {
        return tr5eLib.patchClass(klass, klass.prototype[func], line_number, line, new_line)
    }

    static replaceFunction(klass, name, func) {
        klass[this.ORIG_PFX + name] = klass[name]
        klass[name] = func
    }
    static replaceMethod(klass, name, func) {
        return this.replaceFunction(klass.prototype, name, func)
    }
    static replaceStaticGetter(klass, name, func) {
        let getterProperty = Object.getOwnPropertyDescriptor(klass, name);
        if (getterProperty == undefined)
            return false;
        Object.defineProperty(klass, tr5eLib.ORIG_PFX + name, getterProperty);
        Object.defineProperty(klass, name, { get: func });
        return true;
    }
    static replaceGetter(klass, name, func) {
        return this.replaceStaticGetter(klass.prototype, name, func)
    };

    // Would be the same code for callOriginalMethod as long as 'klass' is actually the instance
    static callOriginalFunction(klass, name, ...args) {
        return klass[this.ORIG_PFX + name].call(klass, ...args)
    }
    static callOriginalGetter(klass, name) {
        return klass[this.ORIG_PFX + name]
    }

    /**
     * Alternate median function that does not average the two middle values
     * @param {Array} rolls    Roll results to evaluate
     * @return {Number}        "Median" roll
     */
    static midValue(rolls) {
        let midRoll = Math.ceil( rolls.length / 2 ) - 1;
        return rolls.sort(function(a, b){return b - a})[midRoll];
    }

    static avgD20roll(d20Roll) {
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

    static chkRoll(adv, bon, mod, lucky) {
        let luck = (CONFIG._tr5e_options_halflingLuckEnabled && lucky) ? "r1=1" : "";
        let rStr = ((adv === 0) ? "1" : "2") + "d20" + luck + ((adv === 1) ? "kh" : ((adv === -1) ? "kl" : "")) + " + @bonus + @modifier";
        let rData = {bonus: bon, modifier: mod};
        let roll = new Roll(rStr, rData).roll();
        if (CONFIG._tr5e_options_averageRolls && adv === 0) tr5eLib.avgD20roll(roll);
        return roll;
      }
      
    static hitRoll(adv, bon, mod, lucky) {
        let luck = (CONFIG._tr5e_options_halflingLuckEnabled && lucky) ? "r1=1" : "";
        let rStr = ((adv === 0) ? "1" : "2") + "d20" + luck + ((adv === 1) ? "kh" : ((adv === -1) ? "kl" : "")) + " + @bonus + @modifier";
        let rData = {bonus: bon, modifier: mod};
        return new Roll(rStr, rData).roll();
      }
    
    static chkPassive(adv, bon, mod) {
        var rStr = "@base + @bonus + @modifier";
        var rData = {base: (adv * 5) + 10, bonus: bon, modifier: mod};
        return new Roll(rStr, rData).roll();
      }

    static init() {
    }
}

tr5eLib.ORIG_PFX = "__tr5e_orig_";

Hooks.once('init', tr5eLib.init);

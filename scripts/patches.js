/* Allow limit on number of dice to reroll (e.g., a halfing rolling an attack 
 * with advantage would use '2d20r1=1kh' to roll two d20, reroll on a 1, but
 * only on one die, then keep the highest roll).
 */
Die.prototype.reroll = function(targets, maxrerolls = 999) {   // ! Changed line
  if ( !targets || !targets.length ) return this.rolls;

  // Flag dice which are eligible for re-roll
  let eligible = this.rolls.filter(r => {
    if ( r.rerolled || r.discarded ) return false;
    else if ( targets.includes(r.roll) && maxrerolls > 0 ) {   // ! Changed line
      maxrerolls--;
       return r.rerolled = true;
    }
    return false;
  });

  // Roll any eligible dice
  let rolls = eligible.map(r => this._roll());
  this.rolls = this.rolls.concat(rolls);
  return this;
}

Die.prototype._applyReroll = function(option) {
  let rr = option.match(Die.rgx.reroll);
  if ( !rr ) return;

  // Determine the reroll range
  let target, nrr = parseInt(rr[2] || 1);
  if ( rr[1] ) {
    if ( rr[1] === "<" )        target = Array.fromRange(nrr);
    else if ( rr[1] === "<=" )  target = Array.fromRange(nrr).map(n => n + 1);
    else if ( rr[1] === ">" )   target = Array.fromRange(this.faces - nrr).map(n => n + nrr + 1);
    else if ( rr[1] === ">=" )  target = Array.fromRange(this.faces - nrr + 1).map(n => n + nrr);
  }
  else target = [nrr];

  // Reroll the die
  this.reroll(target, rr[3]);                                  // ! Changed line
}

Die.rgx.reroll = /r(<=|>=|<|>)?([0-9]+)?(?:=([0-9]+))?/;

if (CONFIG._grouproll_module_averageRolls) {
  Hooks.once("setup", function() {
    game.dnd5e.Dice5e.d20Roll = async function({parts=[], data={}, event={}, template=null, title=null, speaker=null, flavor=null, fastForward=true, critical=20, fumble=1, elvenAccuracy=false, halflingLucky=false, onClose, dialogOptions}={}) {

      // Handle input arguments
      flavor = flavor || title;
      speaker = speaker || ChatMessage.getSpeaker();
      const rollMode = game.settings.get("core", "rollMode");
      parts = parts.concat(["@bonus"]);
      let rolled = false;
  
      // Define inner roll function
      const _roll = function(parts, adv, form=null) {

        // Determine the d20 roll and modifiers
        let nd = 1;
        let mods = halflingLucky ? "r=1" : "";
  
        // Handle advantage
        if ( adv === 1 ) {
          nd = elvenAccuracy ? 3 : 2;
          flavor += " (Advantage)";
          mods += "kh";
        }
  
        // Handle disadvantage
        else if ( adv === -1 ) {
          nd = 2;
          flavor += " (Disadvantage)";
          mods += "kl";
        }

          // Include the d20 roll
        parts.unshift(`${nd}d20${mods}`);
  
        // Optionally include a situational bonus
        if ( form !== null ) data['bonus'] = form.find('[name="bonus"]').val();
        if ( !data["bonus"] ) parts.pop();
  
        // Optionally include an ability score selection (used for tool checks)
        const ability = form ? form.find('[name="ability"]') : null;
        if ( ability && ability.length && ability.val() ) {
          data.ability = ability.val();
          const abl = data.abilities[data.ability];
          if ( abl ) data.mod = abl.mod;
        }
  
        // Execute the roll and flag critical thresholds on the d20
        let roll = new Roll(parts.join(" + "), data).roll();
        if (!(flavor.includes("Attack Roll") || adv !== 0)) {  // ! New Lines
          let avgRoll = new Roll(`2d10${mods}+1-1d2`).roll();
          roll._total = roll._total + avgRoll.total - (roll._dice[0].rolls[1] ? roll._dice[0].rolls[1].roll : roll._dice[0].rolls[0].roll);
          roll._result = roll.parts.slice(1).reduce((acc, val) => { return acc + " " + val; }, avgRoll.total);
          roll.parts[0].rolls = (avgRoll.total == 1) ? [{roll: 1, rerolled: true},{roll: 1}] : [{roll: avgRoll.total}];
          roll._dice[0].rolls = roll.parts[0].rolls;
        }
        const d20 = roll.parts[0];
        d20.options.critical = critical;
        d20.options.fumble = fumble;

        // Convert the roll to a chat message and return the roll
        roll.toMessage({
          speaker: speaker,
          flavor: flavor,
          rollMode: form ? form.find('[name="rollMode"]').val() : rollMode
        });
        rolled = true;
        return roll;
      };
  
      // Optionally allow fast-forwarding to specify advantage or disadvantage
      if ( fastForward ) {
        if (event.shiftKey) return _roll(parts, 0);
        else if (event.altKey) return _roll(parts, 1);
        else if (event.ctrlKey || event.metaKey) return _roll(parts, -1);
      }
  
      // Render modal dialog
      template = template || "systems/dnd5e/templates/chat/roll-dialog.html";
      let dialogData = {
        formula: parts.join(" + "),
        data: data,
        rollMode: rollMode,
        rollModes: CONFIG.rollModes,
        config: CONFIG.DND5E
      };
      const html = await renderTemplate(template, dialogData);
  
      // Create the Dialog window
      let roll;
      return new Promise(resolve => {
        new Dialog({
          title: title,
          content: html,
          buttons: {
            advantage: {
              label: "Advantage",
              callback: html => roll = _roll(parts, 1, html)
            },
            normal: {
              label: "Normal",
              callback: html => roll = _roll(parts, 0, html)
            },
            disadvantage: {
              label: "Disadvantage",
              callback: html => roll = _roll(parts, -1, html)
            }
          },
          default: "normal",
          close: html => {
            if (onClose) onClose(html, parts, data);
            resolve(rolled ? roll : false)
          }
        }, dialogOptions).render(true);
      })
    }
  });
}

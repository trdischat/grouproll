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

/**
 * Alternate median function that does not average the two middle values
 * @param {Array} rolls    Roll results to evaluate
 * @return {Number}        "Median" roll
 */
function midValue(rolls) {
  var midRoll = Math.ceil( rolls.length / 2 ) - 1;
  return rolls.sort(function(a, b){return b - a})[midRoll];
}

function chkRoll(adv, bon, modifier, lucky) {
  if (CONFIG._grouproll_module_halflingLuckEnabled) var luck = lucky ? "r1" : "";
  else var luck = "";
  var rStr;
  var rData = {bonus: bon, mod: modifier};
  if (adv === 1) rStr = "2d20" + luck + "kh";
  else if (adv === -1) rStr = "2d20" + luck + "kl";
  else {
    if (CONFIG._grouproll_module_averageRolls) {
      let coinToss = new Roll("1d2-1").roll();
      rData.coin = coinToss.total;
      rStr = "2d10" + luck + " - @coin";
    }
    else rStr = "1d20" + luck;
  }
  rStr = rStr + " + @bonus + @mod";
  return new Roll(rStr, rData).roll();
}

function hitRoll(adv, bon, modifier, lucky) {
  if (CONFIG._grouproll_module_halflingLuckEnabled) var luck = lucky ? "r1" : "";
  else var luck = "";
  var rStr;
  var rData = {bonus: bon, mod: modifier};
  if (adv === 1) rStr = "2d20" + luck + "kh";
  else if (adv === -1) rStr = "2d20" + luck + "kl";
  else rStr = "1d20" + luck;
  rStr = rStr + " + @bonus + @mod";
  return new Roll(rStr, rData).roll();
}

function chkPassive(adv, bon, modifier) {
  var rStr = "@base + @bonus + @mod";
  var rData = {base: (adv * 5) + 10, bonus: bon, mod: modifier};
  return new Roll(rStr, rData).roll();
}

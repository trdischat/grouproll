function patchClass(klass, func, line_number, line, new_line) {
  let funcStr = func.toString()
  let lines = funcStr.split("\n")
  if (lines[line_number].trim() == line.trim()) {
    lines[line_number] = lines[line_number].replace(line, new_line);
    classStr = klass.toString()
    fixedClass = classStr.replace(funcStr, lines.join("\n"))
    return Function('"use strict";return (' + fixedClass + ')')();
  }
  else {
    console.log("Function has wrong content at line ", line_number, " : ", lines[line_number].trim(), " != ", line.trim(), "\n", funcStr)
  }
}


/* Patch Die and Roll classes to allow limit on number of dice to reroll (e.g.,
 * a halfing rolling an attack with advantage would use '2d20r1=1kh' to roll
 * two d20, reroll on a 1, but only on one die, then keep the highest roll).
 */
function patchDieClass() {
    newClass = patchClass(Die, Die.prototype.reroll, 0,
      `reroll(targets) {`,
      `reroll(targets, maxrerolls) {`);
    if (!newClass) return;
    newClass = patchClass(newClass, newClass.prototype.reroll, 3,
      `// Flag dice which are eligible for re-roll`,
      `maxrerolls = maxrerolls || 999;
      // Flag dice which are eligible for re-roll`);
    if (!newClass) return;
    newClass = patchClass(newClass, newClass.prototype.reroll, 7,
      `else if ( targets.includes(r.roll) ) return r.rerolled = true;`,
      `else if ( targets.includes(r.roll) && maxrerolls > 0 ) { maxrerolls--; return r.rerolled = true; }`);
    if (!newClass) return;
    Die = newClass
    CONFIG.diceTypes[CONFIG.diceTypes.findIndex(d => d.name === "Die")] = Die
}

if (patchedDieClass == undefined) {
  patchDieClass();
  var patchedDieClass = true;
}

function patchRollClass() {
    newClass = patchClass(Roll, Roll.prototype.constructor, 48,
      `reroll: /r(<=|>=|<|>)?([0-9]+)?/,`,
      `reroll: /r(<=|>=|<|>)?([0-9]+)?(?:=([0-9]+))?/,`);
    if (!newClass) return;
    newClass = patchClass(newClass, Roll.prototype._rerollDie, 15,
      `die.reroll(target);`,
      `die.reroll(target, rr[3]);`);
    if (!newClass) return;
    Roll = newClass
}

if (patchedRollClass == undefined) {
  patchRollClass();
  var patchedRollClass = true;
}

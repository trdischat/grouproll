# Group rolls for D&D 5e (limited support for Pathfinder 2e)
The primary purpose of this module is to facilitate group ability and skill check rolls per the Player's Handbook, page 175: *"If at least half the group succeeds, the whole group succeeds."*  It also displays the rolls for each individual token, and therefore can be used to roll saving throws for an entire groups of tokens at once (e.g., DEX saves for a group of characters hit by a fireball).

The module adds two buttons to the Token menu on the left of the canvas. Group skill and ability checks can be launched by selecting tokens, then clicking the relevant group roll button. The window can be left open, and it will update automatically if the token selection is changed.  The "PCs" button will select all player character tokens on the canvas.  The "Pass" button selects only tokens with successful rolls, while the "Fail" button selects only tokens with failed rolls.  Individual tokens can be deselected by clicking the "x" next to the token name.

Skills and abilities are selected from the dropdowns.  If desired, the DC for the roll can be entered.  If the DC is set, a successful roll is colored green, while an failed roll is colored red.  If the DC is not set, natural 20 rolls are highlighted in green, while natural 1 rolls are highlighted in red.

Advantage, disadvantage, and situational bonuses can be set individually for each token.  The "Reset" button clears advantage, bonuses, and rolls for all tokens.  The "Roll" button rolls for all tokens at once, taking into account all advantage and bonus settings, then calculates the minimum roll achieved by at least half of the group.

Normally, roll results are only displayed in the `grouproll` dialog, which is only visible to the GM.  However, if the GM holds down the "Shift" key while clicking the Roll button, the results of the new roll will also be displayed in the Chat window, where they are visible to the players.  If the GM holds down the "Ctrl" key while clicking the Roll button, the results of the previous roll will be retained.  That means that holding down "Ctrl-Shift" while clicking the Roll button displays the previous roll results in the Chat window without rolling new rolls.

Finally, there is a "Passive" button to run passive skill or ability checks for a group in place of actual rolls.  Passive checks cannot be output to the Chat window since they are not actual rolls.

The module also has options for (1) outputting roll results as PASS/FAIL checkmark icons instead of numbers; (2) a house rule that uses the average of 2d20 for normal skill and ability check rolls; and (3) a limit on total rerolls to properly implement the D&D 5e *Halfling Lucky* trait for any Actor that either has the word "halfling" anywhere in the Race field or has the *Halfling Lucky* trait checked in the Special Traits tab the dnd5e system.  Per Player's Handbook, page 173: *"When you have advantage or disadvantage and something in the game, such as the halfling's Lucky trait, lets you reroll or replace the d20, you can reroll or replace only one of the dice."*  All of these options are disabled by default, but can be individually enabled in the module configuration settings.

The module was designed for the D&D 5e system, but will also work for many group rolls in the Pathfinder 2e system.  It will handle all PF2e saving throws, as well as skill checks for player characters.  It will not work properly for skill checks for NPCs in PF2e, and therefore NPCs cannot be selected while the skill check window is open.

# Installation
See https://github.com/foundry-vtt-community/wiki/wiki/Modules#installing-modules. Open the Add-on Modules tab in the Configuration and Setup dialog. Click Install Module, paste `https://raw.githubusercontent.com/trdischat/grouproll/master/module.json` in as the Manifest URL, then click Install.

As DM go to the `Manage Modules` options menu in the Game Settings for your World, then enable the `Group Roll Checks and Saves` module.

# License
This Foundry VTT module, written by trdischat with major assistance from Atropos, ayan, and KaKaRoTo, is licensed under a [Creative Commons Attribution 4.0 International License](http://creativecommons.org/licenses/by/4.0/).

This work is licensed under Foundry Virtual Tabletop [EULA - Limited License Agreement for module development v 0.1.6](http://foundryvtt.com/pages/license.html).

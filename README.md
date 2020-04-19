# Group rolls for DND 5e (and now supporting Pathfinder 2e)
The primary purpose of this module is to facilitate group ability and skill check rolls per Player's Handbook, page 175: *"If at least half the group succeeds, the whole group succeeds."*  It also displays the rolls for each individual token, and therefore can be used to roll saving throws for an entire groups of tokens at once (e.g., DEX saves for a group of characters hit by a fireball).  Natural 20 rolls are highlighted in green, while natural 1 rolls are highlighted in red.  Finally, there is a "Passive" button to run passive skill or ability checks for a group in place of actual rolls. 

The module also has options for (1) a house rule that uses the average of 2d20 for normal skill and ability check rolls, and (2) a limit on total rerolls to properly implement the D&D 5e *Halfling Lucky* trait for any Actor that either has the word "halfling" anywhere in the Race field or has the *Halfling Lucky* trait checked in the Special Traits tab of version 0.84+ of the dnd5e system.  Per Player's Handbook, page 173: *"When you have advantage or disadvantage and something in the game, such as the halfling's Lucky trait, lets you reroll or replace the d20, you can reroll or replace only one of the dice."*  Each of these custom rules can be individually enabled or disabled in lib.js.

# Installation
See https://github.com/foundry-vtt-community/wiki/wiki/Modules#installing-modules. Open the Add-on Modules tab in the Configuration and Setup dialog. Click Install Module, paste `https://raw.githubusercontent.com/trdischat/grouproll/master/module.json` in as the Manifest URL, then click Install.

As DM go to the `Manage Modules` options menu in the Game Settings for your World, then enable the `Roll Group Checks` module. The module adds two buttons to the Token menu on the left of the canvas. Group skill and ability checks can be launched by selecting tokens, then clicking the relevant group roll button. The window can be left open, and it will update automatically if the token selection is changed.

# License
This Foundry VTT module, written by trdischat with major assistance from Atropos, ayan, and KaKaRoTo, is licensed under a [Creative Commons Attribution 4.0 International License](http://creativecommons.org/licenses/by/4.0/).

This work is licensed under Foundry Virtual Tabletop [EULA - Limited License Agreement for module development v 0.1.6](http://foundryvtt.com/pages/license.html).

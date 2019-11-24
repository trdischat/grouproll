# Group rolls for DND 5e
The primary purpose of this module is to facilitate group ability and skill check rolls per Player's Handbook, page 175: *"If at least half the group succeeds, the whole group succeeds."* It also displays the rolls for each individual token, and therefore can be used to roll saving throws for an entire groups of tokens at once (e.g., DEX saves for a group of characters hit by a fireball). Finally, there is a "Passive" button to run passive skill or ability checks for a group in place of actual rolls. 

The module also includes patches to implement the *Halfling Lucky* trait, and a house rule to use the average of 2d20 for normal skill and ability check rolls. Both of these patches can be disabled in config.js. All patches rely on the included **patchClass** utility function.

# Installation
See https://github.com/foundry-vtt-community/wiki/wiki/Modules#installing-modules. Open the Add-on Modules tab in the Configuration and Setup dialog. Click Install Module, paste `https://raw.githubusercontent.com/trdischat/grouproll/master/module.json` in as the Manifest URL, then click Install.

As DM go to the `Manage Modules` options menu in the Game Settings for your World, then enable the `Roll Group Checks` module. The module adds two buttons to the Token menu on the left of the canvas. Group skill and ability checks can be launched by selecting tokens, then clicking the relevant group roll button. The window can be left open, and it will update automatically if the token selection is changed.

# License
This Foundry VTT module, written by trdischat with major assistance from Atropos, ayan, and KaKaRoTo, is licensed under a [Creative Commons Attribution 4.0 International License](http://creativecommons.org/licenses/by/4.0/).

This work is licensed under Foundry Virtual Tabletop [EULA - Limited License Agreement for module development v 0.1.6](http://foundryvtt.com/pages/license.html).

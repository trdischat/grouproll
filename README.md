# Group Rolls for D&D 5e (limited support for Pathfinder 2e)
The primary purpose of this module is to facilitate group ability and skill check rolls per the D&D 5e Player's Handbook, page 175: *"If at least half the group succeeds, the whole group succeeds."*  It also displays the rolls for each individual token, and therefore can be used to roll saving throws for an entire groups of tokens at once (e.g., DEX saves for a group of characters hit by a fireball).

## Launching the Application and Selecting Tokens

The module adds two buttons to the Token menu on the left of the canvas. Group skill and ability checks can be launched by selecting tokens, then clicking the relevant group roll button. The window can be left open, and it will update automatically if the token selection is changed.  The "PCs" button will select all player character tokens on the canvas.  The "Pass" button selects only tokens with successful rolls, while the "Fail" button selects only tokens with failed rolls.  Individual tokens can be deselected by clicking the "x" next to the token name.

## Selecting Roll Options

Skills and abilities are selected from the dropdowns.  If desired, the DC for the roll can be entered.  If the DC is set, a successful roll is colored green, while an failed roll is colored red.  If the DC is not set, natural 20 rolls are highlighted in green, while natural 1 rolls are highlighted in red.

Advantage, disadvantage, and situational bonuses can be set individually for each token.  The "Reset" button clears advantage, bonuses, and rolls for all tokens.  The "Roll" button rolls for all tokens at once, taking into account all advantage and bonus settings, then calculates the minimum roll achieved by at least half of the group.

Finally, there is a "Passive" button to run passive skill or ability checks for a group in place of actual rolls.  

## Dispaying the Results

Normally, roll results are only displayed in the `grouproll` application window, which is only visible to the GM.  However, if the GM holds down the "Shift" key while clicking the Roll button, the results of the new roll will also be displayed in the Chat Log, where they are visible to the players.  If the GM holds down the "Ctrl" key while clicking the Roll button, the results of the previous roll will be retained.  That means that holding down "Ctrl-Shift" while clicking the Roll button displays the previous roll results in the Chat window without rolling new rolls.  Passive checks cannot be output to the Chat window since they are not actual rolls.

## Additional Options

The module also has options for (1) outputting roll results as PASS/FAIL checkmark icons instead of numbers; and (2) a personal house rule of mine that uses the average of 2d20 for normal 1d20 rolls.  Both of these options are disabled by default, but can be individually enabled in the module configuration settings.

## System Compatibility

The module was designed for the D&D 5e system, but will also work for many group rolls in the Pathfinder 2e system.  It will handle all PF2e saving throws, as well as skill checks for player characters.  It will not work properly for skill checks for NPCs in PF2e, and therefore NPCs cannot be selected while the skill check window is open.

# License
This Foundry VTT module, written by trdischat with major assistance from Atropos, ayan, and KaKaRoTo, is licensed under a [Creative Commons Attribution 4.0 International License](http://creativecommons.org/licenses/by/4.0/).

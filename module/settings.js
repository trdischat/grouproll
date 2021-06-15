export const registerSettings = function () {
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
}
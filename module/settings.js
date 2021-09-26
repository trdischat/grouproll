const debouncedReload = debounce(() => window.location.reload(), 100);

export const registerSettings = function () {
    game.settings.register("grouproll", "passfail", {
        name: "Pass or Fail",
        hint: "Output PASS or FAIL icons rather than numbers when DC is set",
        scope: "world",
        type: Boolean,
        default: false,
        config: true,
        onChange: s => { }
    });
    game.settings.register("grouproll", "send2chat", {
        name: "Output Rolls to Chat",
        hint: "The default behavior when this option is set to false is to hide rolls from the Chat log; Shift-Click the Roll button to send rolls to Chat.  To reverse this behavior, set this option to true to automatically output all rolls to the Chat log; Shift-Click the Roll button to hide rolls from Chat.",
        scope: "world",
        type: Boolean,
        default: false,
        config: true,
        onChange: debouncedReload
    });
    game.settings.register("grouproll", "averageRolls", {
        name: "Average Rolls",
        hint: "This personal house rule uses the average of 2d20 in place of 1d20 for NORMAL rolls. Outside of the Group Roll app, this setting only applies to the D&D 5e system and is disabled when using the BetterRolls5e module.",
        scope: "world",
        type: String,
        choices: {
            "n": "No rolls are averaged (default)",
            "c": "Checks and saves only",
            "a": "Attacks, checks, and saves"
        },
        default: "n",
        config: true,
        onChange: debouncedReload
    });
}

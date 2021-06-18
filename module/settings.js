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
    game.settings.register("grouproll", "averageRolls", {
        name: "Average Rolls (Obscure House Rule)",
        hint: "Use the average of 2d20 in place of 1d20 for normal rolls",
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

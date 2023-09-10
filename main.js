// Import JavaScript modules
import { registerSettings } from "./module/settings.js";
import { preloadTemplates } from "./module/templates.js";
import {
    GroupSkillCheck,
    GroupAbilityCheck,
    GroupSkillCheckPF2E,
    GroupSavePF2E
} from "./module/apps.js";
import { avgD20roll, debug } from "./module/lib.js";

/* ------------------------------------ */
/* Initialize module					*/
/* ------------------------------------ */
Hooks.once('init', async function () {
    debug.log(true, 'Initializing');

    // Test whether game system is supported by the module
    CONFIG._grouproll_systemSupported = game.system.id === "dnd5e" || ( game.system.id === "pf2e" && isNewerVersion('2.0.0', game.system.data.version) );

    // Assign custom classes and constants
    CONFIG._grouproll_module_advantageStatus = {
        "-1": {
            "label": "Disadvantage",
            "icon": '<i class="fas fa-minus"></i>'
        },
        "0": {
            "label": "Normal",
            "icon": '<i class="far fa-circle"></i>'
        },
        "1": {
            "label": "Advantage",
            "icon": '<i class="fas fa-plus"></i>'
        }
    };

    // Register custom module settings
    registerSettings();

    // Preload Handlebars templates
    await preloadTemplates();

});

/* ------------------------------------ */
/* Setup module							*/
/* ------------------------------------ */
Hooks.once('setup', function () {
    debug.log(true, 'Setup');
});

/* ------------------------------------ */
/* When ready							*/
/* ------------------------------------ */
Hooks.once('ready', function () {
    debug.log(true, 'Ready');

    // Enable module if game system is supported
    if (CONFIG._grouproll_systemSupported) {

        // Alter Advantage Type labels for Pathfinder 2e
        if (game.system.id === "pf2e") {
            CONFIG._grouproll_module_advantageStatus[1].label = "Fortune";
            CONFIG._grouproll_module_advantageStatus[-1].label = "Misfortune";
        };

        // Flag whether it is safe to insert code to average 1d20 rolls
        // - Only use with D&D 5e system
        // - Do not use if BetterRolls5e module is enabled
        const averagingOK = game.system.id === "dnd5e" && !game.modules.get("betterrolls5e")?.active;

        // Only insert averaging code if roll averaging is enabled in grouproll module
        if (averagingOK && game.settings.get("grouproll", "averageRolls") !== "n") {
            debug.log(false, "Averaging enabled for d20 rolls");

            // Regex for matching roll types
            CONFIG._grouproll_module_matchrolls = new RegExp(
                "(" + game.i18n.localize("GRTYPE.Death") + ")|(" +
                game.i18n.localize("GRTYPE.Check") + "|" +
                game.i18n.localize("GRTYPE.Save") + "|" +
                game.i18n.localize("GRTYPE.Skill") + "|" +
                game.i18n.localize("GRTYPE.Tool") + ")|(" +
                game.i18n.localize("GRTYPE.Attack") + ")");

            // Insert custom d20 roll averaging function into dnd5e system
            CONFIG.Dice.D20Roll.prototype.grouprollAverage = avgD20roll;
            CONFIG.Dice.D20Roll.prototype.grouprollEvaluate = Roll.prototype.evaluate;
            CONFIG.Dice.D20Roll.prototype.evaluate = async function ({ minimize = false, maximize = false, async } = {}) {
                await this.grouprollEvaluate({ minimize, maximize, async: true });

                // Do not use averaging for manual rolls, and only for normal 1d20 rolls
                if (!this.terms[0].options.isManualRoll && this.options.advantageMode === 0 && this.terms[0].faces === 20 && this.terms[0].number === 1) {

                    // Use the flavor to identify the roll type
                    const rollType = this.options.flavor.match(CONFIG._grouproll_module_matchrolls);
                    // Debug detection of roll types when adding new languages
                    if (debug.enabled) {
                        if (rollType[1]) debug.log(true, rollType[1] + " = Death Saving Throw");
                        else if (rollType[2]) debug.log(true, rollType[2] + " = Check or Save");
                        else if (rollType[3]) debug.log(true, rollType[3] + " = Attack Roll");
                    }

                    // Average normal d20 rolls only for selected roll types
                    switch (game.settings.get("grouproll", "averageRolls")) {
                        case "c":
                            if (rollType[2]) this.grouprollAverage(this);
                            break;
                        case "a":
                            if (rollType[2] || rollType[3]) this.grouprollAverage(this);
                            break;
                        default:
                    };
                };

                // Return adjusted roll
                return this;
            };
        };

        // Copy name to label; fix for DFreds Convenient Effects 
        CONFIG.statusEffects = CONFIG.statusEffects.map( x => {
            x.label = x.label || x.name;
            return x;
        });

    } else {
        debug.log(true, "Current game system not supported")
    };

});

/* ------------------------------------ */
/* Devmode Hook                         */
/* ------------------------------------ */
Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
    registerPackageDebugFlag('grouproll');
});

/* ------------------------------------ */
/* Additional Hooks                     */
/* ------------------------------------ */
Hooks.on('getSceneControlButtons', controls => {

    // Enable module if game system is supported
    if (CONFIG._grouproll_systemSupported) {

        // Add Group Roll buttons to UI
        let tokenButton = controls.find(b => b.name == "token");
        if (tokenButton) {
            tokenButton.tools.push(
                {
                    name: "skill",
                    title: "Group Skill Check",
                    icon: "fas fa-user-check",
                    visible: game.user.isGM,
                    onClick: () => {
                        ui.controls.initialize({tool: "select"});
                        if (game.system.id === "pf2e") return new GroupSkillCheckPF2E().render(true);
                        else return new GroupSkillCheck().render(true);
                    }
                },
                {
                    name: "ability",
                    title: game.system.id === "pf2e" ? "Group Saving Throw" : "Group Saving Throw / Check",
                    icon: "fas fa-user-shield",
                    visible: game.user.isGM,
                    onClick: () => {
                        ui.controls.initialize({tool: "select"});
                        if (game.system.id === "pf2e") return new GroupSavePF2E().render(true);
                        else return new GroupAbilityCheck().render(true);
                    }
                }
            );
        };
    };
});

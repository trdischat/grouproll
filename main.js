// Import JavaScript modules
import { registerSettings } from "./module/settings.js";
import { preloadTemplates } from "./module/templates.js";
import {
    GroupSkillCheck,
    GroupAbilityCheck
} from "./module/apps.js";
import { avgD20roll, debug } from "./module/lib.js";

/* ------------------------------------ */
/* Initialize module					*/
/* ------------------------------------ */
Hooks.once('init', async function () {
    debug.log(true, 'Initializing');

    // Test whether game system is supported by the module
    CONFIG._grouproll_systemSupported = game.system.id === "dnd5e";

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

        // Flag whether it is safe to insert code to average 1d20 rolls
        // - Only use with D&D 5e system
        // - Do not use if BetterRolls5e module is enabled
        const averagingOK = game.system.id === "dnd5e" && !game.modules.get("betterrolls5e")?.active;

        // Only insert averaging code if roll averaging is enabled in grouproll module
        if (averagingOK && game.settings.get("grouproll", "averageRolls") !== "n") {
            debug.log(false, "Averaging enabled for d20 rolls");

            // Insert custom d20 roll averaging function into dnd5e system
            CONFIG.Dice.D20Roll.prototype.grouprollAverage = avgD20roll;
            CONFIG.Dice.D20Roll.prototype.grouprollEvaluate = Roll.prototype.evaluate;
            CONFIG.Dice.D20Roll.prototype.evaluate = async function ({ minimize = false, maximize = false, allowStrings = false, allowInteractive = true, ...options} = {}) {
                await this.grouprollEvaluate({ minimize, maximize, allowStrings, allowInteractive });

                // Do not use averaging for manual rolls, and only for normal 1d20 rolls
                if (!this.terms[0].options.isManualRoll && this.options.advantageMode === 0 && this.terms[0].faces === 20 && this.terms[0].number === 1) {
                    const rollType = this.options.rollType;
                    // Average normal d20 rolls only for selected roll types
                    switch (game.settings.get("grouproll", "averageRolls")) {
                        case "c":
                            if (["save", "ability", "skill"].includes(rollType)) await this.grouprollAverage(this);
                            break;
                        case "a":
                            if (["save", "ability", "skill", "attack"].includes(rollType)) await this.grouprollAverage(this);
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
/* Additional Hooks                     */
/* ------------------------------------ */
Hooks.on('getSceneControlButtons', controls => {

    // Enable module if game system is supported
    if (CONFIG._grouproll_systemSupported) {

        // Add Group Roll buttons to UI
        controls.tokens.tools.grouprollSkillCheck = {
            name: "grouprollSkillCheck",
            title: "Group Skill Check",
            icon: "fas fa-user-check",
            visible: game.user.isGM,
            button: true,
            onChange: (event, active) => {
                // ui.controls.initialize({tool: "select"});
                return new GroupSkillCheck().render(true);
            }
        };
        controls.tokens.tools.grouprollSavingThrow = {
            name: "grouprollSavingThrow",
            title: "Group Saving Throw",
            icon: "fas fa-user-shield",
            visible: game.user.isGM,
            button: true,
            onChange: (event, active) => {
                // ui.controls.initialize({tool: "select"});
                return new GroupAbilityCheck().render(true);
            }
        };
    };
});

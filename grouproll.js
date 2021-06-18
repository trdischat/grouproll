// Import JavaScript modules
import { registerSettings } from "./module/settings.js";
import { preloadTemplates } from "./module/templates.js";
import {
    GroupSkillCheck,
    GroupAbilityCheck,
    GroupSkillCheckPF2E,
    GroupSavePF2E
} from "./module/apps.js";
import { avgD20roll, debugLog } from "./module/lib.js";

CONFIG._tsrmod_debug = false;

/* ------------------------------------ */
/* Initialize module					*/
/* ------------------------------------ */
Hooks.once('init', async function () {
    console.log('grouproll | Initializing grouproll');

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
    console.log('grouproll | Setup grouproll');
});

/* ------------------------------------ */
/* When ready							*/
/* ------------------------------------ */
Hooks.once('ready', function () {
    console.log('grouproll | Ready grouproll');

    // Alter Advantage Type labels for Pathfinder 2e
    if (game.system.id === "pf2e") {
        CONFIG._grouproll_module_advantageStatus[1].label = "Fortune";
        CONFIG._grouproll_module_advantageStatus[-1].label = "Misfortune";
    };

    // Only insert code into D&D 5e system if roll averaging is enabled in grouproll module
    if (game.system.id === "dnd5e" && game.settings.get("grouproll", "averageRolls") != "n") {

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
                if (rollType[1]) debugLog("grouproll", rollType[1] + " = Death Saving Throw");
                else if (rollType[2]) debugLog("grouproll", rollType[2] + " = Check or Save");
                else if (rollType[3]) debugLog("grouproll", rollType[3] + " = Attack Roll");

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
            }

            // Return adjusted roll
            return this;
        };
    }

});

/* ------------------------------------ */
/* Additional Hooks                     */
/* ------------------------------------ */
Hooks.on('getSceneControlButtons', controls => {

    // Add Group Roll buttons to UI
    let tokenButton = controls.find(b => b.name == "token")
    if (tokenButton) {
        tokenButton.tools.push(
            {
                name: "skill",
                title: "Group Skill Check",
                icon: "fas fa-user-check",
                visible: game.user.isGM,
                onClick: () => {
                    tokenButton.activeTool = "select";
                    if (game.system.id === "pf2e") return new GroupSkillCheckPF2E().render(true);
                    else return new GroupSkillCheck().render(true);
                }
            },
            {
                name: "ability",
                title: game.system.id === "pf2e" ? "Group Saving Throw" : "Group Ability Check",
                icon: "fas fa-user-shield",
                visible: game.user.isGM,
                onClick: () => {
                    tokenButton.activeTool = "select";
                    if (game.system.id === "pf2e") return new GroupSavePF2E().render(true);
                    else return new GroupAbilityCheck().render(true);
                }
            }
        );
    }

});

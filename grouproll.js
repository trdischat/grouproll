// Import JavaScript modules
import { registerSettings } from "./module/settings.js";
import { preloadTemplates } from "./module/templates.js";
import {
    GroupSkillCheck,
    GroupAbilityCheck,
    GroupSkillCheckPF2E,
    GroupSavePF2E
} from "./module/apps.js";
import { avgD20roll } from "./module/lib.js";

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

    // Regex for matching roll types
    CONFIG._grouproll_module_matchrolls = new RegExp(
        "(" + game.i18n.localize("GRTYPE.Death") + ")|(" +
        game.i18n.localize("GRTYPE.Check") + "|" +
        game.i18n.localize("GRTYPE.Save") + "|" +
        game.i18n.localize("GRTYPE.Skill") + "|" +
        game.i18n.localize("GRTYPE.Tool") + ")|(" +
        game.i18n.localize("GRTYPE.Attack") + ")");

    // Insert d20 roll averaging function into dnd5e system
    CONFIG.Dice.D20Roll.prototype.grouprollAverage = avgD20roll;
    CONFIG.Dice.D20Roll.prototype.grouprollEvaluate = Roll.prototype.evaluate;
    CONFIG.Dice.D20Roll.prototype.evaluate = function ({ minimize = false, maximize = false, async } = {}) {
        let roll = this.grouprollEvaluate(minimize, maximize, async);
        const rollType = roll.options.flavor.match(CONFIG._grouproll_module_matchrolls);

        // ! Uncomment next three lines to debug detection of roll types when adding languages !
        // if (rollType[1]) console.log("grouproll | Death Saving Throw");
        // else if (rollType[2]) console.log("grouproll | Check or Save");
        // else if (rollType[3]) console.log("grouproll | Attack Roll");

        // Average normal d20 rolls only for selected roll types
        if (roll.options.advantageMode === 0) {
            switch (game.settings.get("grouproll", "averageRolls")) {
                case "c":
                    if (rollType[2]) this.grouprollAverage(roll);
                    break;
                case "a":
                    if (rollType[2] || rollType[3]) this.grouprollAverage(roll);
                    break;
                default:
            };
        }

        // Return adjusted roll
        return roll;
    };

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

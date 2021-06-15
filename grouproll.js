// Import JavaScript modules
import { registerSettings } from "./module/settings.js";
import { preloadTemplates } from "./module/templates.js";
import {
    GroupSkillCheck,
    GroupAbilityCheck,
    GroupSkillCheckPF2E,
    GroupSavePF2E
} from "./module/apps.js";
// import { libWrapper } from "./module/shim.js";

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

});

/* ------------------------------------ */
/* When ready							*/
/* ------------------------------------ */
Hooks.once('ready', function () {

    // Alter Advantage Type labels for Pathfinder 2e
    if (game.system.id === "pf2e") {
        CONFIG._grouproll_module_advantageStatus[1].label = "Fortune";
        CONFIG._grouproll_module_advantageStatus[-1].label = "Misfortune";
    };

    // libWrapper.register('grouproll', 'Class.prototype.function', function (wrapped, ...args) {
    //     result = wrapped(...args);
    //     result = result + 1;
    //     return result;
    // }, 'MIXED');

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

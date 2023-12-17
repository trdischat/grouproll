export const preloadTemplates = async function () {
    const templatePaths = [
        'modules/grouproll/templates/group-app-window.html',
        'modules/grouproll/templates/group-chat-roll.html',
        'modules/grouproll/templates/group-chat-tooltip.html',
        'modules/grouproll/templates/group-ability-check.html',
        'modules/grouproll/templates/group-skill-check.html'
    ];
    return loadTemplates(templatePaths);
};

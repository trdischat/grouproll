class trdisGRpatch {

  static appTemplatePatch() {
    let newClass = Application;
    newClass = trPatchLib.patchMethod(newClass, "_renderOuter", 13,
    `let html = await renderTemplate("templates/app-window.html", windowData);`,
    `let html = await renderTemplate("modules/grouproll/templates/group-app-window.html", windowData);`);
    if (!newClass) return;
    Application.prototype._renderOuter = newClass.prototype._renderOuter;
  }

}

Hooks.once("ready", function() {
  // TODO Write new average rolls patch using hooks or libWrapper
  // if (game.system.id === "dnd5e" && game.settings.get("grouproll", "averageRolls")) {}
  // TODO Rework appTemplate patch using hooks or libWrapper
  trdisGRpatch.appTemplatePatch();
});

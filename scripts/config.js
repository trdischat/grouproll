// Configure rolling behavior
CONFIG._grouproll_module_averageRolls = false;         // Set to false to use normal 1d20 roll rather than averaging 2d20
CONFIG._grouproll_module_halflingLuckEnabled = true;  // Set to false if Halfling Luck patch not applied

// Advantage Types
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

const moduleId = "pf2e-critical-fail";

function registerSettings() {
  game.settings.register(moduleId, "ancestryParagon", {
      name: "Ancestry Paragon Variant Rule",
      hint: "Instead of starting with one ancestry feat and gaining another at 5th, 9th, 13th, and 17th levels, the character starts with two ancestry feats and gains another at every odd level thereafter (3rd, 5th, 7th, 9th, and so on) for a total of 11 ancestry feats.",
    scope: "world",
    config: true,
    requiresReload: true,
    type: Boolean,
    default: false,
  });
}

function dev() {
  return game.modules.get(moduleId).version === "dev";
}

async function variantFeats() {
  const ancestryParagon = game.settings.get(
    moduleId,
    "ancestryParagon",
  );

  // Add campaign feat sections if enabled
  if (ancestryParagon) {
    const campaignFeatSections = game.settings.get(
      "pf2e",
      "campaignFeatSections",
    );
    if (ancestryParagon) {
      if (
        !campaignFeatSections.find(
            (section) => section.id === "ancestryParagonClass",
        )
      ) {
        campaignFeatSections.push({
            id: "ancestryParagonClass",
          label: "Ancestry Paragon Feats",
          supported: ["ancestry"],
          slots: [1, 3, 7, 11, 15, 19],
        });
      }
    }

    await game.settings.set("pf2e", "campaignFeatSections", campaignFeatSections);
  }

  const campaignFeatSections = game.settings.get(
    "pf2e",
    "campaignFeatSections",
  );
  // ... or remove it if disabled.
  if (
    campaignFeatSections &&
    !ancestryParagon &&
    campaignFeatSections.find(
        (section) => section.id === "ancestryParagonClass",
    )
  ) {
    campaignFeatSections.splice(
      campaignFeatSections.findIndex(
          (section) => section.id === "ancestryParagonClass",
      ),
      1,
    );

    await game.settings.set("pf2e", "campaignFeatSections", campaignFeatSections);
  }
}

Hooks.on("ready", () => {
    variantFeats();
});

Hooks.once("init", () => {
  registerSettings();
});

Hooks.on("renderCharacterSheetPF2e", async (data, html) => {
  const ancestrySlug = data.actor.ancestry?.slug || "";

  const featGroupTraits = {
    "ancestryParagonClass": [ancestrySlug].filter(entry => entry.trim() != ''),
  };

  for (const key in featGroupTraits) {
    if (Object.prototype.hasOwnProperty.call(featGroupTraits, key)) {
      const element = featGroupTraits[key];

      if (undefined === data.actor.feats.get(key)) {
        continue;
      }
      
      data.actor.feats.get(key).filter.traits = [];

      element.forEach(trait => {
        if (data.actor.feats.get(key).filter.traits.indexOf(trait) === -1) {
          data.actor.feats.get(key).filter.traits.push(trait);
        };
      });
    }
  };
});
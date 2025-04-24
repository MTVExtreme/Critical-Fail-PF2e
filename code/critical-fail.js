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

    game.settings.register(moduleId, "enableSurges", {
        name: "Enable Surges on Spell Cast",
        hint: "Will automatically roll a surge each time a non-cantrip spell is cast",
        scope: "world",
        config: true,
        requiresReload: false,
        type: Boolean,
        default: false,
    });
}

function dev() {
  return game.modules.get(moduleId).version === "dev";
}

async function rollFlatCheck(dc, { hidden = false, label, actor }) {
    return await game.pf2e.Check.roll(
        new game.pf2e.StatisticModifier(label, []),
        {
            actor,
            type: "flat-check",
            dc: { value: dc, visible: true },
            options: /* @__PURE__ */ new Set(["flat-check"]),
            createMessage: true,
            skipDialog: true,
            rollMode: hidden ? "blindroll" : "roll"
        }
    );
}

async function checkSpellCast(message, data, userID) {

    if (game.user.id !== game.users.find((u) => u.isGM && u.active).id) return;

    const actor = message?.actor ?? game.actors.get(message?.speaker?.actor);
    const token = message?.token ?? game.canvas.tokens.get(message?.speaker?.token);
    let { item } = message;
    const originUUID = message.flags.pf2e?.origin?.uuid;

    const type =  message.flags?.pf2e?.origin?.type || message.flags?.pf2e?.context?.type;
    const castRank = message.flags?.pf2e?.origin?.castRank;

    const isBlind = message.blind;

    const whisper = message.whisper || [];

    const rollOptions = message.flags?.pf2e?.origin?.rollOptions || [];

    const isHealingOrInnateSpell = rollOptions.includes("healing") || rollOptions.includes("spellcasting:innate");

    const isCantrip = rollOptions.includes("cantrip");

    if ((type === "spell-cast" || type === "spell") && !isHealingOrInnateSpell) {
        if (!isCantrip) {
            await rollForSurge(castRank + 1, { actor: actor, isBlind: (isBlind || whisper.length > 0) });
        }
        else return;
    }
    else return;
}

async function rollForSurge(castRank, { actor, isBlind  }) {
    const roll = await rollFlatCheck(castRank, { hidden: isBlind, label: "Surge Check", actor: actor });

    console.log("degreeOfSuccess");
    console.log(roll.options.degreeOfSuccess);
    console.log(roll.degreeOfSuccess);

    if (roll.options.degreeOfSuccess < 2)
        await rollFlatCheck(10, { hidden: true, label: "Surge Severity", actor: actor });

    console.log("Roll");
    console.log(roll);

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

Hooks.on("createChatMessage", async (message, data, userID) => {

    const enableSurges = game.settings.get(
        moduleId,
        "enableSurges",
    );

    if (enableSurges) {
        await checkSpellCast(message, data, userID);
    }
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
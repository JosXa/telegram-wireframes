# Admiral and art-style studies

The character sheets explore two alternate guides: Admiral Renn Calder and Admiral Mara Voss. Their reference sheets define proposed identities. The scene sheets explore their presence during onboarding and later play.

The style options compare rendering across both admirals, a patrol ship and a colony building. Numbered images correspond to `styles.json`. The palette is held similar to make the rendering differences easier to compare. `style-review.json` records the chosen base, rejected options and requested refinements.

Before generating any Space Emperors image, read the game's [Art style](../../../bots/gamebot/docs/ART-STYLE.md). Apply the general rendering direction to the prompt, then add the subject brief and any references needed for continuity. Character appearance belongs in its own reference, outside the general art-style document.

The original character images predate the style shortlist. `permutations/` contains identity anchors and scene sheets. Read the [character reference](CHARACTERS.md) for anchor selection, proposed lore and guidance on voice and visual continuity.

## Compare them inside Telegram

```sh
bun run admirals:render
bun run admirals:serve
```

Open the URL printed by the serve command. Step through the journey and compare either admiral or both. The default treatment applies the ratings in `feedback.json`: Skip removes character art and dialogue, while Maybe stays visible for further comparison. Dispatch experience controls whether guidance appears at confirmation. The exact number of launches before it stops remains open.

Every-screen portraits, milestone portraits and factual screens remain available for comparison. Each situation has Use, Maybe and Skip controls plus a note field. The imported ratings stay visible beside the preview. Further choices stay in that browser and can be exported with the imported ratings as Markdown.

The screenshots use Telegram Web A in light and dark themes. Open Telegram from a comparison card to inspect the fixture directly. The fleet review opens a working Mini App with ship selection, travel speed, a quote and dispatch confirmation. Chat buttons are storyboard examples, so use the review page's Next control to advance the journey.

`admirals:build` crops each scene sheet into individual images, builds the review and fleet apps, and validates the generated fixtures. `admirals:render` uses independent browsers to render those fixtures. Generated assets and screenshots are written under the ignored `wireframes/admiral-onboarding/` directory. The source images remain in this example directory.

## Copy review

Edit [copy.ts](copy.ts) for all player-facing onboarding text, including both admirals' dialogue, game facts, actions and Mini App labels. Keep wording changes there so the chat and Mini App use the same source. The build exports `copy-review.md` so the wording can be reviewed together, available from the comparison header.

# Frontier Relay admirals

## Lore proposal

Independent colonies maintain the Frontier Relay to share navigation and emergency assistance. A relay admiral greets each newly appointed commander, helps establish local production, and stays available through the Advisor.

The first command follows the game's [onboarding chain](https://github.com/JosXa/space-emperors/blob/main/docs/game-design.md). The admiral teaches the player to build a mine, establish ship production, send a fleet and read its report. After the fleet returns, the admiral hands control back to the player.

These guides have no game statistics in this study. Assigning admirals to fleets for bonuses is a separate gameplay proposal.

## Renn Calder

Calder spent his early command moving supplies to isolated colonies. He became known for bringing crews home without making a ceremony of it.

He is a mature man with a weathered rectangular face, swept-back dark hair with silver temples, and a short salt-and-pepper beard. His graphite uniform has subdued teal panels and small brass insignia. Use the selected style's reference for exact facial proportions and insignia placement.

He speaks patiently, sometimes dryly, and gives a reason for an instruction. He does not praise every click. After a loss he focuses on understanding the report before committing more ships.

## Mara Voss

Voss flew patrol fighters before taking a relay command. She still visits the hangar and prefers a concrete decision to a speech.

She is an adult woman with brown skin, an angular face, a short asymmetrical dark undercut with a silver forelock, and a small cheek scar. Her uniform uses the same graphite, teal and brass vocabulary. Use the selected style's reference for the precise haircut and scar orientation.

She is direct, alert and protective of her crews. Her warmth comes through practical help and occasional dry humor. Defeat makes her serious, without blaming the player or demanding an immediate return attack.

## Visual continuity

Before every image generation, read the game's [Art style](../../../bots/gamebot/docs/ART-STYLE.md). Its rendering direction applies regardless of the subject.

For each admiral, use the matching `permutations/<style>-<admiral>-reference.png` as the image reference in every prompt. Match the face and uniform to that image. Change only the requested pose, expression or setting. Keep scars and insignia on their original sides.

Inspect each generated image against its anchor before use. Establish a new anchor explicitly if the character design changes. Reuse the anchor for later scenes rather than treating the most recently generated pose as the new identity.

## Presence

The comparison offers three treatments:

- Every screen includes the admiral's portrait and guidance.
- Milestones use portraits at first contact, the first fleet, dispatch, a battle outcome and the end of onboarding. Other screens use a brief line without a portrait.
- No admiral shows the same game facts and controls without character dialogue.

An unknown incoming movement stays unverified in every treatment. A serious portrait must not imply that its mission is hostile. Routine screens must remain useful without repeated character appearances. Quiet hours and reminder preferences belong to the player.

// MK spectral class and luminosity class are separate from system multiplicity.
// Stellar evolution: https://science.nasa.gov/universe/stars/types/
// Remnant mass classes: https://science.nasa.gov/universe/black-holes/types/
// Palette and occurrence weights serve the map study, not a measured stellar census.
export const spectralClasses = {
	O: { color: "#8baaff", name: "Blue", radius: 2.4 },
	B: { color: "#a4c6ff", name: "Blue-white", radius: 2.1 },
	A: { color: "#d2e1ff", name: "White", radius: 1.8 },
	F: { color: "#f3efda", name: "Yellow-white", radius: 1.6 },
	G: { color: "#f2d99c", name: "Warm white", radius: 1.5 },
	K: { color: "#e9a367", name: "Orange", radius: 1.3 },
	M: { color: "#d87856", name: "Orange-red", radius: 1.1 },
};
export const luminosityClasses = { V: "Main sequence", III: "Giant", I: "Supergiant" };

export function stellarSystem(rand) {
	const roll = rand();
	if (roll < 0.025) return [{ kind: "black-hole", accreting: true }, star(rand)];
	if (roll < 0.05) return [{ kind: "neutron-star", pulsar: rand() < 0.7 }];
	if (roll < 0.1) return [{ kind: "white-dwarf", atmosphere: rand() < 0.7 ? "DA" : "DB" }];
	const primary = star(rand);
	const multiplicity = rand();
	return [primary, ...(multiplicity < 0.3 ? [star(rand)] : []), ...(multiplicity < 0.05 ? [star(rand)] : [])];
}

function star(rand) {
	const roll = rand();
	const spectral =
		roll < 0.01
			? "O"
			: roll < 0.04
				? "B"
				: roll < 0.09
					? "A"
					: roll < 0.17
						? "F"
						: roll < 0.3
							? "G"
							: roll < 0.5
								? "K"
								: "M";
	const evolution = rand();
	// Evolutionary classes are sample labels, not an evolutionary simulation.
	const luminosity = evolution < 0.02 ? "I" : evolution < 0.09 && "KM".includes(spectral) ? "III" : "V";
	return { kind: "star", spectral, subclass: Math.floor(rand() * 10), luminosity };
}

export function classify(component) {
	if (component.kind === "star")
		return `${component.spectral}${component.subclass} ${component.luminosity} · ${luminosityClasses[component.luminosity]}`;
	if (component.kind === "white-dwarf") return `${component.atmosphere} · White dwarf`;
	if (component.kind === "neutron-star") return component.pulsar ? "Neutron star · Pulsar" : "Neutron star";
	return "Stellar-mass black hole";
}

export function multiplicity(components) {
	return components.length === 1
		? components[0].kind === "star"
			? "Single star"
			: "Isolated remnant"
		: components.length === 2
			? "Binary system"
			: "Triple system";
}

import { random } from "../../utils/random";

export enum Regions {
	Desert,
	Ocean,
	Plain,
	Forest,
	Arctic,
	Meadow,
	Valley,
}

export enum LocationType {
	Capital,
	Farm,
	Mine,
	Market,
	Fort,
	Harbor,
}

export interface Location {
	name: string;
	region: Regions;
	type: LocationType;
	isLocked: boolean;
}

const desertPrefixes = ["Sun", "Ash", "Dune", "Mirage", "Ember", "Saffron"];
const desertSuffixes = ["reach", "hollow", "oasis", "scar", "veil", "dunes"];

function genDesertName() {
	return random(desertPrefixes) + random(desertSuffixes);
}

const oceanPrefixes = ["Coral", "Abyss", "Tide", "Wave", "Pearl", "Salt"];
const oceanSuffixes = ["deep", "harbor", "bay", "reef", "current", "whisper"];

function genOceanName() {
	return random(oceanPrefixes) + random(oceanSuffixes);
}

const plainPrefixes = ["Golden", "Sun", "Wind", "Green", "Harvest", "Bright"];
const plainSuffixes = ["field", "meadow", "plain", "bend", "vale", "reach"];

function genPlainName() {
	return random(plainPrefixes) + random(plainSuffixes);
}

const forestPrefixes = ["Whisper", "Moon", "Elder", "Oak", "Thorn", "Moss"];
const forestSuffixes = ["wood", "grove", "hollow", "shade", "leaf", "bark"];

function genForestName() {
	return random(forestPrefixes) + random(forestSuffixes);
}

const arcticPrefixes = ["Frost", "Ice", "Snow", "Glacier", "White", "Winter"];
const arcticSuffixes = ["reach", "veil", "spire", "fang", "hollow", "tundra"];

function genArcticName() {
	return random(arcticPrefixes) + random(arcticSuffixes);
}

const meadowPrefixes = ["Soft", "Bloom", "Honey", "Gentle", "Daisy", "Sunlit"];
const meadowSuffixes = ["field", "glade", "meadow", "vale", "rest", "hollow"];

function genMeadowName() {
	return random(meadowPrefixes) + random(meadowSuffixes);
}

const valleyPrefixes = ["Shadow", "Stone", "River", "Echo", "Deep", "Lost"];
const valleySuffixes = ["valley", "pass", "rift", "gorge", "bend", "hollow"];

function genValleyName() {
	return random(valleyPrefixes) + random(valleySuffixes);
}

export function generateLocationName(region: Regions): string {
	switch (region) {
		case Regions.Desert:
			return genDesertName();

		case Regions.Ocean:
			return genOceanName();

		case Regions.Plain:
			return genPlainName();

		case Regions.Forest:
			return genForestName();

		case Regions.Arctic:
			return genArcticName();

		case Regions.Meadow:
			return genMeadowName();

		case Regions.Valley:
			return genValleyName();
	}
}

const regionTypes: Record<Regions, LocationType[]> = {
	[Regions.Desert]: [
		LocationType.Capital,
		LocationType.Mine,
		LocationType.Market,
		LocationType.Fort,
	],

	[Regions.Ocean]: [
		LocationType.Harbor,
		LocationType.Market,
		LocationType.Fort,
		LocationType.Capital,
	],

	[Regions.Plain]: [
		LocationType.Farm,
		LocationType.Market,
		LocationType.Capital,
		LocationType.Fort,
	],

	[Regions.Forest]: [
		LocationType.Farm,
		LocationType.Mine,
		LocationType.Fort,
		LocationType.Capital,
	],

	[Regions.Arctic]: [
		LocationType.Mine,
		LocationType.Fort,
		LocationType.Capital,
	],

	[Regions.Meadow]: [
		LocationType.Farm,
		LocationType.Market,
		LocationType.Capital,
	],

	[Regions.Valley]: [
		LocationType.Farm,
		LocationType.Mine,
		LocationType.Market,
		LocationType.Fort,
		LocationType.Capital,
	],
};

export function generateLocation(region: Regions): Location {
	const name = generateLocationName(region);
	const typePool = regionTypes[region];

	return {
		name,
		region,
		type: random(typePool),
		isLocked: true,
	};
}

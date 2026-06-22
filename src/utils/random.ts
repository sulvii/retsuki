type State = [bigint, bigint];

const MASK64 = (1n << 64n) - 1n;

function rotl(x: bigint, k: bigint): bigint {
	return ((x << k) | (x >> (64n - k))) & MASK64;
}

function next(state: State): [bigint, State] {
	const [s0, s1] = state;
	const result = (rotl(s0 + s1, 17n) + s0) & MASK64;

	const ns1 = (s0 ^ s1) & MASK64;
	const nextState: State = [
		(rotl(s0, 49n) ^ ns1 ^ ((ns1 << 21n) & MASK64)) & MASK64,
		rotl(ns1, 28n),
	];

	return [result, nextState];
}

function getCrypto(): Crypto {
	return typeof crypto !== "undefined"
		? crypto
		: (require("node:crypto").webcrypto as Crypto);
}

function seedFromCrypto(): State {
	const buf = new Uint8Array(16);
	getCrypto().getRandomValues(buf);
	const view = new DataView(buf.buffer);
	const lo0 = view.getBigUint64(0, true);
	const lo1 = view.getBigUint64(8, true);
	return [lo0 === 0n ? 1n : lo0, lo1 === 0n ? 1n : lo1];
}

export class Xoroshiro128pp {
	#state: State;

	constructor(seed?: State) {
		this.#state = seed ?? seedFromCrypto();
	}

	nextBigInt(): bigint {
		const [value, nextState] = next(this.#state);
		this.#state = nextState;
		return value;
	}

	nextInt(max: number): number {
		if (max <= 0) throw new Error("max must be greater than 0");

		const bigMax = BigInt(max);
		const range = 1n << 64n;
		const maxValid = (range / bigMax) * bigMax;

		let value: bigint;
		do {
			value = this.nextBigInt();
		} while (value >= maxValid);

		return Number(value % bigMax);
	}

	nextFloat(): number {
		return Number(this.nextBigInt() >> 11n) / 2 ** 53;
	}

	pick<T>(arr: T[]): T {
		if (arr.length === 0) throw new Error("No values provided");
		return arr[this.nextInt(arr.length)] as T;
	}

	choose<T>(...values: T[]): T {
		if (values.length === 0) throw new Error("No values provided");
		return this.pick(values);
	}
}

const _default = new Xoroshiro128pp();

export const random = <T>(arr: T[]): T => _default.pick(arr);

export const chooseFrom = <T>(...v: T[]): T => _default.choose(...v);

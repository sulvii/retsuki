function secureRandomIndex(max: number): number {
	if (max <= 0) throw new Error("max must be greater than 0");

	const cryptoObj: Crypto =
		typeof crypto !== "undefined"
			? crypto
			: (require("node:crypto").webcrypto as Crypto);

	const range = 256;
	const maxValid = Math.floor(range / max) * max;

	const buf = new Uint8Array(1);
	let value: number;

	do {
		cryptoObj.getRandomValues(buf);
		value = buf[0] as number;
	} while (value >= maxValid);

	return value % max;
}

export const random = <T>(arr: T[]): T => {
	if (arr.length === 0) throw new Error("No values provided");
	return arr[secureRandomIndex(arr.length)] as T;
};

export function chooseFrom<T>(...v: Array<T>): T {
	if (v.length === 0) throw new Error("No values provided");
	if (v.length === 1) return v[0] as T;

	return v[secureRandomIndex(v.length)] as T;
}

export const random = <T>(arr: T[]): T =>
	arr[Math.floor(Math.random() * arr.length)] || (arr[0] as T);

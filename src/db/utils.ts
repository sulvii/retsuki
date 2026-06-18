import { customAlphabet } from "nanoid";

const UPPERCASE_ALPHANUMERIC = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const generateCitizenId = () =>
	customAlphabet(UPPERCASE_ALPHANUMERIC, 6)();

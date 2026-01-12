export function generateRandomString(length = 12): string {
	let result = "";
	for (let i = 0; i < length; i++) {
		result += String.fromCharCode(97 + Math.floor(Math.random() * 26));
	}
	return result;
}

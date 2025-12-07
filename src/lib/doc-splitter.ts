export function splitText(
	text: string,
	chunkSize = 200,
	overlap = 50,
): string[] {
	const words = text.split(" ");
	const chunks: string[] = [];

	for (let i = 0; i < words.length; i += chunkSize - overlap) {
		const chunk = words.slice(i, i + chunkSize).join(" ");
		chunks.push(chunk);
	}

	return chunks;
}

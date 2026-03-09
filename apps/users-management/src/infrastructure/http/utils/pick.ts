export function pickPresent<T extends object>(
	source: T,
	keys: (keyof T)[]
): Partial<T> {
	const result: Partial<T> = {}
	for (const key of keys) {
		if (Object.prototype.hasOwnProperty.call(source, key)) {
			result[key] = source[key]
		}
	}
	return result
}

// Uso:
// const data = pickPresent(req.body, ['name', 'description', 'leaderId'])
// Retorna só os campos que foram enviados (mesmo se null)

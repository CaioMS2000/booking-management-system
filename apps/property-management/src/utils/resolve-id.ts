import { UniqueId } from '@repo/core'
import { appContext } from '@/application-context'

export async function resolveId(id?: UniqueId) {
	let resolvedId: UniqueId

	if (id) {
		resolvedId = id
	} else {
		const context = appContext.get()
		const idGenerator = context.idGenerator.V4
		const newId = await idGenerator.generate()
		resolvedId = newId
	}

	return resolvedId
}

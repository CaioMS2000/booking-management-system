import { UniqueEntityID } from '@repo/core'
import { appContext } from '@/application-context'

export async function resolveId(id?: UniqueEntityID) {
	let resolvedId: UniqueEntityID

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

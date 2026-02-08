import type { OpenAPIV3 } from 'openapi-types'

interface TransformedAuthSpec {
	paths: OpenAPIV3.PathsObject
	tags: OpenAPIV3.TagObject[]
	components: {
		schemas?: OpenAPIV3.ComponentsObject['schemas']
		securitySchemes?: OpenAPIV3.ComponentsObject['securitySchemes']
	}
}

export function transformAuthSpec(
	authSpec: OpenAPIV3.Document
): TransformedAuthSpec {
	const paths: OpenAPIV3.PathsObject = {}
	for (const [path, value] of Object.entries(authSpec.paths ?? {})) {
		paths[`/auth${path}`] = value
	}

	const tags: OpenAPIV3.TagObject[] = (authSpec.tags ?? []).map(tag =>
		tag.name === 'Default'
			? {
					...tag,
					name: 'Authentication',
					description: 'Authentication endpoints',
				}
			: tag
	)

	for (const pathValue of Object.values(paths)) {
		if (!pathValue) continue
		for (const method of Object.values(pathValue)) {
			const operation = method as OpenAPIV3.OperationObject | undefined
			if (operation?.tags) {
				operation.tags = operation.tags.map(t =>
					t === 'Default' ? 'Authentication' : t
				)
			}
		}
	}

	return {
		paths,
		tags,
		components: {
			schemas: authSpec.components?.schemas,
			securitySchemes: authSpec.components?.securitySchemes,
		},
	}
}

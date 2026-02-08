import type { OpenAPIV3 } from 'openapi-types'

export function patchAuthSpec(authSpec: OpenAPIV3.Document): void {
	const signUpPath = authSpec.paths?.['/sign-up/email']
	if (!signUpPath) return

	const postOperation = signUpPath.post as OpenAPIV3.OperationObject | undefined
	const requestBody = postOperation?.requestBody as
		| OpenAPIV3.RequestBodyObject
		| undefined
	const signUpSchema = requestBody?.content?.['application/json']?.schema as
		| OpenAPIV3.SchemaObject
		| undefined

	if (signUpSchema) {
		signUpSchema.properties = {
			...signUpSchema.properties,
			phone: {
				type: 'string',
				description: 'Telefone do usuário (obrigatório)',
			},
		}
		signUpSchema.required = [...(signUpSchema.required || []), 'phone']
	}
}

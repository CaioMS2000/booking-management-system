import { Rule } from '@repo/core'

export class CEPLengthRule extends Rule<string> {
	message = 'CEP must have 8 digits'
	validate(value: string): boolean {
		return value.length === 8
	}
}

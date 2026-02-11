import { Either, failure, success, ValueObject } from '@repo/core'
import { CEPLengthRule } from './rules/cep-length-rule'

export class CEP extends ValueObject<string> {
	static create(value: string): Either<null, CEP> {
		const cepLengthRule = new CEPLengthRule()
		if (!cepLengthRule.validate(value)) {
			return failure(null)
		}
		return success(new CEP(value))
	}
}

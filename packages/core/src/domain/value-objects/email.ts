import { Either, failure, success } from '../../either'
import { ValueObject } from '../../value-object'
import { InvalidValueError } from '../@errors/domain-errors/invalid-value-error'

export class Email extends ValueObject<string> {
	private constructor(value: string) {
		super(value)
	}

	static create(email: string): Either<InvalidValueError, Email> {
		if (!email.includes('@')) {
			return failure(new InvalidValueError('Email inválido'))
		}

		if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
			return failure(new InvalidValueError('Formato de email inválido'))
		}

		return success(new Email(email))
	}
}

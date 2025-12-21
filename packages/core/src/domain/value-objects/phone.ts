import { Either, failure, success } from '@/either'
import { ValueObject } from '../../value-object'
import { InvalidValueError } from '../@errors/domain-errors/invalid-value-error'

//556293765723 -> 12 digitos(e 13 tambem porque em alguns estados os telefone ganharam um '9' a mais no começo)
export class Phone extends ValueObject<string> {
	static create(phone: string): Either<InvalidValueError, Phone> {
		const cleaned = phone.replace(/\D/g, '')

		if (cleaned.length < 12 || cleaned.length > 13) {
			return failure(
				new InvalidValueError('Telefone deve ter entre 12 e 13 dígitos')
			)
		}

		return success(new Phone(cleaned))
	}
}

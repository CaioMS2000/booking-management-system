import { Either, success } from '../../either'
import { ValueObject } from '../../value-object'

export class Name extends ValueObject<string> {
	static create(name: string): Either<null, Name> {
		return success(new Name(name))
	}
}

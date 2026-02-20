import { failure, Result, success } from '../../result'
import { ValueObject } from '../../value-object'
import { InvalidValueError } from '../@errors/domain-errors/invalid-value-error'
import { EmailContainsAtRule } from './rules/email-contains-at-rule'
import { EmailFormatRule } from './rules/email-format-rule'

export class Email extends ValueObject<string> {
	private constructor(value: string) {
		super(value)
	}

	static create(email: string): Result<InvalidValueError, Email> {
		const containsAtRule = new EmailContainsAtRule()
		const formatRule = new EmailFormatRule()

		if (!containsAtRule.validate(email)) {
			return failure(new InvalidValueError(containsAtRule.message))
		}

		if (!formatRule.validate(email)) {
			return failure(new InvalidValueError(formatRule.message))
		}

		return success(new Email(email))
	}
}

import { ValueObject } from '@repo/core'
import { CURRENCIES, Currency } from '../@types/currency'

export type MoneyProps = {
	valueInCents: number
	currency: Currency
}

export class Money extends ValueObject<MoneyProps> {
	static create(props: MoneyProps) {
		return new Money(props)
	}

	getAmount(format: 'minor' | 'major' = 'minor') {
		const { valueInCents, currency } = this._value
		const fractionDigits = CURRENCIES[currency].fractionDigits

		if (format === 'major') {
			return valueInCents / 10 ** fractionDigits // divide by 10 to the power of fractionDigits
		}

		return valueInCents
	}

	getCurrency() {
		return this._value.currency
	}
}

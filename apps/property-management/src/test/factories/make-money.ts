import { faker } from '@faker-js/faker'
import { Currency, Money } from '@/domain'

export function makeMoney(currency: Currency = 'BRL'): Money {
	return Money.create({
		valueInCents:
			Number.parseFloat(faker.commerce.price({ min: 100, max: 800 })) * 100,
		currency,
	})
}

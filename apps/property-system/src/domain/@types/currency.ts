export const Currency = ['USD', 'BRL'] as const
export type Currency = (typeof Currency)[number]

type CurrencyConfig = {
	code: Currency
	fractionDigits: number
}

export const CURRENCIES: Record<Currency, CurrencyConfig> = {
	BRL: { code: 'BRL', fractionDigits: 2 },
	USD: { code: 'USD', fractionDigits: 2 },
}

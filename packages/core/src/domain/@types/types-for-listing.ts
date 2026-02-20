export const IntervalStatus = [
	'AVAILABLE',
	'BLOCKED',
	'HOLD',
	'RESERVED',
] as const
export type IntervalStatus = (typeof IntervalStatus)[number]

export type DateInterval = {
	from: Date
	to: Date
	status: IntervalStatus
}

export const Currency = ['USD', 'BRL'] as const
export type Currency = (typeof Currency)[number]

export type Money = {
	valueInCents: number
	currency: Currency
}

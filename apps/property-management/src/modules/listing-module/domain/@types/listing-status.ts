export const IntervalStatus = [
	'AVAILABLE',
	'BLOCKED',
	'HOLD',
	'RESERVED',
] as const
export type IntervalStatus = (typeof IntervalStatus)[number]

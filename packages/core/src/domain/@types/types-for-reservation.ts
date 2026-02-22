export type ReservationPeriod = {
	from: Date
	to: Date
}

export const ReservationStatus = [
	'PENDING',
	'CONFIRMED',
	'CANCELLED',
	'COMPLETED',
] as const
export type ReservationStatus = (typeof ReservationStatus)[number]

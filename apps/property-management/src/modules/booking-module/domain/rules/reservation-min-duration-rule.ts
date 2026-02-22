import { Rule, ReservationPeriod } from '@repo/core'

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

export class ReservationMinDurationRule extends Rule<ReservationPeriod> {
	message = 'Reservation period must be at least 24 hours'
	validate(period: ReservationPeriod): boolean {
		return period.to.getTime() - period.from.getTime() >= TWENTY_FOUR_HOURS_MS
	}
}

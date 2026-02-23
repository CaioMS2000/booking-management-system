import { Rule } from '@repo/core'

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

export type CancellationWindowRuleInput = {
	checkInDate: Date
	now: Date
}

export class CancellationWindowRule extends Rule<CancellationWindowRuleInput> {
	message = 'Cancellation is no longer allowed within 24 hours of check-in'
	validate({ checkInDate, now }: CancellationWindowRuleInput): boolean {
		return checkInDate.getTime() - now.getTime() >= TWENTY_FOUR_HOURS_MS
	}
}

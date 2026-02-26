import { Rule } from '@repo/core'

const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000

export type IntervalWithinSlidingWindowRuleInput = {
	from: Date
	now: Date
}

export class IntervalWithinSlidingWindowRule extends Rule<IntervalWithinSlidingWindowRuleInput> {
	message = 'Interval start date must be within 12 months from now'
	validate({ from, now }: IntervalWithinSlidingWindowRuleInput): boolean {
		return from.getTime() <= now.getTime() + TWELVE_MONTHS_MS
	}
}

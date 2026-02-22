import { UniqueId } from '@repo/core'
import { appContext } from '@/application-context'
import {
	Reservation,
	ReservationCreateInput,
} from '@/modules/booking-module/domain/models/reservation'

export async function makeReservation(
	listingId: UniqueId,
	overrides?: Partial<ReservationCreateInput>
): Promise<Reservation> {
	const context = appContext.get()

	const from = new Date('2026-04-01')
	const to = new Date('2026-04-05')

	const props: ReservationCreateInput = {
		listingId,
		guestId: await context.idGenerator.V4.generate(),
		period: { from, to },
		totalPrice: { valueInCents: 60000, currency: 'BRL' },
		...overrides,
	}

	return Reservation.create(props)
}

import type { FastifyRequest } from 'fastify'
import type { Session, User } from 'better-auth/types'

// Type helper for authenticated requests (after auth middleware)
export interface AuthenticatedRequest extends FastifyRequest {
	currentUser: User
	currentSession: Session
}

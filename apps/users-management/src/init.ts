import {
	DefaultIncrementalIdGenerator,
	UUIDV4Generator,
	UUIDV7Generator,
} from '@repo/core'
import { SystemConfigService } from '@repo/system-settings-manager'
import { asFunction } from 'awilix'
import { DeleteAdminUseCase } from '@/application/use-cases/delete-admin-use-case'
import { DeleteGuestUseCase } from '@/application/use-cases/delete-guest-use-case'
import { DeleteHostUseCase } from '@/application/use-cases/delete-host-use-case'
// Application - Use Cases (Admin)
import { GetAdminUseCase } from '@/application/use-cases/get-admin-use-case'
// Application - Use Cases (Guest)
import { GetGuestUseCase } from '@/application/use-cases/get-guest-use-case'
// Application - Use Cases (Host)
import { GetHostUseCase } from '@/application/use-cases/get-host-use-case'
import { LoginUseCase } from '@/application/use-cases/login-use-case'
import { LogoutUseCase } from '@/application/use-cases/logout-use-case'
import { RefreshTokenUseCase } from '@/application/use-cases/refresh-token-use-case'
// Application - Use Cases (Auth)
import { RegisterUseCase } from '@/application/use-cases/register-use-case'
import { UpdateAdminUseCase } from '@/application/use-cases/update-admin-use-case'
import { UpdateGuestUseCase } from '@/application/use-cases/update-guest-use-case'
import { UpdateHostUseCase } from '@/application/use-cases/update-host-use-case'
// Infrastructure - Auth
import { PasswordService } from '@/infrastructure/auth/password-service'
import { TokenService } from '@/infrastructure/auth/token-service'
import { redisClient } from '@/infrastructure/database/redis/redis-client'
import { DrizzleUserRepository } from '@/infrastructure/database/repositories/drizzle-user-repository'
// Infrastructure - Repositories
import { RedisRefreshTokenRepository } from '@/infrastructure/database/repositories/redis-refresh-token-repository'
import { AdminController } from '@/infrastructure/http/controllers/admin-controller'

// HTTP - Controllers
import { AuthController } from '@/infrastructure/http/controllers/auth-controller'
import { GuestController } from '@/infrastructure/http/controllers/guest-controller'
import { HostController } from '@/infrastructure/http/controllers/host-controller'
import { container } from './container'

container.register({
	// Core
	systemConfigService: asFunction(() => new SystemConfigService()).singleton(),
	idGeneratorV4: asFunction(() => new UUIDV4Generator()).singleton(),
	idGeneratorV7: asFunction(() => new UUIDV7Generator()).singleton(),
	incrementalIdGenerator: asFunction(
		() => new DefaultIncrementalIdGenerator()
	).singleton(),

	// Auth services
	passwordService: asFunction(() => new PasswordService()).singleton(),
	tokenService: asFunction(() => new TokenService()).singleton(),

	// Repositories
	refreshTokenRepository: asFunction(
		() => new RedisRefreshTokenRepository(redisClient)
	).singleton(),
	userRepository: asFunction(() => new DrizzleUserRepository()).singleton(),

	// Auth use cases
	registerUseCase: asFunction(
		({
			userRepository,
			passwordService,
			tokenService,
			refreshTokenRepository,
		}) =>
			new RegisterUseCase({
				userRepository,
				passwordService,
				tokenService,
				refreshTokenRepository,
			})
	).singleton(),

	loginUseCase: asFunction(
		({
			userRepository,
			passwordService,
			tokenService,
			refreshTokenRepository,
		}) =>
			new LoginUseCase({
				userRepository,
				passwordService,
				tokenService,
				refreshTokenRepository,
			})
	).singleton(),

	refreshTokenUseCase: asFunction(
		({ userRepository, tokenService, refreshTokenRepository }) =>
			new RefreshTokenUseCase({
				userRepository,
				tokenService,
				refreshTokenRepository,
			})
	).singleton(),

	logoutUseCase: asFunction(
		({ tokenService, refreshTokenRepository }) =>
			new LogoutUseCase({ tokenService, refreshTokenRepository })
	).singleton(),

	// Host use cases
	getHostUseCase: asFunction(
		({ hostRepository }) => new GetHostUseCase({ hostRepository })
	).singleton(),

	updateHostUseCase: asFunction(
		({ hostRepository }) => new UpdateHostUseCase({ hostRepository })
	).singleton(),

	deleteHostUseCase: asFunction(
		({ hostRepository }) => new DeleteHostUseCase({ hostRepository })
	).singleton(),

	// Guest use cases
	getGuestUseCase: asFunction(
		({ guestRepository }) => new GetGuestUseCase({ guestRepository })
	).singleton(),

	updateGuestUseCase: asFunction(
		({ guestRepository }) => new UpdateGuestUseCase({ guestRepository })
	).singleton(),

	deleteGuestUseCase: asFunction(
		({ guestRepository }) => new DeleteGuestUseCase({ guestRepository })
	).singleton(),

	// Admin use cases
	getAdminUseCase: asFunction(
		({ adminRepository }) => new GetAdminUseCase({ adminRepository })
	).singleton(),

	updateAdminUseCase: asFunction(
		({ adminRepository }) => new UpdateAdminUseCase({ adminRepository })
	).singleton(),

	deleteAdminUseCase: asFunction(
		({ adminRepository }) => new DeleteAdminUseCase({ adminRepository })
	).singleton(),

	// Controllers
	authController: asFunction(
		({
			app,
			registerUseCase,
			loginUseCase,
			refreshTokenUseCase,
			logoutUseCase,
		}) =>
			new AuthController({
				app,
				registerUseCase,
				loginUseCase,
				refreshTokenUseCase,
				logoutUseCase,
			})
	).singleton(),

	hostController: asFunction(
		({ app, getHostUseCase, updateHostUseCase, deleteHostUseCase }) =>
			new HostController({
				app,
				getHostUseCase,
				updateHostUseCase,
				deleteHostUseCase,
			})
	).singleton(),

	guestController: asFunction(
		({ app, getGuestUseCase, updateGuestUseCase, deleteGuestUseCase }) =>
			new GuestController({
				app,
				getGuestUseCase,
				updateGuestUseCase,
				deleteGuestUseCase,
			})
	).singleton(),

	adminController: asFunction(
		({ app, getAdminUseCase, updateAdminUseCase, deleteAdminUseCase }) =>
			new AdminController({
				app,
				getAdminUseCase,
				updateAdminUseCase,
				deleteAdminUseCase,
			})
	).singleton(),
})

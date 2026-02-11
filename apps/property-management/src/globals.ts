import {
	injectable as _injectable,
	inject as _inject,
	singleton as _singleton,
	container as _container,
	InjectionToken as _InjectionToken,
} from 'tsyringe'
import { TOKENS as _TOKENS } from './tokens'

declare global {
	const injectable: typeof _injectable
	const inject: typeof _inject
	const singleton: typeof _singleton
	const container: typeof _container
	type InjectionToken<T> = _InjectionToken<T>
	const TOKENS: typeof _TOKENS
}

Object.assign(globalThis, {
	injectable: _injectable,
	inject: _inject,
	singleton: _singleton,
	container: _container,
	TOKENS: _TOKENS,
})

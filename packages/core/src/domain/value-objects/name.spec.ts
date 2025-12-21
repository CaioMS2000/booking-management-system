import { describe, expect, it } from 'vitest'
import { Name } from './name'

describe('Name', () => {
	describe('create', () => {
		it('should create a valid name', () => {
			const result = Name.create('João Silva')

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.value).toBe('João Silva')
			}
		})

		it('should create a name with single word', () => {
			const result = Name.create('João')

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.value).toBe('João')
			}
		})

		it('should create a name with multiple words', () => {
			const result = Name.create('Maria Silva Santos Costa')

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.value).toBe('Maria Silva Santos Costa')
			}
		})

		it('should create a name with accents', () => {
			const result = Name.create('José Américo da Conceição')

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.value).toBe('José Américo da Conceição')
			}
		})

		it('should create a name with hyphens', () => {
			const result = Name.create('Ana-Maria Silva-Santos')

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.value).toBe('Ana-Maria Silva-Santos')
			}
		})

		it('should create a name with apostrophes', () => {
			const result = Name.create("D'Angelo Santos")

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.value).toBe("D'Angelo Santos")
			}
		})

		it('should create an empty name', () => {
			const result = Name.create('')

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.value).toBe('')
			}
		})

		it('should preserve original spacing', () => {
			const result = Name.create('João  Silva')

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.value).toBe('João  Silva')
			}
		})
	})

	describe('value object equality', () => {
		it('should be equal when names have the same value', () => {
			const name1Result = Name.create('João Silva')
			const name2Result = Name.create('João Silva')

			expect(name1Result.isSuccess()).toBe(true)
			expect(name2Result.isSuccess()).toBe(true)

			if (name1Result.isSuccess() && name2Result.isSuccess()) {
				expect(name1Result.value.equals(name2Result.value)).toBe(true)
			}
		})

		it('should not be equal when names have different values', () => {
			const name1Result = Name.create('João Silva')
			const name2Result = Name.create('Maria Silva')

			expect(name1Result.isSuccess()).toBe(true)
			expect(name2Result.isSuccess()).toBe(true)

			if (name1Result.isSuccess() && name2Result.isSuccess()) {
				expect(name1Result.value.equals(name2Result.value)).toBe(false)
			}
		})

		it('should be case-sensitive in equality check', () => {
			const name1Result = Name.create('João Silva')
			const name2Result = Name.create('joão silva')

			expect(name1Result.isSuccess()).toBe(true)
			expect(name2Result.isSuccess()).toBe(true)

			if (name1Result.isSuccess() && name2Result.isSuccess()) {
				expect(name1Result.value.equals(name2Result.value)).toBe(false)
			}
		})
	})
})

export abstract class UseCase<Input, Output, ClassProps = null> {
	/**
	 * When providing a `ClassProps` type, you **must** override this property
	 * in a constructor to assign the actual runtime value.
	 * The type system alone does not guarantee initialization —
	 * without a constructor assignment, `props` will be `null` at runtime.
	 *
	 * @example
	 * ```ts
	 * class MyUseCase extends UseCase<Input, Output, MyProps> {
	 *     constructor(protected props: MyProps) {
	 *         super()
	 *     }
	 * }
	 * ```
	 */
	protected readonly props: ClassProps = null as ClassProps
	abstract execute(input: Input): Promise<Output>
}

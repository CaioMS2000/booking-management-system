import {
	FileSizeExceededError,
	FileNotFoundError,
	InvalidFileTypeError,
	UploadFailedError,
} from '@/storage/@errors/file-service-errors'
import { AppError } from '../errors'

/**
 * Mapeia erros de domínio do FileService para erros HTTP (AppError)
 *
 * Exemplo de uso:
 * ```typescript
 * try {
 *   const savedFile = await fileService.save(file, tenantId)
 *   return { success: true, file: savedFile }
 * } catch (error) {
 *   throw mapFileServiceError(error)
 * }
 * ```
 */
export function mapFileServiceError(error: unknown): AppError {
	if (error instanceof InvalidFileTypeError) {
		return AppError.unsupportedMediaType(
			error.message,
			`Tipos aceitos: ${error.allowed.join(', ')}`,
			{
				received: error.received,
				allowed: error.allowed,
			}
		)
	}

	if (error instanceof FileSizeExceededError) {
		const formatBytes = (bytes: number) => {
			if (bytes < 1024) return `${bytes} B`
			if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
			return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
		}

		return AppError.badRequest('BAD_REQUEST', error.message, {
			maxSize: formatBytes(error.maxSize),
			receivedSize: formatBytes(error.receivedSize),
		})
	}

	if (error instanceof FileNotFoundError) {
		return AppError.notFound('NOT_FOUND', error.message)
	}

	if (error instanceof UploadFailedError) {
		return AppError.internal('Erro ao fazer upload do arquivo')
	}

	// Se não for um erro conhecido do FileService, re-lança
	if (error instanceof Error) {
		return AppError.internal(error.message)
	}

	return AppError.internal('Erro desconhecido')
}

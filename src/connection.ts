import type { ModuleConfig } from './types.js'

/** Resolve the selected connection type and protocol fields. */
export function connectionConfig(config: ModuleConfig): ModuleConfig {
	const mode = config.connectionMode ?? (config.secure ? (config.tlsProfile ?? 'standard') : 'http')
	if (!['http', 'advatek', 'standard'].includes(mode)) throw new Error('Choose a valid connection type')
	return {
		...config,
		connectionMode: mode,
		secure: mode !== 'http',
		tlsProfile: mode === 'http' ? (config.tlsProfile ?? 'standard') : mode,
	}
}

export function connectionOptions(config: ModuleConfig): ModuleConfig {
	const settings = connectionConfig(config)
	return {
		...settings,
		port: settings.port === 0 ? (settings.secure ? 4443 : 80) : settings.port,
		// Retain a saved custom CA, but use it only for standard HTTPS.
		ca: settings.secure && settings.tlsProfile === 'standard' ? settings.ca : '',
	}
}

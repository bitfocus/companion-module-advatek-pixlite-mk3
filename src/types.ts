import type { ActionsSchema } from './actions.js'
import type { FeedbacksSchema } from './feedbacks.js'
import type { VariablesSchema } from './variables.js'
export type ModuleConfig = {
	host: string
	// Zero selects the normal protocol port; resolve it before creating a client.
	port: number
	// Legacy saved fields. connectionMode takes precedence when present.
	secure: boolean
	tlsProfile?: 'standard' | 'advatek'
	expectedMac: string
	ca: string
	telemetry: boolean
	connectionMode?: 'http' | 'advatek' | 'standard'
	advanced?: boolean
}

export type ModuleSchema = {
	config: ModuleConfig
	secrets: { password: string }
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: VariablesSchema
}

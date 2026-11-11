import type { CompanionStaticUpgradeScript } from '@companion-module/base'
import type { ModuleConfig } from './types.js'

export const UpgradeScripts: CompanionStaticUpgradeScript<ModuleConfig, { password: string }>[] = []

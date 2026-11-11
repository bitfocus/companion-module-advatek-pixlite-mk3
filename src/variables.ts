import type { CompanionVariableValue, InstanceBase } from '@companion-module/base'
import type { ModuleSchema } from './types.js'

export type VariablesSchema = Record<string, CompanionVariableValue>

const labels: Record<string, string> = {
	connection_ready: 'Connection: Ready',
	connection_source: 'Connection: Identity verification',
	device_ip: 'Device: Address',
	device_mac: 'Device: MAC address',
	pixel_colour_type: 'Pixels: Configured colour type',
	white_w_available: 'Colour: White W available',
	white_x_available: 'Colour: White X available',
	selected_scene_valid: 'Scene metadata: Valid',
	estimated_output_w_total: 'Power: Total estimated output (W)',
	output_current_total_a: 'Power: Total output current (A)',
	pix_programmed_display: 'Pixels: Programmed intensity display',
}
const words: Record<string, string> = {
	pix: 'Pixel',
	aux: 'Auxiliary',
	sd: 'SD',
	api: 'API',
	cpu: 'CPU',
	rgb: 'RGB',
	w: 'W',
	x: 'X',
}

/** Labels are independent of the persisted variable IDs used in expressions. */
export function variableLabel(id: string): string {
	if (labels[id]) return labels[id]
	const colour = /^(static_colour|playlist_item_colour)_([rgbwx])$/.exec(id)
	if (colour)
		return `${colour[1] === 'static_colour' ? 'Static colour' : 'Playlist item colour'}: ${colour[2]?.toUpperCase()}`
	const prefix = /^(port|bank|aux)_(\d+)_/.exec(id)
	const group = prefix
		? `${prefix[1] === 'port' ? 'Pixel output' : prefix[1] === 'aux' ? 'Auxiliary output' : 'Power bank'} ${prefix[2]}: `
		: ''
	let text = prefix ? id.slice(prefix[0].length) : id
	const units = /_(percent|fps|bytes|ms|s|c|a|v|w)$/.exec(text)
	if (units) text = text.slice(0, -units[0].length)
	text = text
		.split('_')
		.map((word) => words[word] ?? word)
		.join(' ')
	text = text.charAt(0).toUpperCase() + text.slice(1)
	const unit = units?.[1]
	const displayUnit =
		unit === 'percent' ? '%' : unit === 'c' ? '°C' : ['a', 'v', 'w'].includes(unit ?? '') ? unit?.toUpperCase() : unit
	return `${group}${text}${displayUnit ? ` (${displayUnit})` : ''}`
}

export function UpdateVariableDefinitions(self: InstanceBase<ModuleSchema>, names: Iterable<string>): void {
	self.setVariableDefinitions(Object.fromEntries([...names].map((id) => [id, { name: variableLabel(id) }])))
}

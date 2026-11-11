import type {
	CompanionFeedbackDefinitions,
	CompanionOptionValues,
	SomeCompanionFeedbackInputField,
} from '@companion-module/base'
import { array, at, type Snapshot } from './pixlite/model.js'
import { valuesFor, type Values } from './state/view.js'
import { MediaButtonLabels, mediaName } from './companion/media-labels.js'
import { mixChannelAvailable, type ColourMixer } from './colour-mixer.js'
import { variableLabel } from './variables.js'

type BooleanFeedbacks<Ids extends string, Options = Record<string, never>> = {
	[Id in Ids]: { type: 'boolean'; options: Options }
}
type ValueOption = { value: string }
export type FeedbacksSchema = BooleanFeedbacks<
	| 'connection_ready'
	| 'state_stale'
	| 'playback_paused'
	| 'playback_running'
	| 'pause_state_unavailable'
	| 'mode_error'
	| 'media_cache_stale'
	| 'scene_valid'
	| 'sd_present'
	| 'diagnostic_error'
	| 'last_action_rejected'
	| 'last_action_unknown'
	| 'button_action_failed'
	| 'button_media_selected'
	| 'colour_mix_live'
	| 'colour_mix_pending'
	| 'colour_mix_matches'
	| 'colour_mix_error'
> &
	BooleanFeedbacks<
		| 'capability_unavailable'
		| 'mode_is'
		| 'playback_operation_is'
		| 'scene_selected'
		| 'playlist_selected'
		| 'playlist_item_is'
		| 'media_available'
		| 'sd_state_is',
		ValueOption
	> &
	BooleanFeedbacks<
		'output_policy_is' | 'intensity_priority_is' | 'intensity_authority_is',
		ValueOption & { output?: string }
	> &
	BooleanFeedbacks<'live_intensity_available', { output?: string }> &
	BooleanFeedbacks<'static_colour_matches', { colour: number; white?: number; extra?: number }> &
	BooleanFeedbacks<'power_output_state_is', ValueOption & { metric?: string }> &
	BooleanFeedbacks<'power_output_active', { metric?: string }> &
	BooleanFeedbacks<
		| 'programmed_intensity_compare'
		| 'sd_space_below'
		| 'data_frame_rate_compare'
		| 'temperature_compare'
		| 'current_compare'
		| 'voltage_compare'
		| 'power_estimate_compare'
		| 'metric_compare',
		{ metric?: string; comparison?: string; threshold: number; tolerance?: number }
	> &
	BooleanFeedbacks<'colour_mix_channel_unavailable', { channel: string }> & {
		button_media_name: { type: 'value'; options: Record<string, never> }
		colour_mix_channel_value: { type: 'value'; options: { channel: string } }
	}

const feedbackNames: Record<string, string> = {
	connection_ready: 'Connection: Ready',
	state_stale: 'Connection: Status is stale',
	capability_unavailable: 'Monitoring: Capability unavailable',
	mode_is: 'Mode: Operating mode is',
	playback_operation_is: 'Playback: Operation is',
	scene_selected: 'Scene: Selected',
	playlist_selected: 'Playlist: Selected',
	playlist_item_is: 'Playlist: Current item is',
	playback_paused: 'Playback: Paused',
	playback_running: 'Playback: Running',
	pause_state_unavailable: 'Playback: Pause state unavailable',
	mode_error: 'Playback: Mode error',
	output_policy_is: 'Outputs: Playback policy is',
	intensity_priority_is: 'Intensity: Programmed priority is',
	live_intensity_available: 'Intensity: Live intensity available',
	intensity_authority_is: 'Intensity: Active source is',
	static_colour_matches: 'Colour: Static colour matches',
	media_available: 'Media: File available',
	media_cache_stale: 'Media: List is stale',
	scene_valid: 'Scene metadata: Valid',
	sd_present: 'Storage: SD card present',
	sd_state_is: 'Storage: SD filesystem is',
	diagnostic_error: 'Monitoring: Diagnostic error reported',
	last_action_rejected: 'Command: Last action rejected',
	last_action_unknown: 'Command: Last action delivery unknown',
	power_output_state_is: 'Power: Output fuse state is',
	power_output_active: 'Power: Output active',
	programmed_intensity_compare: 'Intensity: Compare programmed level',
	sd_space_below: 'Storage: Free space at or below threshold',
	data_frame_rate_compare: 'Data: Compare frame rate',
	temperature_compare: 'Monitoring: Compare temperature',
	current_compare: 'Power: Compare current',
	voltage_compare: 'Power: Compare voltage',
	power_estimate_compare: 'Power: Compare estimated output',
	metric_compare: 'Monitoring: Compare measurement',
}
const choiceLabels: Record<string, string> = {
	live: 'Live data',
	playback: 'Playback',
	record: 'Recording',
	testData: 'Test pattern',
	File: 'File playback',
	Blank: 'Blank outputs',
	Freeze: 'Freeze frame',
	Color: 'Static colour',
	Play: 'Play content',
	Live: 'Live data',
	Hi: 'High (override live intensity)',
	Lo: 'Low (defer to live intensity)',
	Inactv: 'Inactive',
	OvrCur: 'Over current',
	pix: 'Pixel outputs',
}
export function feedbackDefinitions(
	snapshot: () => Snapshot,
	mediaButtons = new MediaButtonLabels(),
	mixer?: ColourMixer,
): CompanionFeedbackDefinitions<FeedbacksSchema> {
	const outputPrefix = (options: CompanionOptionValues): string =>
		typeof options.output === 'string' ? options.output : 'pix'
	const tests: Record<string, (v: Values, s: Snapshot, o: CompanionOptionValues) => boolean> = {
		connection_ready: (v) => v.connection_ready === true,
		state_stale: (v) => v.status_stale === true,
		capability_unavailable: (v, _s, o) => v[typeof o.value === 'string' ? o.value : 'telemetry_available'] !== true,
		mode_is: (v, _s, o) => v.mode === o.value,
		playback_operation_is: (v, _s, o) => v.playback_operation === o.value,
		scene_selected: (v, _s, o) => !!o.value && v.active_scene === o.value && v.mode_error_code === '',
		playlist_selected: (v, _s, o) => !!o.value && v.active_playlist === o.value && v.mode_error_code === '',
		playlist_item_is: (v, _s, o) =>
			!!o.value && (v.playlist_item_file === o.value || String(v.playlist_item_index) === o.value),
		playback_paused: (v) => v.playback_paused === true,
		playback_running: (v) => v.playback_running === true,
		pause_state_unavailable: (v) => v.pause_state_available !== true,
		mode_error: (v) => v.mode_error_code !== '',
		output_policy_is: (v, _s, o) =>
			v[outputPrefix(o) === 'pix' ? 'pixel_playback_policy' : `${outputPrefix(o)}_playback_policy`] === o.value,
		intensity_priority_is: (v, _s, o) => v[`${outputPrefix(o)}_programmed_priority`] === o.value,
		live_intensity_available: (v, _s, o) => v[`${outputPrefix(o)}_live_intensity_available`] === true,
		intensity_authority_is: (v, _s, o) => v[`${outputPrefix(o)}_intensity_authority`] === o.value,
		static_colour_matches: (_v, s, o) => {
			if (at(s.status, 'params.op') !== 'Color') return false
			const channels = array(at(s.status, 'params.color'))
			// Firmware may pad RGB status; use the configured colour type to select channels.
			const type = at(s.config, 'pix.colorType')
			const count = type === 'RGB' ? 3 : type === 'RGBW' ? 4 : type === 'RGBWX' ? 5 : channels.length
			const colour = Number(o.colour ?? 0xffffff),
				scale = at(s.status, 'params.colorRes') === '16Bit' ? 257 : 1
			if (
				colour === 0 &&
				((type === 'RGB' && Number(o.white ?? 0) > 0) || (type !== 'RGBWX' && Number(o.extra ?? 0) > 0))
			)
				return false
			return (
				channels.length >= count &&
				[(colour >> 16) & 255, (colour >> 8) & 255, colour & 255].every(
					(channel, index) => channels[index] === channel * scale,
				) &&
				(count < 4 || channels[3] === Number(o.white ?? 0)) &&
				(count < 5 || channels[4] === Number(o.extra ?? 0))
			)
		},
		media_available: (v, s, o) =>
			!v.media_stale && s.files.some((entry) => entry.attr !== 'h' && entry.file === o.value),
		media_cache_stale: (v) => v.media_stale === true,
		scene_valid: (v) => v.selected_scene_valid === true,
		sd_present: (v) => v.sd_present === true,
		sd_state_is: (v, _s, o) => v.sd_filesystem === o.value,
		diagnostic_error: (v) => typeof v.diagnostic_error_count === 'number' && v.diagnostic_error_count > 0,
		last_action_rejected: (v) => v.last_action_delivery === 'Rejected',
		last_action_unknown: (v) => v.last_action_delivery === 'Unknown delivery',
		power_output_state_is: (v, _s, o) => v[typeof o.metric === 'string' ? o.metric : 'port_1_power_state'] === o.value,
		power_output_active: (v, _s, o) => v[typeof o.metric === 'string' ? o.metric : 'port_1_power_active'] === true,
	}
	const defaults: Record<string, string> = {
		programmed_intensity_compare: 'pix_programmed_percent',
		sd_space_below: 'sd_free_percent',
		data_frame_rate_compare: 'pix_output_fps',
		temperature_compare: 'temperature_c',
		current_compare: 'output_current_total_a',
		voltage_compare: 'bank_1_voltage_v',
		power_estimate_compare: 'estimated_output_w_total',
		metric_compare: 'temperature_c',
	}
	for (const [id, metric] of Object.entries(defaults))
		tests[id] = (v, _s, o) => {
			const actual = v[typeof o.metric === 'string' ? o.metric : metric],
				threshold = Number(o.threshold ?? 0)
			if (typeof actual !== 'number' || !Number.isFinite(threshold)) return false
			const comparison = o.comparison ?? (id === 'sd_space_below' ? 'lte' : 'gte')
			return comparison === 'eq'
				? Math.abs(actual - threshold) <= Number(o.tolerance ?? 0.001)
				: comparison === 'lte'
					? actual <= threshold
					: actual >= threshold
		}
	const definitions: CompanionFeedbackDefinitions = {}
	const current = snapshot(),
		view = valuesFor(current)
	const choose = (
		id: string,
		label: string,
		choices: string[],
		initial = choices[0] ?? '',
		allowCustom = false,
		choiceLabel = (value: string): string =>
			choiceLabels[value] ?? (/^aux_[1-8]$/.test(value) ? `Auxiliary output ${value.slice(4)}` : variableLabel(value)),
	): SomeCompanionFeedbackInputField => ({
		id,
		type: 'dropdown',
		label,
		default: initial,
		allowCustom,
		choices: [...new Set(choices)].map((value) => ({
			id: value,
			label: choiceLabel(value),
		})),
	})
	const fieldsFor = (id: string): SomeCompanionFeedbackInputField[] => {
		if (defaults[id])
			return [
				choose(
					'metric',
					'Measurement',
					[...Object.keys(view).filter((key) => typeof view[key] === 'number'), ...Object.values(defaults)],
					defaults[id],
					true,
				),
				choose(
					'comparison',
					'Comparison',
					['gte', 'lte', 'eq'],
					id === 'sd_space_below' ? 'lte' : 'gte',
					false,
					(value) => (value === 'gte' ? 'At least' : value === 'lte' ? 'At most' : 'Equal (within tolerance)'),
				),
				{
					id: 'threshold',
					type: 'number',
					label: 'Threshold (measurement units)',
					default: 0,
					min: -100,
					max: 1e9,
				},
				{
					id: 'tolerance',
					type: 'number',
					label: 'Equality tolerance',
					default: 0.001,
					min: 0,
					max: 100,
				},
			]
		if (['scene_selected', 'playlist_selected', 'playlist_item_is', 'media_available'].includes(id))
			return [
				choose(
					'value',
					'File or playlist item number (custom values supported)',
					[
						'',
						...current.files
							.filter(
								(file) =>
									file.attr !== 'h' &&
									(id !== 'scene_selected' || file.file.endsWith('.scn')) &&
									(id !== 'playlist_selected' || file.file.endsWith('.pl')),
							)
							.map((file) => file.file),
					],
					'',
					true,
					(file) => {
						const name = mediaName(file)
						if (id === 'scene_selected' || id === 'playlist_selected') return name
						return file.endsWith('.scn') ? `${name} (Scene)` : file.endsWith('.pl') ? `${name} (Playlist)` : name
					},
				),
			]
		if (id === 'static_colour_matches')
			return [
				{
					id: 'colour',
					type: 'colorpicker',
					label: 'RGB colour',
					default: 0xffffff,
				},
				{
					id: 'white',
					type: 'number',
					label: 'White W channel (RGBW / RGBCCT)',
					default: 0,
					min: 0,
					max: 65535,
				},
				{
					id: 'extra',
					type: 'number',
					label: 'White X channel (RGBCCT / RGBWX)',
					default: 0,
					min: 0,
					max: 65535,
				},
			]
		const values: Record<string, string[]> = {
			mode_is: ['live', 'playback', 'record', 'testData'],
			playback_operation_is: ['File', 'Blank', 'Freeze', 'Color'],
			output_policy_is: ['Play', 'Live', 'Blank', 'Freeze'],
			intensity_priority_is: ['Hi', 'Lo'],
			intensity_authority_is: ['Programmed', 'Live'],
			sd_state_is: ['FAT32', 'Unknown', 'Formatting'],
			power_output_state_is: ['Good', 'Inactv', 'OvrCur'],
			capability_unavailable: [
				'white_w_available',
				'white_x_available',
				'telemetry_available',
				'media_available',
				'thermal_available',
				'power_current_available',
				'power_state_available',
				'power_voltage_available',
			],
		}
		const fields: SomeCompanionFeedbackInputField[] = values[id] ? [choose('value', 'State', values[id])] : []
		if (
			['output_policy_is', 'intensity_priority_is', 'live_intensity_available', 'intensity_authority_is'].includes(id)
		)
			fields.unshift(
				choose('output', 'Output group', ['pix', ...Array.from({ length: 8 }, (_, index) => `aux_${index + 1}`)]),
			)
		if (id.startsWith('power_output_')) {
			const suffix = id === 'power_output_active' ? 'power_active' : 'power_state'
			const initial = `port_1_${suffix}`
			fields.unshift(
				choose(
					'metric',
					'Physical output',
					[initial, ...Object.keys(view).filter((key) => key.startsWith('port_') && key.endsWith(suffix))],
					initial,
					true,
				),
			)
		}
		return fields
	}
	for (const [id, test] of Object.entries(tests))
		definitions[id] = {
			type: 'boolean',
			name: feedbackNames[id] ?? variableLabel(id),
			description: id.startsWith('power_output_')
				? 'Requires fresh power telemetry from a supported controller. Inactive alone does not indicate a fuse fault.'
				: 'Uses reported controller state. Unavailable or stale readings do not match unless this feedback explicitly checks availability.',
			defaultStyle: { bgcolor: 0x006638, color: 0xffffff },
			options: fieldsFor(id),
			callback: (feedback) => {
				const state = snapshot(),
					view = valuesFor(state)
				const local = [
					'state_stale',
					'capability_unavailable',
					'media_cache_stale',
					'last_action_rejected',
					'last_action_unknown',
					'connection_ready',
				].includes(id)
				return (local || view.connection_ready === true) && test(view, state, feedback.options)
			},
		}
	definitions.button_action_failed = {
		type: 'boolean',
		name: 'Button: Last command failed or delivery is unknown',
		description:
			'Matches only the button that issued the most recent command on this connection. Inspect the last action delivery and error variables before repeating an uncertain command.',
		defaultStyle: { bgcolor: 0xb42318, color: 0xffffff },
		options: [],
		callback: (feedback) => {
			const state = snapshot()
			return (
				!!feedback.controlId &&
				state.lastActionControlId === feedback.controlId &&
				['Rejected', 'Unknown delivery'].includes(state.delivery)
			)
		},
	}
	definitions.button_media_name = {
		type: 'value',
		name: 'Button: Configured scene or playlist name',
		description:
			"Uses this button's configured media action, including offline filename changes. Add as a local variable and use $(local:media_name) in the button text. Multiple different media actions are labelled Multiple media.",
		options: [],
		callback: (feedback) => mediaButtons.label(feedback.controlId),
	}
	definitions.button_media_selected = {
		type: 'boolean',
		name: 'Button: Configured media is selected',
		description: "Follows this button's selected playback filename rather than a second manually copied filename.",
		defaultStyle: { bgcolor: 0x006638, color: 0xffffff },
		options: [],
		callback: (feedback) => {
			const selected = mediaButtons.selection(feedback.controlId)
			const view = valuesFor(snapshot())
			return (
				!!selected?.file &&
				selected.actionId !== 'scene_inspect' &&
				view.connection_ready === true &&
				view.mode_error_code === '' &&
				view[selected.actionId === 'playlist_play' ? 'active_playlist' : 'active_scene'] === selected.file
			)
		},
	}
	for (const [id, name, variable] of [
		['colour_mix_live', 'Colour mix: Live Mix enabled', 'mix_live_enabled'],
		['colour_mix_pending', 'Colour mix: Command pending', 'mix_pending'],
		['colour_mix_matches', 'Colour mix: Prepared colour matches output', 'mix_matches_output'],
		['colour_mix_error', 'Colour mix: Last operation failed', 'mix_error'],
	] as const) {
		definitions[id] = {
			type: 'boolean',
			name,
			options: [],
			defaultStyle: { bgcolor: 0xf15a2c, color: 0xffffff },
			callback: () => Boolean(mixer?.values(snapshot())[variable]),
		}
	}
	definitions.colour_mix_channel_unavailable = {
		type: 'boolean',
		name: 'Colour mix: Channel unavailable on connected controller',
		options: [
			{
				id: 'channel',
				type: 'dropdown',
				label: 'Channel',
				default: 'white',
				choices: [
					{ id: 'red', label: 'Red' },
					{ id: 'green', label: 'Green' },
					{ id: 'blue', label: 'Blue' },
					{ id: 'white', label: 'White W' },
					{ id: 'extra', label: 'White X' },
				],
			},
		],
		defaultStyle: { color: 0xb8b7b9 },
		callback: (event) =>
			!mixChannelAvailable(snapshot(), typeof event.options.channel === 'string' ? event.options.channel : ''),
	}
	definitions.colour_mix_channel_value = {
		type: 'value',
		name: 'Colour mix: Prepared channel level',
		options: definitions.colour_mix_channel_unavailable.options,
		callback: (event) =>
			typeof event.options.channel === 'string'
				? (mixer?.values(snapshot())[`mix_${event.options.channel}_display`] ?? '')
				: '',
	}
	return definitions as CompanionFeedbackDefinitions<FeedbacksSchema>
}

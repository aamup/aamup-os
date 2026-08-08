import {
  formatMemoryContext,
  recallRelevantMemories,
} from '../memory/retrieval'
import { getWeatherIntelligence } from '../weather/client'
import {
  getAssistantModelStatus,
  queryAssistantModel,
} from './model'
import {
  runAssistantQuery,
  type AssistantIntent,
  type AssistantResult,
} from './router'

export type AssistantModule =
  | 'github'
  | 'weather'
  | 'markets'
  | 'news'
  | 'music'
  | 'briefing'
  | 'memory'
  | 'assistant'

export type NewsCategory = 'LOCAL' | 'AI' | 'TECH'

export interface AssistantContext {
  lastIntent: AssistantIntent | null
  lastModule: AssistantModule | null
  lastNewsCategory: NewsCategory | null
  turnCount: number
}

export interface AssistantAction {
  type: 'navigate'
  module: AssistantModule
}

export interface AssistantSessionResult extends AssistantResult {
  context: AssistantContext
  action?: AssistantAction
}

export function createAssistantContext(): AssistantContext {
  return {
    lastIntent: null,
    lastModule: null,
    lastNewsCategory: null,
    turnCount: 0,
  }
}

let commandContext = createAssistantContext()

function normalize(input: string) {
  return ` ${input.trim().toLowerCase().replace(/[?!.,:;]/g, ' ').replace(/\s+/g, ' ')} `
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term))
}

function moduleForIntent(
  intent: AssistantIntent,
  fallback: AssistantModule | null,
): AssistantModule | null {
  if (intent === 'briefing') return 'briefing'
  if (intent === 'weather') return 'weather'
  if (intent === 'markets') return 'markets'
  if (intent === 'news') return 'news'
  if (intent === 'github') return 'github'
  if (intent === 'media' || intent === 'media-control') return 'music'
  return fallback
}

function detectCategory(
  value: string,
  fallback: NewsCategory | null,
): NewsCategory | null {
  if (value.includes(' local ') || value.includes('portland')) return 'LOCAL'
  if (value.includes(' ai ') || value.includes('artificial intelligence')) return 'AI'
  if (value.includes(' tech ') || value.includes('technology')) return 'TECH'
  return fallback
}

function detectNavigation(
  value: string,
  context: AssistantContext,
): AssistantModule | null {
  const nav = includesAny(value, [
    ' open ',
    ' go to ',
    ' switch to ',
    ' take me to ',
    ' view ',
    ' show module ',
  ])

  if (!nav) return null

  if (value.includes('weather')) return 'weather'
  if (value.includes('market')) return 'markets'
  if (value.includes('news')) return 'news'
  if (value.includes('github') || value.includes('repo')) return 'github'
  if (value.includes('audio') || value.includes('music') || value.includes('visualizer')) return 'music'
  if (value.includes('brief') || value.includes('daily')) return 'briefing'
  if (value.includes('memory')) return 'memory'
  if (value.includes('assistant')) return 'assistant'
  if (value.includes(' it ') || value.includes(' that ')) return context.lastModule

  return null
}

function nextContext(
  current: AssistantContext,
  intent: AssistantIntent,
  module: AssistantModule | null,
  category: NewsCategory | null,
): AssistantContext {
  return {
    lastIntent: intent,
    lastModule: module,
    lastNewsCategory: category,
    turnCount: current.turnCount + 1,
  }
}

function wrap(
  result: AssistantResult,
  context: AssistantContext,
  action?: AssistantAction,
): AssistantSessionResult {
  return {
    ...result,
    context,
    action,
  }
}

function greetingResult(context: AssistantContext): AssistantSessionResult {
  const next = nextContext(
    context,
    'help',
    context.lastModule,
    context.lastNewsCategory,
  )

  return wrap({
    intent: 'help',
    title: 'ASSISTANT CORE // READY',
    ok: true,
    lines: [
      'Local context router online.',
      context.lastIntent
        ? `CURRENT CONTEXT // ${context.lastIntent.toUpperCase()}`
        : 'CURRENT CONTEXT // NONE',
      'Ask for weather, markets, news, repository, system, or media intelligence.',
    ],
  }, next)
}

async function tomorrowWeather(
  context: AssistantContext,
): Promise<AssistantSessionResult> {
  const weather = await getWeatherIntelligence()
  const tomorrow = weather.daily[1]

  const result: AssistantResult = tomorrow
    ? {
        intent: 'weather',
        title: `WEATHER // TOMORROW // ${weather.locationLabel}`,
        ok: true,
        lines: [
          `HIGH ${Math.round(tomorrow.high)}F // LOW ${Math.round(tomorrow.low)}F`,
          `RAIN ${Math.round(tomorrow.precipitationProbability)}%`,
          `SUNRISE ${tomorrow.sunrise.slice(-5)} // SUNSET ${tomorrow.sunset.slice(-5)}`,
        ],
      }
    : {
        intent: 'weather',
        title: 'WEATHER // TOMORROW',
        ok: false,
        lines: ['Tomorrow forecast is unavailable.'],
      }

  return wrap(
    result,
    nextContext(context, 'weather', 'weather', context.lastNewsCategory),
  )
}

function navigationResult(
  module: AssistantModule,
  context: AssistantContext,
): AssistantSessionResult {
  const result: AssistantResult = {
    intent: 'help',
    title: `NAVIGATION // ${module.toUpperCase()}`,
    ok: true,
    lines: [`Opening ${module.toUpperCase()} module.`],
  }

  return wrap(
    result,
    nextContext(context, 'help', module, context.lastNewsCategory),
    { type: 'navigate', module },
  )
}

export async function runAssistantSessionQuery(
  input: string,
  suppliedContext?: AssistantContext,
): Promise<AssistantSessionResult> {
  const context = suppliedContext ?? commandContext
  const value = normalize(input)

  if (
    includesAny(value, [
      ' clear context ',
      ' reset context ',
      ' forget context ',
    ])
  ) {
    const fresh = createAssistantContext()
    const result = wrap({
      intent: 'help',
      title: 'ASSISTANT CORE // CONTEXT CLEARED',
      ok: true,
      lines: ['Conversation context reset.'],
    }, fresh)

    if (!suppliedContext) commandContext = fresh
    return result
  }

  if (
    includesAny(value, [
      ' hello ',
      ' hi ',
      ' hey ',
      ' good morning ',
      ' good afternoon ',
      ' good evening ',
    ])
  ) {
    const result = greetingResult(context)
    if (!suppliedContext) commandContext = result.context
    return result
  }

  const navigation = detectNavigation(value, context)

  const explicitDataTarget = includesAny(value, [
    'weather',
    'market',
    'news',
    'github',
    'repo',
    'system',
    'cpu',
    'playing',
    'song',
    'track',
    'spotify',
  ])

  if (navigation && !explicitDataTarget) {
    const result = navigationResult(navigation, context)
    if (!suppliedContext) commandContext = result.context
    return result
  }

  if (
    context.lastIntent === 'weather' &&
    (value.includes(' tomorrow ') || value.includes(' next day '))
  ) {
    const result = await tomorrowWeather(context)
    if (!suppliedContext) commandContext = result.context
    return result
  }

  let routedInput = input

  const followUp = includesAny(value, [
    ' what about ',
    ' how about ',
    ' show me more ',
    ' show more ',
    ' more ',
    ' again ',
    ' now show ',
  ])

  if (followUp && context.lastIntent === 'news') {
    const category = detectCategory(value, context.lastNewsCategory)
    routedInput = category
      ? `${category.toLowerCase()} news`
      : 'news'
  } else if (followUp && context.lastIntent === 'markets') {
    routedInput = value.includes('bitcoin')
      ? 'bitcoin markets'
      : value.includes('ethereum')
        ? 'ethereum markets'
        : 'markets'
  } else if (followUp && context.lastIntent === 'github') {
    routedInput = 'repository status'
  } else if (
    followUp &&
    (context.lastIntent === 'media' || context.lastIntent === 'media-control')
  ) {
    routedInput = 'what is playing'
  }

  const base = await runAssistantQuery(routedInput)

  let result = base

  if (base.intent === 'unknown') {
    const modelStatus = await getAssistantModelStatus()
      .catch(() => null)

    if (modelStatus?.configured) {
      try {
        const recalledMemories =
          await recallRelevantMemories(input, 5)
            .catch(() => [])

        const model = await queryAssistantModel(
          input,
          [
            'SESSION CONTEXT:',
            `lastIntent=${context.lastIntent ?? 'none'}`,
            `lastModule=${context.lastModule ?? 'none'}`,
            `lastNewsCategory=${context.lastNewsCategory ?? 'none'}`,
            `turnCount=${context.turnCount}`,
            '',
            formatMemoryContext(recalledMemories),
          ].join('\n'),
        )

        result = {
          intent: 'model',
          title: `MODEL // ${model.model}`,
          ok: true,
          lines: [model.content],
        }
      } catch (error) {
        result = {
          ...base,
          title: 'ASSISTANT CORE // MODEL ERROR',
          ok: false,
          lines: [
            error instanceof Error
              ? error.message
              : String(error),
            'Local AAMUP tools remain available.',
          ],
        }
      }
    } else {
      result = {
        ...base,
        title: 'ASSISTANT CORE // NEEDS A TARGET',
        lines: [
          context.lastIntent
            ? `I retained ${context.lastIntent.toUpperCase()} context but could not map that request safely.`
            : 'I could not map that request to a local module.',
          'Try weather, markets, news, GitHub, system, media, or "open <module>".',
          'MODEL PROVIDER // NOT CONFIGURED',
        ],
      }
    }
  }

  const category = result.intent === 'news'
    ? detectCategory(value, context.lastNewsCategory)
    : context.lastNewsCategory

  const module = moduleForIntent(result.intent, context.lastModule)
  const next = nextContext(context, result.intent, module, category)

  const action = navigation
    ? { type: 'navigate' as const, module: navigation }
    : undefined

  const wrapped = wrap(result, next, action)
  if (!suppliedContext) commandContext = wrapped.context
  return wrapped
}

import { getPlaywrightCoreModule } from './getPlaywrightCoreModule';
import type { LocalUtilsHarLookupParams, LocalUtilsHarLookupResult, Metadata } from './types';

type HarLookup = (
    this: unknown,
    params: LocalUtilsHarLookupParams,
    metadata?: Metadata,
    ...rest: unknown[]
) => Promise<LocalUtilsHarLookupResult>;

export type HarLookupParamsTransformFunction = (
    params: LocalUtilsHarLookupParams,
) => LocalUtilsHarLookupParams;
export type HarLookupResultTransformFunction = (
    result: LocalUtilsHarLookupResult,
    params: LocalUtilsHarLookupParams,
) => LocalUtilsHarLookupResult | Promise<LocalUtilsHarLookupResult>;

function wrapLocalUtilsDispatcherMethods(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    LocalUtilsDispatcher: any,
    transformParams?: HarLookupParamsTransformFunction,
    transformResult?: HarLookupResultTransformFunction,
) {
    const originalHarLookup: HarLookup = LocalUtilsDispatcher.prototype.harLookup;

    if (originalHarLookup) {
        // eslint-disable-next-line no-param-reassign
        LocalUtilsDispatcher.prototype.harLookup = async function harLookup(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this: any,
            params,
            metadata,
            ...rest: unknown[]
        ) {
            if (transformParams) {
                // eslint-disable-next-line no-param-reassign
                params = transformParams(params);
            }

            let result: LocalUtilsHarLookupResult | Promise<LocalUtilsHarLookupResult> =
                await originalHarLookup.call(this, params, metadata, ...rest);

            if (transformResult) {
                result = transformResult(result, params);
            }

            return result;
        } as HarLookup;
    } else {
        throw new Error('Can\'t find "harLookup" method in "LocalUtilsDispatcher" class.');
    }
}

let patchInited = false;

function initLocalUtilsDispatcherPatch(
    transformParams?: HarLookupParamsTransformFunction,
    transformResult?: HarLookupResultTransformFunction,
) {
    patchInited = true;

    const modules = getPlaywrightCoreModule('lib/server/dispatchers/localUtilsDispatcher');

    for (const module of modules) {
        wrapLocalUtilsDispatcherMethods(
            module.LocalUtilsDispatcher,
            transformParams,
            transformResult,
        );
    }
}

/**
 * Позволяет внести модификации на этапе поиска записи в дампе, подходящей под запрос
 * @param transformParams Функция для изменения параметров, на основании которых будет произведён поиск
 * @param transformResult Функция для изменения результата поиска (здесь можно изменить параметры найденного ответа, например его тело)
 */
export function addHarLookupTransform(
    transformParams?: HarLookupParamsTransformFunction,
    transformResult?: HarLookupResultTransformFunction,
) {
    if (!patchInited) {
        initLocalUtilsDispatcherPatch(transformParams, transformResult);
    }
}

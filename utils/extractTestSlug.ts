/**
 * Извлекает идентификатор теста для использования в пути к артефактам теста
 *
 * Предполагается, что идентификатор записан в конце названия теста в квадратных скобках:
 * `'My test title [my-test]'`
 * Иначе формируется из названия, исключая все спец символы, например:
 * `'My test title 1 @test @tag'` -> `'my-test-title-1-test-tag'`
 *
 * @param title Название теста
 * @param allowToUseTitle Требуется, чтобы в названии был указан slug специальным образом (иначе будет использован сам title)
 */
export function extractTestSlug(title: string, allowToUseTitle = true) {
    const matches = /\[([^[\]]+)\]$/.exec(title);

    if (matches) {
        return matches[1]!;
    }

    if (allowToUseTitle) {
        return title.match(/\w+/g)?.join('-').toLocaleLowerCase() || '';
    }

    return '';
}

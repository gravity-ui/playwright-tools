# Changelog

## [2.0.0](https://github.com/gravity-ui/playwright-tools/compare/v1.1.3...v2.0.0) (2026-02-11)


### ⚠ BREAKING CHANGES

* new fixtures interface will require refactoring in clients using library

### refactor

* changed interface of fixtures ([#58](https://github.com/gravity-ui/playwright-tools/issues/58)) ([4540a06](https://github.com/gravity-ui/playwright-tools/commit/4540a062c4fd124c480d7b8e836413dcfaeae8b4)), closes [#57](https://github.com/gravity-ui/playwright-tools/issues/57)


### Features

* expectScreenshot added default locator ([#55](https://github.com/gravity-ui/playwright-tools/issues/55)) ([fe09ebb](https://github.com/gravity-ui/playwright-tools/commit/fe09ebb8ddcf36b1da676269e8397fcea3c5272d)), closes [#51](https://github.com/gravity-ui/playwright-tools/issues/51)


### Bug Fixes

* removed default plain name ([#56](https://github.com/gravity-ui/playwright-tools/issues/56)) ([abca542](https://github.com/gravity-ui/playwright-tools/commit/abca54201129a61192807e84ce830710f1ac4a79))

## [1.1.3](https://github.com/gravity-ui/playwright-tools/compare/v1.1.2...v1.1.3) (2026-01-29)


### Bug Fixes

* component tests -&gt; fixed mount was throwing error ([#53](https://github.com/gravity-ui/playwright-tools/issues/53)) ([8fce986](https://github.com/gravity-ui/playwright-tools/commit/8fce9864fceb9d80ac579eca5d1fa597bef4bda8)), closes [#52](https://github.com/gravity-ui/playwright-tools/issues/52)

## [1.1.2](https://github.com/gravity-ui/playwright-tools/compare/v1.1.1...v1.1.2) (2026-01-27)


### Bug Fixes

* mockNetworkFixture return is actually mocking happened ([#49](https://github.com/gravity-ui/playwright-tools/issues/49)) ([884e9a4](https://github.com/gravity-ui/playwright-tools/commit/884e9a4e540d9fb2cd490828dc42ad1084c191f2))

## [1.1.1](https://github.com/gravity-ui/playwright-tools/compare/v1.1.0...v1.1.1) (2026-01-19)


### Bug Fixes

* optionally enabled with fixture ([#46](https://github.com/gravity-ui/playwright-tools/issues/46)) ([618a597](https://github.com/gravity-ui/playwright-tools/commit/618a5979a85ba1791b5b5301dbe828fbd58b3ce0))

## [1.1.0](https://github.com/gravity-ui/playwright-tools/compare/v1.0.0...v1.1.0) (2025-12-25)


### Features

* optionally enabled + add base url in harPatcher callbacks ([#43](https://github.com/gravity-ui/playwright-tools/issues/43)) ([b26019a](https://github.com/gravity-ui/playwright-tools/commit/b26019ad8045586647b2b3fc43e52f4b6b0c7d34))

## [1.0.0](https://github.com/gravity-ui/playwright-tools/compare/v0.9.2...v1.0.0) (2025-12-10)


### chore

* release 1.0.0 ([#41](https://github.com/gravity-ui/playwright-tools/issues/41)) ([df1e5b2](https://github.com/gravity-ui/playwright-tools/commit/df1e5b205bcd275ef8aced875f516c2b60652b5f))

## [0.9.2](https://github.com/gravity-ui/playwright-tools/compare/v0.9.1...v0.9.2) (2025-12-08)


### Bug Fixes

* removed vegancat from codeowners ([#37](https://github.com/gravity-ui/playwright-tools/issues/37)) ([dda23cc](https://github.com/gravity-ui/playwright-tools/commit/dda23cc7ee309895a8c3957a6f392f6e16749fe2))

## [0.9.1](https://github.com/gravity-ui/playwright-tools/compare/v0.9.0...v0.9.1) (2025-12-08)


### Bug Fixes

* added react and react-dom to peer deps ([#35](https://github.com/gravity-ui/playwright-tools/issues/35)) ([0e6bd7c](https://github.com/gravity-ui/playwright-tools/commit/0e6bd7c618707b254e30b2d6c1f29ed8fcb4dd3b))

## [0.9.0](https://github.com/gravity-ui/playwright-tools/compare/v0.8.4...v0.9.0) (2025-12-01)


### Features

* initDumps -&gt; removed deprecated dumpsPath ([#31](https://github.com/gravity-ui/playwright-tools/issues/31)) ([acea120](https://github.com/gravity-ui/playwright-tools/commit/acea120f1ba5447164463322f98e77a7e11fd760))

## [0.8.4](https://github.com/gravity-ui/playwright-tools/compare/v0.8.3...v0.8.4) (2025-12-01)


### Bug Fixes

* exported data from playwright-tools ([#32](https://github.com/gravity-ui/playwright-tools/issues/32)) ([844b1e0](https://github.com/gravity-ui/playwright-tools/commit/844b1e0eba419c0385f0244b26f879f174d052bb))

## [0.8.3](https://github.com/gravity-ui/playwright-tools/compare/v0.8.2...v0.8.3) (2025-11-26)


### Bug Fixes

* removed config from clean script ([#29](https://github.com/gravity-ui/playwright-tools/issues/29)) ([76b67c7](https://github.com/gravity-ui/playwright-tools/commit/76b67c7cc316e1d476a2de3deffa70bece852478))

## [0.8.2](https://github.com/gravity-ui/playwright-tools/compare/v0.8.1...v0.8.2) (2025-11-26)


### Bug Fixes

* removed config from files directory of a package ([#27](https://github.com/gravity-ui/playwright-tools/issues/27)) ([83d02fd](https://github.com/gravity-ui/playwright-tools/commit/83d02fd4917902e0a4c8d2d82f5e9e99accde1f8))

## [0.8.1](https://github.com/gravity-ui/playwright-tools/compare/v0.8.0...v0.8.1) (2025-11-26)


### Bug Fixes

* fixed exports format for package ([#25](https://github.com/gravity-ui/playwright-tools/issues/25)) ([978c475](https://github.com/gravity-ui/playwright-tools/commit/978c475f5853bc406b3c41d2767077e0dd397c0a))

## [0.8.0](https://github.com/gravity-ui/playwright-tools/compare/v0.7.0...v0.8.0) (2025-11-25)


### Features

* ported all missing code from playwright-utils to playwright-tools ([#23](https://github.com/gravity-ui/playwright-tools/issues/23)) ([fcf3378](https://github.com/gravity-ui/playwright-tools/commit/fcf3378390ceea86bcd35f56819af8b8dbff3ea7))

## [0.7.0](https://github.com/gravity-ui/playwright-tools/compare/v0.6.0...v0.7.0) (2025-09-17)


### Features

* added CODEOWNERS ([#21](https://github.com/gravity-ui/playwright-tools/issues/21)) ([68abf6d](https://github.com/gravity-ui/playwright-tools/commit/68abf6d7d2d2a871727eec43bce250c04914cacb))

## [0.6.0](https://github.com/gravity-ui/playwright-tools/compare/v0.5.0...v0.6.0) (2025-09-17)


### Features

* added createSmokeScenarios utility for bulding smoke scenarios for storybook based tests ([2b65449](https://github.com/gravity-ui/playwright-tools/commit/2b654493280ea1155a878f411dcf85ae60b9fe9e))
* added mount fixture for component tests ([2b65449](https://github.com/gravity-ui/playwright-tools/commit/2b654493280ea1155a878f411dcf85ae60b9fe9e))

## [0.5.0](https://github.com/gravity-ui/playwright-tools/compare/v0.4.1...v0.5.0) (2025-08-26)


### Features

* **matchScreenshot:** sync from pw-utils ([#14](https://github.com/gravity-ui/playwright-tools/issues/14)) ([e19aeea](https://github.com/gravity-ui/playwright-tools/commit/e19aeea84ebdb549f8e34856d86efdb415d6a1ca))

## [0.4.1](https://github.com/gravity-ui/playwright-tools/compare/v0.4.0...v0.4.1) (2025-08-25)


### Bug Fixes

* **app:** fix clean script in package.json ([#11](https://github.com/gravity-ui/playwright-tools/issues/11)) ([e5d8d97](https://github.com/gravity-ui/playwright-tools/commit/e5d8d97c7047cfffd5101d12d076225a370dda96))

## [0.4.0](https://github.com/gravity-ui/playwright-tools/compare/v0.3.0...v0.4.0) (2025-08-25)


### Features

* **app:** re-run first release ([#9](https://github.com/gravity-ui/playwright-tools/issues/9)) ([218c13d](https://github.com/gravity-ui/playwright-tools/commit/218c13dc530fa177c128f89a5bc566e5bd44914f))

## [0.3.0](https://github.com/gravity-ui/playwright-tools/compare/v0.2.0...v0.3.0) (2025-08-25)


### Features

* **app:** fix first release ([#6](https://github.com/gravity-ui/playwright-tools/issues/6)) ([27b091a](https://github.com/gravity-ui/playwright-tools/commit/27b091a7fb4ae6c7658752b3d0e7215fbdd80301))

## [0.2.0](https://github.com/gravity-ui/playwright-tools/compare/0.1.0...v0.2.0) (2025-08-25)


### Features

* **app:** build first release ([#4](https://github.com/gravity-ui/playwright-tools/issues/4)) ([8a604f9](https://github.com/gravity-ui/playwright-tools/commit/8a604f91e39a75f82b0f0fbea176e9a4050c5ab9))

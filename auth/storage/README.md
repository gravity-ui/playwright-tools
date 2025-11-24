# Authentication Functions: Saving and Restoring Browser Storage Snapshots

By default, snapshots are stored only in memory. You can configure disk cache saving using `setCacheSettings` with the `auth` key.

## applyStorageState

Restores saved browser storage.

Parameters:
- `context: BrowserContext` — Browser context
- `storageState: StorageState` — Browser storage snapshot
- `append: boolean = false` — Add to existing storage (otherwise — clear first)

## applyStorageStateFor

Restores saved browser storage by the specified key

Parameters:
- `key: string` — Key under which the browser storage snapshot is saved
- `context: BrowserContext` — Browser context
- `append: boolean = false` — Add to existing storage (otherwise — clear first)

## deleteStorageStateFor

Deletes the browser storage snapshot for the specified key.

Parameters:
- `key: string` — Key under which the browser storage snapshot is saved

## getStorageState

Performs authentication in a separate browser context and returns a browser storage snapshot.

Parameters:
- `authActions: AuthActions` — Authentication actions

```ts
type AuthActions = (page: Page) => Promise<void>;
```

## getStorageStateFor

Returns the browser storage snapshot for the specified key.

Parameters:
- `key: string` — Key under which the browser storage snapshot is saved

## hasStorageStateFor

Checks whether a browser storage snapshot exists for the specified key

Parameters:
- `key: string` — Key under which the browser storage snapshot is saved

## restoreCookies

Restores saved cookies in the browser.

Parameters:
- `context: BrowserContext` — Browser context
- `cookies: StorageState['cookies']` — List of cookies to restore
- `append: boolean = false` — Add to existing cookies (otherwise — clear first)

```ts
type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>;
```

## restoreLocalStorage

Restores saved localStorage entries in the browser.

Parameters:
- `context: BrowserContext` — Browser context
- `origins: StorageState['origins']` — List of localStorage entries to restore
- `append: boolean = false` — Add to existing entries (otherwise — clear first)

```ts
type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>;
```

## saveStorageStateFor

Performs authentication in a separate browser context and saves the browser storage snapshot under the specified key.

Parameters:
- `key: string` — Key under which to save the browser storage state
- `authActions: AuthActions` — Authentication actions

```ts
type AuthActions = (page: Page) => Promise<void>;
```


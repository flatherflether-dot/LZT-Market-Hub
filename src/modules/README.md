# Модули LZT Market Hub

Каждый модуль — отдельная папка в `src/modules/`. Имя папки может быть любым (латиница, kebab-case); в навигации используется `id` из `manifest.ts` или имя папки.

## Структура модуля

```
my-module/
  manifest.ts      # метаданные, маршрут, иконка
  loader.ts        # опционально — шаги загрузочного экрана
  MyModulePage.tsx # главная страница
  i18n/
    en.ts          # переводы EN
    ru.ts          # переводы RU
  styles.css       # опционально — стили модуля
  components/      # опционально — внутренние компоненты
```

## manifest.ts

```typescript
import { Star } from 'lucide-react'
import type { ModuleManifest } from '@core/module-types'

export default {
  id: 'my-module',           // опционально; по умолчанию = имя папки
  path: '/my-module',
  optional: true,            // можно выключить в Настройки → Модули
  defaultEnabled: true,
  order: 50,
  icon: Star,
  navKey: 'nav.myModule',     // ключ из i18n/en.ts
  descKey: 'modules.myModuleDesc',
  loadPage: () => import('./MyModulePage').then((m) => ({ default: m.MyModulePage }))
} satisfies ModuleManifest
```

## loader.ts (загрузочный экран)

При старте приложения каждый модуль может добавить шаги и предзагрузку данных:

```typescript
import type { ModuleLoaderContribution } from '@core/module-types'

export default {
  steps: [
    {
      statusKey: 'loader.module.myModule.status',
      detailKey: 'loader.module.myModule.detail',
      weight: 1
    }
  ],
  async prepare() {
    // опционально: предзагрузка данных модуля до открытия UI
  }
} satisfies ModuleLoaderContribution
```

Добавьте ключи `loader.module.myModule.status` и `loader.module.myModule.detail` в `i18n/en.ts` и `i18n/ru.ts`.

## i18n/en.ts

```typescript
export const en = {
  'nav.myModule': 'My Module',
  'modules.myModuleDesc': 'What this module does.',
  'myModule.title': 'Hello'
} as const

export default en
```

Переводы лежат в `i18n/en.ts` и `i18n/ru.ts` внутри папки модуля. После изменений запустите:

```bash
npm run i18n:merge
```

Скрипт собирает общие словари `src/core/i18n/en.ts` и `ru.ts` для TypeScript.

## Стили

Файл `styles.css` в корне папки модуля подключается автоматически при старте приложения.

## Связки (bridges)

Если модуль зависит от другого, добавьте запись в `src/core/module-registry.ts` → `MODULE_BRIDGES`, либо проверяйте `useModulesHelpers().isBridgeActive('your_bridge_id')` в UI.

## Шаблон

Скопируйте папку `_template/` и переименуйте. Уберите префикс `_` — папки с `_` игнорируются загрузчиком.

## Ограничения (текущая версия)

- Модули подключаются на **этапе сборки** (Vite). Для runtime-плагинов из `userData/` потребуется отдельный загрузчик (Electron + dynamic import).
- TypeScript `TranslationKey` включает ключи всех встроенных модулей; для новых ключей используйте префикс модуля (`myModule.*`).

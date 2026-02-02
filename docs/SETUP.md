# Руководство по запуску проекта Outline

## Описание проекта
Outline - это быстрая, совместная база знаний для вашей команды, построенная с использованием React и Node.js.

## Системные требования

### Node.js
- **Версия**: >=20.12 <21 || 22
- Проверить версию: `node --version`

### Yarn
- **Версия**: 4.11.0 (указана в package.json)
- Установить: `npm install -g yarn`

### PostgreSQL
- **Версия**: 12+
- Требуется для базы данных

### Redis (опционально)
- Рекомендуется для продакшена и некоторых функций разработки

## Установка и настройка

### 1. Клонирование репозитория
```bash
git clone https://github.com/outline/outline.git
cd outline
```

### 2. Установка зависимостей
```bash
yarn install
```

### 3. Настройка переменных окружения

Создайте файл `.env` в корне проекта на основе `.env.sample`:

```bash
cp .env.sample .env
```

Основные переменные для разработки:
```env
NODE_ENV=development
DATABASE_URL=postgresql://username:password@localhost:5432/outline
REDIS_URL=redis://localhost:6379
SECRET_KEY=your-secret-key-here
URL=http://localhost:3000
```

### 4. Настройка базы данных

#### Создание базы данных PostgreSQL
```bash
createdb outline
# или
yarn db:create
```

#### Запуск миграций
```bash
yarn db:migrate
```

### 5. Запуск в режиме разработки

#### Полный стек (рекомендуется)
```bash
yarn dev:watch
```
Эта команда запускает:
- Backend сервер с авто-перезагрузкой
- Frontend dev server с Vite
- Все сервисы: cron, collaboration, websockets, admin, web, worker

#### Только backend
```bash
yarn dev:backend
```

#### Только frontend
```bash
yarn vite:dev
```

#### Продакшн сборка
```bash
yarn build
yarn start
```

## Доступ к приложению

После запуска приложение будет доступно по адресу:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3000/api

## Основные команды

### Разработка
```bash
# Запуск всех сервисов
yarn dev:watch

# Запуск тестов
yarn test                    # Все тесты
yarn test:server            # Только backend тесты
yarn test:app               # Только frontend тесты

# Линтинг и форматирование
yarn lint                   # Проверка кода
yarn format                 # Форматирование кода

# База данных
yarn db:migrate             # Запуск миграций
yarn db:rollback            # Откат последней миграции
yarn db:reset               # Сброс базы данных
yarn db:create-migration    # Создание новой миграции
```

### Сборка и развертывание
```bash
# Сборка для продакшена
yarn build

# Запуск в продакшене
yarn start

# Очистка сборки
yarn clean
```

## Структура проекта

```
outline/
├── app/                    # React frontend приложение
├── server/                 # Node.js/Koa backend сервер
├── shared/                 # Общий код (типы, утилиты, редактор)
├── plugins/                # Плагины и расширения
├── public/                 # Статические файлы
├── build/                  # Скомпилированные файлы (генерируется)
├── node_modules/           # Зависимости (генерируется)
└── docs/                   # Документация
```

## Устранение неполадок

### Порт 3000 занят
Если порт 3000 уже используется:
```bash
# Найти процесс использующий порт
lsof -i :3000

# Или изменить порт в .env
PORT=3001
```

### Проблемы с базой данных
```bash
# Сброс базы данных
yarn db:reset

# Проверить подключение
yarn db:migrate
```

### Проблемы с зависимостями
```bash
# Очистка node_modules и переустановка
rm -rf node_modules yarn.lock
yarn install
```

### Очистка кэша
```bash
# Очистка yarn кэша
yarn cache clean

# Очистка build файлов
yarn clean

# Полная очистка
rm -rf node_modules build .yarn/cache
yarn install
```

## Разработка и contribution

### Настройка pre-commit hooks
```bash
yarn prepare
```

### Запуск тестов перед коммитом
```bash
yarn test
yarn lint
```

### Создание новой фичи
1. Создайте ветку: `git checkout -b feature/my-feature`
2. Напишите код и тесты
3. Запустите тесты: `yarn test`
4. Проверьте линтинг: `yarn lint`
5. Создайте PR

## Переменные окружения

### Обязательные
- `DATABASE_URL` - URL подключения к PostgreSQL
- `SECRET_KEY` - Секретный ключ для JWT токенов
- `URL` - URL приложения

### Опциональные
- `REDIS_URL` - URL Redis сервера
- `AWS_ACCESS_KEY_ID` - AWS ключи для S3
- `SMTP_HOST` - Настройки SMTP для email
- `SLACK_CLIENT_ID` - Slack интеграция

## Мониторинг и логирование

### Логи
- HTTP логирование: `DEBUG=http`
- Детальное логирование: `DEBUG=*`
- Уровень логирования: `LOG_LEVEL=debug`

### Профилирование
- Используйте Chrome DevTools для frontend профилирования
- Backend логи в консоли или файлах

## Безопасность

- Никогда не коммитите `.env` файл
- Используйте сильные пароли для базы данных
- В продакшене используйте HTTPS
- Регулярно обновляйте зависимости

## Поддержка

- **Документация**: https://docs.getoutline.com
- **GitHub Issues**: https://github.com/outline/outline/issues
- **Discussions**: https://github.com/outline/outline/discussions

## Лицензия

Business Source License 1.1 - см. LICENSE файл

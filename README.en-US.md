# Keystone Frontend

[中文](./README.md) | **English**

Keystone Frontend is the Vue 3 administration UI for [Keystone](https://github.com/bruceblink/Keystone). It is built with Vite, TypeScript, Element Plus, Pinia, Vue Router, Axios, and the pure-admin component ecosystem.

## Requirements

- Node.js 18+
- pnpm 10+
- Keystone backend running at `http://localhost:18080`

## Quick Start

```bash
pnpm install
pnpm dev
```

The development server listens on `http://localhost:8848` by default.

## Backend Alignment

The backend project is Keystone `3.6.1`. Its default local profile is `dev`, and the default backend port is `18080`.

Development proxy rules are defined in [vite.config.mts](vite.config.mts):

| Frontend path      | Target                                   | Notes                                   |
| ------------------ | ---------------------------------------- | --------------------------------------- |
| `/api/*`           | `http://localhost:18080/*`               | Business API, removes the `/api` prefix |
| `/v3/*`            | `http://localhost:18080/v3/*`            | OpenAPI JSON                            |
| `/swagger-ui/*`    | `http://localhost:18080/swagger-ui/*`    | Swagger UI                              |
| `/swagger-ui.html` | `http://localhost:18080/swagger-ui.html` | Compatibility entry                     |

Authentication endpoints used by the frontend include `/getConfig`, `/captchaImage`, `/login/rsa-public-key`, `/login`, `/refresh-token`, `/logout-refresh-token`, and `/logout`.

## Scripts

| Command               | Description                        |
| --------------------- | ---------------------------------- |
| `pnpm dev`            | Start the development server       |
| `pnpm build`          | Build production assets            |
| `pnpm typecheck`      | Run TypeScript and Vue type checks |
| `pnpm lint:eslint`    | Run ESLint with auto-fix           |
| `pnpm lint:prettier`  | Format source files with Prettier  |
| `pnpm lint:stylelint` | Run Stylelint with auto-fix        |

## License

MIT. Keep upstream dependency and template license requirements in mind when redistributing derivative work.

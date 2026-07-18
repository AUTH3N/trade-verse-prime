
# Vyro — Paper Trading Web App (MVP Plan)

A mobile-first responsive web app that looks and feels like a real Indian broker (Kotak Neo-inspired), running entirely on mocked-but-realistic market data. Built on Lovable's stack (TanStack Start + React + Tailwind + Lovable Cloud/Postgres + Lovable AI).

## Scope for this build

Everything below ships in this MVP. Broker API integration, native biometric/Face Unlock, and SMS-OTP delivery are explicitly out of scope for v1 (web-only; PIN gate covers the "unlock" experience).

### 1. Auth & shell
- Email + password, Google sign-in, Phone OTP (mocked verify code for now — swap in a real SMS provider later), 4-digit PIN gate on app open (stored hashed server-side, checked client-side per session).
- Bottom tab nav (mobile): Home · Watchlist · Orders · Portfolio · More. Dark theme default, light theme toggle.
- Onboarding: pick starting virtual capital (₹1L / ₹5L / ₹10L / custom).

### 2. Home dashboard
Virtual funds, portfolio value, day P&L, total P&L, margin used/available, open positions strip, holdings summary, top gainers/losers, sector heatmap, index tiles (NIFTY, BANKNIFTY, SENSEX, FINNIFTY), FII/DII mock card, market breadth, news feed (AI-generated headlines seeded).

### 3. Watchlists & stock page
- Unlimited watchlists, drag-to-reorder, search, add/remove, per-item alerts and notes.
- Stock page: TradingView-style chart (lightweight-charts library), fundamentals, financials, corporate actions, shareholding, peers, ratings, news.

### 4. Charts
Timeframes 1m → Monthly, indicators (EMA, SMA, RSI, MACD, Bollinger, VWAP, Supertrend, Pivot Points), drawing tools (trendline, Fib, rectangle, horizontal ray), landscape mode, replay mode (scrubber over historical mock series).

### 5. Option chain & strategy builder
- Live-updating chain: LTP, Bid/Ask, OI, OI Δ, Volume, IV, Δ Γ Θ Ⅴ ρ, PCR, intrinsic/extrinsic, ATM/ITM/OTM filters, expiry picker, strike search.
- Multi-leg strategy builder with presets (Straddle, Strangle, Iron Condor, Iron Butterfly, Bull/Bear spreads, Calendar, Ratio, Jade Lizard) + custom legs. Payoff graph, breakevens, max P/L, probability of profit, live MTM, SPAN+Exposure margin approximation.

### 6. Orders, positions, holdings, P&L
- Order types: Market, Limit, SL, SL-M, Bracket, Cover, GTT, Basket, Iceberg, AMO.
- Order lifecycle with realistic slippage, configurable execution delay, partial fills, rejects, modify/cancel.
- Positions: add qty, reverse, partial exit, avg price, live Greeks, MTM. Holdings: LTP, invested, current, day/overall P&L, XIRR.
- Complete trade history with filters and CSV export.

### 7. Portfolio analytics & journal
Equity curve, drawdown, Sharpe, expectancy, profit factor, win rate, R:R, calendar heatmap, best/worst trades. Auto trade journal with tags, notes, mistakes, AI-generated review per trade (Lovable AI Gateway, `google/gemini-3-flash-preview`).

### 8. Backtesting
Pick instrument, date range, capital, timeframe, brokerage/slippage, indicator-based entry/exit rules. Outputs equity curve, drawdown, trade log, replay. "Promote to paper strategy" button clones config into a live paper strategy.

### 9. Market replay
Replay any historical mock session with play/pause/FF/slow/jump-to-time; user can place paper orders against the replayed tape.

### 10. AI Trading Coach
Per-trade and weekly reviews scored on entries, exits, sizing, risk, Greeks awareness, overtrading, discipline. Chat coach page for asking questions about own history. All via Lovable AI Gateway server functions — key never leaves server.

### 11. Risk tools
Daily loss limit, profit target, max trades/day (enforced on order placement), position sizing calc, lot-size calc, R:R calc, probability calc, margin calc.

### 12. Learn center
Interactive lessons: options basics, selling, Greeks, expiry, assignment, indicators, candlestick patterns, S/R, margin, strategies. Progress tracked per user.

### 13. Social
Public trade sharing (opt-in), leaderboards (day/week/month/all-time, sortable by P&L / Sharpe / win-rate), achievements & badges, challenges, community discussion threads, public journals.

### 14. Notifications
In-app notification center + browser Web Push. Triggers: price alerts, IV/OI/Greeks thresholds, targets/SL hit, expiry reminders, earnings, economic events, margin calls, daily-limit warnings.

### 15. Admin dashboard
Role-gated `/admin` — users list, feature flags, broadcast push notifications, mock-market controls (volatility, event injection), abuse reports, system health tiles.

## Technical section

**Stack:** TanStack Start (Vite 7, React 19) · Tailwind v4 · shadcn · TanStack Query · Lovable Cloud (Supabase Postgres + Auth) · Lovable AI Gateway · `lightweight-charts` for charts · `dnd-kit` for drag-drop · `recharts` for analytics · `zod` for validation.

**Auth:** Lovable Cloud email/password + Google OAuth via `lovable.auth.signInWithOAuth`. Phone OTP built as a `createServerFn` pair (`requestOtp`, `verifyOtp`) with server-generated 6-digit code stored in a short-TTL table — mocked delivery (returned in dev, hidden in prod) so real SMS provider drops in later. PIN gate as separate `user_pins` table (bcrypt hash, RLS own-row).

**Roles:** `app_role` enum (`admin`, `user`) + `user_roles` table + `has_role()` SECURITY DEFINER, per Lovable rules. Admin routes gated in `beforeLoad` using route context.

**Data model (Supabase, RLS on every table, GRANTs included):**
- `profiles`, `user_roles`, `user_pins`, `otp_codes`
- `virtual_wallets` (balance, margin_used, starting_capital)
- `watchlists`, `watchlist_items` (with `sort_order`, `note`, `alert_price`)
- `instruments` (symbol, name, segment, lot_size, tick_size, ISIN) — seeded via migration with ~200 NSE stocks + index option definitions
- `orders` (full lifecycle fields), `trades` (fills), `positions`, `holdings`
- `option_strategies` (parent) + `strategy_legs`
- `alerts`, `notifications`
- `backtests` (config + results JSON), `backtest_trades`
- `journal_entries` (linked to trades, AI review text, tags, screenshot URL)
- `lessons`, `lesson_progress`
- `posts`, `post_comments`, `leaderboard_snapshots`, `achievements`, `user_achievements`, `challenges`, `challenge_participants`
- `feature_flags`, `admin_events`

**Mock market engine (server-side):**
- `instruments` seeded with realistic reference prices, sector, beta.
- A `createServerFn` `getQuote(symbols[])` and `getOptionChain(underlying, expiry)` generate live-feeling ticks deterministically from `(symbol, wall-clock second, seed)` using a Geometric Brownian Motion + intraday volatility profile; option premiums via Black-Scholes with realistic IV surface (smile + term). Greeks computed from BSM. Same second → same price across users, so orders/positions are consistent.
- Historical OHLCV generated once per instrument per day via seeded RNG and cached in `historical_bars` — used for charts, replay, and backtesting so results are reproducible.
- Order matching: server fn `placeOrder` runs full validation (funds, margin, risk limits), applies configurable slippage bps + execution-delay ms, creates `orders` + `trades`, updates `positions`/`holdings`/`virtual_wallets` atomically inside a Postgres function.
- Brokerage + STT + exchange txn charges + GST + SEBI + stamp duty calculated per Indian equity/F&O schedules.

**Realtime:** TanStack Query with `refetchInterval` (1–2 s on active chart/orderbook/positions pages) against `getQuote` server fns. Supabase Realtime subscribes on `orders`, `positions`, `notifications` for instant lifecycle updates. No WebSocket server to author — the browser Supabase client handles it.

**AI:** Server-only `src/lib/ai-gateway.server.ts` provider (openai-compatible → `https://ai.gateway.lovable.dev/v1`, `Lovable-API-Key` header). Server fns: `reviewTrade`, `weeklyCoachReport`, `chatWithCoach` (streaming via `/api/chat` route + `useChat`).

**Charts:** `lightweight-charts` for candles + indicators; overlays for drawings kept in local component state and persisted per instrument in `chart_layouts`.

**Routing:**
```
src/routes/
  index.tsx                       (public landing → CTA to /auth)
  auth.tsx                        (email/pw + Google + phone OTP + PIN setup)
  _authenticated/
    route.tsx                     (integration-managed gate + PIN gate wrapper)
    home.tsx
    watchlist.tsx, watchlist.$id.tsx
    stock.$symbol.tsx
    chart.$symbol.tsx             (fullscreen/landscape)
    optionchain.$underlying.tsx
    strategy.new.tsx, strategy.$id.tsx
    orders.tsx, orders.$id.tsx
    positions.tsx, holdings.tsx
    portfolio.tsx, portfolio.journal.tsx
    backtest.tsx, backtest.$id.tsx
    replay.tsx
    coach.tsx
    learn.tsx, learn.$lessonId.tsx
    social.tsx, social.leaderboard.tsx, social.user.$id.tsx
    alerts.tsx, notifications.tsx, settings.tsx
    _admin/
      route.tsx                   (has_role('admin') gate)
      admin.index.tsx, admin.users.tsx, admin.flags.tsx, admin.market.tsx
  api/
    chat.ts                       (streaming AI coach)
    public/push-subscribe.ts      (Web Push endpoint)
```

**Performance & UX:** 60 FPS animations via CSS/Framer-lite, haptic-style micro-interactions (`navigator.vibrate` on mobile), skeleton loaders, optimistic order UI, IndexedDB cache for last watchlist/positions snapshot for offline read-only.

**Security:** RLS on every table scoped to `auth.uid()`; admin actions via `has_role`; all server fns validate inputs with zod; PIN + OTP hashed; AI key server-side only; no service-role in components.

## Delivery order inside this build
1. Auth + PIN + shell + theme + Home skeleton
2. Instruments seed + mock quote engine + watchlist + stock page + chart
3. Orders + positions + holdings + wallet + P&L
4. Option chain + strategy builder + margin/Greeks
5. Portfolio analytics + journal + AI review
6. Backtesting + market replay + AI coach chat
7. Risk tools + learn center + notifications + alerts
8. Social + leaderboards + achievements
9. Admin dashboard + feature flags + polish pass

## Explicitly deferred (post-MVP)
- Real broker APIs (Kotak Neo, Zerodha, etc.) — architecture leaves a `MarketDataProvider` / `BrokerAdapter` seam.
- Real-time licensed NSE/BSE feed — swap the mock engine's `getQuote`/`getOptionChain` implementations only.
- Native biometric / Face Unlock — requires a native shell.
- Real SMS OTP delivery — plug in Twilio/MSG91 by replacing the mocked send step.
- Native Flutter/iOS app — reuses the same server fns as HTTP.

Confirm and I'll start with step 1 (auth + shell + Home skeleton) and enable Lovable Cloud.

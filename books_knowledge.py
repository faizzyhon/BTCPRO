#!/usr/bin/env python3
"""
MarketPulse AI — Books Knowledge Database (Phase 1)
Complete structured knowledge from 20 trading books.
Run standalone: python books_knowledge.py
Used by: books_server.py (port 5001) for dashboard integration
"""

import json
import sys
from datetime import datetime

# ─── BOOK REGISTRY ────────────────────────────────────────────────────────────

BOOKS = {
    "trading_in_the_zone": {
        "title": "Trading in the Zone",
        "author": "Mark Douglas",
        "category": "psychology",
        "core_thesis": "Consistent profitability comes from probabilistic thinking, not prediction accuracy.",
        "principles": [
            "Anything can happen at any moment in the market.",
            "You don't need to know what will happen next to make money.",
            "There is a random distribution of wins and losses for any edge.",
            "An edge is merely a higher probability of one thing happening over another.",
            "Every moment in the market is unique — no two moments are identical.",
            "Winners think in terms of probabilities across a series of trades, not individual outcomes.",
            "Fully accepting risk means no emotional pain when stop-loss is hit.",
            "The market is neutral — it has no memory and generates no emotions.",
            "Fear, euphoria, and hope are the three trading killers.",
            "Your mind creates the experience of the market, not the market itself.",
            "A losing trade does not invalidate an edge — only statistics over time do.",
            "Predefine your risk before entering every trade, no exceptions.",
            "Cut losing trades without hesitation — your only job is capital protection.",
            "Mental flexibility (no attachment to a direction) outperforms conviction.",
            "Overconfidence after a win streak is as dangerous as fear after a loss streak.",
        ],
        "five_truths": [
            "Anything can happen.",
            "You don't need to know to make money.",
            "Wins/losses are randomly distributed within an edge.",
            "An edge = higher probability, not certainty.",
            "Every moment is unique — past patterns suggest, not guarantee.",
        ],
        "error_patterns": {
            "fear_of_missing_out": "Chasing entries after missing the setup — accept the missed trade.",
            "revenge_trading": "Doubling down after a loss to 'win back' — statistically ruins accounts.",
            "hope_holding": "Holding a losing trade hoping it comes back — violates predefined risk.",
            "euphoria_sizing": "Oversizing after wins because 'I'm on a roll' — ignores edge statistics.",
        },
        "signals": {
            "enter_on": ["predefined setup criteria met", "risk amount acceptable before entry"],
            "avoid_on": ["emotional state is not neutral", "chasing after breakout already happened"],
        },
    },

    "disciplined_trader": {
        "title": "The Disciplined Trader",
        "author": "Mark Douglas",
        "category": "psychology",
        "core_thesis": "Mental discipline is the primary skill separating winning and losing traders.",
        "principles": [
            "The market environment is unlike any other — no external structure forces discipline.",
            "Your beliefs about the market create your trading reality.",
            "Conflicting beliefs create inconsistency — audit and resolve them.",
            "Discipline is a skill that can be learned through repetition and structure.",
            "Structure your trading environment to reduce discretionary decisions.",
            "Most losses come from refusing to accept being wrong.",
            "The market offers unlimited opportunity — scarcity thinking is destructive.",
            "Your trading system is only as good as your ability to execute it without hesitation.",
            "Emotional neutrality is not suppression — it is genuine acceptance of all outcomes.",
            "Build rules that remove emotion from the decision — then trust the rules.",
        ],
        "belief_audit_questions": [
            "Do I believe I deserve to win?",
            "Do I believe the market is against me personally?",
            "Do I believe I need to be right to feel good?",
            "Do I believe losses mean I am a bad trader?",
        ],
    },

    "psychology_of_trading": {
        "title": "The Psychology of Trading",
        "author": "Brett N. Steenbarger",
        "category": "psychology",
        "core_thesis": "Trading performance improves by identifying and interrupting losing patterns, not just positive thinking.",
        "principles": [
            "Solution-focused: identify what you do RIGHT in winning trades and replicate it.",
            "Pattern identification: chart your emotional states alongside your P&L.",
            "Cognitive behavioral: change behavior first, feelings follow.",
            "State management: physical state (posture, breathing) affects decision quality.",
            "Trading journal is non-negotiable — review patterns weekly.",
            "Separate trading performance from self-worth completely.",
            "Arousal level matters: too calm = missed opportunities; too excited = errors.",
            "Peak performance is a skill state, not a personality trait.",
            "Interrupt losing patterns immediately — do not ride them out.",
            "Brief solution-focused therapy: exceptions to the problem contain the solution.",
        ],
        "state_management": {
            "optimal_arousal": "Moderate — alert but calm. Heart rate ~60-80 bpm.",
            "signs_too_high": ["hands sweating", "racing thoughts", "urge to trade immediately"],
            "signs_too_low": ["boredom", "distraction", "slow reaction to setups"],
            "reset_techniques": ["5-minute break", "box breathing (4-4-4-4)", "physical movement"],
        },
    },

    "thinking_fast_slow": {
        "title": "Thinking, Fast and Slow",
        "author": "Daniel Kahneman",
        "category": "psychology",
        "core_thesis": "System 1 (fast/emotional) dominates System 2 (slow/rational) under stress — disastrous in trading.",
        "principles": [
            "System 1 is automatic, fast, emotional — it generates trading impulses.",
            "System 2 is deliberate, slow, rational — it should govern trade decisions.",
            "Loss aversion: losses feel 2× more painful than equivalent gains feel good.",
            "Prospect theory: people take more risk to avoid a sure loss than to achieve a sure gain.",
            "Anchoring bias: first price seen anchors expectations irrationally.",
            "Availability heuristic: recent dramatic events feel more likely to repeat.",
            "Overconfidence: 90% of traders think they are above average.",
            "Framing effect: 'win 60%' vs 'lose 40%' produce different decisions despite identical meaning.",
            "Sunk cost fallacy: prior losses are irrelevant to future decisions.",
            "Narrative fallacy: humans construct stories to explain random outcomes.",
            "WYSIATI (What You See Is All There Is): decisions made on available info only, ignoring unknown unknowns.",
            "Regression to mean: extreme outcomes are followed by more average ones — not continuation.",
        ],
        "trading_biases": {
            "loss_aversion": "Exit winning trades too early; hold losing trades too long.",
            "anchoring": "Anchoring to buy price when deciding to exit.",
            "availability": "Overweighting last headline; underweighting base rates.",
            "overconfidence": "Oversizing after winning streaks.",
            "narrative_fallacy": "Inventing post-hoc stories to justify poor entries.",
        },
        "countermeasures": {
            "loss_aversion": "Set exit rules in advance, never during the trade.",
            "anchoring": "Always evaluate current price vs. current market structure, not entry price.",
            "availability": "Use base rate statistics, not recent dramatic events.",
            "overconfidence": "Track actual vs. predicted accuracy monthly.",
        },
    },

    "fooled_by_randomness": {
        "title": "Fooled by Randomness",
        "author": "Nassim Nicholas Taleb",
        "category": "psychology",
        "core_thesis": "Randomness masquerades as skill in short periods. Survivorship bias hides the graveyard of failed traders.",
        "principles": [
            "Survivorship bias: only successful traders are visible — failures are hidden.",
            "Short track records prove nothing — randomness produces winning streaks.",
            "Alternative histories: consider all paths that could have occurred, not just what happened.",
            "Monte Carlo thinking: simulate thousands of paths to understand distribution of outcomes.",
            "Rare events (black swans) are underweighted by human intuition.",
            "Skewness matters: small frequent gains + rare catastrophic loss = negative EV.",
            "Do not mistake luck for skill in short sample sizes.",
            "Dentist rule: check performance monthly, not hourly — reduces emotional noise.",
            "Mild success in random environments can cause more harm than failure by increasing confidence.",
            "Ergodicity error: ensemble probability ≠ time probability for individual traders.",
            "Path dependency: sequence of returns matters more than average return (ruin risk).",
        ],
        "practical_rules": [
            "Require 3+ years of live trading data before trusting a system.",
            "Ask: could this performance be explained by luck alone?",
            "Design strategies where black swans are survivable — never bet the account.",
            "Asymmetric payoff: many small losses, rare large wins > many small wins, rare large loss.",
        ],
    },

    "technical_analysis_murphy": {
        "title": "Technical Analysis of the Financial Markets",
        "author": "John J. Murphy",
        "category": "technical_analysis",
        "core_thesis": "Price action discounts all known information. Trends persist until broken. History repeats.",
        "dow_theory": [
            "Market has three trends: primary (months-years), secondary (weeks-months), minor (days-weeks).",
            "Primary uptrend: higher highs and higher lows. Downtrend: lower highs and lower lows.",
            "Volume confirms trend: volume increases with trend direction, decreases on corrections.",
            "Markets are efficient in reflecting all known information — trade the price, not the news.",
        ],
        "support_resistance": {
            "support": "Price level where buying interest is strong enough to halt downtrend.",
            "resistance": "Price level where selling interest halts uptrend.",
            "role_reversal": "Broken support becomes resistance; broken resistance becomes support.",
            "strength_factors": ["number of times tested", "volume at level", "time at level", "distance moved from level"],
        },
        "trend_rules": [
            "Trend is your friend until it ends.",
            "Never trade against the primary trend.",
            "Secondary corrections retrace 38.2%, 50%, or 61.8% (Fibonacci) of prior move.",
            "Trend change requires: opposite pattern, volume confirmation, and time.",
        ],
        "chart_patterns": {
            "reversal": ["head_and_shoulders", "double_top", "double_bottom", "triple_top", "rounding_bottom"],
            "continuation": ["flag", "pennant", "symmetrical_triangle", "ascending_triangle", "descending_triangle"],
            "measured_move": "Target = height of pattern added to/subtracted from breakout level.",
        },
        "volume_rules": [
            "Rising price + rising volume = healthy uptrend.",
            "Rising price + falling volume = weakening trend, potential reversal.",
            "Falling price + rising volume = strong downtrend.",
            "Falling price + falling volume = weakening downtrend, potential base.",
            "Volume spike at reversal point = climactic exhaustion signal.",
        ],
        "gaps": {
            "common": "Low-significance gaps within congestion — usually filled quickly.",
            "breakaway": "High-significance gap breaking out of pattern on high volume — often not filled.",
            "runaway": "Mid-trend gap confirming trend strength — measures halfway point of move.",
            "exhaustion": "Final gap near end of trend — quickly filled, reversal signal.",
        },
        "indicators": {
            "moving_averages": "Trend following — lagging. 200MA = long-term trend, 50MA = medium, 20MA = short.",
            "rsi": "Momentum oscillator 0-100. >70 = overbought, <30 = oversold. Divergence is key signal.",
            "macd": "Trend + momentum. Crossover signal. Histogram = momentum of momentum.",
            "bollinger_bands": "Volatility envelope. Squeeze = low volatility (breakout imminent). Walk the band = strong trend.",
            "stochastic": "Momentum oscillator. >80 overbought, <20 oversold. %K/%D crossover signals.",
            "vwap": "Volume-weighted average price. Institutional benchmark. Price above = bullish bias.",
            "atr": "Average True Range = volatility measure. Use for stop placement (1-2x ATR).",
        },
    },

    "candlestick_nison": {
        "title": "Japanese Candlestick Charting Techniques",
        "author": "Steve Nison",
        "category": "technical_analysis",
        "core_thesis": "Candlestick patterns reveal the battle between buyers and sellers with precision unavailable in bar charts.",
        "single_candle_patterns": {
            "doji": {
                "description": "Open ≈ Close. Indecision. Neither bulls nor bears in control.",
                "signal": "Reversal warning when appears after strong trend.",
                "types": {
                    "long_legged_doji": "Very long wicks both sides — extreme indecision.",
                    "dragonfly_doji": "Long lower wick, no upper wick — bullish reversal.",
                    "gravestone_doji": "Long upper wick, no lower wick — bearish reversal.",
                    "four_price_doji": "Open=High=Low=Close — very thin market.",
                },
                "confirmation_required": True,
            },
            "hammer": {
                "description": "Small body at top, long lower wick (≥2x body), little/no upper wick.",
                "signal": "Bullish reversal after downtrend.",
                "confirmation_required": True,
                "key_rule": "Must appear after a downtrend. Body color secondary.",
            },
            "hanging_man": {
                "description": "Same shape as hammer but appears after uptrend.",
                "signal": "Bearish reversal warning after uptrend.",
                "confirmation_required": True,
                "key_rule": "Requires bearish next-candle confirmation.",
            },
            "shooting_star": {
                "description": "Small body at bottom, long upper wick (≥2x body), little/no lower wick.",
                "signal": "Bearish reversal after uptrend.",
                "confirmation_required": True,
            },
            "inverted_hammer": {
                "description": "Same shape as shooting star but after downtrend.",
                "signal": "Bullish reversal potential after downtrend.",
                "confirmation_required": True,
            },
            "spinning_top": {
                "description": "Small body, wicks both sides. Indecision.",
                "signal": "Continuation uncertainty. Watch next candle.",
            },
            "marubozu": {
                "bullish": "Large green body, no wicks. Strong buying pressure all session.",
                "bearish": "Large red body, no wicks. Strong selling pressure all session.",
                "signal": "Continuation in direction of body.",
            },
        },
        "two_candle_patterns": {
            "bullish_engulfing": {
                "description": "Small red candle followed by large green candle that engulfs previous body.",
                "signal": "Strong bullish reversal after downtrend.",
                "strength": "High",
                "confirmation_required": False,
            },
            "bearish_engulfing": {
                "description": "Small green candle followed by large red candle that engulfs previous body.",
                "signal": "Strong bearish reversal after uptrend.",
                "strength": "High",
            },
            "piercing_line": {
                "description": "Red candle followed by green candle opening below low, closing above midpoint of red.",
                "signal": "Bullish reversal.",
                "strength": "Medium-High",
            },
            "dark_cloud_cover": {
                "description": "Green candle followed by red candle opening above high, closing below midpoint of green.",
                "signal": "Bearish reversal.",
                "strength": "Medium-High",
            },
            "harami_bullish": {
                "description": "Large red candle followed by small green candle entirely within previous body.",
                "signal": "Bullish reversal warning — trend losing momentum.",
                "strength": "Medium",
                "confirmation_required": True,
            },
            "harami_bearish": {
                "description": "Large green candle followed by small red candle entirely within previous body.",
                "signal": "Bearish reversal warning.",
                "strength": "Medium",
                "confirmation_required": True,
            },
        },
        "three_candle_patterns": {
            "morning_star": {
                "description": "Large red → small body (gap down) → large green (closes above midpoint of first candle).",
                "signal": "Strong bullish reversal after downtrend.",
                "strength": "Very High",
            },
            "evening_star": {
                "description": "Large green → small body (gap up) → large red (closes below midpoint of first candle).",
                "signal": "Strong bearish reversal after uptrend.",
                "strength": "Very High",
            },
            "three_white_soldiers": {
                "description": "Three consecutive large green candles, each closing near high.",
                "signal": "Strong bullish reversal or continuation.",
                "strength": "High",
            },
            "three_black_crows": {
                "description": "Three consecutive large red candles, each closing near low.",
                "signal": "Strong bearish reversal or continuation.",
                "strength": "High",
            },
            "morning_doji_star": {
                "description": "Morning star with doji in middle position.",
                "signal": "Strongest bullish reversal pattern.",
                "strength": "Very High",
            },
        },
        "confluence_rules": [
            "Pattern at key support/resistance = 2× strength.",
            "Pattern with high volume = 2× strength.",
            "Pattern confirmed by oscillator divergence = 2× strength.",
            "Pattern against primary trend requires 2 confirmations before acting.",
            "Never act on pattern alone — always require confluence.",
        ],
    },

    "price_charts_brooks": {
        "title": "Reading Price Charts Bar by Bar",
        "author": "Al Brooks",
        "category": "technical_analysis",
        "core_thesis": "Every bar is either a with-trend or countertrend setup. Price action is the only leading indicator.",
        "principles": [
            "Every bar tells a story — body size, wick size, and location relative to prior bars.",
            "Strong bull signal bar: large green body, close near high, small lower wick.",
            "Strong bear signal bar: large red body, close near low, small upper wick.",
            "Entry on breakout of signal bar = entry on confirmation.",
            "Failed breakout = strong counter signal — trapped traders fuel opposite move.",
            "Always-in-long vs always-in-short: determine which side is in control at all times.",
            "Measured moves: channel height added to breakout point = target.",
            "Tight trading range (TTR) = coil before explosive move.",
            "Bull flag: pullback in uptrend on lower volume, small-bodied candles.",
            "Bear flag: rally in downtrend on lower volume, small-bodied candles.",
            "Two-legged pullback (AB=CD) is highest probability entry.",
            "Microchannels: trend runs extremely strongly — only trade with trend.",
            "Channel breakout: often retests channel before continuing.",
            "Climactic exhaustion: very long bar in trend direction = likely reversal soon.",
            "Second entry (EMA test #2) has higher probability than first test.",
        ],
        "bar_analysis": {
            "bull_bar_traits": ["green body", "close in upper third", "lower wick < body", "larger than avg"],
            "bear_bar_traits": ["red body", "close in lower third", "upper wick < body", "larger than avg"],
            "indecision_traits": ["small body", "large wicks both sides", "close near middle"],
        },
        "probability_rules": {
            "with_trend_entry_at_ema": "60-70% success rate.",
            "countertrend_entry": "40-50% — requires confirmation.",
            "failed_breakout_reversal": "65-75% if bar closes back inside range.",
            "two_legged_pullback": "65-70% with good signal bar.",
        },
    },

    "market_wizards": {
        "title": "Market Wizards / Unknown Market Wizards",
        "author": "Jack D. Schwager",
        "category": "wisdom",
        "core_thesis": "Elite traders share universal traits despite vastly different styles: discipline, risk control, conviction.",
        "universal_traits": [
            "Cut losses quickly — every wizard cited this as primary rule.",
            "Let winners run — asymmetric holding: quick exits for losses, patience for winners.",
            "Trade your own method — never copy another trader's exact system.",
            "Have a clearly defined edge — know WHY it works statistically.",
            "Expect and plan for losing streaks — they are mathematically certain with any edge.",
            "Risk management is first; profit is second.",
            "Physical and mental health directly impacts performance.",
            "The best traders are constantly learning — never complacent.",
            "Position sizing separates good systems from great performance.",
            "Never add to a losing position (averaging down) — exception only for scalpers with strict rules.",
        ],
        "trader_archetypes": {
            "trend_follower": "Loses frequently but wins are 5-10× losses. Drawdowns are long and deep but recoverable.",
            "mean_reverter": "Wins frequently (70-80%) but losses can be large if trend starts. Must be disciplined with size.",
            "momentum_trader": "Quick entries and exits. High frequency. Requires extreme discipline and fast execution.",
            "macro_trader": "Rare big bets on global macro themes. Long holding times. Fundamental analysis primary.",
        },
        "quotes": [
            "The market can stay irrational longer than you can stay solvent. — Keynes (referenced by Schwager)",
            "The elements of good trading are: cutting losses, riding winners, and keeping bets small.",
            "Amateurs look for certainty. Professionals manage uncertainty.",
            "The best trades are often the ones that feel uncomfortable — counterintuitive entries at extremes.",
        ],
    },

    "trade_your_way": {
        "title": "Trade Your Way to Financial Freedom",
        "author": "Van K. Tharp",
        "category": "risk_management",
        "core_thesis": "Position sizing is the primary determinant of whether you achieve your trading objectives.",
        "r_multiples": {
            "concept": "Express all P&L in multiples of initial risk (R). Win of $300 with $100 risk = 3R.",
            "expectancy_formula": "E = (Win% × Avg Win R) - (Loss% × Avg Loss R)",
            "positive_expectancy": "System has positive edge if E > 0 over large sample.",
            "sqn": "System Quality Number = (Mean R / StdDev R) × √(Number of Trades). SQN > 2 = good, >3 = excellent.",
        },
        "position_sizing_models": {
            "fixed_fractional": "Risk fixed % of current equity per trade (1-2% recommended).",
            "fixed_ratio": "Increase size after fixed profit increment. More conservative.",
            "kelly": "Mathematically optimal but too volatile. Use ½-Kelly in practice.",
            "percent_volatility": "Size based on ATR — equalizes risk across different volatility assets.",
        },
        "principles": [
            "Never risk more than 1% of account on any single trade (conservative) or 2% (aggressive).",
            "Position size determines your success more than entry and exit signals.",
            "A positive expectancy system CAN destroy your account with wrong position sizing.",
            "Martingale (doubling after losses) = guaranteed ruin with any finite capital.",
            "Anti-martingale (increase size after wins) = aligns with account growth.",
            "Maximum drawdown determines if a system is tradeable psychologically.",
            "Backtesting without position sizing is meaningless.",
            "R-multiple thinking removes emotional attachment to dollar amounts.",
        ],
        "holy_grail": "There is no perfect system. The holy grail is finding a positive-expectancy system and sizing it correctly.",
    },

    "kelly_criterion": {
        "title": "The Kelly Capital Growth Investment Criterion",
        "author": "MacLean, Thorp, Ziemba",
        "category": "risk_management",
        "core_thesis": "Kelly fraction maximizes long-run geometric growth of capital but requires precise probability estimates.",
        "formula": {
            "kelly_fraction": "f* = (bp - q) / b",
            "variables": {
                "b": "Net odds received (e.g., 2:1 odds → b=2)",
                "p": "Probability of winning",
                "q": "Probability of losing (1-p)",
            },
            "example": "60% win rate, 1:1 odds → f* = (1×0.6 - 0.4)/1 = 0.20 = bet 20% of bankroll",
        },
        "practical_rules": [
            "Full Kelly maximizes growth but drawdowns are extreme (50%+ drawdowns normal).",
            "Half-Kelly (f*/2) is standard practical recommendation — 75% of max growth, 50% of variance.",
            "Quarter-Kelly for very uncertain probability estimates.",
            "Over-Kelly (betting more than full Kelly) decreases growth rate and increases ruin probability.",
            "Kelly requires precise win rate and payoff ratio — overestimation is dangerous.",
            "In trading: use Kelly as upper bound, not target.",
            "Kelly fraction of 0 = abandon the strategy (negative expectancy).",
        ],
        "over_kelly_warning": "Betting 2× Kelly reduces long-run return to zero. Betting 3× Kelly guarantees ruin.",
    },

    "risk_management_hull": {
        "title": "Risk Management and Financial Institutions",
        "author": "John C. Hull",
        "category": "risk_management",
        "core_thesis": "Quantitative risk management prevents catastrophic losses. Tail risk is always underestimated.",
        "var_concepts": {
            "definition": "Value at Risk: maximum loss over N days with X% confidence.",
            "example": "1-day 99% VaR of $10,000 = should not lose more than $10k on 99 out of 100 days.",
            "limitation": "VaR says nothing about losses beyond the threshold (tail risk).",
        },
        "expected_shortfall": {
            "definition": "Average loss when VaR is exceeded. Better tail risk measure than VaR.",
            "also_known_as": "CVaR (Conditional VaR) or ES.",
        },
        "risk_types": {
            "market_risk": "Price moves against position. Managed by position limits and stops.",
            "liquidity_risk": "Cannot exit position without moving price. Managed by size limits.",
            "leverage_risk": "Amplifies both gains and losses. Liquidation = total loss of margin.",
            "correlation_risk": "Diversification fails when correlations spike (crises).",
            "model_risk": "Model assumptions fail in tail events.",
        },
        "leverage_rules": [
            "Leverage 10× = 10% adverse move = 100% account loss (liquidation).",
            "Leverage 20× = 5% adverse move = 100% loss.",
            "Leverage 50× = 2% adverse move = 100% loss.",
            "Liquidation price LONG = Entry × (1 - 1/Leverage)",
            "Liquidation price SHORT = Entry × (1 + 1/Leverage)",
            "Always calculate liquidation distance before sizing a leveraged position.",
        ],
        "stress_testing": "Test portfolio against: 2008 crash, 2020 COVID, 2022 crypto bear, 1987 Black Monday.",
    },

    "new_trading_for_living": {
        "title": "The New Trading for a Living",
        "author": "Alexander Elder",
        "category": "technical_analysis",
        "core_thesis": "Three Ms of trading: Mind, Method, Money. All three must be mastered.",
        "three_ms": {
            "mind": "Psychology — trading without emotion, accepting losses, staying disciplined.",
            "method": "Technical system — clear entry/exit rules with statistical edge.",
            "money": "Risk management — position sizing, max loss per day/week.",
        },
        "2_percent_rule": "Never risk more than 2% of account on any single trade.",
        "6_percent_rule": "Stop trading for the month if total equity drops 6% in one month.",
        "triple_screen": {
            "screen_1": "Weekly chart — identify primary trend direction.",
            "screen_2": "Daily chart — find pullback counter to weekly trend (entry zone).",
            "screen_3": "Hourly/intraday — precise entry on momentum returning to weekly trend direction.",
        },
        "indicators": {
            "impulse_system": "Weekly EMA + MACD histogram direction. Both rising = green (buy only). Both falling = red (sell only). Mixed = blue (neutral).",
            "force_index": "Volume × price change. Measures conviction behind each price move.",
            "elder_ray": "Bull power = High - EMA. Bear power = Low - EMA. Divergences signal reversals.",
        },
        "principles": [
            "The market is a crowd — study crowd psychology, not just price.",
            "No indicator works all the time — combine multiple timeframes.",
            "A trader's worst enemy is not the market — it's their own emotions.",
            "Paper trade new systems for 3 months minimum before real capital.",
            "Never add to a losing position.",
            "Decrease size after 3 consecutive losses — you may be in a drawdown period.",
        ],
    },

    "beginner_stock_kratter": {
        "title": "A Beginner's Guide to the Stock Market",
        "author": "Matthew R. Kratter",
        "category": "fundamentals",
        "core_thesis": "Simple rules consistently applied beat complex systems that cannot be executed.",
        "principles": [
            "Buy quality assets in uptrends — simple trend following works.",
            "Dollar cost averaging reduces timing risk for long-term investors.",
            "Compounding is the most powerful force in wealth building.",
            "Don't try to time the market — time IN the market beats timing the market.",
            "Keep costs low — fees compound against you.",
            "Diversification across uncorrelated assets reduces portfolio volatility.",
            "Never invest money you need within 5 years.",
            "Fundamental value matters long-term, sentiment matters short-term.",
        ],
        "beginner_rules": [
            "Start with paper trading to build confidence without risking capital.",
            "Only risk money you can afford to lose completely.",
            "Understand what you own — never buy what you don't understand.",
            "Have an exit plan before entering any position.",
        ],
    },

    "world_order_dalio": {
        "title": "Principles for Dealing with the Changing World Order",
        "author": "Ray Dalio",
        "category": "macro",
        "core_thesis": "History repeats in long cycles. Understanding debt cycles and empire shifts predicts macro volatility.",
        "big_cycle": {
            "duration": "250 years (empire cycle)",
            "phases": [
                "New order established after wars/revolution. New reserve currency. Low debt.",
                "Prosperity and productivity. Rising wealth. Peaceful competition.",
                "Wealth disparity grows. Debt accumulates. Internal conflict rises.",
                "Financial crisis and/or revolution/war. Restructuring. New order begins.",
            ],
        },
        "debt_cycles": {
            "short_cycle": "5-8 years. Business cycle. Central bank managed. Recessions and recoveries.",
            "long_cycle": "50-75 years. Debt super-cycle. Ends in deleveraging (depression or inflation).",
        },
        "reserve_currency": [
            "Reserve currency status provides enormous economic advantage.",
            "Reserve currency shifts happen when: debt too high, military power declines, new power rises.",
            "Current shift: USD (dominant) vs CNY (challenger) = structural volatility.",
            "Commodity backing (gold, oil) affects reserve currency status.",
        ],
        "wealth_income_gaps": [
            "Extremes in wealth gap → political polarization → populism → policy volatility.",
            "Watch: Gini coefficient, union membership, political extremism indicators.",
        ],
        "trading_signals": {
            "watch_for": [
                "Debt-to-GDP > 300% = deleveraging risk.",
                "Real interest rates deeply negative = inflation ahead.",
                "Reserve currency weakening vs commodities = structural shift.",
                "Internal political conflict escalating = risk-off.",
                "Rising power vs declining power confrontation = geopolitical risk premium.",
            ],
            "asset_implications": {
                "deleveraging": "Gold, commodities outperform. Cash and bonds underperform.",
                "inflation": "Bitcoin/crypto, gold, real assets outperform. Long-duration bonds collapse.",
                "geopolitical_risk": "Safe havens (USD, gold, JPY) spike. Risk assets sell off.",
            },
        },
    },

    "global_macro_gliner": {
        "title": "Global Macro Trading",
        "author": "Greg Gliner",
        "category": "macro",
        "core_thesis": "Top-down macro analysis drives the most profitable long-term trade themes.",
        "framework": {
            "level_1": "Global growth cycle (expanding vs contracting).",
            "level_2": "Regional dynamics (US, EU, EM, China divergence).",
            "level_3": "Country-specific factors (central bank policy, political stability).",
            "level_4": "Sector rotation within countries.",
            "level_5": "Asset selection within sectors.",
        },
        "primary_signals": {
            "currency_strength": "Strong USD = headwind for commodities and EM assets. Weak USD = tailwind.",
            "yield_curve": "Inverted (2yr > 10yr) = recession signal 12-18 months ahead.",
            "carry_trade": "High-yield currency borrow + low-yield invest. Unwinds rapidly in risk-off.",
            "commodity_cycle": "Oil leads inflation; copper leads growth; gold leads risk sentiment.",
            "capital_flows": "Track cross-border fund flows — institutional money drives direction.",
        },
        "crypto_macro_links": {
            "usd_strength": "BTC/USD falls when DXY rises. Watch DXY inversely.",
            "risk_appetite": "BTC correlates with Nasdaq in risk-off events.",
            "liquidity": "Fed balance sheet expansion = BTC bullish. Contraction = bearish.",
            "real_rates": "Negative real rates = alternative asset demand (gold, BTC).",
            "institutional": "Institutional adoption creates structural demand floor.",
        },
    },

    "economics_one_lesson": {
        "title": "Economics in One Lesson",
        "author": "Henry Hazlitt",
        "category": "macro",
        "core_thesis": "Economic policy must consider ALL effects on ALL groups — not just immediate visible effects.",
        "broken_window_fallacy": "Destroying value does not create wealth. Government spending replaces private spending.",
        "principles": [
            "Price controls destroy supply — artificial ceilings reduce production.",
            "Tariffs reduce efficiency — consumers pay higher prices, industries become uncompetitive.",
            "Inflation is hidden taxation — governments inflate to reduce real debt burden.",
            "Free market prices aggregate distributed knowledge — interference distorts this signal.",
            "Trade benefits both parties — zero-sum thinking about trade is wrong.",
            "Minimum wage laws reduce employment for lowest-skilled workers.",
        ],
        "trading_implications": {
            "inflation_trade": "Government spending + money printing → inflation → BTC/gold long.",
            "tariff_impact": "Tariffs increase costs → inflation → central bank tightening → risk-off.",
            "price_control_warning": "Stablecoin regulation, CBDC implementation = hidden risk for crypto.",
        },
    },

    "financial_machine_learning": {
        "title": "Advances in Financial Machine Learning",
        "author": "Marcos López de Prado",
        "category": "quantitative",
        "core_thesis": "Traditional ML applied to finance fails due to false discoveries. Proper methodology is required.",
        "key_concepts": {
            "triple_barrier_labeling": {
                "description": "Label each observation as: TP hit (1), SL hit (-1), or time exit (0).",
                "benefit": "Eliminates lookahead bias in labeling.",
            },
            "fractional_differentiation": {
                "description": "Make time series stationary while preserving maximum memory.",
                "benefit": "Stationary enough for ML without losing predictive signal.",
            },
            "purging_and_embargo": {
                "description": "Prevent information leakage in cross-validation.",
                "benefit": "Accurate out-of-sample performance estimates.",
            },
            "meta_labeling": {
                "description": "Primary model gives direction, secondary model decides bet size.",
                "benefit": "Improves precision of signals.",
            },
        },
        "backtest_rules": [
            "Walk-forward validation only — no random splits for time series.",
            "Never test on data used in feature engineering.",
            "Report: Sharpe ratio, max drawdown, Calmar ratio, Sortino ratio.",
            "Deflated Sharpe ratio corrects for multiple testing.",
            "More parameters = more likely overfit — prefer simple models.",
            "Out-of-sample performance should be 50-70% of in-sample — not equal.",
        ],
        "feature_importance": "Use Mean Decrease Impurity AND permutation importance. Both agree = genuine feature.",
        "bet_sizing": "Size bets proportional to model confidence. High confidence = full size. Low = quarter size.",
    },

    "expected_returns_ilmanen": {
        "title": "Expected Returns",
        "author": "Antti Ilmanen",
        "category": "quantitative",
        "core_thesis": "Long-run returns are driven by risk premia. Factors beat asset classes for diversification.",
        "risk_premia": {
            "equity_premium": "Stocks > bonds over long run. Risk: drawdowns, illiquidity, sentiment.",
            "value_premium": "Cheap assets outperform expensive. Risk: prolonged underperformance.",
            "momentum_premium": "Winners continue winning (3-12 months). Risk: momentum crashes.",
            "carry_premium": "High-yield assets outperform low-yield. Risk: sharp reversals.",
            "defensive_premium": "Low-volatility assets outperform. Risk: underperformance in bull markets.",
        },
        "crypto_factor_mapping": {
            "momentum": "BTC momentum (3m return) predicts next 1-3m return.",
            "carry": "Funding rate positive = market bullish (spot > perp). Negative = bearish.",
            "value": "MVRV ratio (market cap / realized cap) < 1 = undervalued.",
        },
        "diversification": "Diversify by risk factor, not just asset. BTC + gold + USD = uncorrelated in most regimes.",
    },
}

# ─── AGGREGATED TOPIC KNOWLEDGE ───────────────────────────────────────────────

TOPICS = {
    "entry_rules": [
        "Only enter when signal bar quality is high (large body, small counter-wick). — Brooks",
        "Require confluence: price action + indicator + context alignment. — Murphy",
        "Second test of support/resistance has higher probability than first. — Brooks",
        "Enter on pullback to EMA in trending market, not on breakout chase. — Elder",
        "Define exact entry criteria before market opens — no discretionary decisions during session. — Douglas",
        "Higher timeframe must confirm direction before lower timeframe entry. — Elder Triple Screen",
    ],
    "exit_rules": [
        "Predefine stop-loss distance before entering — never move stop against position. — Douglas",
        "Use ATR×1.5 for stop placement — adapts to current volatility. — Murphy",
        "Scale out at TP1, trail remaining position. — Brooks",
        "Exit immediately when thesis is invalidated — do not hope. — Douglas",
        "Time-based exit: if trade not working in X bars, exit regardless. — Brooks",
        "Never let a winner become a loser after reaching TP1. — Elder",
    ],
    "position_sizing": [
        "Fixed 1-2% risk per trade is foundation. — Tharp, Elder",
        "Use ½-Kelly as absolute maximum. — MacLean/Thorp",
        "Reduce size by 50% after 3 consecutive losses. — Elder",
        "Never increase size during drawdown — the worst time to add risk. — Tharp",
        "Position size = (Account × Risk%) / Stop Distance in $. — Tharp",
        "Leverage amplifies mistakes as much as profits — prefer lower leverage. — Hull",
    ],
    "trend_analysis": [
        "Higher highs + higher lows = uptrend. Lower highs + lower lows = downtrend. — Murphy/Dow",
        "Trade with primary weekly trend on daily/hourly entries. — Elder Triple Screen",
        "Never predict trend change without confirmation. — Murphy",
        "Volume must confirm trend — declining volume in trend = warning. — Murphy",
        "Microchannels (very steep trends) only trade with trend. — Brooks",
        "Trend change: wait for opposite pattern + volume + test of breakout. — Murphy",
    ],
    "psychology_rules": [
        "Accept all outcomes before entering — not after stop is hit. — Douglas",
        "Think in probabilities across 100 trades, not individual outcomes. — Douglas",
        "Check emotional state before trading — do not trade when in fear or euphoria. — Steenbarger",
        "Losses are the cost of doing business — not personal failures. — Douglas",
        "Loss aversion will make you hold losers and exit winners early — counteract with rules. — Kahneman",
        "Consider alternative histories — could you have been wrong by luck? — Taleb",
        "Survive first — profit second. Capital preservation is the primary objective. — Multiple",
    ],
    "macro_context": [
        "Check USD strength (DXY) — strong USD = BTC headwind. — Gliner",
        "Fed policy cycle dominates all other signals in crypto. — Gliner/Dalio",
        "Yield curve inversion = recession 12-18 months ahead — risk-off positioning. — Gliner",
        "Geopolitical risk events → safe-haven flows → risk asset selling. — Dalio",
        "Negative real rates = demand for store-of-value assets (gold, BTC). — Dalio/Ilmanen",
        "Global liquidity (Fed + ECB + PBOC balance sheets combined) drives crypto. — Gliner",
    ],
    "risk_warnings": [
        "Leverage 10× = 10% move = liquidation. Know your liquidation price. — Hull",
        "Never risk entire capital on any position. — Tharp, Douglas, Elder",
        "Correlation spikes in crises — diversification fails exactly when needed. — Hull",
        "Fat tails exist — black swans will occur. Size accordingly. — Taleb",
        "Stop-loss is not optional — it is the business cost of trading. — Douglas",
        "Drawdown deeper than 25% requires 33% gain to recover. 50% requires 100% gain. — Mathematics",
    ],
}

# ─── PROBABILITY SCORING ENGINE ───────────────────────────────────────────────

def score_rsi(rsi):
    """Return bullish score 0-100 from RSI value."""
    if rsi is None:
        return 50
    if rsi < 20:
        return 85  # extremely oversold
    if rsi < 30:
        return 72  # oversold
    if rsi < 40:
        return 58  # mildly oversold
    if rsi < 60:
        return 50  # neutral
    if rsi < 70:
        return 42  # mildly overbought
    if rsi < 80:
        return 28  # overbought
    return 15  # extremely overbought


def score_macd(macd_hist):
    """Return bullish score from MACD histogram."""
    if macd_hist is None:
        return 50
    if macd_hist > 0:
        return min(50 + macd_hist * 2, 80)
    return max(50 + macd_hist * 2, 20)


def score_bb(pct_b):
    """Return bullish score from Bollinger Band %B (0=lower band, 1=upper band)."""
    if pct_b is None:
        return 50
    if pct_b < 0:
        return 80  # below lower band = oversold
    if pct_b < 0.2:
        return 68
    if pct_b < 0.4:
        return 58
    if pct_b < 0.6:
        return 50
    if pct_b < 0.8:
        return 42
    if pct_b < 1.0:
        return 32
    return 20  # above upper band = overbought


def score_price_vs_ema(price, ema21, ema55):
    """Score price position relative to EMAs."""
    if not all([price, ema21, ema55]):
        return 50
    score = 50
    if price > ema21:
        score += 10
    else:
        score -= 10
    if price > ema55:
        score += 10
    else:
        score -= 10
    if ema21 > ema55:
        score += 5  # EMAs aligned bullish
    else:
        score -= 5
    return max(10, min(90, score))


def score_stoch(k, d):
    """Score momentum from Stochastic K/D."""
    if k is None or d is None:
        return 50
    base = 50
    if k < 20:
        base = 70
    elif k > 80:
        base = 30
    if k > d:
        base += 8  # K above D = bullish
    else:
        base -= 8
    return max(10, min(90, base))


def score_news_sentiment(sentiment):
    """Convert news sentiment string to score."""
    mapping = {
        "strongly_bullish": 85, "bullish": 70, "mildly_bullish": 60,
        "neutral": 50,
        "mildly_bearish": 40, "bearish": 30, "strongly_bearish": 15,
    }
    return mapping.get(sentiment, 50)


def score_macro(macro_context):
    """Score macro environment."""
    score = 50
    if not macro_context:
        return score
    if macro_context.get("fed_policy") == "easing":
        score += 15
    elif macro_context.get("fed_policy") == "tightening":
        score -= 15
    if macro_context.get("dxy_trend") == "falling":
        score += 10
    elif macro_context.get("dxy_trend") == "rising":
        score -= 10
    if macro_context.get("risk_appetite") == "risk_on":
        score += 8
    elif macro_context.get("risk_appetite") == "risk_off":
        score -= 8
    return max(10, min(90, score))


def calculate_probability(market_data: dict) -> dict:
    """
    Calculate comprehensive trade probability using all book knowledge.

    market_data keys:
        price, rsi, macd_hist, bb_pct_b, ema21, ema55, stoch_k, stoch_d,
        news_sentiment (string), macro (dict), candle_pattern (string)

    Returns: probability dict with scores, recommendation, books_reasoning
    """
    scores = {}

    scores["rsi"] = score_rsi(market_data.get("rsi"))
    scores["macd"] = score_macd(market_data.get("macd_hist"))
    scores["bollinger"] = score_bb(market_data.get("bb_pct_b"))
    scores["ema_position"] = score_price_vs_ema(
        market_data.get("price"),
        market_data.get("ema21"),
        market_data.get("ema55"),
    )
    scores["stochastic"] = score_stoch(
        market_data.get("stoch_k"),
        market_data.get("stoch_d"),
    )
    scores["news"] = score_news_sentiment(market_data.get("news_sentiment", "neutral"))
    scores["macro"] = score_macro(market_data.get("macro", {}))

    # Candle pattern bonus/penalty
    candle_bonus = 0
    pattern = market_data.get("candle_pattern", "")
    BULLISH_PATTERNS = ["morning_star", "bullish_engulfing", "hammer", "dragonfly_doji",
                        "three_white_soldiers", "piercing_line", "morning_doji_star",
                        "inverted_hammer"]
    BEARISH_PATTERNS = ["evening_star", "bearish_engulfing", "shooting_star", "gravestone_doji",
                        "three_black_crows", "dark_cloud_cover", "hanging_man"]
    if pattern in BULLISH_PATTERNS:
        candle_bonus = 12
    elif pattern in BEARISH_PATTERNS:
        candle_bonus = -12
    scores["candle_pattern"] = 50 + candle_bonus

    # Weighted aggregate (books-informed weights)
    weights = {
        "rsi": 0.18,           # Murphy, Elder
        "macd": 0.15,          # Murphy, Elder
        "bollinger": 0.12,     # Murphy
        "ema_position": 0.18,  # Elder Triple Screen, Brooks
        "stochastic": 0.10,    # Murphy
        "news": 0.15,          # MD Knowledge Base
        "macro": 0.08,         # Dalio, Gliner
        "candle_pattern": 0.04, # Nison
    }
    total_score = sum(scores[k] * weights[k] for k in scores)

    # Map to direction and confidence
    if total_score >= 65:
        direction = "LONG"
        confidence = int((total_score - 50) * 2)
    elif total_score <= 35:
        direction = "SHORT"
        confidence = int((50 - total_score) * 2)
    else:
        direction = "NEUTRAL"
        confidence = int(abs(total_score - 50) * 2)

    confidence = max(10, min(90, confidence))

    # Build books reasoning
    reasoning = []
    if scores["rsi"] > 65:
        reasoning.append("RSI oversold → mean reversion probability (Murphy + Elder)")
    elif scores["rsi"] < 35:
        reasoning.append("RSI overbought → pullback probability (Murphy + Elder)")
    if scores["macd"] > 60:
        reasoning.append("MACD histogram positive/rising → momentum bullish (Murphy)")
    elif scores["macd"] < 40:
        reasoning.append("MACD histogram negative/falling → momentum bearish (Murphy)")
    if scores["ema_position"] > 65:
        reasoning.append("Price above both EMAs + EMAs aligned → trend bullish (Elder Triple Screen)")
    elif scores["ema_position"] < 35:
        reasoning.append("Price below EMAs → trend bearish (Elder Triple Screen)")
    if scores["news"] > 65:
        reasoning.append("News sentiment bullish → crowd psychology bullish (MD Knowledge Base + Kahneman)")
    elif scores["news"] < 35:
        reasoning.append("News sentiment bearish → fear dominant (Douglas + Kahneman)")
    if scores["macro"] > 60:
        reasoning.append("Macro environment supportive (Dalio + Gliner)")
    elif scores["macro"] < 40:
        reasoning.append("Macro headwinds present (Dalio + Gliner)")
    if candle_bonus > 0:
        reasoning.append(f"Bullish candle pattern '{pattern}' confirms (Nison)")
    elif candle_bonus < 0:
        reasoning.append(f"Bearish candle pattern '{pattern}' confirms (Nison)")

    return {
        "direction": direction,
        "confidence": confidence,
        "probability_long": round(total_score, 1),
        "probability_short": round(100 - total_score, 1),
        "component_scores": scores,
        "books_reasoning": reasoning,
        "risk_notes": [
            "Confirm on higher timeframe before entry (Elder Triple Screen)",
            f"Max risk: 1-2% of account (Tharp + Elder 2% rule)",
            "Liquidation check required if using leverage (Hull)",
            "Pattern alone insufficient — require confluence (Nison + Murphy)",
        ],
        "timestamp": datetime.now().isoformat(),
    }


def get_topic_summary(topic):
    """Return summarized rules for a topic."""
    return TOPICS.get(topic, [])


def get_book_principles(book_key):
    """Return principles for a specific book."""
    book = BOOKS.get(book_key, {})
    return {
        "title": book.get("title", ""),
        "author": book.get("author", ""),
        "core_thesis": book.get("core_thesis", ""),
        "principles": book.get("principles", []),
    }


def get_all_books_summary():
    """Return lightweight summary of all books."""
    return [
        {
            "key": k,
            "title": v["title"],
            "author": v["author"],
            "category": v["category"],
            "core_thesis": v["core_thesis"],
            "principle_count": len(v.get("principles", [])),
        }
        for k, v in BOOKS.items()
    ]


def build_ai_context(market_data: dict) -> str:
    """Build compressed books-knowledge context string for Ollama prompt injection."""
    prob = calculate_probability(market_data)
    lines = [
        "=== BOOKS KNOWLEDGE CONTEXT ===",
        "",
        "PSYCHOLOGY (Douglas + Kahneman + Taleb):",
        "- Accept all outcomes. Think in probabilities across 100 trades.",
        "- Loss aversion makes you hold losers — predefine exits.",
        "- Randomness can mimic skill — require statistical edge, not recent winners.",
        "",
        "TECHNICAL (Murphy + Nison + Brooks + Elder):",
        "- Trend confirmation: price vs EMAs, volume confirms direction.",
        "- Entry on signal bar quality (large body, small counter-wick).",
        "- Candle patterns require confluence: support level + volume + oscillator.",
        "- Triple Screen: weekly trend → daily pullback → intraday entry.",
        "",
        "RISK (Tharp + Hull + Elder):",
        "- Max 1-2% account risk per trade. Position size = (Account × Risk%) / Stop$.",
        "- Half-Kelly is maximum safe bet size.",
        "- Leverage liquidation: LONG liq = Entry × (1 - 1/Leverage).",
        "- 6% monthly rule: stop trading if down 6% in month.",
        "",
        "MACRO (Dalio + Gliner):",
        "- Fed policy is the dominant signal. Easing = bullish. Tightening = bearish.",
        "- DXY rising = BTC headwind. DXY falling = tailwind.",
        "- Real rates negative = gold/BTC demand.",
        "",
        f"CURRENT PROBABILITY ANALYSIS:",
        f"Direction: {prob['direction']} | Confidence: {prob['confidence']}%",
        f"Long probability: {prob['probability_long']}% | Short: {prob['probability_short']}%",
        "Key reasoning:",
    ]
    for r in prob["books_reasoning"]:
        lines.append(f"  · {r}")
    lines.append("==============================")
    return "\n".join(lines)


# ─── CLI RUNNER ───────────────────────────────────────────────────────────────

def cli_menu():
    print("\n" + "="*60)
    print("  MarketPulse AI — Books Knowledge Database")
    print("  Phase 1: 20 Trading Books Synthesized")
    print("="*60)
    print("\nOptions:")
    print("  1. List all books")
    print("  2. View book principles")
    print("  3. View topic rules")
    print("  4. Run probability analysis (manual input)")
    print("  5. Export full knowledge base to JSON")
    print("  6. Exit")
    return input("\nChoice: ").strip()


def run_probability_cli():
    print("\n--- Probability Analysis ---")
    print("Enter market data (press Enter to skip/use default):")

    def _get(prompt, default=None, cast=float):
        val = input(f"  {prompt} [{default}]: ").strip()
        if not val:
            return default
        try:
            return cast(val)
        except Exception:
            return default

    data = {
        "price": _get("BTC Price", 94000),
        "rsi": _get("RSI (0-100)", 50),
        "macd_hist": _get("MACD Histogram", 0),
        "bb_pct_b": _get("BB %B (0-1)", 0.5),
        "ema21": _get("EMA21", 93000),
        "ema55": _get("EMA55", 91000),
        "stoch_k": _get("Stoch K (0-100)", 50),
        "stoch_d": _get("Stoch D (0-100)", 50),
        "news_sentiment": _get("News sentiment (bullish/bearish/neutral)", "neutral", str),
        "candle_pattern": _get("Candle pattern (e.g. hammer, doji)", "", str),
    }

    result = calculate_probability(data)
    print("\n--- RESULT ---")
    print(f"Direction: {result['direction']}")
    print(f"Confidence: {result['confidence']}%")
    print(f"Long probability: {result['probability_long']}%")
    print(f"Short probability: {result['probability_short']}%")
    print("\nComponent Scores:")
    for k, v in result["component_scores"].items():
        bar = "█" * int(v / 10) + "░" * (10 - int(v / 10))
        print(f"  {k:<18} {bar} {v:.0f}")
    print("\nBooks Reasoning:")
    for r in result["books_reasoning"]:
        print(f"  · {r}")
    print("\nRisk Notes:")
    for n in result["risk_notes"]:
        print(f"  ⚠ {n}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--export":
        data = {
            "books": BOOKS,
            "topics": TOPICS,
            "books_summary": get_all_books_summary(),
            "exported_at": datetime.now().isoformat(),
        }
        with open("books_knowledge.json", "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print("Exported to books_knowledge.json")
        sys.exit(0)

    while True:
        choice = cli_menu()
        if choice == "1":
            books = get_all_books_summary()
            print(f"\n{'#':<3} {'Title':<52} {'Author':<28} {'Category'}")
            print("-" * 110)
            for i, b in enumerate(books, 1):
                print(f"{i:<3} {b['title']:<52} {b['author']:<28} {b['category']}")
                print(f"    → {b['core_thesis'][:90]}...")
                print()
        elif choice == "2":
            books_list = list(BOOKS.keys())
            print("\nAvailable books:")
            for i, k in enumerate(books_list, 1):
                print(f"  {i}. {BOOKS[k]['title']} — {BOOKS[k]['author']}")
            sel = input("Select number: ").strip()
            try:
                key = books_list[int(sel) - 1]
                book = get_book_principles(key)
                print(f"\n{'='*60}")
                print(f"  {book['title']}")
                print(f"  {book['author']}")
                print(f"{'='*60}")
                print(f"\nCore Thesis:\n  {book['core_thesis']}\n")
                print("Principles:")
                for i, p in enumerate(book['principles'], 1):
                    print(f"  {i:2}. {p}")
            except (ValueError, IndexError):
                print("Invalid selection.")
        elif choice == "3":
            topics = list(TOPICS.keys())
            print("\nTopics:")
            for i, t in enumerate(topics, 1):
                print(f"  {i}. {t}")
            sel = input("Select number: ").strip()
            try:
                topic = topics[int(sel) - 1]
                rules = get_topic_summary(topic)
                print(f"\n--- {topic.upper()} ---")
                for r in rules:
                    print(f"  · {r}")
            except (ValueError, IndexError):
                print("Invalid selection.")
        elif choice == "4":
            run_probability_cli()
        elif choice == "5":
            data = {
                "books": BOOKS,
                "topics": TOPICS,
                "books_summary": get_all_books_summary(),
                "exported_at": datetime.now().isoformat(),
            }
            with open("books_knowledge.json", "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print("Exported to books_knowledge.json")
        elif choice == "6":
            print("Bye.")
            break
        else:
            print("Invalid choice.")
        input("\nPress Enter to continue...")

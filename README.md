# 🚀 MarketPulse AI (BTCPRO)

> High-Performance Trading Intelligence Dashboard powered by Local AI (Ollama)

---

## 📌 Overview

**MarketPulse AI (BTCPRO)** is a real-time trading intelligence system that combines:

* 📡 Live market news (RSS feeds)
* 🧠 Local AI analysis (Ollama / Llama 3)
* 📊 Advanced technical indicators
* ⚠️ Risk & trade management tools
* 📚 Built-in trading knowledge (Books system)

The goal is simple:
👉 Turn raw news + data into **actionable trading decisions**.

---

## ⚡ Core Features

### 🧠 AI Intelligence Engine

* Local AI (Ollama) – no external dependency
* Bullish / Bearish sentiment detection
* Impact scoring (0–100)
* Trade suggestions (Entry / SL / TP)
* Memory-aware learning system

### 📚 Books Knowledge System

* Built-in trading knowledge (psychology, risk, macro)
* Real book references (Mark Douglas, Ray Dalio, etc.)
* Enhances AI reasoning beyond raw data

### 📰 Live News Engine

* Crypto, Macro, Politics, Global feeds
* RSS aggregation + proxy handling
* Source links included for transparency

### 📊 Trading Dashboard

* Real-time price tracking
* Candlestick chart (zoom, pan, OHLCV)
* Multi-indicator system:

  * RSI, MACD, VWAP
  * Bollinger Bands, Stochastic

### 📈 Signal Engine

* Bullish / Bearish signal counts
* Indicator-based bias system
* Visual badges for decision support

### ⚠️ Risk Management Panel

* Position sizing (Kelly Criterion)
* Risk/Reward validation
* Drawdown tracking
* Exposure meter

### 💼 Trade Journal

* Live P&L tracking
* Trade history
* Close-at-price feature

### 🔔 Alerts System

* Price alerts
* RSI alerts
* % movement alerts
* Browser notifications

### 🌍 Macro Panel

* DXY, Gold, SPX, VIX tracking
* Correlation insights

---

## 🧱 Project Structure

```
MarketPulse AI /

backend/
  books_server.py
  books_knowledge.py

frontend/
  src/
    components/
    hooks/
    utils/

core/
  AI Engine (Ollama)
  News Processor
  Signal Engine

storage/
  SQLite DB
```

---

## 🛠️ Tech Stack (Simplified)

* Local AI: Ollama (Llama 3)
* Backend: Fast API style service
* Frontend: Modern reactive UI
* Database: SQLite (local storage)

---

## ⚙️ How It Works

1. News is fetched from RSS feeds
2. Headlines are sent to local AI
3. AI analyzes using:

   * Books knowledge
   * Market context
   * Historical memory
4. Output includes:

   * Sentiment
   * Impact score
   * Trade direction
5. Data is stored for future learning

---

## 🧠 AI Prompt System

The AI operates on 3 layers:

1. **Books (Knowledge)**
2. **News (Real-time input)**
3. **Memory (Past outcomes)**

This creates a **learning trading assistant**, not just a predictor.

---

## 💡 Key Concepts Used

* Long vs Short trading
* Leverage & liquidation
* Risk management
* Market psychology
* Macro economics

---

## 🚀 Getting Started

### Run Full System

```
run-full-system.bat
```

### Start Frontend

```
npm install
npm run dev
```

### Start Backend

```
python books_server.py
```

---

## 📊 Future Enhancements

* AI self-learning accuracy tracking
* Strategy backtesting
* Multi-asset support
* Mobile version

---

## 👨‍💻 Developer

**Muhammad Faizan (Faizzyhon)**

* AI Engineer | React Developer | Cybersecurity Specialist
* GitHub: [https://github.com/faizzyhon](https://github.com/faizzyhon)
* Portfolio: [https://faizzyhon.online](https://faizzyhon.online)

---

## ⚠️ Disclaimer

This project is for **educational and research purposes only**.

Trading involves risk. Always do your own analysis before making financial decisions.

---

## 🧩 Version

```
BTCPRO — MarketPulse AI Core
Initial Commit
35 files | 9000+ lines
```

---

## 🔥 Vision

> "Don’t just follow the market. Understand it. Predict it. Act on it."

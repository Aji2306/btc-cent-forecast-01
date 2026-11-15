# btc-cent-forecast-01 Entry

Forecasts Bitcoin's price 4 hours ahead using historical price data.
Method: Damped linear trend on log prices over the 4320-minute price history with a 0.35 damping factor and a 0.5% move cap.

## Local Run
```bash
mkdir -p out
MAKEFUN_INPUT_DIR=input MAKEFUN_OUTPUT_DIR=out node main.ts
```

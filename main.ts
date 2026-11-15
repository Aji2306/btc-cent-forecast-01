import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const inputDir = process.env.MAKEFUN_INPUT_DIR || '/input';
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const files = fs.readdirSync(inputDir)
  .filter(f => f.endsWith('.in'))
  .sort();

for (const file of files) {
  const inputPath = path.join(inputDir, file);
  const content = fs.readFileSync(inputPath, 'utf8');
  const data = JSON.parse(content);

  const caseId = data.case;
  const market = data.markets && data.markets[0];
  const prices: number[] = market && Array.isArray(market.prices) 
    ? market.prices.filter((p: number) => typeof p === 'number' && p > 0) 
    : [];

  let forecastPrice = 0;
  if (prices.length === 0) {
    forecastPrice = 10000;
  } else {
    const lastPrice = prices[prices.length - 1];
    const logPrices = prices.map(p => Math.log(p));
    const n = logPrices.length;

    if (n < 2) {
      forecastPrice = lastPrice;
    } else {
      let sumT = 0;
      let sumY = 0;
      let sumTY = 0;
      let sumTT = 0;

      for (let t = 0; t < n; t++) {
        sumT += t;
        sumY += logPrices[t];
        sumTY += t * logPrices[t];
        sumTT += t * t;
      }

      const denom = n * sumTT - sumT * sumT;
      const slope = denom === 0 ? 0 : (n * sumTY - sumT * sumY) / denom;
      // Refined damping factor 0.35 based on rigorous evaluation against practice cases
      const damping = 0.35;
      const horizonMinutes = data.horizon_minutes || 240;
      const predLog = logPrices[n - 1] + slope * horizonMinutes * damping;
      forecastPrice = Math.exp(predLog);

      // Robust 0.5% move cap to prevent runaway errors in volatile regimes
      const maxMove = 0.005 * lastPrice;
      if (forecastPrice > lastPrice + maxMove) {
        forecastPrice = lastPrice + maxMove;
      } else if (forecastPrice < lastPrice - maxMove) {
        forecastPrice = lastPrice - maxMove;
      }
    }
  }

  // Round to 5 decimals as required by competition rules
  forecastPrice = Number(forecastPrice.toFixed(5));

  const outputData = {
    forecasts: [
      {
        case: caseId,
        price: forecastPrice
      }
    ]
  };

  const outputPath = path.join(outputDir, `${caseId}.out`);
  fs.writeFileSync(outputPath, JSON.stringify(outputData) + '\n', 'utf8');
}

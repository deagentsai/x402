//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * x402 Payment-Enabled Merchant Agent (Production Version)
 *
 * This agent demonstrates the full x402 payment protocol with:
 * - Exception-based payment requirements
 * - Dynamic pricing
 * - Payment verification and settlement
 * - Production-ready architecture
 */

import { LlmAgent as Agent } from 'adk-typescript/agents';
import { LlmRegistry, LiteLlm } from 'adk-typescript/models';
import { createHash } from 'crypto';
import {
  x402PaymentRequiredException,
  PaymentRequirements,
} from 'a2a-x402';

// --- Merchant Agent Configuration ---

// Register LiteLLM to support OpenAI models via OPENAI_API_KEY
LlmRegistry.register(LiteLlm);
// Force-match any model name to LiteLLM (OpenAI, etc.)
(LlmRegistry as any)._register('.*', LiteLlm);

// Validate and load required configuration
if (!process.env.MERCHANT_WALLET_ADDRESS) {
  console.error('❌ ERROR: MERCHANT_WALLET_ADDRESS is not set in .env file');
  console.error('   Please add MERCHANT_WALLET_ADDRESS to your .env file');
  throw new Error('Missing required environment variable: MERCHANT_WALLET_ADDRESS');
}

const WALLET_ADDRESS: string = process.env.MERCHANT_WALLET_ADDRESS;
const NETWORK = process.env.PAYMENT_NETWORK || "base-sepolia";
const USDC_CONTRACT = process.env.USDC_CONTRACT || "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

const PRODUCT_CATALOG = [
  {
    id: "devrel-ebook",
    name: "Developer Relations Ebook",
    description: "A practical guide to modern Developer Relations by dabit3.",
    priceAtomic: "10000", // 0.01 USDC
    link: "https://gist.github.com/dabit3/fd7f4d24ebdda092f6cbbb6a5e57e487",
  },
];

console.log(`💼 Merchant Configuration:
  Wallet: ${WALLET_ADDRESS}
  Network: ${NETWORK}
  USDC Contract: ${USDC_CONTRACT}
`);

// --- Helper Functions ---

/**
 * Returns a fixed price of 1 USDC for all products
 */
function getProductPrice(productName: string): string {
  const product = PRODUCT_CATALOG.find((item) => item.name.toLowerCase() === productName.toLowerCase());
  if (product) return product.priceAtomic;
  // Default fallback price: 0.01 USDC
  return "10000";
}

// --- Tool Functions ---

/**
 * Get product details and request payment
 * This tool throws x402PaymentRequiredException to trigger the payment flow
 */
async function getProductDetailsAndRequestPayment(
  params: Record<string, any>,
  context?: any
): Promise<void> {
  const productName = params.productName || params.product_name || params;

  console.log(`\n🛒 Product Request: ${productName}`);

  if (!productName || typeof productName !== 'string' || productName.trim() === '') {
    throw new Error("Product name cannot be empty.");
  }

  const product = PRODUCT_CATALOG.find((item) => item.name.toLowerCase() === productName.toLowerCase());
  const price = getProductPrice(productName);
  const priceUSDC = (parseInt(price) / 1_000_000).toFixed(6);

  console.log(`💰 Price calculated: ${priceUSDC} USDC (${price} atomic units)`);

  // Create payment requirements
  const requirements: PaymentRequirements = {
    scheme: "exact",
    network: NETWORK as any,
    asset: USDC_CONTRACT,
    payTo: WALLET_ADDRESS,
    maxAmountRequired: price,
    description: `Payment for: ${productName}`,
    resource: product?.link || `https://example.com/product/${productName}`,
    mimeType: "application/json",
    maxTimeoutSeconds: 1200,
    extra: {
      name: "USDC",
      version: "2",
      product: {
        sku: product?.id || `${productName}_sku`,
        name: productName,
        version: "1",
      },
    },
  };

  console.log(`💳 Payment required: ${priceUSDC} USDC`);
  console.log(`📡 Throwing x402PaymentRequiredException...`);

  // Throw payment exception - this will be caught by MerchantServerExecutor
  throw new x402PaymentRequiredException(
    `Payment of ${priceUSDC} USDC required for ${productName}`,
    requirements
  );
}

/**
 * Check the status of the current order
 * This tool is called after payment is verified
 */
async function checkOrderStatus(
  params: Record<string, any>,
  context?: any
): Promise<{ status: string; message: string }> {
  console.log('\n📦 Checking Order Status...');

  const product = PRODUCT_CATALOG[0];

  return {
    status: "success",
    message: `✅ Payment confirmed! Here is your download link for ${product.name}: ${product.link}`
  };
}

// --- Agent Definition ---

export const merchantAgent = new Agent({
  name: "x402_merchant_agent",
  model: "gpt-4o",
  description: "A merchant agent that sells a curated catalog using the x402 payment protocol.",
  instruction: `You are a helpful and friendly merchant agent powered by the x402 payment protocol.

**Your Role:**
- You sell a specific catalog of digital products (starting with a Developer Relations Ebook)
- When a user asks what products are available, describe the catalog and pricing
- When a user asks to buy the ebook, ALWAYS use the 'getProductDetailsAndRequestPayment' tool
- After payment is verified by the system, confirm the purchase and provide the download link
- Be professional, friendly, and concise

**Catalog:**
- Developer Relations Ebook — 0.01 USDC

**Critical Rules:**
- ALWAYS call getProductDetailsAndRequestPayment when a user wants to buy the ebook
- If the user asks for unavailable items, gently redirect them to the ebook
- The payment processing happens automatically — you don't need to mention technical details

**Examples:**
- "What products do you have?" → Explain the ebook and price
- "I want to buy the Developer Relations Ebook" → Call getProductDetailsAndRequestPayment
- "Can I buy a book?" → Treat it as the Developer Relations Ebook and proceed`,
  tools: [
    getProductDetailsAndRequestPayment,
    checkOrderStatus,
  ],
});

// Export as root agent for ADK
// Note: For x402 payment functionality, wrap this agent with MerchantServerExecutor
// (see src/test-payment-flow.ts for example)
export const rootAgent = merchantAgent;

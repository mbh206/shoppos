import { Client, Environment } from 'square'

const environment = process.env.SQUARE_ENVIRONMENT === 'production' 
  ? Environment.Production 
  : Environment.Sandbox

export const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN || '',
  environment: environment,
})

export const SQUARE_CONFIG = {
  locationId: process.env.SQUARE_LOCATION_ID || '',
  applicationId: process.env.SQUARE_APPLICATION_ID || '',
  deviceId: process.env.SQUARE_DEVICE_ID || '',
  webhookSignatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || '',
}

export function formatMoneyAmount(amountInMinorUnits: number): string {
  return `¥${Math.floor(amountInMinorUnits / 100)}`
}

export function toSquareMoney(amountInMinorUnits: number) {
  return {
    amount: BigInt(amountInMinorUnits),
    currency: 'JPY',
  }
}
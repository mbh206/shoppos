// Square API client without SDK - uses direct REST API calls
interface SquareConfig {
  accessToken: string
  environment: 'sandbox' | 'production'
  applicationId?: string
  locationId?: string
}

class SquareAPIClient {
  private baseUrl: string
  private headers: Record<string, string>
  
  constructor(config: SquareConfig) {
    this.baseUrl = config.environment === 'production' 
      ? 'https://connect.squareup.com/v2'
      : 'https://connect.squareupsandbox.com/v2'
    
    this.headers = {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
      'Square-Version': '2024-01-18'
    }
  }
  
  // Create a payment
  async createPayment(params: {
    sourceId: string
    amountMoney: { amount: number; currency: string }
    idempotencyKey: string
    locationId: string
    referenceId?: string
    note?: string
  }) {
    // JPY is a zero-decimal currency in Square's API
    // Our system stores amounts in minor units (1 yen = 100 minor units for consistency)
    // But Square expects JPY amounts as whole yen
    let amount = params.amountMoney.amount
    if (params.amountMoney.currency === 'JPY') {
      // Always convert from our minor units to Square's whole yen
      amount = Math.round(amount / 100)
    }
    
    const response = await fetch(`${this.baseUrl}/payments`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        source_id: params.sourceId,
        amount_money: {
          amount: amount,
          currency: params.amountMoney.currency
        },
        idempotency_key: params.idempotencyKey,
        location_id: params.locationId,
        reference_id: params.referenceId,
        note: params.note
      })
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.errors?.[0]?.detail || 'Payment failed')
    }
    
    return data
  }
  
  // Get payment details
  async getPayment(paymentId: string) {
    const response = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
      method: 'GET',
      headers: this.headers
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.errors?.[0]?.detail || 'Failed to get payment')
    }
    
    return data
  }
  
  // List locations
  async listLocations() {
    const response = await fetch(`${this.baseUrl}/locations`, {
      method: 'GET',
      headers: this.headers
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.errors?.[0]?.detail || 'Failed to list locations')
    }
    
    return data
  }
  
  // Get merchant info
  async getMerchant() {
    const response = await fetch(`${this.baseUrl}/merchants/me`, {
      method: 'GET',
      headers: this.headers
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.errors?.[0]?.detail || 'Failed to get merchant info')
    }
    
    return data
  }
}

export function createSquareClient() {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN
  const environment = (process.env.SQUARE_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production'
  
  if (!accessToken) {
    throw new Error('SQUARE_ACCESS_TOKEN is not configured')
  }
  
  return new SquareAPIClient({
    accessToken,
    environment,
    applicationId: process.env.SQUARE_APPLICATION_ID,
    locationId: process.env.SQUARE_LOCATION_ID
  })
}

// Test card nonces for sandbox environment
export const SANDBOX_TEST_CARDS = {
  'visa_success': 'cnon:card-nonce-ok',
  'visa_declined': 'cnon:card-nonce-declined',
  'mastercard_success': 'cnon:card-nonce-ok',
  'amex_success': 'cnon:card-nonce-ok',
  'discover_success': 'cnon:card-nonce-ok',
  'diners_success': 'cnon:card-nonce-ok',
  'jcb_success': 'cnon:card-nonce-ok',
  'expired_card': 'cnon:card-nonce-expired-card',
  'incorrect_cvv': 'cnon:card-nonce-incorrect-cvv',
  'incorrect_postal': 'cnon:card-nonce-incorrect-postal-code',
  'gift_card': 'cnon:gift-card-nonce-ok'
}
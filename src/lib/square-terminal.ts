import { Terminal, ApiError } from '@square/web-sdk'

interface SquareConfig {
  applicationId: string
  accessToken: string
  locationId: string
  deviceId?: string
}

interface PaymentRequest {
  amountMinor: number
  orderId: string
  note?: string
}

interface PaymentResult {
  success: boolean
  paymentId?: string
  receiptUrl?: string
  error?: string
}

class SquareTerminalService {
  private terminal: Terminal | null = null
  private config: SquareConfig | null = null
  private isInitialized = false

  async initialize(config: SquareConfig): Promise<boolean> {
    try {
      this.config = config
      
      // Initialize Square Web SDK Terminal
      // Note: This requires the Square Web SDK to be loaded in the client
      if (typeof window !== 'undefined' && window.Square) {
        const payments = await window.Square.payments(
          config.applicationId,
          config.locationId
        )
        
        this.terminal = await payments.terminal()
        this.isInitialized = true
        
        console.log('Square Terminal initialized successfully')
        return true
      }
      
      console.warn('Square SDK not available')
      return false
    } catch (error) {
      console.error('Failed to initialize Square Terminal:', error)
      return false
    }
  }

  async createCheckout(request: PaymentRequest): Promise<PaymentResult> {
    if (!this.isInitialized || !this.terminal) {
      return {
        success: false,
        error: 'Square Terminal not initialized'
      }
    }

    try {
      // Create checkout request for Square Terminal
      const checkoutRequest = {
        amountMoney: {
          amount: request.amountMinor,
          currency: 'JPY' // Japanese Yen
        },
        reference_id: request.orderId,
        note: request.note || `Order ${request.orderId}`,
        device_options: {
          device_id: this.config?.deviceId,
          skip_receipt_screen: false,
          tip_settings: {
            allow_tipping: false // Can be configured based on requirements
          }
        }
      }

      // Send checkout request to terminal
      const result = await this.terminal.createCheckout(checkoutRequest)
      
      if (result.checkout) {
        return {
          success: true,
          paymentId: result.checkout.id,
          receiptUrl: result.checkout.receipt_url
        }
      }
      
      return {
        success: false,
        error: 'Checkout creation failed'
      }
    } catch (error) {
      const apiError = error as ApiError
      console.error('Square Terminal checkout error:', apiError)
      
      return {
        success: false,
        error: apiError.message || 'Payment failed'
      }
    }
  }

  async cancelCheckout(checkoutId: string): Promise<boolean> {
    if (!this.isInitialized || !this.terminal) {
      return false
    }

    try {
      await this.terminal.cancelCheckout({ checkout_id: checkoutId })
      return true
    } catch (error) {
      console.error('Failed to cancel checkout:', error)
      return false
    }
  }

  async getCheckoutStatus(checkoutId: string): Promise<string> {
    if (!this.isInitialized || !this.terminal) {
      return 'unknown'
    }

    try {
      const result = await this.terminal.getCheckout({ checkout_id: checkoutId })
      return result.checkout?.status || 'unknown'
    } catch (error) {
      console.error('Failed to get checkout status:', error)
      return 'error'
    }
  }

  isReady(): boolean {
    return this.isInitialized && this.terminal !== null
  }

  getDeviceStatus(): string {
    if (!this.isInitialized) return 'not_initialized'
    if (!this.terminal) return 'no_terminal'
    return 'ready'
  }
}

// Singleton instance
export const squareTerminal = new SquareTerminalService()

// Helper function to process Square Terminal payment
export async function processSquareTerminalPayment(
  orderId: string,
  amountMinor: number,
  note?: string
): Promise<PaymentResult> {
  // Check if Square Terminal is configured
  const applicationId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID
  const accessToken = process.env.SQUARE_ACCESS_TOKEN
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID
  const deviceId = process.env.SQUARE_DEVICE_ID

  if (!applicationId || !accessToken || !locationId) {
    return {
      success: false,
      error: 'Square Terminal not configured. Please set up Square credentials.'
    }
  }

  // Initialize if not already done
  if (!squareTerminal.isReady()) {
    const initialized = await squareTerminal.initialize({
      applicationId,
      accessToken,
      locationId,
      deviceId
    })

    if (!initialized) {
      return {
        success: false,
        error: 'Failed to initialize Square Terminal'
      }
    }
  }

  // Create checkout
  return await squareTerminal.createCheckout({
    amountMinor,
    orderId,
    note
  })
}

// Type declaration for Square Web SDK
declare global {
  interface Window {
    Square: any
  }
}
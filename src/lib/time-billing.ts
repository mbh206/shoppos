/**
 * Time-based billing calculation for seat charges
 * 
 * Pricing rules:
 * - Base rate: ¥500 per hour
 * - 15-minute grace period per hour (only charged if sitting > 15 min in that hour)
 * - Half-hour increments: 50% charge for 31-45 minutes into an hour
 * - 3-hour discount: ¥450/hour for all hours after 3 hours (with 10-min buffer at 171 min)
 * - 5-hour cap: ¥420/hour, max ¥2100 total (with 10-min buffer at 291 min)
 */

export interface TimeBilling {
  minutes: number
  totalCharge: number
  rateApplied: 'standard' | '3hour' | '5hour'
  breakdown: {
    hours: number
    halfHours: number
    graceApplied: boolean
    ratePerHour: number
  }
}

export function calculateTimeCharge(minutes: number): TimeBilling {
  // No charge for 0 minutes
  if (minutes <= 0) {
    return {
      minutes,
      totalCharge: 0,
      rateApplied: 'standard',
      breakdown: {
        hours: 0,
        halfHours: 0,
        graceApplied: false,
        ratePerHour: 0
      }
    }
  }

  // Check for 5-hour cap (with 10-minute buffer at 291 minutes = 4h 51m)
  if (minutes >= 291) {
    // Fixed rate: ¥420 × 5 hours = ¥2100
    return {
      minutes,
      totalCharge: 2100,
      rateApplied: '5hour',
      breakdown: {
        hours: 5,
        halfHours: 0,
        graceApplied: false,
        ratePerHour: 420
      }
    }
  }

  // Check for 3-hour discount (with 10-minute buffer at 171 minutes = 2h 51m)
  if (minutes >= 171) {
    const ratePerHour = 450
    const { hours, halfHours, graceApplied } = calculateBillableUnits(minutes)
    const totalCharge = (hours * ratePerHour) + (halfHours * ratePerHour / 2)
    
    return {
      minutes,
      totalCharge,
      rateApplied: '3hour',
      breakdown: {
        hours,
        halfHours,
        graceApplied,
        ratePerHour
      }
    }
  }

  // Standard rate: ¥500 per hour
  const ratePerHour = 500
  const { hours, halfHours, graceApplied } = calculateBillableUnits(minutes)
  const totalCharge = (hours * ratePerHour) + (halfHours * ratePerHour / 2)

  return {
    minutes,
    totalCharge,
    rateApplied: 'standard',
    breakdown: {
      hours,
      halfHours,
      graceApplied,
      ratePerHour
    }
  }
}

function calculateBillableUnits(minutes: number): { 
  hours: number
  halfHours: number
  graceApplied: boolean 
} {
  const fullHours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  let billableHours = fullHours
  let billableHalfHours = 0
  let graceApplied = false

  // Handle remaining minutes in the current hour
  if (remainingMinutes > 0) {
    if (remainingMinutes <= 10) {
      // Grace period - no charge for first 15 minutes of an hour
      graceApplied = true
    } else if (remainingMinutes <= 30) {
      // 16-30 minutes: charge half hour
      billableHalfHours = 1
    } else if (remainingMinutes <= 45) {
      // 31-45 minutes: charge half hour (75% threshold)
      billableHalfHours = 1
    } else {
      // 46-59 minutes: charge full hour
      billableHours += 1
    }
  }

  return {
    hours: billableHours,
    halfHours: billableHalfHours,
    graceApplied
  }
}

/**
 * Format time charge for display
 */
export function formatTimeCharge(charge: number): string {
  return `¥${charge.toLocaleString('ja-JP')}`
}

/**
 * Get a human-readable description of the time charge
 */
export function getTimeChargeDescription(billing: TimeBilling): string {
  if (billing.totalCharge === 0) {
    return 'No time charge'
  }

  const hours = Math.floor(billing.minutes / 60)
  const mins = billing.minutes % 60
  const timeStr = hours > 0 
    ? `${hours}h ${mins}m` 
    : `${mins}m`

  if (billing.rateApplied === '5hour') {
    return `Time: ${timeStr} (5+ hour flat rate)`
  }

  if (billing.rateApplied === '3hour') {
    return `Time: ${timeStr} (3+ hour discount rate)`
  }

  if (billing.breakdown.graceApplied) {
    return `Time: ${timeStr} (within grace period)`
  }

  return `Time: ${timeStr}`
}

/**
 * Calculate estimated charge for display (updates every minute)
 */
export function getEstimatedCharge(startTime: Date | string): TimeBilling {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime
  const now = new Date()
  const diffMs = now.getTime() - start.getTime()
  const minutes = Math.floor(diffMs / 60000)
  
  return calculateTimeCharge(minutes)
}
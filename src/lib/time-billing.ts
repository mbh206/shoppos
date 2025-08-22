/**
 * Time-based billing calculation for seat charges
 * 
 * Pricing rules:
 * - First 2 hours: ¥500 per hour
 * - After 2 hours: ¥200 per half hour (¥400 per hour)
 * - 5-hour cap: ¥2200 maximum (no additional charges after 5 hours)
 * 
 * Examples:
 * - 1 hour: ¥500
 * - 2 hours: ¥1000
 * - 3 hours: ¥1400 (¥1000 + 2*¥200)
 * - 4 hours: ¥1800 (¥1000 + 4*¥200)
 * - 5+ hours: ¥2200 (capped)
 */

export interface TimeBilling {
  minutes: number
  totalCharge: number
  rateApplied: 'standard' | 'discounted' | '5hour'
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

  // After 5 hours (300 minutes), cap at ¥2200
  if (minutes >= 300) {
    return {
      minutes,
      totalCharge: 2200,
      rateApplied: '5hour',
      breakdown: {
        hours: 5,
        halfHours: 0,
        graceApplied: false,
        ratePerHour: 440 // ¥2200 / 5 hours average
      }
    }
  }

  // First 2 hours (120 minutes) at ¥500/hour
  if (minutes <= 120) {
    const { hours, halfHours } = calculateBillableUnits(minutes)
    const totalCharge = (hours * 500) + (halfHours * 250) // ¥250 per half hour
    
    return {
      minutes,
      totalCharge,
      rateApplied: 'standard',
      breakdown: {
        hours,
        halfHours,
        graceApplied: false,
        ratePerHour: 500
      }
    }
  }

  // After 2 hours: ¥200 per half hour
  // First 2 hours cost ¥1000 fixed
  const firstTwoHoursCharge = 1000
  const remainingMinutes = minutes - 120
  
  // Calculate half-hour blocks for time after first 2 hours
  // Round up to nearest half hour
  const additionalHalfHours = Math.ceil(remainingMinutes / 30)
  const additionalCharge = additionalHalfHours * 200
  
  const totalCharge = firstTwoHoursCharge + additionalCharge
  
  return {
    minutes,
    totalCharge,
    rateApplied: 'discounted',
    breakdown: {
      hours: Math.floor(minutes / 60),
      halfHours: additionalHalfHours,
      graceApplied: false,
      ratePerHour: 400 // ¥200 per half hour = ¥400 per hour
    }
  }
}

function calculateBillableUnits(minutes: number): { 
  hours: number
  halfHours: number
} {
  // For first hour (0-60 minutes), charge full hour
  if (minutes > 0 && minutes <= 60) {
    return {
      hours: 1,
      halfHours: 0
    }
  }
  
  // After first hour, calculate in 30-minute increments
  const beyondFirstHour = minutes - 60
  const additionalFullHours = Math.floor(beyondFirstHour / 60)
  const remainingMinutes = beyondFirstHour % 60
  
  let billableHours = 1 + additionalFullHours // 1 for the first hour
  let billableHalfHours = 0

  // Handle remaining minutes after the first hour
  if (remainingMinutes > 0) {
    if (remainingMinutes <= 30) {
      // 1-30 minutes: charge half hour
      billableHalfHours = 1
    } else {
      // 31-60 minutes: charge full hour
      billableHours += 1
    }
  }

  return {
    hours: billableHours,
    halfHours: billableHalfHours
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
    return `${timeStr}`
  }

  if (billing.rateApplied === 'discounted') {
    return `${timeStr}`
  }

  return `${timeStr}`
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
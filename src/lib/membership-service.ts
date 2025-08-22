import { prisma } from '@/lib/prisma'
import { MembershipStatus } from '@prisma/client'
import { PointsService } from './points-service'
import { addMonths } from 'date-fns'

export class MembershipService {
  /**
   * Get all available membership plans
   */
  static async getPlans() {
    return await prisma.membershipPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' }
    })
  }

  /**
   * Get a customer's active membership
   */
  static async getActiveMembership(customerId: string) {
    return await prisma.customerMembership.findFirst({
      where: {
        customerId,
        status: MembershipStatus.ACTIVE,
        endDate: { gte: new Date() }
      },
      include: {
        plan: true
      }
    })
  }

  /**
   * Purchase a membership plan
   */
  static async purchaseMembership(
    customerId: string,
    planId: string,
    autoRenew = false
  ) {
    // Get the plan details
    const plan = await prisma.membershipPlan.findUnique({
      where: { id: planId }
    })
    
    if (!plan || !plan.isActive) {
      throw new Error('Invalid or inactive membership plan')
    }
    
    // Check for existing active membership
    const existingMembership = await this.getActiveMembership(customerId)
    if (existingMembership) {
      throw new Error('Customer already has an active membership')
    }
    
    const startDate = new Date()
    const endDate = addMonths(startDate, 1)  // 1 month from purchase date
    
    // Create membership and award bonus points in a transaction
    const [membership] = await prisma.$transaction(async (tx) => {
      // Create the membership
      const membership = await tx.customerMembership.create({
        data: {
          customerId,
          planId,
          startDate,
          endDate,
          hoursUsed: 0,
          autoRenew,
          status: MembershipStatus.ACTIVE
        },
        include: {
          plan: true
        }
      })
      
      // Award bonus points if specified in plan
      if (plan.pointsOnPurchase > 0) {
        await PointsService.addBonusPoints(
          customerId,
          plan.pointsOnPurchase,
          `Monthly Pass purchase bonus`
        )
      }
      
      return [membership]
    })
    
    return membership
  }

  /**
   * Track hour usage for a membership
   */
  static async trackHourUsage(
    membershipId: string,
    hoursToUse: number,
    seatSessionId?: string,
    description?: string
  ) {
    // Get membership with plan details
    const membership = await prisma.customerMembership.findUnique({
      where: { id: membershipId },
      include: { plan: true }
    })
    
    if (!membership) {
      throw new Error('Membership not found')
    }
    
    if (membership.status !== MembershipStatus.ACTIVE) {
      throw new Error('Membership is not active')
    }
    
    // Calculate included vs overage hours
    const remainingIncludedHours = Math.max(0, membership.plan.hoursIncluded - membership.hoursUsed)
    const includedHoursUsed = Math.min(hoursToUse, remainingIncludedHours)
    const overageHours = Math.max(0, hoursToUse - includedHoursUsed)
    // Round to nearest ¥10 to avoid odd prices
    const overageCharge = Math.round(overageHours * membership.plan.overageRate / 1000) * 1000
    
    // Update membership hours and create usage record
    const [updatedMembership, usage] = await prisma.$transaction([
      prisma.customerMembership.update({
        where: { id: membershipId },
        data: {
          hoursUsed: membership.hoursUsed + hoursToUse
        }
      }),
      prisma.membershipUsage.create({
        data: {
          membershipId,
          seatSessionId,
          hoursUsed: hoursToUse,
          overageHours,
          overageCharge,
          description: description || `Table time usage`
        }
      })
    ])
    
    return {
      membership: updatedMembership,
      usage,
      includedHoursUsed,
      overageHours,
      overageCharge,
      remainingHours: Math.max(0, membership.plan.hoursIncluded - updatedMembership.hoursUsed)
    }
  }

  /**
   * Calculate charges for time usage (with membership discount)
   */
  static async calculateTimeCharges(
    customerId: string | null,
    hoursUsed: number,
    regularHourlyRate: number = 50000  // ¥500/hour in minor units
  ) {
    if (!customerId) {
      // No customer, use regular rate
      return {
        totalCharge: Math.round(hoursUsed * regularHourlyRate),
        includedHours: 0,
        chargedHours: hoursUsed,
        overageHours: 0,
        membership: null
      }
    }
    
    // Check for active membership
    const membership = await this.getActiveMembership(customerId)
    
    if (!membership) {
      // No membership, use regular rate
      return {
        totalCharge: Math.round(hoursUsed * regularHourlyRate),
        includedHours: 0,
        chargedHours: hoursUsed,
        overageHours: 0,
        membership: null
      }
    }
    
    // Calculate with membership benefits
    const remainingIncludedHours = Math.max(0, membership.plan.hoursIncluded - membership.hoursUsed)
    const includedHours = Math.min(hoursUsed, remainingIncludedHours)
    const overageHours = Math.max(0, hoursUsed - includedHours)
    // Round to nearest ¥10 to avoid odd prices
    const overageCharge = Math.round(overageHours * membership.plan.overageRate / 1000) * 1000
    
    return {
      totalCharge: overageCharge,  // Only charge for overage
      includedHours,
      chargedHours: overageHours,
      overageHours,
      membership: {
        id: membership.id,
        planName: membership.plan.name,
        remainingHours: remainingIncludedHours - includedHours
      }
    }
  }

  /**
   * Renew a membership
   */
  static async renewMembership(membershipId: string, carryOverUnusedHours = false) {
    const membership = await prisma.customerMembership.findUnique({
      where: { id: membershipId },
      include: { plan: true }
    })
    
    if (!membership) {
      throw new Error('Membership not found')
    }
    
    // Calculate new dates
    const startDate = new Date(membership.endDate)
    const endDate = addMonths(startDate, 1)
    
    // Calculate hours to carry over (if enabled)
    let initialHours = 0
    if (carryOverUnusedHours) {
      const unusedHours = Math.max(0, membership.plan.hoursIncluded - membership.hoursUsed)
      initialHours = Math.min(unusedHours, membership.plan.hoursIncluded)  // Cap at plan hours
    }
    
    // Create new membership period
    const [newMembership] = await prisma.$transaction(async (tx) => {
      // Mark old membership as expired
      await tx.customerMembership.update({
        where: { id: membershipId },
        data: { status: MembershipStatus.EXPIRED }
      })
      
      // Create new membership
      const newMembership = await tx.customerMembership.create({
        data: {
          customerId: membership.customerId,
          planId: membership.planId,
          startDate,
          endDate,
          hoursUsed: initialHours,
          autoRenew: membership.autoRenew,
          status: MembershipStatus.ACTIVE
        },
        include: {
          plan: true
        }
      })
      
      // Award renewal bonus points
      if (membership.plan.pointsOnPurchase > 0) {
        await PointsService.addBonusPoints(
          membership.customerId,
          membership.plan.pointsOnPurchase,
          `Monthly Pass renewal bonus`
        )
      }
      
      return [newMembership]
    })
    
    return newMembership
  }

  /**
   * Cancel a membership
   */
  static async cancelMembership(membershipId: string) {
    return await prisma.customerMembership.update({
      where: { id: membershipId },
      data: {
        status: MembershipStatus.CANCELLED,
        autoRenew: false
      }
    })
  }

  /**
   * Check and process expired memberships
   */
  static async processExpiredMemberships() {
    const now = new Date()
    
    // Find expired memberships
    const expiredMemberships = await prisma.customerMembership.findMany({
      where: {
        status: MembershipStatus.ACTIVE,
        endDate: { lt: now }
      },
      include: {
        plan: true,
        customer: true
      }
    })
    
    for (const membership of expiredMemberships) {
      if (membership.autoRenew) {
        // Auto-renew the membership
        try {
          await this.renewMembership(membership.id, true)  // Carry over unused hours
          console.log(`Auto-renewed membership for ${membership.customer.displayName}`)
        } catch (error) {
          console.error(`Failed to auto-renew membership ${membership.id}:`, error)
        }
      } else {
        // Mark as expired
        await prisma.customerMembership.update({
          where: { id: membership.id },
          data: { status: MembershipStatus.EXPIRED }
        })
        console.log(`Expired membership for ${membership.customer.displayName}`)
      }
    }
    
    return expiredMemberships.length
  }

  /**
   * Get membership statistics
   */
  static async getMembershipStats() {
    const [activeCount, totalRevenue, avgHoursUsed] = await Promise.all([
      // Count active memberships
      prisma.customerMembership.count({
        where: {
          status: MembershipStatus.ACTIVE,
          endDate: { gte: new Date() }
        }
      }),
      
      // Calculate total revenue (simplified - counts all memberships)
      prisma.customerMembership.count({
        where: { status: { in: [MembershipStatus.ACTIVE, MembershipStatus.EXPIRED] } }
      }).then(count => count * 800000),  // ¥8000 per membership
      
      // Average hours used
      prisma.customerMembership.aggregate({
        where: { status: MembershipStatus.ACTIVE },
        _avg: { hoursUsed: true }
      })
    ])
    
    return {
      activeMembers: activeCount,
      totalRevenue: totalRevenue / 100,  // Convert to yen
      averageHoursUsed: avgHoursUsed._avg.hoursUsed || 0
    }
  }
}
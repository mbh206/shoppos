import { prisma } from '@/lib/prisma'
import { PointsTransactionType } from '@prisma/client'

export class PointsService {
  /**
   * Get points settings from database
   */
  static async getSettings() {
    const settings = await prisma.pointsSettings.findFirst({
      where: { id: 'default' }
    })
    
    if (!settings) {
      // Create default settings if none exist
      return await prisma.pointsSettings.create({
        data: {
          id: 'default',
          regularEarnRate: 50,
          memberEarnRate: 40,
          pointsPerYen: 1
        }
      })
    }
    
    return settings
  }

  /**
   * Check if customer has active membership
   */
  static async hasActiveMembership(customerId: string): Promise<boolean> {
    const membership = await prisma.customerMembership.findFirst({
      where: {
        customerId,
        status: 'ACTIVE',
        endDate: { gte: new Date() }
      }
    })
    
    return !!membership
  }

  /**
   * Calculate points to earn for a purchase
   */
  static async calculatePointsEarned(
    amountInMinorUnits: number,
    customerId?: string
  ): Promise<number> {
    const settings = await this.getSettings()
    
    // Check if customer has membership for better rate
    let earnRate = settings.regularEarnRate
    if (customerId) {
      const hasMembership = await this.hasActiveMembership(customerId)
      if (hasMembership) {
        earnRate = settings.memberEarnRate
      }
    }
    
    // Calculate points: amount / earnRate (e.g., ¥5000 / 50 = 100 points)
    const amountInYen = Math.floor(amountInMinorUnits / 100)
    const pointsEarned = Math.floor(amountInYen / earnRate)
    
    return pointsEarned
  }

  /**
   * Award points to a customer
   */
  static async awardPoints(
    customerId: string,
    amount: number,
    orderId?: string,
    description?: string
  ) {
    // Get current balance
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { pointsBalance: true }
    })
    
    if (!customer) {
      throw new Error('Customer not found')
    }
    
    const newBalance = customer.pointsBalance + amount
    
    // Update balance and create transaction in a single transaction
    const [updatedCustomer, transaction] = await prisma.$transaction([
      prisma.customer.update({
        where: { id: customerId },
        data: { pointsBalance: newBalance }
      }),
      prisma.pointsTransaction.create({
        data: {
          customerId,
          orderId,
          type: PointsTransactionType.EARNED,
          amount,
          balanceAfter: newBalance,
          description: description || `Earned from order ${orderId || 'N/A'}`
        }
      })
    ])
    
    return {
      newBalance,
      transaction
    }
  }

  /**
   * Redeem points for payment
   */
  static async redeemPoints(
    customerId: string,
    pointsToRedeem: number,
    orderId?: string,
    description?: string
  ) {
    // Get current balance
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { pointsBalance: true }
    })
    
    if (!customer) {
      throw new Error('Customer not found')
    }
    
    if (customer.pointsBalance < pointsToRedeem) {
      throw new Error(`Insufficient points. Balance: ${customer.pointsBalance}, Requested: ${pointsToRedeem}`)
    }
    
    const newBalance = customer.pointsBalance - pointsToRedeem
    
    // Update balance and create transaction
    const [updatedCustomer, transaction] = await prisma.$transaction([
      prisma.customer.update({
        where: { id: customerId },
        data: { pointsBalance: newBalance }
      }),
      prisma.pointsTransaction.create({
        data: {
          customerId,
          orderId,
          type: PointsTransactionType.REDEEMED,
          amount: -pointsToRedeem,  // Negative for redemption
          balanceAfter: newBalance,
          description: description || `Redeemed for order ${orderId || 'N/A'}`
        }
      })
    ])
    
    return {
      newBalance,
      transaction,
      valueInYen: pointsToRedeem  // 1 point = ¥1
    }
  }

  /**
   * Refund points (when order is refunded)
   */
  static async refundPoints(
    customerId: string,
    pointsEarned: number,
    orderId?: string,
    description?: string
  ) {
    // Get current balance
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { pointsBalance: true }
    })
    
    if (!customer) {
      throw new Error('Customer not found')
    }
    
    // Can't go below 0
    const pointsToDeduct = Math.min(pointsEarned, customer.pointsBalance)
    const newBalance = customer.pointsBalance - pointsToDeduct
    
    // Update balance and create transaction
    const [updatedCustomer, transaction] = await prisma.$transaction([
      prisma.customer.update({
        where: { id: customerId },
        data: { pointsBalance: newBalance }
      }),
      prisma.pointsTransaction.create({
        data: {
          customerId,
          orderId,
          type: PointsTransactionType.REFUNDED,
          amount: -pointsToDeduct,
          balanceAfter: newBalance,
          description: description || `Refunded from order ${orderId || 'N/A'}`
        }
      })
    ])
    
    return {
      newBalance,
      transaction,
      pointsDeducted: pointsToDeduct
    }
  }

  /**
   * Add bonus points (e.g., for membership purchase)
   */
  static async addBonusPoints(
    customerId: string,
    bonusAmount: number,
    description: string
  ) {
    // Get current balance
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { pointsBalance: true }
    })
    
    if (!customer) {
      throw new Error('Customer not found')
    }
    
    const newBalance = customer.pointsBalance + bonusAmount
    
    // Update balance and create transaction
    const [updatedCustomer, transaction] = await prisma.$transaction([
      prisma.customer.update({
        where: { id: customerId },
        data: { pointsBalance: newBalance }
      }),
      prisma.pointsTransaction.create({
        data: {
          customerId,
          type: PointsTransactionType.BONUS,
          amount: bonusAmount,
          balanceAfter: newBalance,
          description
        }
      })
    ])
    
    return {
      newBalance,
      transaction
    }
  }

  /**
   * Manual adjustment by admin
   */
  static async adjustPoints(
    customerId: string,
    adjustmentAmount: number,  // Can be positive or negative
    reason: string
  ) {
    // Get current balance
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { pointsBalance: true }
    })
    
    if (!customer) {
      throw new Error('Customer not found')
    }
    
    const newBalance = Math.max(0, customer.pointsBalance + adjustmentAmount)
    
    // Update balance and create transaction
    const [updatedCustomer, transaction] = await prisma.$transaction([
      prisma.customer.update({
        where: { id: customerId },
        data: { pointsBalance: newBalance }
      }),
      prisma.pointsTransaction.create({
        data: {
          customerId,
          type: PointsTransactionType.MANUAL_ADJUSTMENT,
          amount: adjustmentAmount,
          balanceAfter: newBalance,
          description: `Manual adjustment: ${reason}`
        }
      })
    ])
    
    return {
      newBalance,
      transaction
    }
  }

  /**
   * Get customer's points history
   */
  static async getPointsHistory(customerId: string, limit = 50) {
    return await prisma.pointsTransaction.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  }

  /**
   * Get total points liability (all customers' balances)
   */
  static async getTotalPointsLiability() {
    const result = await prisma.customer.aggregate({
      _sum: {
        pointsBalance: true
      }
    })
    
    return result._sum.pointsBalance || 0
  }
}
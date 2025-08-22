import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createSquareClient } from '@/lib/square-client'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const config = {
    accessToken: process.env.SQUARE_ACCESS_TOKEN || '',
    applicationId: process.env.SQUARE_APPLICATION_ID || '',
    locationId: process.env.SQUARE_LOCATION_ID || '',
    deviceId: process.env.SQUARE_DEVICE_ID || '',
    environment: process.env.SQUARE_ENVIRONMENT || 'sandbox'
  }

  // Check which values are configured
  const configStatus = {
    hasAccessToken: !!config.accessToken,
    hasApplicationId: !!config.applicationId,
    hasLocationId: !!config.locationId,
    hasDeviceId: !!config.deviceId,
    environment: config.environment
  }

  // Test actual Square API connection
  let apiTests: any = {}

  // Test 1: Verify the access token by fetching merchant info
  if (configStatus.hasAccessToken) {
    try {
      const squareClient = createSquareClient()
      const merchantData = await squareClient.getMerchant()
      
      apiTests.merchant = {
        success: true,
        data: {
          merchantId: merchantData.merchant?.id,
          businessName: merchantData.merchant?.business_name,
          country: merchantData.merchant?.country,
          currency: merchantData.merchant?.currency
        }
      }
    } catch (error: any) {
      apiTests.merchant = {
        success: false,
        error: error.message || 'Failed to connect to Square API'
      }
    }
  } else {
    apiTests.merchant = {
      success: false,
      error: 'Access token not configured'
    }
  }

  // Test 2: List and verify locations
  if (configStatus.hasAccessToken) {
    try {
      const squareClient = createSquareClient()
      const locationsData = await squareClient.listLocations()
      
      apiTests.locations = {
        success: true,
        count: locationsData.locations?.length || 0,
        locations: locationsData.locations?.map((loc: any) => ({
          id: loc.id,
          name: loc.name,
          status: loc.status,
          timezone: loc.timezone,
          currency: loc.currency
        }))
      }
      
      // Check if configured location exists
      if (configStatus.hasLocationId) {
        const configuredLocation = locationsData.locations?.find(
          (loc: any) => loc.id === config.locationId
        )
        
        if (configuredLocation) {
          apiTests.configuredLocation = {
            success: true,
            data: {
              id: configuredLocation.id,
              name: configuredLocation.name,
              status: configuredLocation.status
            }
          }
        } else {
          apiTests.configuredLocation = {
            success: false,
            error: `Location ${config.locationId} not found in your Square account`
          }
        }
      }
    } catch (error: any) {
      apiTests.locations = {
        success: false,
        error: error.message || 'Failed to list Square locations'
      }
    }
  }

  return NextResponse.json({
    configuration: configStatus,
    apiTests,
    environment: config.environment,
    recommendation: getRecommendation(configStatus, apiTests)
  })
}

function getRecommendation(configStatus: any, apiTests: any): string {
  if (!configStatus.hasAccessToken) {
    return 'Missing SQUARE_ACCESS_TOKEN. Please add it to your .env.local file.'
  }
  
  if (!apiTests.merchant?.success) {
    return 'Access token appears to be invalid. Please check your Square credentials.'
  }
  
  if (!configStatus.hasLocationId) {
    return 'Missing NEXT_PUBLIC_SQUARE_LOCATION_ID. Please add it to your .env.local file.'
  }
  
  if (!apiTests.location?.success) {
    return 'Location ID appears to be invalid or not accessible with this access token.'
  }
  
  if (!configStatus.hasDeviceId) {
    if (apiTests.devices?.devices?.length > 0) {
      return `Missing SQUARE_DEVICE_ID. Available devices: ${apiTests.devices.devices.map((d: any) => `${d.name} (${d.id})`).join(', ')}`
    }
    return 'Missing SQUARE_DEVICE_ID. Please create a Terminal device in your Square dashboard.'
  }
  
  if (!apiTests.configuredDevice?.success) {
    return 'Device ID appears to be invalid or not accessible.'
  }
  
  return 'Square Terminal is properly configured and ready to use!'
}
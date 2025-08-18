import { PrismaClient } from '@prisma/client'
import axios from 'axios'
import * as xml2js from 'xml2js'

const prisma = new PrismaClient()
const parser = new xml2js.Parser()

// BGG API endpoints
const BGG_SEARCH_URL = 'https://boardgamegeek.com/xmlapi2/search'
const BGG_THING_URL = 'https://boardgamegeek.com/xmlapi2/thing'

// Delay between API calls (BGG requests ~5 seconds between calls)
const API_DELAY = 5000

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Search for a game on BGG and get its ID
async function searchBGG(gameName: string): Promise<number | null> {
  try {
    console.log(`  Searching BGG for: ${gameName}`)
    
    const response = await axios.get(BGG_SEARCH_URL, {
      params: {
        query: gameName,
        type: 'boardgame',
        exact: 0
      }
    })
    
    const result = await parser.parseStringPromise(response.data)
    
    if (!result.items || !result.items.item || result.items.item.length === 0) {
      console.log(`  ⚠️  No results found for: ${gameName}`)
      return null
    }
    
    // Find the best match (prefer exact name match)
    const items = result.items.item
    let bestMatch = items[0]
    
    for (const item of items) {
      const itemName = item.name?.[0]?.$.value || item.name?.[0]?.value || ''
      if (itemName.toLowerCase() === gameName.toLowerCase()) {
        bestMatch = item
        break
      }
    }
    
    const bggId = parseInt(bestMatch.$.id)
    const matchedName = bestMatch.name?.[0]?.$.value || bestMatch.name?.[0]?.value || 'Unknown'
    console.log(`  ✓ Found match: ${matchedName} (BGG ID: ${bggId})`)
    
    return bggId
  } catch (error) {
    console.error(`  ❌ Error searching for ${gameName}:`, error.message)
    return null
  }
}

// Get detailed game information from BGG
async function fetchGameDetails(bggId: number) {
  try {
    console.log(`  Fetching details for BGG ID: ${bggId}`)
    
    const response = await axios.get(BGG_THING_URL, {
      params: {
        id: bggId,
        stats: 1,
        type: 'boardgame'
      }
    })
    
    const result = await parser.parseStringPromise(response.data)
    
    if (!result.items || !result.items.item || result.items.item.length === 0) {
      console.log(`  ⚠️  No details found for BGG ID: ${bggId}`)
      return null
    }
    
    const item = result.items.item[0]
    
    // Extract data from the complex XML structure
    const details = {
      bggId,
      description: item.description?.[0] || null,
      yearPublished: item.yearpublished?.[0]?.$.value ? parseInt(item.yearpublished[0].$.value) : null,
      minPlayers: item.minplayers?.[0]?.$.value ? parseInt(item.minplayers[0].$.value) : null,
      maxPlayers: item.maxplayers?.[0]?.$.value ? parseInt(item.maxplayers[0].$.value) : null,
      playingTime: item.playingtime?.[0]?.$.value ? parseInt(item.playingtime[0].$.value) : null,
      minPlayTime: item.minplaytime?.[0]?.$.value ? parseInt(item.minplaytime[0].$.value) : null,
      maxPlayTime: item.maxplaytime?.[0]?.$.value ? parseInt(item.maxplaytime[0].$.value) : null,
      imageUrl: item.image?.[0] || null,
      thumbnailUrl: item.thumbnail?.[0] || null,
      
      // Statistics
      bggRating: item.statistics?.[0]?.ratings?.[0]?.average?.[0]?.$.value 
        ? parseFloat(item.statistics[0].ratings[0].average[0].$.value) 
        : null,
      bggWeight: item.statistics?.[0]?.ratings?.[0]?.averageweight?.[0]?.$.value 
        ? parseFloat(item.statistics[0].ratings[0].averageweight[0].$.value) 
        : null,
      
      // Categories and mechanics
      categories: [],
      mechanics: [],
      
      // Designers and publishers
      designers: [],
      publishers: []
    }
    
    // Extract categories
    if (item.link) {
      for (const link of item.link) {
        if (link.$.type === 'boardgamecategory') {
          details.categories.push(link.$.value)
        } else if (link.$.type === 'boardgamemechanic') {
          details.mechanics.push(link.$.value)
        } else if (link.$.type === 'boardgamedesigner') {
          details.designers.push(link.$.value)
        } else if (link.$.type === 'boardgamepublisher') {
          details.publishers.push(link.$.value)
        }
      }
    }
    
    console.log(`  ✓ Fetched details successfully`)
    return details
  } catch (error) {
    console.error(`  ❌ Error fetching details for BGG ID ${bggId}:`, error.message)
    return null
  }
}

// Map BGG weight to our complexity enum
function mapComplexity(weight: number | null): 'easy' | 'medium' | 'hard' | 'expert' {
  if (!weight) return 'medium'
  if (weight < 2) return 'easy'
  if (weight < 3) return 'medium'
  if (weight < 4) return 'hard'
  return 'expert'
}

// Main function to update all games with BGG data
async function updateGamesWithBGGData() {
  try {
    console.log('Starting BGG data fetch...\n')
    
    // Get all games from database
    const games = await prisma.game.findMany({
      orderBy: { name: 'asc' }
    })
    
    console.log(`Found ${games.length} games to update\n`)
    
    let successCount = 0
    let failCount = 0
    
    for (let i = 0; i < games.length; i++) {
      const game = games[i]
      console.log(`[${i + 1}/${games.length}] Processing: ${game.name}`)
      
      // Skip if already has BGG data
      if (game.bggId) {
        console.log(`  ⏭️  Already has BGG ID: ${game.bggId}, skipping...`)
        successCount++
        continue
      }
      
      // Search for the game on BGG
      const bggId = await searchBGG(game.name)
      
      if (!bggId) {
        failCount++
        await delay(API_DELAY)
        continue
      }
      
      // Wait before fetching details (respect rate limit)
      await delay(2000)
      
      // Fetch detailed information
      const details = await fetchGameDetails(bggId)
      
      if (!details) {
        failCount++
        await delay(API_DELAY)
        continue
      }
      
      // Update the game in database
      try {
        await prisma.game.update({
          where: { id: game.id },
          data: {
            bggId: details.bggId,
            description: details.description,
            yearPublished: details.yearPublished,
            minPlayers: details.minPlayers || game.minPlayers,
            maxPlayers: details.maxPlayers || game.maxPlayers,
            duration: details.playingTime || game.duration,
            complexity: mapComplexity(details.bggWeight),
            imageUrl: details.imageUrl,
            thumbnailUrl: details.thumbnailUrl,
            bggRating: details.bggRating,
            bggWeight: details.bggWeight,
            designer: details.designers.slice(0, 3).join(', '),
            publisher: details.publishers.slice(0, 2).join(', '),
            categories: details.categories.slice(0, 5),
            mechanics: details.mechanics.slice(0, 5)
          }
        })
        
        console.log(`  ✅ Updated successfully!`)
        successCount++
      } catch (error) {
        console.error(`  ❌ Failed to update database:`, error.message)
        failCount++
      }
      
      // Delay before next API call
      await delay(API_DELAY)
    }
    
    console.log('\n========================================')
    console.log(`✅ Successfully updated: ${successCount} games`)
    console.log(`❌ Failed to update: ${failCount} games`)
    console.log('========================================\n')
    
  } catch (error) {
    console.error('Fatal error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the updater
updateGamesWithBGGData()
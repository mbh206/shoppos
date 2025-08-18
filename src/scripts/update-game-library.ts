import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Map our complexity to Prisma enum values
const complexityMap: Record<string, 'easy' | 'medium' | 'hard' | 'expert'> = {
  'light': 'easy',
  'medium': 'medium',
  'heavy': 'hard'
}

const games = [
  { title: "Arborea", minPlayers: 1, maxPlayers: 5, playTime: 90, complexity: "medium" },
  { title: "Arboretum", minPlayers: 2, maxPlayers: 4, playTime: 30, complexity: "light" },
  { title: "Architects of the West Kingdom", minPlayers: 1, maxPlayers: 5, playTime: 80, complexity: "medium" },
  { title: "Atlas Lost Rise of the New Sovereigns", minPlayers: 2, maxPlayers: 4, playTime: 60, complexity: "medium" },
  { title: "Axis & Allies & Zombies", minPlayers: 2, maxPlayers: 5, playTime: 180, complexity: "heavy" },
  { title: "Azul: Crystal Mosaic", minPlayers: 2, maxPlayers: 4, playTime: 45, complexity: "light" },
  { title: "Bad Neighbors", minPlayers: 2, maxPlayers: 4, playTime: 30, complexity: "light" },
  { title: "Botany", minPlayers: 1, maxPlayers: 5, playTime: 45, complexity: "light" },
  { title: "Brass Birmingham", minPlayers: 2, maxPlayers: 4, playTime: 120, complexity: "heavy" },
  { title: "Bristol 1350", minPlayers: 1, maxPlayers: 9, playTime: 20, complexity: "light" },
  { title: "Bushido Breaker", minPlayers: 2, maxPlayers: 4, playTime: 30, complexity: "light" },
  { title: "By Order of the Queen", minPlayers: 2, maxPlayers: 4, playTime: 90, complexity: "medium" },
  { title: "Call to Adventure", minPlayers: 1, maxPlayers: 4, playTime: 45, complexity: "light" },
  { title: "Camp Pinetop", minPlayers: 2, maxPlayers: 5, playTime: 45, complexity: "light" },
  { title: "Canvas", minPlayers: 1, maxPlayers: 5, playTime: 30, complexity: "light" },
  { title: "Caral", minPlayers: 2, maxPlayers: 4, playTime: 75, complexity: "medium" },
  { title: "Carcassonne", minPlayers: 2, maxPlayers: 5, playTime: 45, complexity: "light" },
  { title: "Cartographers: A Roll Player Tale", minPlayers: 1, maxPlayers: 100, playTime: 45, complexity: "light" },
  { title: "Catacombs Cubes", minPlayers: 2, maxPlayers: 4, playTime: 60, complexity: "medium" },
  { title: "Cascadia", minPlayers: 1, maxPlayers: 4, playTime: 45, complexity: "light" },
  { title: "Century", minPlayers: 2, maxPlayers: 5, playTime: 45, complexity: "light" },
  { title: "Civilization A New Dawn", minPlayers: 2, maxPlayers: 4, playTime: 120, complexity: "medium" },
  { title: "Chicken", minPlayers: 2, maxPlayers: 6, playTime: 20, complexity: "light" },
  { title: "Cribbage", minPlayers: 2, maxPlayers: 2, playTime: 30, complexity: "light" },
  { title: "Dawn of Ulos", minPlayers: 1, maxPlayers: 5, playTime: 90, complexity: "medium" },
  { title: "Deep Dive", minPlayers: 1, maxPlayers: 4, playTime: 30, complexity: "light" },
  { title: "Detective: A Modern Crime Board Game", minPlayers: 1, maxPlayers: 5, playTime: 180, complexity: "heavy" },
  { title: "Dice Throne: Adventures", minPlayers: 1, maxPlayers: 4, playTime: 60, complexity: "medium" },
  { title: "Dice Throne: Season One", minPlayers: 2, maxPlayers: 6, playTime: 30, complexity: "medium" },
  { title: "Dice Throne: Season Two – Battle Chest", minPlayers: 2, maxPlayers: 6, playTime: 30, complexity: "medium" },
  { title: "Dice Throne: Marvel", minPlayers: 2, maxPlayers: 6, playTime: 30, complexity: "medium" },
  { title: "Dice Throne: Marvel X-Men", minPlayers: 2, maxPlayers: 6, playTime: 30, complexity: "medium" },
  { title: "Dice Throne: Missions", minPlayers: 1, maxPlayers: 6, playTime: 45, complexity: "medium" },
  { title: "Dixit", minPlayers: 3, maxPlayers: 6, playTime: 30, complexity: "light" },
  { title: "Dog Park", minPlayers: 1, maxPlayers: 4, playTime: 60, complexity: "light" },
  { title: "Enchanters", minPlayers: 2, maxPlayers: 4, playTime: 45, complexity: "light" },
  { title: "Enchanters: Odyssey", minPlayers: 1, maxPlayers: 4, playTime: 45, complexity: "light" },
  { title: "Enchanters: Overlords", minPlayers: 2, maxPlayers: 4, playTime: 45, complexity: "light" },
  { title: "Everdell", minPlayers: 1, maxPlayers: 4, playTime: 80, complexity: "medium" },
  { title: "Fit to Print", minPlayers: 1, maxPlayers: 6, playTime: 30, complexity: "light" },
  { title: "Fluxx Jumanji", minPlayers: 2, maxPlayers: 6, playTime: 30, complexity: "light" },
  { title: "Fluxx Marvel", minPlayers: 2, maxPlayers: 6, playTime: 30, complexity: "light" },
  { title: "Forbidden Desert", minPlayers: 2, maxPlayers: 5, playTime: 45, complexity: "light" },
  { title: "Founders of Gloomhaven", minPlayers: 1, maxPlayers: 4, playTime: 120, complexity: "heavy" },
  { title: "Frosthaven", minPlayers: 1, maxPlayers: 4, playTime: 120, complexity: "heavy" },
  { title: "Funkoverse Strategy Game: Harry Potter 100", minPlayers: 2, maxPlayers: 4, playTime: 45, complexity: "light" },
  { title: "Galaxy Trucker", minPlayers: 2, maxPlayers: 4, playTime: 60, complexity: "medium" },
  { title: "Glen More II: Chronicles", minPlayers: 2, maxPlayers: 4, playTime: 90, complexity: "medium" },
  { title: "Gloomhaven", minPlayers: 1, maxPlayers: 4, playTime: 120, complexity: "heavy" },
  { title: "Gloomhaven: Jaws of the Lion", minPlayers: 1, maxPlayers: 4, playTime: 120, complexity: "medium" },
  { title: "Gloomhaven Mini", minPlayers: 1, maxPlayers: 4, playTime: 30, complexity: "medium" },
  { title: "Great Western Trail", minPlayers: 2, maxPlayers: 4, playTime: 120, complexity: "heavy" },
  { title: "Harvest", minPlayers: 1, maxPlayers: 4, playTime: 45, complexity: "light" },
  { title: "Hexpanse", minPlayers: 2, maxPlayers: 4, playTime: 45, complexity: "light" },
  { title: "Hollywood", minPlayers: 2, maxPlayers: 5, playTime: 60, complexity: "medium" },
  { title: "King of Tokyo", minPlayers: 2, maxPlayers: 6, playTime: 30, complexity: "light" },
  { title: "Let's Go! To Japan", minPlayers: 1, maxPlayers: 5, playTime: 60, complexity: "light" },
  { title: "Libertalia: Winds of Galecrest", minPlayers: 1, maxPlayers: 6, playTime: 60, complexity: "medium" },
  { title: "Little Town Builders", minPlayers: 2, maxPlayers: 4, playTime: 45, complexity: "light" },
  { title: "Lords of Waterdeep", minPlayers: 2, maxPlayers: 5, playTime: 90, complexity: "medium" },
  { title: "Lost Ruins of Arnak", minPlayers: 1, maxPlayers: 4, playTime: 90, complexity: "medium" },
  { title: "Machi Koro", minPlayers: 2, maxPlayers: 4, playTime: 30, complexity: "light" },
  { title: "Melee", minPlayers: 2, maxPlayers: 2, playTime: 30, complexity: "light" },
  { title: "Mr. Jack Pocket", minPlayers: 2, maxPlayers: 2, playTime: 20, complexity: "light" },
  { title: "Munchkin Deluxe", minPlayers: 3, maxPlayers: 6, playTime: 90, complexity: "light" },
  { title: "Namiji", minPlayers: 2, maxPlayers: 5, playTime: 45, complexity: "light" },
  { title: "Night Parade", minPlayers: 1, maxPlayers: 4, playTime: 45, complexity: "light" },
  { title: "Ninja Sloths", minPlayers: 2, maxPlayers: 5, playTime: 20, complexity: "light" },
  { title: "Ninjitsu!", minPlayers: 2, maxPlayers: 5, playTime: 20, complexity: "light" },
  { title: "Orleans", minPlayers: 2, maxPlayers: 4, playTime: 90, complexity: "medium" },
  { title: "Pan Am", minPlayers: 2, maxPlayers: 4, playTime: 60, complexity: "medium" },
  { title: "PARKS", minPlayers: 1, maxPlayers: 5, playTime: 60, complexity: "light" },
  { title: "Parks Memories", minPlayers: 2, maxPlayers: 8, playTime: 30, complexity: "light" },
  { title: "Patchwork", minPlayers: 2, maxPlayers: 2, playTime: 30, complexity: "light" },
  { title: "Point City", minPlayers: 1, maxPlayers: 4, playTime: 30, complexity: "light" },
  { title: "Railways of the Lost Atlas", minPlayers: 2, maxPlayers: 5, playTime: 90, complexity: "medium" },
  { title: "Redwood", minPlayers: 1, maxPlayers: 4, playTime: 60, complexity: "medium" },
  { title: "Robinson Crusoe: Adventures on the Cursed Island", minPlayers: 1, maxPlayers: 4, playTime: 120, complexity: "heavy" },
  { title: "Roll Player", minPlayers: 1, maxPlayers: 4, playTime: 90, complexity: "medium" },
  { title: "Samurai Gardener", minPlayers: 2, maxPlayers: 5, playTime: 20, complexity: "light" },
  { title: "Scythe", minPlayers: 1, maxPlayers: 5, playTime: 115, complexity: "heavy" },
  { title: "Scythe: Invaders from Afar", minPlayers: 1, maxPlayers: 7, playTime: 140, complexity: "heavy" },
  { title: "Scythe: The Wind Gambit", minPlayers: 1, maxPlayers: 7, playTime: 140, complexity: "heavy" },
  { title: "Sherlock Holmes Consulting Detective: The Thames Murders & Other Cases", minPlayers: 1, maxPlayers: 8, playTime: 90, complexity: "medium" },
  { title: "Sid Meier's Civilization: A New Dawn", minPlayers: 2, maxPlayers: 4, playTime: 120, complexity: "medium" },
  { title: "Sleeping Gods", minPlayers: 1, maxPlayers: 4, playTime: 180, complexity: "heavy" },
  { title: "Space Parks", minPlayers: 1, maxPlayers: 4, playTime: 30, complexity: "light" },
  { title: "Spirit Island", minPlayers: 1, maxPlayers: 4, playTime: 120, complexity: "heavy" },
  { title: "Star Realms: Frontiers", minPlayers: 1, maxPlayers: 4, playTime: 30, complexity: "light" },
  { title: "Star Wars: Outer Rim", minPlayers: 1, maxPlayers: 4, playTime: 180, complexity: "medium" },
  { title: "Star Wars: Shatterpoint", minPlayers: 2, maxPlayers: 2, playTime: 90, complexity: "medium" },
  { title: "Star Wars: The Clone Wars - A Pandemic System Game", minPlayers: 1, maxPlayers: 5, playTime: 60, complexity: "medium" },
  { title: "Sub Terra: Collector's Edition", minPlayers: 1, maxPlayers: 6, playTime: 60, complexity: "medium" },
  { title: "Sushi Go!", minPlayers: 2, maxPlayers: 5, playTime: 15, complexity: "light" },
  { title: "Takenoko", minPlayers: 2, maxPlayers: 4, playTime: 45, complexity: "light" },
  { title: "Tao Long: The Way of the Dragon", minPlayers: 2, maxPlayers: 2, playTime: 30, complexity: "medium" },
  { title: "Tapestry", minPlayers: 1, maxPlayers: 5, playTime: 120, complexity: "medium" },
  { title: "Terraforming Mars", minPlayers: 1, maxPlayers: 5, playTime: 120, complexity: "medium" },
  { title: "Terraforming Mars: The Dice Game", minPlayers: 1, maxPlayers: 4, playTime: 45, complexity: "light" },
  { title: "The Search for Planet X", minPlayers: 1, maxPlayers: 4, playTime: 60, complexity: "medium" },
  { title: "Thebes", minPlayers: 2, maxPlayers: 4, playTime: 60, complexity: "light" },
  { title: "Ticket to Ride", minPlayers: 2, maxPlayers: 5, playTime: 60, complexity: "light" },
  { title: "Ticket to Ride Map Collection: Volume 1 – Team Asia & Legendary Asia", minPlayers: 2, maxPlayers: 6, playTime: 60, complexity: "light" },
  { title: "Tiny Epic Dinosaurs", minPlayers: 1, maxPlayers: 4, playTime: 45, complexity: "light" },
  { title: "Tiny Epic Vikings", minPlayers: 1, maxPlayers: 4, playTime: 45, complexity: "light" },
  { title: "Tokaido", minPlayers: 2, maxPlayers: 5, playTime: 45, complexity: "light" },
  { title: "Tokaido: Crossroads", minPlayers: 2, maxPlayers: 5, playTime: 45, complexity: "light" },
  { title: "Too Many Bones", minPlayers: 1, maxPlayers: 4, playTime: 90, complexity: "heavy" },
  { title: "Tortuga 1667", minPlayers: 2, maxPlayers: 9, playTime: 60, complexity: "light" },
  { title: "Twilight Struggle", minPlayers: 2, maxPlayers: 2, playTime: 180, complexity: "heavy" },
  { title: "Tzolk'in: The Mayan Calendar", minPlayers: 2, maxPlayers: 4, playTime: 90, complexity: "heavy" },
  { title: "Weirdwood Manor", minPlayers: 1, maxPlayers: 5, playTime: 90, complexity: "medium" },
  { title: "Wingspan", minPlayers: 1, maxPlayers: 5, playTime: 70, complexity: "medium" }
]

async function updateGameLibrary() {
  try {
    console.log('Clearing existing game sessions...')
    await prisma.tableGameSession.deleteMany({})
    
    console.log('Clearing existing games...')
    await prisma.game.deleteMany({})
    
    console.log('Adding new game library...')
    let addedCount = 0
    
    for (const game of games) {
      await prisma.game.create({
        data: {
          name: game.title,
          location: 'A1', // Default location, to be updated
          available: true,
          type: 'board_game',
          minPlayers: game.minPlayers,
          maxPlayers: game.maxPlayers,
          duration: game.playTime,
          complexity: complexityMap[game.complexity] || 'medium',
          setupTime: 10, // Default 10 minutes
          description: null,
          imageUrl: null,
        }
      })
      addedCount++
      console.log(`Added: ${game.title}`)
    }
    
    console.log(`\n✅ Successfully added ${addedCount} games to the library`)
    
  } catch (error) {
    console.error('Error updating game library:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateGameLibrary()
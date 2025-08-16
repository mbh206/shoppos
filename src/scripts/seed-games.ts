import { PrismaClient, GameType, GameComplexity } from '@prisma/client'

const prisma = new PrismaClient()

type GameData = {
  name: string
  nameJa?: string
  location: string
  type: GameType
  minPlayers: number
  maxPlayers: number
  duration: number
  complexity: GameComplexity
  setupTime: number
}

const games: GameData[] = [
  { name: "Arboretum", location: "Shelf A-1", type: "card_game", minPlayers: 2, maxPlayers: 4, duration: 30, complexity: "medium", setupTime: 5 },
  { name: "Architects of the West Kingdom", location: "Shelf A-2", type: "strategy_game", minPlayers: 1, maxPlayers: 5, duration: 80, complexity: "medium", setupTime: 15 },
  { name: "Axis & Allies & Zombies", location: "Shelf A-3", type: "strategy_game", minPlayers: 2, maxPlayers: 5, duration: 180, complexity: "hard", setupTime: 30 },
  { name: "Azul: Crystal Mosaic", nameJa: "アズール", location: "Shelf B-1", type: "board_game", minPlayers: 2, maxPlayers: 4, duration: 45, complexity: "medium", setupTime: 5 },
  { name: "Bad Neighbors", location: "Shelf B-2", type: "card_game", minPlayers: 2, maxPlayers: 4, duration: 30, complexity: "easy", setupTime: 5 },
  { name: "Bushido Breaker", location: "Shelf B-3", type: "card_game", minPlayers: 2, maxPlayers: 4, duration: 15, complexity: "easy", setupTime: 2 },
  { name: "By Order of the Queen", location: "Shelf C-1", type: "cooperative_game", minPlayers: 2, maxPlayers: 4, duration: 90, complexity: "medium", setupTime: 10 },
  { name: "Cartographers: A Roll Player Tale", location: "Shelf C-2", type: "board_game", minPlayers: 1, maxPlayers: 100, duration: 45, complexity: "easy", setupTime: 5 },
  { name: "Catacombs Cubes", location: "Shelf C-3", type: "dice_game", minPlayers: 2, maxPlayers: 4, duration: 30, complexity: "easy", setupTime: 5 },
  { name: "Cribbage", location: "Shelf D-1", type: "card_game", minPlayers: 2, maxPlayers: 2, duration: 30, complexity: "easy", setupTime: 2 },
  { name: "Detective: A Modern Crime Board Game", location: "Shelf D-2", type: "cooperative_game", minPlayers: 1, maxPlayers: 5, duration: 180, complexity: "hard", setupTime: 15 },
  { name: "Dice Throne: Season One", location: "Shelf D-3", type: "dice_game", minPlayers: 2, maxPlayers: 6, duration: 30, complexity: "medium", setupTime: 5 },
  { name: "Dice Throne: Season Two – Battle Chest", location: "Shelf E-1", type: "dice_game", minPlayers: 2, maxPlayers: 6, duration: 30, complexity: "medium", setupTime: 5 },
  { name: "Dice Throne: Adventures", location: "Shelf E-2", type: "dice_game", minPlayers: 1, maxPlayers: 4, duration: 60, complexity: "hard", setupTime: 15 },
  { name: "Enchanters", location: "Shelf E-3", type: "card_game", minPlayers: 1, maxPlayers: 4, duration: 30, complexity: "medium", setupTime: 5 },
  { name: "Enchanters: Odyssey", location: "Shelf F-1", type: "card_game", minPlayers: 1, maxPlayers: 4, duration: 30, complexity: "medium", setupTime: 5 },
  { name: "Enchanters: Overlords", location: "Shelf F-2", type: "card_game", minPlayers: 1, maxPlayers: 4, duration: 30, complexity: "medium", setupTime: 5 },
  { name: "Forbidden Desert", location: "Shelf F-3", type: "cooperative_game", minPlayers: 2, maxPlayers: 5, duration: 45, complexity: "medium", setupTime: 10 },
  { name: "Founders of Gloomhaven", location: "Shelf G-1", type: "strategy_game", minPlayers: 1, maxPlayers: 4, duration: 120, complexity: "hard", setupTime: 20 },
  { name: "Funkoverse Strategy Game: Harry Potter 100", location: "Shelf G-2", type: "strategy_game", minPlayers: 2, maxPlayers: 4, duration: 30, complexity: "easy", setupTime: 5 },
  { name: "Gloomhaven", location: "Shelf G-3", type: "strategy_game", minPlayers: 1, maxPlayers: 4, duration: 120, complexity: "expert", setupTime: 30 },
  { name: "Hexpanse", location: "Shelf H-1", type: "board_game", minPlayers: 2, maxPlayers: 4, duration: 60, complexity: "medium", setupTime: 10 },
  { name: "Jumanji Fluxx", location: "Shelf H-2", type: "card_game", minPlayers: 2, maxPlayers: 6, duration: 30, complexity: "easy", setupTime: 2 },
  { name: "Little Town Builders", location: "Shelf H-3", type: "board_game", minPlayers: 2, maxPlayers: 4, duration: 45, complexity: "easy", setupTime: 5 },
  { name: "Lords of Waterdeep", location: "Shelf I-1", type: "strategy_game", minPlayers: 2, maxPlayers: 5, duration: 90, complexity: "medium", setupTime: 10 },
  { name: "Mr. Jack Pocket", location: "Shelf I-2", type: "board_game", minPlayers: 2, maxPlayers: 2, duration: 15, complexity: "easy", setupTime: 2 },
  { name: "Munchkin Delux", location: "Shelf I-3", type: "card_game", minPlayers: 3, maxPlayers: 6, duration: 90, complexity: "easy", setupTime: 5 },
  { name: "Ninjitsu!", location: "Shelf J-1", type: "card_game", minPlayers: 2, maxPlayers: 5, duration: 15, complexity: "easy", setupTime: 2 },
  { name: "PARKS", location: "Shelf J-2", type: "board_game", minPlayers: 1, maxPlayers: 5, duration: 60, complexity: "medium", setupTime: 10 },
  { name: "Roll Player", location: "Shelf J-3", type: "dice_game", minPlayers: 1, maxPlayers: 4, duration: 90, complexity: "medium", setupTime: 10 },
  { name: "Samurai Gardener", location: "Shelf K-1", type: "board_game", minPlayers: 2, maxPlayers: 5, duration: 20, complexity: "easy", setupTime: 5 },
  { name: "Scythe", location: "Shelf K-2", type: "strategy_game", minPlayers: 1, maxPlayers: 5, duration: 115, complexity: "hard", setupTime: 15 },
  { name: "Scythe: Invaders from Afar", location: "Shelf K-3", type: "strategy_game", minPlayers: 1, maxPlayers: 7, duration: 140, complexity: "hard", setupTime: 15 },
  { name: "Scythe: The Wind Gambit", location: "Shelf L-1", type: "strategy_game", minPlayers: 1, maxPlayers: 5, duration: 140, complexity: "hard", setupTime: 20 },
  { name: "The Search for Planet X", location: "Shelf L-2", type: "board_game", minPlayers: 1, maxPlayers: 4, duration: 60, complexity: "medium", setupTime: 10 },
  { name: "Sherlock Holmes Consulting Detective: The Thames Murders & Other Cases", location: "Shelf L-3", type: "cooperative_game", minPlayers: 1, maxPlayers: 8, duration: 120, complexity: "medium", setupTime: 5 },
  { name: "Sid Meier's Civilization: A New Dawn", location: "Shelf M-1", type: "strategy_game", minPlayers: 2, maxPlayers: 4, duration: 120, complexity: "hard", setupTime: 15 },
  { name: "Spirit Island", location: "Shelf M-2", type: "cooperative_game", minPlayers: 1, maxPlayers: 4, duration: 120, complexity: "expert", setupTime: 20 },
  { name: "Star Realms: Frontiers", location: "Shelf M-3", type: "card_game", minPlayers: 1, maxPlayers: 4, duration: 20, complexity: "easy", setupTime: 2 },
  { name: "Sub Terra Collector's Edition", location: "Shelf N-1", type: "cooperative_game", minPlayers: 1, maxPlayers: 6, duration: 60, complexity: "medium", setupTime: 10 },
  { name: "Sushi Go!", location: "Shelf N-2", type: "card_game", minPlayers: 2, maxPlayers: 5, duration: 15, complexity: "easy", setupTime: 2 },
  { name: "Tao Long: The Way of the Dragon", location: "Shelf N-3", type: "board_game", minPlayers: 2, maxPlayers: 2, duration: 30, complexity: "medium", setupTime: 5 },
  { name: "Tapestry", location: "Shelf O-1", type: "strategy_game", minPlayers: 1, maxPlayers: 5, duration: 120, complexity: "hard", setupTime: 15 },
  { name: "Terraforming Mars", location: "Shelf O-2", type: "strategy_game", minPlayers: 1, maxPlayers: 5, duration: 120, complexity: "hard", setupTime: 10 },
  { name: "Terraforming Mars: Colonies", location: "Shelf O-3", type: "strategy_game", minPlayers: 1, maxPlayers: 5, duration: 120, complexity: "hard", setupTime: 15 },
  { name: "Ticket to Ride", location: "Shelf P-1", type: "board_game", minPlayers: 2, maxPlayers: 5, duration: 60, complexity: "easy", setupTime: 5 },
  { name: "Ticket to Ride Map Collection: Volume 1 – Team Asia & Legendary Asia", location: "Shelf P-2", type: "board_game", minPlayers: 2, maxPlayers: 6, duration: 60, complexity: "medium", setupTime: 10 },
  { name: "Tokaido", location: "Shelf P-3", type: "board_game", minPlayers: 2, maxPlayers: 5, duration: 45, complexity: "easy", setupTime: 5 },
  { name: "Tokaido: Crossroad", location: "Shelf Q-1", type: "board_game", minPlayers: 2, maxPlayers: 5, duration: 45, complexity: "easy", setupTime: 5 },
  { name: "Tortuga 1667", location: "Shelf Q-2", type: "party_game", minPlayers: 2, maxPlayers: 9, duration: 60, complexity: "medium", setupTime: 10 },
  { name: "Wingspan", location: "Shelf Q-3", type: "strategy_game", minPlayers: 1, maxPlayers: 5, duration: 70, complexity: "medium", setupTime: 10 },
  { name: "アズール", location: "Shelf R-1", type: "board_game", minPlayers: 2, maxPlayers: 4, duration: 45, complexity: "medium", setupTime: 5 },
  { name: "カルカソンヌＪ", nameJa: "カルカソンヌＪ", location: "Shelf R-2", type: "board_game", minPlayers: 2, maxPlayers: 5, duration: 45, complexity: "easy", setupTime: 5 },
  { name: "街コロ", nameJa: "街コロ", location: "Shelf R-3", type: "dice_game", minPlayers: 2, maxPlayers: 4, duration: 30, complexity: "easy", setupTime: 5 },
]

async function seedGames() {
  console.log('Seeding games...')
  
  for (const gameData of games) {
    try {
      const existing = await prisma.game.findFirst({
        where: { name: gameData.name }
      })
      
      if (!existing) {
        await prisma.game.create({
          data: gameData
        })
        console.log(`✓ Added game: ${gameData.name}`)
      } else {
        console.log(`- Game already exists: ${gameData.name}`)
      }
    } catch (error) {
      console.error(`✗ Error adding game ${gameData.name}:`, error)
    }
  }
  
  console.log('Done seeding games!')
}

seedGames()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
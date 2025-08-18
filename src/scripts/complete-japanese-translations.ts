import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Complete list of Japanese translations for all games
const completeTranslations: Record<string, string> = {
  // D games
  "Dice Throne: Adventures": "ダイス・スローン：アドベンチャー",
  "Dice Throne: Marvel": "ダイス・スローン：マーベル",
  "Dice Throne: Marvel X-Men": "ダイス・スローン：マーベル X-メン",
  "Dice Throne: Missions": "ダイス・スローン：ミッション",
  "Dice Throne: Season One": "ダイス・スローン：シーズン1",
  "Dice Throne: Season Two – Battle Chest": "ダイス・スローン：シーズン2 バトルチェスト",
  "Dixit": "ディクシット",
  "Dog Park": "ドッグパーク",
  
  // E games
  "Enchanters": "エンチャンター",
  "Enchanters: Odyssey": "エンチャンター：オデッセイ",
  "Enchanters: Overlords": "エンチャンター：オーバーロード",
  "Everdell": "エバーデール",
  
  // F games
  "Fit to Print": "フィット・トゥ・プリント",
  "Fluxx Jumanji": "フラックス：ジュマンジ",
  "Fluxx Marvel": "フラックス：マーベル",
  "Forbidden Desert": "禁断の砂漠",
  "Founders of Gloomhaven": "グルームヘイヴンの創設者",
  "Frosthaven": "フロストヘイヴン",
  "Funkoverse Strategy Game: Harry Potter 100": "ファンコバース：ハリー・ポッター100",
  
  // G games
  "Galaxy Trucker": "ギャラクシー・トラッカー",
  "Glen More II: Chronicles": "グレンモア2：クロニクル",
  "Gloomhaven": "グルームヘイヴン",
  "Gloomhaven: Bugs & Buttons": "グルームヘイヴン：バグス＆ボタンズ",
  "Gloomhaven: Jaws of the Lion": "グルームヘイヴン：獅子のあぎと",
  "Gloomhaven Mini": "グルームヘイヴン・ミニ",
  "Great Western Trail": "グレート・ウェスタン・トレイル",
  
  // H games
  "Harvest": "ハーベスト（収穫）",
  "Hexpanse": "ヘクスパンス",
  "Hollywood": "ハリウッド",
  
  // K games
  "King of Tokyo": "キング・オブ・トーキョー",
  
  // L games
  "Let's Go! To Japan": "レッツゴー！日本へ",
  "Libertalia: Winds of Galecrest": "リベルタリア：ゲイルクレストの風",
  "Little Town Builders": "リトルタウンビルダーズ",
  "Lords of Waterdeep": "ウォーターディープの支配者",
  "Lost Ruins of Arnak": "アルナックの失われし遺跡",
  
  // M games
  "Machi Koro": "街コロ",
  "Melee": "メレー（白兵戦）",
  "Mr. Jack Pocket": "ミスター・ジャック・ポケット",
  "Munchkin Deluxe": "マンチキン デラックス",
  
  // N games
  "Namiji": "ナミジ",
  "Night Parade": "百鬼夜行",
  "Ninja Sloths": "ニンジャ・スロース",
  "Ninjitsu!": "忍術！",
  
  // O games
  "Orleans": "オルレアン",
  
  // P games
  "Pan Am": "パンナム",
  "PARKS": "パークス",
  "Parks Memories": "パークス・メモリーズ",
  "Parks: Nightfall Expansion": "パークス：ナイトフォール拡張",
  "Patchwork": "パッチワーク",
  "Point City": "ポイント・シティ",
  
  // R games
  "Railways of the Lost Atlas": "失われたアトラスの鉄道",
  "Redwood": "レッドウッド",
  "Robinson Crusoe: Adventures on the Cursed Island": "ロビンソン・クルーソー：呪われた島の冒険",
  "Roll Player": "ロール・プレイヤー",
  
  // S games
  "Samurai Gardener": "侍ガーデナー",
  "Scythe": "サイズ - 大鎌戦役",
  "Scythe: Invaders from Afar": "サイズ：彼方からの侵略者",
  "Scythe: The Wind Gambit": "サイズ：風のギャンビット",
  "Sherlock Holmes Consulting Detective: The Thames Murders & Other Cases": "シャーロック・ホームズ：コンサルティング・ディテクティブ",
  "Sid Meier's Civilization: A New Dawn": "シド・マイヤーズ シヴィライゼーション：新たなる夜明け",
  "Sleeping Gods": "スリーピング・ゴッズ",
  "Space Parks": "スペース・パークス",
  "Spirit Island": "スピリット・アイランド",
  "Star Realms: Frontiers": "スター・レルムズ：フロンティア",
  "Star Wars: Outer Rim": "スター・ウォーズ：アウター・リム",
  "Star Wars: Shatterpoint": "スター・ウォーズ：シャッターポイント",
  "Star Wars: The Clone Wars - A Pandemic System Game": "スター・ウォーズ：クローン・ウォーズ パンデミックシステム",
  "Sub Terra: Collector's Edition": "サブ・テラ：コレクターズエディション",
  "Sushi Go!": "スシゴー！",
  
  // T games
  "Takenoko": "タケノコ",
  "Tao Long: The Way of the Dragon": "タオ・ロン：龍の道",
  "Tapestry": "タペストリー",
  "Terraforming Mars": "テラフォーミング・マーズ",
  "Terraforming Mars: The Dice Game": "テラフォーミング・マーズ：ダイスゲーム",
  "The Search for Planet X": "惑星Xの探索",
  "Thebes": "テーベ",
  "Ticket to Ride": "チケット・トゥ・ライド",
  "Ticket to Ride Map Collection: Volume 1 – Team Asia & Legendary Asia": "チケット・トゥ・ライド：マップコレクション Vol.1",
  "Tiny Epic Dinosaurs": "タイニー・エピック・ダイナソー",
  "Tiny Epic Vikings": "タイニー・エピック・バイキング",
  "Tokaido": "東海道",
  "Tokaido: Crossroads": "東海道：クロスロード",
  "Too Many Bones": "トゥー・メニー・ボーンズ",
  "Tortuga 1667": "トルトゥーガ1667",
  "Twilight Struggle": "トワイライト・ストラグル",
  "Tzolk'in: The Mayan Calendar": "ツォルキン：マヤ暦",
  
  // W games
  "Weirdwood Manor": "ウィアウッド・マナー",
  "Wingspan": "ウイングスパン"
}

// Complexity translations
const complexityTranslations: Record<string, string> = {
  'easy': '簡単',
  'medium': '普通',
  'hard': '難しい',
  'expert': 'エキスパート'
}

async function completeJapaneseTranslations() {
  try {
    console.log('Completing Japanese translations for all games...\n')
    
    // Get all games
    const games = await prisma.game.findMany({
      orderBy: { name: 'asc' }
    })
    
    console.log(`Found ${games.length} games total\n`)
    
    let updatedCount = 0
    let skippedCount = 0
    
    for (const game of games) {
      const updateData: any = {}
      
      // Check if game needs Japanese name
      if (!game.nameJa || game.nameJa === '') {
        const translation = completeTranslations[game.name]
        if (translation) {
          updateData.nameJa = translation
          console.log(`Adding Japanese name for: ${game.name} → ${translation}`)
        } else {
          // For any games not in our list, use the English name
          updateData.nameJa = game.name
          console.log(`Using English name for: ${game.name}`)
        }
      }
      
      // Add Japanese complexity if missing
      if (!game.complexityJa) {
        updateData.complexityJa = complexityTranslations[game.complexity] || '普通'
      }
      
      // Add basic Japanese description if missing
      if (!game.descriptionJa) {
        let jaDescription = ""
        
        // Create description based on player count and complexity
        if (game.minPlayers === 1) {
          jaDescription = "1人から遊べる"
        } else {
          jaDescription = `${game.minPlayers}〜${game.maxPlayers}人で遊べる`
        }
        
        // Add complexity info
        if (game.complexity === 'easy') {
          jaDescription += "初心者向けの"
        } else if (game.complexity === 'hard' || game.complexity === 'expert') {
          jaDescription += "上級者向けの"
        }
        
        // Add play time
        jaDescription += `ボードゲームです。プレイ時間は約${game.duration}分です。`
        
        // Add BGG rating if available
        if (game.bggRating) {
          jaDescription += ` BGG評価: ${game.bggRating.toFixed(1)}/10。`
        }
        
        updateData.descriptionJa = jaDescription
      }
      
      // Update the game if there are changes
      if (Object.keys(updateData).length > 0) {
        await prisma.game.update({
          where: { id: game.id },
          data: updateData
        })
        updatedCount++
      } else {
        skippedCount++
      }
    }
    
    console.log('\n========================================')
    console.log(`✅ Successfully updated: ${updatedCount} games`)
    console.log(`⏭️  Skipped (already complete): ${skippedCount} games`)
    console.log('========================================\n')
    
    // Verify all games now have Japanese names
    const missingJapanese = await prisma.game.findMany({
      where: {
        OR: [
          { nameJa: null },
          { nameJa: '' }
        ]
      }
    })
    
    if (missingJapanese.length === 0) {
      console.log('✨ All games now have Japanese translations!')
    } else {
      console.log(`⚠️  Still missing Japanese for ${missingJapanese.length} games`)
    }
    
  } catch (error) {
    console.error('Error completing translations:', error)
  } finally {
    await prisma.$disconnect()
  }
}

completeJapaneseTranslations()
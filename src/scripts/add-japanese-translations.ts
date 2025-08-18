import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Japanese translations for popular games and direct translations for others
const gameTranslations: Record<string, { nameJa: string, complexityJa?: string }> = {
  // Popular games with known Japanese names
  "Azul: Crystal Mosaic": { nameJa: "アズール：クリスタルモザイク" },
  "Carcassonne": { nameJa: "カルカソンヌ" },
  "Cascadia": { nameJa: "カスカディア" },
  "Catan": { nameJa: "カタン" },
  "Dixit": { nameJa: "ディクシット" },
  "Everdell": { nameJa: "エバーデール" },
  "Gloomhaven": { nameJa: "グルームヘイヴン" },
  "Gloomhaven: Jaws of the Lion": { nameJa: "グルームヘイヴン：獅子のあぎと" },
  "King of Tokyo": { nameJa: "キング・オブ・トーキョー" },
  "Lords of Waterdeep": { nameJa: "ウォーターディープの支配者" },
  "Lost Ruins of Arnak": { nameJa: "アルナックの失われし遺跡" },
  "Machi Koro": { nameJa: "街コロ" },
  "Munchkin Deluxe": { nameJa: "マンチキン デラックス" },
  "Pandemic": { nameJa: "パンデミック" },
  "Patchwork": { nameJa: "パッチワーク" },
  "Scythe": { nameJa: "サイズ - 大鎌戦役" },
  "Spirit Island": { nameJa: "スピリット・アイランド" },
  "Sushi Go!": { nameJa: "スシゴー！" },
  "Takenoko": { nameJa: "タケノコ" },
  "Terraforming Mars": { nameJa: "テラフォーミング・マーズ" },
  "Ticket to Ride": { nameJa: "チケット・トゥ・ライド" },
  "Tokaido": { nameJa: "東海道" },
  "Wingspan": { nameJa: "ウイングスパン" },
  "Twilight Struggle": { nameJa: "トワイライト・ストラグル" },
  "Robinson Crusoe: Adventures on the Cursed Island": { nameJa: "ロビンソン・クルーソー：呪われた島の冒険" },
  "Star Wars: Outer Rim": { nameJa: "スター・ウォーズ：アウター・リム" },
  "Star Wars: The Clone Wars - A Pandemic System Game": { nameJa: "スター・ウォーズ：クローン・ウォーズ パンデミックシステム" },
  
  // Direct translations for others
  "Arborea": { nameJa: "アルボレア" },
  "Arboretum": { nameJa: "アルボレタム" },
  "Architects of the West Kingdom": { nameJa: "西フランク王国の建築家" },
  "Atlas Lost Rise of the New Sovereigns": { nameJa: "アトラス・ロスト：新君主の台頭" },
  "Axis & Allies & Zombies": { nameJa: "アクシス＆アライズ＆ゾンビ" },
  "Bad Neighbors": { nameJa: "バッド・ネイバーズ" },
  "Botany": { nameJa: "ボタニー（植物学）" },
  "Brass Birmingham": { nameJa: "ブラス：バーミンガム" },
  "Bristol 1350": { nameJa: "ブリストル1350" },
  "Bushido Breaker": { nameJa: "武士道ブレイカー" },
  "By Order of the Queen": { nameJa: "女王の命令により" },
  "Call to Adventure": { nameJa: "コール・トゥ・アドベンチャー" },
  "Camp Pinetop": { nameJa: "キャンプ・パイントップ" },
  "Canvas": { nameJa: "キャンバス" },
  "Caral": { nameJa: "カラル" },
  "Cartographers: A Roll Player Tale": { nameJa: "カートグラファー：ロールプレイヤー物語" },
  "Catacombs Cubes": { nameJa: "カタコンベ・キューブ" },
  "Century": { nameJa: "センチュリー" },
  "Civilization A New Dawn": { nameJa: "シヴィライゼーション：新たなる夜明け" },
  "Chicken": { nameJa: "チキン" },
  "Cribbage": { nameJa: "クリベッジ" },
  "Dawn of Ulos": { nameJa: "ウロスの夜明け" },
  "Deep Dive": { nameJa: "ディープ・ダイブ" },
  "Detective: A Modern Crime Board Game": { nameJa: "ディテクティブ：現代犯罪ボードゲーム" },
  "Dice Throne: Adventures": { nameJa: "ダイス・スローン：アドベンチャー" },
  "Dice Throne: Season One": { nameJa: "ダイス・スローン：シーズン1" },
  "Dice Throne: Season Two – Battle Chest": { nameJa: "ダイス・スローン：シーズン2 バトルチェスト" },
  "Dice Throne: Marvel": { nameJa: "ダイス・スローン：マーベル" },
  "Dice Throne: Marvel X-Men": { nameJa: "ダイス・スローン：マーベル X-メン" },
  "Dice Throne: Missions": { nameJa: "ダイス・スローン：ミッション" },
  "Dog Park": { nameJa: "ドッグパーク" },
  "Enchanters": { nameJa: "エンチャンター" },
  "Enchanters: Odyssey": { nameJa: "エンチャンター：オデッセイ" },
  "Enchanters: Overlords": { nameJa: "エンチャンター：オーバーロード" },
  "Fit to Print": { nameJa: "フィット・トゥ・プリント" },
  "Fluxx Jumanji": { nameJa: "フラックス：ジュマンジ" },
  "Fluxx Marvel": { nameJa: "フラックス：マーベル" },
  "Forbidden Desert": { nameJa: "禁断の砂漠" },
  "Founders of Gloomhaven": { nameJa: "グルームヘイヴンの創設者" },
  "Frosthaven": { nameJa: "フロストヘイヴン" },
  "Funkoverse Strategy Game: Harry Potter 100": { nameJa: "ファンコバース：ハリー・ポッター100" },
  "Galaxy Trucker": { nameJa: "ギャラクシー・トラッカー" },
  "Glen More II: Chronicles": { nameJa: "グレンモア2：クロニクル" },
  "Gloomhaven Mini": { nameJa: "グルームヘイヴン・ミニ" },
  "Great Western Trail": { nameJa: "グレート・ウェスタン・トレイル" },
  "Harvest": { nameJa: "ハーベスト（収穫）" },
  "Hexpanse": { nameJa: "ヘクスパンス" },
  "Hollywood": { nameJa: "ハリウッド" },
  "Let's Go! To Japan": { nameJa: "レッツゴー！日本へ" },
  "Libertalia: Winds of Galecrest": { nameJa: "リベルタリア：ゲイルクレストの風" },
  "Little Town Builders": { nameJa: "リトルタウンビルダーズ" },
  "Melee": { nameJa: "メレー（白兵戦）" },
  "Mr. Jack Pocket": { nameJa: "ミスター・ジャック・ポケット" },
  "Namiji": { nameJa: "ナミジ" },
  "Night Parade": { nameJa: "百鬼夜行" },
  "Ninja Sloths": { nameJa: "ニンジャ・スロース" },
  "Ninjitsu!": { nameJa: "忍術！" },
  "Orleans": { nameJa: "オルレアン" },
  "Pan Am": { nameJa: "パンナム" },
  "PARKS": { nameJa: "パークス" },
  "Parks Memories": { nameJa: "パークス・メモリーズ" },
  "Point City": { nameJa: "ポイント・シティ" },
  "Railways of the Lost Atlas": { nameJa: "失われたアトラスの鉄道" },
  "Redwood": { nameJa: "レッドウッド" },
  "Roll Player": { nameJa: "ロール・プレイヤー" },
  "Samurai Gardener": { nameJa: "侍ガーデナー" },
  "Scythe: Invaders from Afar": { nameJa: "サイズ：彼方からの侵略者" },
  "Scythe: The Wind Gambit": { nameJa: "サイズ：風のギャンビット" },
  "Sherlock Holmes Consulting Detective: The Thames Murders & Other Cases": { nameJa: "シャーロック・ホームズ：コンサルティング・ディテクティブ" },
  "Sid Meier's Civilization: A New Dawn": { nameJa: "シド・マイヤーズ シヴィライゼーション：新たなる夜明け" },
  "Sleeping Gods": { nameJa: "スリーピング・ゴッズ" },
  "Space Parks": { nameJa: "スペース・パークス" },
  "Star Realms: Frontiers": { nameJa: "スター・レルムズ：フロンティア" },
  "Star Wars: Shatterpoint": { nameJa: "スター・ウォーズ：シャッターポイント" },
  "Sub Terra: Collector's Edition": { nameJa: "サブ・テラ：コレクターズエディション" },
  "Tao Long: The Way of the Dragon": { nameJa: "タオ・ロン：龍の道" },
  "Tapestry": { nameJa: "タペストリー" },
  "Terraforming Mars: The Dice Game": { nameJa: "テラフォーミング・マーズ：ダイスゲーム" },
  "The Search for Planet X": { nameJa: "惑星Xの探索" },
  "Thebes": { nameJa: "テーベ" },
  "Ticket to Ride Map Collection: Volume 1 – Team Asia & Legendary Asia": { nameJa: "チケット・トゥ・ライド：マップコレクション Vol.1" },
  "Tiny Epic Dinosaurs": { nameJa: "タイニー・エピック・ダイナソー" },
  "Tiny Epic Vikings": { nameJa: "タイニー・エピック・バイキング" },
  "Tokaido: Crossroads": { nameJa: "東海道：クロスロード" },
  "Too Many Bones": { nameJa: "トゥー・メニー・ボーンズ" },
  "Tortuga 1667": { nameJa: "トルトゥーガ1667" },
  "Tzolk'in: The Mayan Calendar": { nameJa: "ツォルキン：マヤ暦" },
  "Weirdwood Manor": { nameJa: "ウィアウッド・マナー" }
}

// Complexity translations
const complexityTranslations: Record<string, string> = {
  'easy': '簡単',
  'medium': '普通',
  'hard': '難しい',
  'expert': 'エキスパート'
}

// Common game descriptions in Japanese
const descriptionTemplates = {
  strategy: "戦略的思考と計画性が求められる本格的なボードゲームです。",
  party: "みんなで楽しめるパーティーゲームです。",
  family: "家族で楽しめるファミリーゲームです。",
  cooperative: "プレイヤー全員で協力してゲームに挑む協力型ゲームです。",
  deckbuilding: "デッキ構築メカニズムを使用したカードゲームです。",
  workerplacement: "ワーカープレイスメントメカニズムを採用した戦略ゲームです。"
}

async function addJapaneseTranslations() {
  try {
    console.log('Adding Japanese translations to games...\n')
    
    const games = await prisma.game.findMany({
      orderBy: { name: 'asc' }
    })
    
    console.log(`Found ${games.length} games to update\n`)
    
    let updatedCount = 0
    
    for (const game of games) {
      const translation = gameTranslations[game.name]
      
      // Prepare update data
      const updateData: any = {}
      
      // Add Japanese name
      if (translation?.nameJa) {
        updateData.nameJa = translation.nameJa
      } else {
        // Use katakana transliteration for unknown games
        updateData.nameJa = game.name // Keep English for now if no translation
      }
      
      // Add Japanese complexity
      updateData.complexityJa = complexityTranslations[game.complexity]
      
      // Add basic Japanese description based on game characteristics
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
        
        // Add specific description based on categories if available
        if (game.categories && game.categories.length > 0) {
          if (game.categories.some(c => c.toLowerCase().includes('party'))) {
            jaDescription += " " + descriptionTemplates.party
          } else if (game.categories.some(c => c.toLowerCase().includes('strategy'))) {
            jaDescription += " " + descriptionTemplates.strategy
          } else if (game.categories.some(c => c.toLowerCase().includes('family'))) {
            jaDescription += " " + descriptionTemplates.family
          }
        }
        
        updateData.descriptionJa = jaDescription
      }
      
      // Update the game
      await prisma.game.update({
        where: { id: game.id },
        data: updateData
      })
      
      updatedCount++
      console.log(`Updated: ${game.name} → ${updateData.nameJa}`)
    }
    
    console.log(`\n✅ Successfully added Japanese translations to ${updatedCount} games`)
    
  } catch (error) {
    console.error('Error adding translations:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addJapaneseTranslations()
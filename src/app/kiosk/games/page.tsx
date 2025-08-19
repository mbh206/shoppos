'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

type Game = {
  id: string
  name: string
  nameJa?: string | null
  location: string
  available: boolean
  type: string
  minPlayers: number
  maxPlayers: number
  duration: number
  complexity: string
  complexityJa?: string | null
  setupTime: number
  description?: string | null
  descriptionJa?: string | null
  imageUrl?: string | null
  thumbnailUrl?: string | null
  bggId?: number | null
  bggRating?: number | null
  bggWeight?: number | null
  yearPublished?: number | null
  designer?: string | null
  publisher?: string | null
  categories?: string[]
  mechanics?: string[]
  timesPlayed: number
}

type SortOption = 'popular' | 'rating' | 'name' | 'duration'
type ViewMode = 'browse' | 'wizard' | 'playing'

export default function KioskGamesPage() {
  const [games, setGames] = useState<Game[]>([])
  const [filteredGames, setFilteredGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('browse')
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [playerCount, setPlayerCount] = useState<number | null>(null)
  const [maxDuration, setMaxDuration] = useState<number | null>(null)
  const [complexity, setComplexity] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [onlyAvailable, setOnlyAvailable] = useState(true)
  const [sortBy, setSortBy] = useState<SortOption>('popular')
  
  // Wizard state
  const [wizardStep, setWizardStep] = useState(0)
  const [wizardAnswers, setWizardAnswers] = useState<any>({})
  
  // Idle/screensaver
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [isIdle, setIsIdle] = useState(false)
  
  // Language
  const [language, setLanguage] = useState<'en' | 'ja'>('en')

  useEffect(() => {
    fetchGames()
    // Auto-refresh availability every 30 seconds
    const interval = setInterval(fetchGames, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    filterAndSortGames()
  }, [games, searchTerm, playerCount, maxDuration, complexity, selectedCategory, onlyAvailable, sortBy])

  useEffect(() => {
    // Reset idle timer on any interaction
    const resetIdleTimer = () => {
      setIsIdle(false)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => setIsIdle(true), 120000) // 2 minutes
    }
    
    window.addEventListener('touchstart', resetIdleTimer)
    window.addEventListener('click', resetIdleTimer)
    resetIdleTimer()
    
    return () => {
      window.removeEventListener('touchstart', resetIdleTimer)
      window.removeEventListener('click', resetIdleTimer)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [])

  const fetchGames = async () => {
    try {
      const response = await fetch('/api/kiosk/games')
      const data = await response.json()
      setGames(data)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch games:', error)
      setLoading(false)
    }
  }

  const filterAndSortGames = () => {
    let filtered = [...games]
    
    // Apply filters
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(game => 
        game.name.toLowerCase().includes(term) ||
        (game.nameJa && game.nameJa.toLowerCase().includes(term))
      )
    }
    
    if (playerCount) {
      filtered = filtered.filter(game => 
        game.minPlayers <= playerCount && game.maxPlayers >= playerCount
      )
    }
    
    if (maxDuration) {
      filtered = filtered.filter(game => game.duration <= maxDuration)
    }
    
    if (complexity) {
      filtered = filtered.filter(game => game.complexity === complexity)
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(game => 
        game.categories?.includes(selectedCategory)
      )
    }
    
    if (onlyAvailable) {
      filtered = filtered.filter(game => game.available)
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b.timesPlayed - a.timesPlayed
        case 'rating':
          return (b.bggRating || 0) - (a.bggRating || 0)
        case 'name':
          return a.name.localeCompare(b.name)
        case 'duration':
          return a.duration - b.duration
        default:
          return 0
      }
    })
    
    setFilteredGames(filtered)
  }

  const decodeHtmlEntities = (text: string | null | undefined): string => {
    if (!text) return ''
    
    const textarea = document.createElement('textarea')
    textarea.innerHTML = text
    return textarea.value
      .replace(/&#10;/g, '\n')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
  }

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'easy': return 'bg-green-500'
      case 'medium': return 'bg-yellow-500'
      case 'hard': return 'bg-orange-500'
      case 'expert': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getComplexityLabel = (complexity: string, complexityJa?: string | null) => {
    if (language === 'ja' && complexityJa) return complexityJa
    return complexity.charAt(0).toUpperCase() + complexity.slice(1)
  }

  const startWizard = () => {
    setViewMode('wizard')
    setWizardStep(0)
    setWizardAnswers({})
  }

  const resetFilters = () => {
    setSearchTerm('')
    setPlayerCount(null)
    setMaxDuration(null)
    setComplexity(null)
    setSelectedCategory(null)
    setOnlyAvailable(true)
    setSortBy('popular')
  }

  const handleWizardAnswer = (key: string, value: any) => {
    setWizardAnswers({ ...wizardAnswers, [key]: value })
    if (wizardStep < wizardQuestions.length - 1) {
      setWizardStep(wizardStep + 1)
    } else {
      // Calculate recommendations
      calculateWizardRecommendations()
    }
  }

  const calculateWizardRecommendations = () => {
    let recommended = [...games]
    
    // Apply wizard filters based on answers
    if (wizardAnswers.players) {
      recommended = recommended.filter(g => 
        g.minPlayers <= wizardAnswers.players && g.maxPlayers >= wizardAnswers.players
      )
    }
    
    if (wizardAnswers.time) {
      const maxTime = wizardAnswers.time === 'quick' ? 30 : 
                      wizardAnswers.time === 'medium' ? 60 : 999
      recommended = recommended.filter(g => g.duration <= maxTime)
    }
    
    if (wizardAnswers.experience) {
      const complexityMap: Record<string, string[]> = {
        'new': ['easy'],
        'some': ['easy', 'medium'],
        'experienced': ['medium', 'hard'],
        'expert': ['hard', 'expert']
      }
      recommended = recommended.filter(g => 
        complexityMap[wizardAnswers.experience].includes(g.complexity)
      )
    }
    
    if (wizardAnswers.mood) {
      const categoryMap: Record<string, string[]> = {
        'competitive': ['Strategy', 'Card Game'],
        'cooperative': ['Cooperative'],
        'party': ['Party', 'Party Game'],
        'thinking': ['Strategy', 'Economic']
      }
      recommended = recommended.filter(g =>
        g.categories?.some(c => categoryMap[wizardAnswers.mood]?.includes(c))
      )
    }
    
    // Sort by rating and limit to top 6
    recommended.sort((a, b) => (b.bggRating || 0) - (a.bggRating || 0))
    setFilteredGames(recommended.slice(0, 6))
    setViewMode('browse')
  }

  const wizardQuestions = [
    {
      key: 'players',
      question: language === 'ja' ? '何人で遊びますか？' : 'How many players?',
      options: [
        { value: 1, label: language === 'ja' ? '1人' : 'Solo' },
        { value: 2, label: language === 'ja' ? '2人' : '2 Players' },
        { value: 3, label: language === 'ja' ? '3-4人' : '3-4 Players' },
        { value: 5, label: language === 'ja' ? '5人以上' : '5+ Players' }
      ]
    },
    {
      key: 'time',
      question: language === 'ja' ? 'どのくらい時間がありますか？' : 'How much time do you have?',
      options: [
        { value: 'quick', label: language === 'ja' ? '30分以内' : 'Quick (< 30 min)' },
        { value: 'medium', label: language === 'ja' ? '1時間くらい' : 'About an hour' },
        { value: 'long', label: language === 'ja' ? '時間はたっぷり' : 'Plenty of time' }
      ]
    },
    {
      key: 'experience',
      question: language === 'ja' ? 'ボードゲームの経験は？' : 'Board game experience?',
      options: [
        { value: 'new', label: language === 'ja' ? '初心者' : 'New to games' },
        { value: 'some', label: language === 'ja' ? '少し経験あり' : 'Some experience' },
        { value: 'experienced', label: language === 'ja' ? '経験豊富' : 'Experienced' },
        { value: 'expert', label: language === 'ja' ? 'エキスパート' : 'Expert' }
      ]
    },
    {
      key: 'mood',
      question: language === 'ja' ? '今日の気分は？' : "What's your mood?",
      options: [
        { value: 'competitive', label: language === 'ja' ? '競争したい' : 'Competitive' },
        { value: 'cooperative', label: language === 'ja' ? '協力したい' : 'Cooperative' },
        { value: 'party', label: language === 'ja' ? 'パーティー気分' : 'Party mood' },
        { value: 'thinking', label: language === 'ja' ? 'じっくり考えたい' : 'Strategic thinking' }
      ]
    }
  ]

  // Screensaver component
  if (isIdle) {
    return (
      <div 
        className="fixed inset-0 bg-gradient-to-br from-purple-900 via-purple-700 to-pink-700 flex items-center justify-center cursor-pointer"
        onClick={() => setIsIdle(false)}
      >
        <div className="text-center">
          <div className="animate-pulse">
            <h1 className="text-7xl font-bold text-white mb-2">
              Tap to Browse Games
            </h1>
            <h2 className="text-5xl font-bold text-white/90 mb-8">
              タップしてゲームを探す
            </h2>
          </div>
          
          <div className="space-y-2 animate-pulse" style={{ animationDelay: '0.5s' }}>
            <div className="text-3xl text-white/80 font-medium">
              {games.filter(g => g.available).length} Games Available
            </div>
            <div className="text-2xl text-white/70">
              {games.filter(g => g.available).length} ゲーム利用可能
            </div>
          </div>
          
          <div className="mt-12 animate-bounce">
            <svg className="w-16 h-16 mx-auto text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13l-3 3m0 0l-3-3m3 3V8m0 13a9 9 0 110-18 9 9 0 010 18z" />
            </svg>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white cursor-pointer">
            {language === 'ja' ? 'ゲームライブラリ' : 'Game Library'}
          </h1>
          
          <div className="flex gap-2">
            {/* Language Toggle */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'ja' : 'en')}
              className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition  cursor-pointer"
            >
              {language === 'en' ? '日本語' : 'English'}
            </button>
            
            {/* View Mode Buttons */}
            <button
              onClick={() => setViewMode('browse')}
              className={`px-4 py-2 rounded-lg transition cursor-pointer ${
                viewMode === 'browse' ? 'bg-white text-purple-900' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {language === 'ja' ? '閲覧' : 'Browse'}
            </button>
            <button
              onClick={startWizard}
              className={`px-4 py-2 rounded-lg transition cursor-pointer ${
                viewMode === 'wizard' ? 'bg-white text-purple-900' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {language === 'ja' ? 'おすすめ' : 'Recommend'}
            </button>
            <button
              onClick={() => setViewMode('playing')}
              className={`px-4 py-2 rounded-lg transition cursor-pointer ${
                viewMode === 'playing' ? 'bg-white text-purple-900' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {language === 'ja' ? 'プレイ中' : 'Now Playing'}
            </button>
          </div>
        </div>
      </div>

      {/* Wizard Mode */}
      {viewMode === 'wizard' && (
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 mb-4">
          <div className="max-w-2xl mx-auto">
            <div className="mb-4">
              <div className="flex justify-between text-sm text-white/60 mb-2">
                <span>{language === 'ja' ? 'ステップ' : 'Step'} {wizardStep + 1} / {wizardQuestions.length}</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-300"
                  style={{ width: `${((wizardStep + 1) / wizardQuestions.length) * 100}%` }}
                />
              </div>
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              {wizardQuestions[wizardStep].question}
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              {wizardQuestions[wizardStep].options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleWizardAnswer(wizardQuestions[wizardStep].key, option.value)}
                  className="p-6 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xl font-medium transition transform hover:scale-105"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Browse Mode Filters */}
      {viewMode === 'browse' && (
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {/* Search */}
            <div className="col-span-2">
              <input
                type="text"
                placeholder={language === 'ja' ? 'ゲームを検索...' : 'Search games...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-white/20 text-white placeholder-white/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
            
            {/* Player Count */}
            <select
              value={playerCount || ''}
              onChange={(e) => setPlayerCount(e.target.value ? parseInt(e.target.value) : null)}
              className="px-4 py-2 bg-white/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <option value="">{language === 'ja' ? '人数' : 'Players'}</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5+</option>
            </select>
            
            {/* Duration */}
            <select
              value={maxDuration || ''}
              onChange={(e) => setMaxDuration(e.target.value ? parseInt(e.target.value) : null)}
              className="px-4 py-2 bg-white/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <option value="">{language === 'ja' ? '時間' : 'Duration'}</option>
              <option value="30">{language === 'ja' ? '30分以内' : '< 30 min'}</option>
              <option value="60">{language === 'ja' ? '1時間以内' : '< 1 hour'}</option>
              <option value="90">{language === 'ja' ? '90分以内' : '< 90 min'}</option>
              <option value="999">{language === 'ja' ? '制限なし' : 'Any'}</option>
            </select>
            
            {/* Complexity */}
            <select
              value={complexity || ''}
              onChange={(e) => setComplexity(e.target.value || null)}
              className="px-4 py-2 bg-white/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <option value="">{language === 'ja' ? '難易度' : 'Complexity'}</option>
              <option value="easy">{language === 'ja' ? '簡単' : 'Easy'}</option>
              <option value="medium">{language === 'ja' ? '普通' : 'Medium'}</option>
              <option value="hard">{language === 'ja' ? '難しい' : 'Hard'}</option>
              <option value="expert">{language === 'ja' ? 'エキスパート' : 'Expert'}</option>
            </select>
            
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-4 py-2 bg-white/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <option value="popular">{language === 'ja' ? '人気順' : 'Popular'}</option>
              <option value="rating">{language === 'ja' ? '評価順' : 'Rating'}</option>
              <option value="name">{language === 'ja' ? '名前順' : 'Name'}</option>
              <option value="duration">{language === 'ja' ? '時間順' : 'Duration'}</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyAvailable}
                  onChange={(e) => setOnlyAvailable(e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <span>{language === 'ja' ? '利用可能なゲームのみ' : 'Available only'}</span>
              </label>
              
              <div className="text-white/60">
                {filteredGames.length} {language === 'ja' ? 'ゲーム' : 'games'}
              </div>
            </div>
            
            {/* Reset Filters Button */}
            <button
              onClick={resetFilters}
              className="px-4 py-2 cursor-pointer bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{language === 'ja' ? 'フィルターをリセット' : 'Reset Filters'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Currently Playing View */}
      {viewMode === 'playing' && (
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-4">
            {language === 'ja' ? '現在プレイ中のゲーム' : 'Currently Being Played'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.filter(g => !g.available).map((game) => (
              <div key={game.id} className="bg-white/10 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  {game.thumbnailUrl && (
                    <img 
                      src={game.thumbnailUrl} 
                      alt={game.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-white">
                      {language === 'ja' && game.nameJa ? game.nameJa : game.name}
                    </h3>
                    <p className="text-white/60 text-sm">
                      {language === 'ja' ? 'テーブルで遊ばれています' : 'Being played at a table'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Games Grid */}
      {viewMode === 'browse' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredGames.map((game) => (
            <div
              key={game.id}
              onClick={() => setSelectedGame(game)}
              className="bg-white/10 backdrop-blur-md rounded-xl overflow-hidden cursor-pointer transform transition hover:scale-105 hover:bg-white/20"
            >
              <div className="aspect-square relative">
                {game.imageUrl || game.thumbnailUrl ? (
                  <img
                    src={game.imageUrl || game.thumbnailUrl || ''}
                    alt={game.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                    <span className="text-white text-6xl">🎲</span>
                  </div>
                )}
                
                {/* Availability Badge */}
                <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
                  game.available ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                }`}>
                  {game.available ? (language === 'ja' ? '利用可能' : 'Available') : (language === 'ja' ? 'プレイ中' : 'In Use')}
                </div>
                
                {/* Rating Badge */}
                {game.bggRating && (
                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 rounded-full text-white text-xs font-medium flex items-center gap-1">
                    <span>⭐</span>
                    <span>{game.bggRating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              
              <div className="p-3">
                <h3 className="font-semibold text-white mb-1 line-clamp-2">
                  {language === 'ja' && game.nameJa ? game.nameJa : game.name}
                </h3>
                {language === 'ja' && game.nameJa && (
                  <p className="text-xs text-white/60 mb-2 line-clamp-1">{game.name}</p>
                )}
                
                <div className="flex items-center gap-2 text-xs text-white/80">
                  <span className="flex items-center gap-1">
                    <span>👥</span>
                    <span>{game.minPlayers === game.maxPlayers ? game.minPlayers : `${game.minPlayers}-${game.maxPlayers}`}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span>⏱</span>
                    <span>{game.duration}m</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-full ${getComplexityColor(game.complexity)} text-white`}>
                    {getComplexityLabel(game.complexity, game.complexityJa)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Game Detail Modal */}
      {selectedGame && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedGame(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              {selectedGame.imageUrl ? (
                <img
                  src={selectedGame.imageUrl}
                  alt={selectedGame.name}
                  className="w-full h-64 object-cover rounded-t-2xl"
                />
              ) : (
                <div className="w-full h-64 bg-gradient-to-br from-purple-600 to-pink-600 rounded-t-2xl flex items-center justify-center">
                  <span className="text-white text-8xl">🎲</span>
                </div>
              )}
              
              <button
                onClick={() => setSelectedGame(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    {language === 'ja' && selectedGame.nameJa ? selectedGame.nameJa : selectedGame.name}
                  </h2>
                  {language === 'ja' && selectedGame.nameJa && (
                    <p className="text-lg text-gray-600">{selectedGame.name}</p>
                  )}
                </div>
                
                <div className={`px-4 py-2 rounded-full text-lg font-medium ${
                  selectedGame.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {selectedGame.available ? (language === 'ja' ? '利用可能' : 'Available') : (language === 'ja' ? 'プレイ中' : 'In Use')}
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-100 rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">👥</div>
                  <div className="text-sm text-gray-600">{language === 'ja' ? 'プレイ人数' : 'Players'}</div>
                  <div className="font-semibold">
                    {selectedGame.minPlayers === selectedGame.maxPlayers 
                      ? selectedGame.minPlayers 
                      : `${selectedGame.minPlayers}-${selectedGame.maxPlayers}`}
                  </div>
                </div>
                
                <div className="bg-gray-100 rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">⏱</div>
                  <div className="text-sm text-gray-600">{language === 'ja' ? 'プレイ時間' : 'Play Time'}</div>
                  <div className="font-semibold">{selectedGame.duration} min</div>
                </div>
                
                <div className="bg-gray-100 rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">📊</div>
                  <div className="text-sm text-gray-600">{language === 'ja' ? '難易度' : 'Complexity'}</div>
                  <div className={`inline-block px-2 py-1 rounded-full text-sm font-medium text-white ${getComplexityColor(selectedGame.complexity)}`}>
                    {getComplexityLabel(selectedGame.complexity, selectedGame.complexityJa)}
                  </div>
                </div>
                
                {selectedGame.bggRating && (
                  <div className="bg-gray-100 rounded-lg p-3 text-center">
                    <div className="text-2xl mb-1">⭐</div>
                    <div className="text-sm text-gray-600">BGG {language === 'ja' ? '評価' : 'Rating'}</div>
                    <div className="font-semibold">{selectedGame.bggRating.toFixed(1)}/10</div>
                  </div>
                )}
              </div>
              
              {(selectedGame.description || selectedGame.descriptionJa) && (
                <div className="mb-6">
                  <h3 className="font-semibold text-lg mb-2">{language === 'ja' ? '説明' : 'Description'}</h3>
                  {language === 'ja' && selectedGame.descriptionJa ? (
                    <div>
                      <p className="text-gray-700 mb-2 whitespace-pre-line">{decodeHtmlEntities(selectedGame.descriptionJa)}</p>
                      {selectedGame.description && (
                        <p className="text-gray-600 text-sm whitespace-pre-line">{decodeHtmlEntities(selectedGame.description)}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-700 whitespace-pre-line">{decodeHtmlEntities(selectedGame.description || selectedGame.descriptionJa)}</p>
                  )}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                {selectedGame.yearPublished && (
                  <div>
                    <span className="text-gray-600">{language === 'ja' ? '発売年:' : 'Published:'}</span>
                    <span className="ml-2 font-medium">{selectedGame.yearPublished}</span>
                  </div>
                )}
                {selectedGame.designer && (
                  <div>
                    <span className="text-gray-600">{language === 'ja' ? 'デザイナー:' : 'Designer:'}</span>
                    <span className="ml-2 font-medium">{decodeHtmlEntities(selectedGame.designer)}</span>
                  </div>
                )}
                {selectedGame.publisher && (
                  <div>
                    <span className="text-gray-600">{language === 'ja' ? '出版社:' : 'Publisher:'}</span>
                    <span className="ml-2 font-medium">{decodeHtmlEntities(selectedGame.publisher)}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">{language === 'ja' ? '場所:' : 'Location:'}</span>
                  <span className="ml-2 font-medium">{selectedGame.location}</span>
                </div>
              </div>
              
              {selectedGame.categories && selectedGame.categories.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-lg mb-2">{language === 'ja' ? 'カテゴリー' : 'Categories'}</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedGame.categories.map((cat, idx) => (
                      <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* {selectedGame.available && (
                <button className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition">
                  {language === 'ja' ? 'このゲームをリクエスト' : 'Request This Game'}
                </button>
              )} */}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
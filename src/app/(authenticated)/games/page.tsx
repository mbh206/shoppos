'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
  createdAt: string
  updatedAt: string
}

type SortField = 'name' | 'location' | 'available' | 'type' | 'players' | 'duration' | 'complexity' | 'setupTime'
type SortOrder = 'asc' | 'desc'

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [complexityFilter, setComplexityFilter] = useState<string>('all')
  const [availableFilter, setAvailableFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingGame, setEditingGame] = useState<Game | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchGames()
  }, [])

  const fetchGames = async () => {
    try {
      const response = await fetch('/api/games')
      if (!response.ok) {
        console.error('Failed to fetch games:', response.status)
        setGames([])
        setLoading(false)
        return
      }
      const data = await response.json()
      setGames(Array.isArray(data) ? data : [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching games:', error)
      setGames([])
      setLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const filteredGames = games
    .filter(game => {
      const matchesSearch = filter === '' || 
        game.name.toLowerCase().includes(filter.toLowerCase()) ||
        (game.nameJa && game.nameJa.toLowerCase().includes(filter.toLowerCase())) ||
        game.location.toLowerCase().includes(filter.toLowerCase())
      
      const matchesType = typeFilter === 'all' || game.type === typeFilter
      const matchesComplexity = complexityFilter === 'all' || game.complexity === complexityFilter
      const matchesAvailable = availableFilter === 'all' || 
        (availableFilter === 'available' && game.available) ||
        (availableFilter === 'checked_out' && !game.available)
      
      return matchesSearch && matchesType && matchesComplexity && matchesAvailable
    })
    .sort((a, b) => {
      let aVal: any, bVal: any
      
      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase()
          bVal = b.name.toLowerCase()
          break
        case 'location':
          aVal = a.location.toLowerCase()
          bVal = b.location.toLowerCase()
          break
        case 'available':
          aVal = a.available ? 0 : 1
          bVal = b.available ? 0 : 1
          break
        case 'type':
          aVal = a.type
          bVal = b.type
          break
        case 'players':
          aVal = a.minPlayers
          bVal = b.minPlayers
          break
        case 'duration':
          aVal = a.duration
          bVal = b.duration
          break
        case 'complexity':
          aVal = a.complexity
          bVal = b.complexity
          break
        case 'setupTime':
          aVal = a.setupTime
          bVal = b.setupTime
          break
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

  const handleToggleAvailable = async (game: Game) => {
    try {
      const response = await fetch(`/api/games/${game.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: !game.available }),
      })
      
      if (response.ok) {
        fetchGames()
      }
    } catch (error) {
      console.error('Error updating game availability:', error)
    }
  }

  const handleDelete = async (gameId: string) => {
    if (!confirm('Are you sure you want to delete this game?')) return
    
    try {
      const response = await fetch(`/api/games/${gameId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        fetchGames()
      }
    } catch (error) {
      console.error('Error deleting game:', error)
    }
  }

  const formatType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const formatComplexity = (complexity: string) => {
    return complexity.charAt(0).toUpperCase() + complexity.slice(1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading games...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Game Library</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            + Add New Game
          </button>
        </div>

        {/* Filters */}
        <div className="mb-4 bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <input
              type="text"
              placeholder="Search games..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border rounded"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border rounded"
            >
              <option value="all">All Types</option>
              <option value="board_game">Board Game</option>
              <option value="card_game">Card Game</option>
              <option value="party_game">Party Game</option>
              <option value="strategy_game">Strategy Game</option>
              <option value="cooperative_game">Cooperative</option>
              <option value="dice_game">Dice Game</option>
              <option value="rpg">RPG</option>
              <option value="miniatures">Miniatures</option>
              <option value="other">Other</option>
            </select>
            <select
              value={complexityFilter}
              onChange={(e) => setComplexityFilter(e.target.value)}
              className="px-3 py-2 border rounded"
            >
              <option value="all">All Complexity</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="expert">Expert</option>
            </select>
            <select
              value={availableFilter}
              onChange={(e) => setAvailableFilter(e.target.value)}
              className="px-3 py-2 border rounded"
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="checked_out">Checked Out</option>
            </select>
            <div className="text-sm text-gray-600 flex items-center">
              {filteredGames.length} of {games.length} games
            </div>
          </div>
        </div>

        {/* Games Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                  >
                    Name {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('location')}
                  >
                    Location {sortField === 'location' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('available')}
                  >
                    Available {sortField === 'available' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('type')}
                  >
                    Type {sortField === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('players')}
                  >
                    Players {sortField === 'players' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('duration')}
                  >
                    Duration {sortField === 'duration' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('complexity')}
                  >
                    Complexity {sortField === 'complexity' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('setupTime')}
                  >
                    Setup {sortField === 'setupTime' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredGames.map((game) => (
                  <tr 
                    key={game.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setEditingGame(game)}
                  >
                    <td className="px-4 py-4 whitespace-wrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {game.name}
                        </div>
                        {game.nameJa && (
                          <div className="text-xs text-gray-500">
                            {game.nameJa}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {game.location}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleAvailable(game)
                        }}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          game.available 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {game.available ? 'Available' : 'Checked Out'}
                      </button>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatType(game.type)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {game.minPlayers === game.maxPlayers 
                        ? game.minPlayers 
                        : `${game.minPlayers}-${game.maxPlayers}`}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {game.duration} min
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        game.complexity === 'easy' ? 'bg-green-100 text-green-800' :
                        game.complexity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        game.complexity === 'hard' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        <div>{formatComplexity(game.complexity)}</div>
                        {game.complexityJa && (
                          <div className="text-xs">{game.complexityJa}</div>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {game.setupTime} min
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(game.id)
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredGames.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No games found</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingGame) && (
        <GameModal
          game={editingGame}
          onClose={() => {
            setShowAddModal(false)
            setEditingGame(null)
          }}
          onSave={() => {
            fetchGames()
            setShowAddModal(false)
            setEditingGame(null)
          }}
        />
      )}
    </div>
  )
}

function GameModal({ 
  game, 
  onClose, 
  onSave 
}: { 
  game: Game | null
  onClose: () => void
  onSave: () => void 
}) {
  const [formData, setFormData] = useState({
    name: game?.name || '',
    nameJa: game?.nameJa || '',
    location: game?.location || '',
    type: game?.type || 'board_game',
    minPlayers: game?.minPlayers || 1,
    maxPlayers: game?.maxPlayers || 4,
    duration: game?.duration || 60,
    complexity: game?.complexity || 'medium',
    setupTime: game?.setupTime || 10,
    description: game?.description || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch(
        game ? `/api/games/${game.id}` : '/api/games',
        {
          method: game ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        }
      )
      
      if (response.ok) {
        onSave()
      }
    } catch (error) {
      console.error('Error saving game:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {game ? 'Edit Game' : 'Add New Game'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Japanese Name
              </label>
              <input
                type="text"
                value={formData.nameJa}
                onChange={(e) => setFormData({ ...formData, nameJa: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Shelf A-1"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="board_game">Board Game</option>
                <option value="card_game">Card Game</option>
                <option value="party_game">Party Game</option>
                <option value="strategy_game">Strategy Game</option>
                <option value="cooperative_game">Cooperative</option>
                <option value="dice_game">Dice Game</option>
                <option value="rpg">RPG</option>
                <option value="miniatures">Miniatures</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Players
              </label>
              <input
                type="number"
                min="1"
                value={formData.minPlayers}
                onChange={(e) => setFormData({ ...formData, minPlayers: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Players
              </label>
              <input
                type="number"
                min="1"
                value={formData.maxPlayers}
                onChange={(e) => setFormData({ ...formData, maxPlayers: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (min)
              </label>
              <input
                type="number"
                min="1"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Setup (min)
              </label>
              <input
                type="number"
                min="0"
                value={formData.setupTime}
                onChange={(e) => setFormData({ ...formData, setupTime: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Complexity
            </label>
            <select
              value={formData.complexity}
              onChange={(e) => setFormData({ ...formData, complexity: e.target.value })}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="expert">Expert</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {game ? 'Save Changes' : 'Add Game'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
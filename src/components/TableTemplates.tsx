'use client'

type TableTemplate = {
  type: string
  seats: number
  shape: 'rectangle' | 'circle' | 'bar'
  width: number
  height: number
  zone?: string
}

type TableTemplatesProps = {
  onAddTable: (template: TableTemplate) => void
}

export default function TableTemplates({ onAddTable }: TableTemplatesProps) {
  const templates: TableTemplate[] = [
    // Counter/Bar seats
    { type: 'Counter-1', seats: 1, shape: 'bar', width: 50, height: 50, zone: 'bar' },
    { type: 'Counter-4', seats: 4, shape: 'bar', width: 200, height: 60, zone: 'bar' },
    { type: 'Counter-6', seats: 6, shape: 'bar', width: 300, height: 60, zone: 'bar' },
    
    // Small tables
    { type: 'Table-2', seats: 2, shape: 'rectangle', width: 80, height: 80, zone: 'main' },
    { type: 'Table-4', seats: 4, shape: 'rectangle', width: 100, height: 100, zone: 'main' },
    
    // Large tables
    { type: 'Table-6', seats: 6, shape: 'rectangle', width: 120, height: 160, zone: 'main' },
    { type: 'Table-8', seats: 8, shape: 'rectangle', width: 140, height: 180, zone: 'main' },
    { type: 'Table-10', seats: 10, shape: 'rectangle', width: 160, height: 200, zone: 'main' },
    
    // Round tables
    { type: 'Round-2', seats: 2, shape: 'circle', width: 80, height: 80, zone: 'main' },
    { type: 'Round-4', seats: 4, shape: 'circle', width: 100, height: 100, zone: 'main' },
    { type: 'Round-6', seats: 6, shape: 'circle', width: 120, height: 120, zone: 'main' },
    { type: 'Round-8', seats: 8, shape: 'circle', width: 140, height: 140, zone: 'main' },
  ]

  const groupedTemplates = templates.reduce((acc, template) => {
    const key = template.shape
    if (!acc[key]) acc[key] = []
    acc[key].push(template)
    return acc
  }, {} as Record<string, TableTemplate[]>)

  const shapeLabels = {
    bar: 'Counter Seating',
    rectangle: 'Regular Tables',
    circle: 'Round Tables',
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold mb-3">Table Templates</h3>
      <div className="space-y-4">
        {Object.entries(groupedTemplates).map(([shape, templates]) => (
          <div key={shape}>
            <h4 className="text-sm font-medium text-gray-600 mb-2">
              {shapeLabels[shape as keyof typeof shapeLabels]}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {templates.map((template) => (
                <button
                  key={`${template.type}-${template.seats}`}
                  onClick={() => onAddTable(template)}
                  className="p-2 bg-gray-100 rounded hover:bg-gray-200 text-xs transition-colors"
                >
                  <div className="flex flex-col items-center">
                    <div className={`mb-1 ${
                      template.shape === 'circle' ? 'rounded-full' :
                      'rounded'
                    } ${
                      template.zone === 'bar' ? 'bg-purple-300' :
                      'bg-gray-300'
                    }`} style={{
                      width: `${Math.min(40, template.width / 3)}px`,
                      height: `${Math.min(40, template.height / 3)}px`,
                    }} />
                    <span className="font-medium">{template.type}</span>
                    <span className="text-gray-500">{template.seats} seats</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 p-3 bg-blue-50 rounded">
        <p className="text-xs text-blue-800">
          Click a template to add it to the floor. Then drag to position and resize as needed.
        </p>
      </div>
    </div>
  )
}
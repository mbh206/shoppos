export default function KioskLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-main via-brand-accent-2 to-brand-secondary-2">
      {children}
    </div>
  )
}
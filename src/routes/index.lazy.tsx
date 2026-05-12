import { Link, createLazyFileRoute } from '@tanstack/react-router'
import { aboutLinkOptions } from './-navigation'

export const Route = createLazyFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <main className="page">
      <h1>Ephemora</h1>
      <p>Say it today. Let it fade tomorrow.</p>
      <p className="page-note">Phase 1 will add Mantine + app shell.</p>
      <p>
        <Link {...aboutLinkOptions}>Read project status</Link>
      </p>
    </main>
  )
}

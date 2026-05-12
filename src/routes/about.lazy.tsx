import { Link, createLazyFileRoute } from '@tanstack/react-router'
import { homeLinkOptions } from './-navigation'

export const Route = createLazyFileRoute('/about')({
  component: AboutPage,
})

function AboutPage() {
  return (
    <main className="page">
      <h1>About Ephemora</h1>
      <p>Phase 0 restores the project and establishes TanStack Router foundations.</p>
      <p className="page-note">
        Phase 1 implementation is intentionally untouched while you improve the plan.
      </p>
      <p>
        <Link {...homeLinkOptions}>Back to home</Link>
      </p>
    </main>
  )
}

import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { Suspense, lazy } from 'react'
import { homeLinkOptions } from './-navigation'

const TanStackRouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-router-devtools').then((module) => ({
        default: module.TanStackRouterDevtools,
      })),
    )
  : null

function RootLayout() {
  return (
    <>
      <HeadContent />
      <Outlet />
      <Scripts />
      {TanStackRouterDevtools ? (
        <Suspense fallback={null}>
          <TanStackRouterDevtools />
        </Suspense>
      ) : null}
    </>
  )
}

function RootNotFound() {
  return (
    <main className="page">
      <h1>Page not found</h1>
      <p>The page you requested does not exist.</p>
      <p>
        <Link {...homeLinkOptions}>Return to home</Link>
      </p>
    </main>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: RootNotFound,
})

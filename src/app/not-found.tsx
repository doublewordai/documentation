import Link from 'next/link'
import Image from 'next/image'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Image
            src="/logo-icon-black.png"
            alt="Doubleword"
            width={64}
            height={64}
            className="dark:hidden"
          />
          <Image
            src="/logo-icon-white.png"
            alt="Doubleword"
            width={64}
            height={64}
            className="hidden dark:block"
          />
        </div>

        <h1
          className="text-7xl font-bold mb-2"
          style={{color: 'var(--foreground)'}}
        >
          404
        </h1>
        <h2
          className="text-xl font-medium mb-4"
          style={{color: 'var(--text-muted)'}}
        >
          Page not found
        </h2>
        <p
          className="mb-8 text-sm"
          style={{color: 'var(--text-muted)'}}
        >
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-colors"
          style={{
            backgroundColor: 'var(--accent)',
            color: 'white',
          }}
        >
          Go to Documentation
        </Link>

        {/* Quick Links */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <Link
            href="/batches/getting-started-with-batched-api"
            className="group p-4 rounded-lg border transition-colors hover:border-[var(--accent)]"
            style={{borderColor: 'var(--sidebar-border)'}}
          >
            <p
              className="font-semibold mb-1 group-hover:text-[var(--accent)] transition-colors"
              style={{color: 'var(--foreground)'}}
            >
              Batched API
            </p>
            <p className="text-sm" style={{color: 'var(--text-muted)'}}>
              Low-cost, high-throughput LLM inference
            </p>
          </Link>

          <Link
            href="/control-layer/getting-started"
            className="group p-4 rounded-lg border transition-colors hover:border-[var(--accent)]"
            style={{borderColor: 'var(--sidebar-border)'}}
          >
            <p
              className="font-semibold mb-1 group-hover:text-[var(--accent)] transition-colors"
              style={{color: 'var(--foreground)'}}
            >
              Control Layer
            </p>
            <p className="text-sm" style={{color: 'var(--text-muted)'}}>
              Secure access control for AI models
            </p>
          </Link>

          <Link
            href="/inference-stack/deployment/first-deployment"
            className="group p-4 rounded-lg border transition-colors hover:border-[var(--accent)]"
            style={{borderColor: 'var(--sidebar-border)'}}
          >
            <p
              className="font-semibold mb-1 group-hover:text-[var(--accent)] transition-colors"
              style={{color: 'var(--foreground)'}}
            >
              Inference Stack
            </p>
            <p className="text-sm" style={{color: 'var(--text-muted)'}}>
              Run genAI in your private environment
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}

import type {NextConfig} from 'next'

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Enable detailed logging for cache debugging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // PostHog reverse proxy configuration
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ];
  },
  // Required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,

  // Allow images from Sanity CDN
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
    ],
  },

  // Redirects for URL migration from old Docusaurus site
  async redirects() {
    return [
      // =====================================================
      // BLOG POSTS: /conceptual/* → blog.doubleword.ai/*
      // Old Docusaurus used filename as slug (e.g., /conceptual/15-07-2025-bts-8)
      // =====================================================

      // Behind the Stack episodes
      {
        source: '/conceptual/28-05-2025-bts-1',
        destination: 'https://blog.doubleword.ai/behind-the-stack-ep-1-what-should-i-be-observing-in-my-llm-stack',
        permanent: true,
      },
      {
        source: '/conceptual/10-06-2025-bts-2',
        destination: 'https://blog.doubleword.ai/behind-the-stack-ep-2-how-many-users-can-my-gpu-serve',
        permanent: true,
      },
      {
        source: '/conceptual/04-06-2025-bts-3',
        destination: 'https://blog.doubleword.ai/behind-the-stack-ep-3-how-to-serve-100-models-on-a-single-gpu-with-no-cold-starts',
        permanent: true,
      },
      {
        source: '/conceptual/18-06-2025-bts-4',
        destination: 'https://blog.doubleword.ai/behind-the-stack-ep-4-making-your-load-balancer-llm-aware',
        permanent: true,
      },
      {
        source: '/conceptual/24-06-2025-bts-5',
        destination: 'https://blog.doubleword.ai/behind-the-stack-ep-5-making-rag-work-for-multimodal-documents',
        permanent: true,
      },
      {
        source: '/conceptual/01-07-2025-bts-6',
        destination: 'https://blog.doubleword.ai/behind-the-stack-ep-6-how-to-speed-up-the-inference-of-ai-agents',
        permanent: true,
      },
      {
        source: '/conceptual/09-07-2025-bts-7',
        destination: 'https://blog.doubleword.ai/behind-the-stack-ep-7-choosing-the-right-quantization-for-self-hosted-llms',
        permanent: true,
      },
      {
        source: '/conceptual/15-07-2025-bts-8',
        destination: 'https://blog.doubleword.ai/behind-the-stack-ep-8-choosing-the-right-inference-engine-for-your-llm-deployment',
        permanent: true,
      },
      {
        source: '/conceptual/03-09-2025-bts-9',
        destination: 'https://blog.doubleword.ai/behind-the-stack-ep-9-how-to-evaluate-open-source-llms',
        permanent: true,
      },
      {
        source: '/conceptual/03-09-2025-bts-10',
        destination: 'https://blog.doubleword.ai/behind-the-stack-ep-10-batched-endpoints',
        permanent: true,
      },

      // Other blog posts
      {
        source: '/conceptual/06-10-2025-chargeback',
        destination: 'https://blog.doubleword.ai/understanding-chargeback-in-the-context-of-self-hosted-systems',
        permanent: true,
      },
      {
        source: '/conceptual/06-10-2025-picking-a-model',
        destination: 'https://blog.doubleword.ai/choosing-the-right-model-for-the-use-case',
        permanent: true,
      },
      {
        source: '/conceptual/08-12-2025-batch-usecase',
        destination: 'https://blog.doubleword.ai/1-for-a-year-of-research-digests',
        permanent: true,
      },
      {
        source: '/conceptual/08-12-2025-batch',
        destination: 'https://blog.doubleword.ai/why-batch-inference-matters',
        permanent: true,
      },
      {
        source: '/conceptual/21-19-2025-dwctl-benchmark',
        destination: 'https://blog.doubleword.ai/benchmarking-doubleword-control-layer',
        permanent: true,
      },

      // Catch-all for /conceptual index
      {
        source: '/conceptual',
        destination: 'https://blog.doubleword.ai',
        permanent: true,
      },

      // =====================================================
      // CHANGED DOC SLUGS
      // =====================================================
      {
        source: '/inference-stack/deployment/first',
        destination: '/inference-stack/deployment/first-deployment',
        permanent: true,
      },
      {
        source: '/inference-stack/deployment/loading',
        destination: '/inference-stack/deployment/faster-model-loading',
        permanent: true,
      },
      {
        source: '/inference-stack/usage/active',
        destination: '/inference-stack/usage/active-monitoring',
        permanent: true,
      },

      // =====================================================
      // MISSING INDEX PAGES → redirect to first doc in section
      // =====================================================
      {
        source: '/control-layer/usage',
        destination: '/control-layer/usage/models-and-access',
        permanent: true,
      },
      {
        source: '/control-layer/reference',
        destination: '/control-layer/reference/configuration',
        permanent: true,
      },
      {
        source: '/control-layer/usage/admin',
        destination: '/control-layer/admin/model-sources',
        permanent: true,
      },
      {
        source: '/inference-stack/deployment',
        destination: '/inference-stack/deployment/first-deployment',
        permanent: true,
      },
      {
        source: '/inference-stack/usage',
        destination: '/inference-stack/usage/metrics',
        permanent: true,
      },

      // Old nested admin paths → new flat admin paths
      {
        source: '/control-layer/usage/admin/model-sources',
        destination: '/control-layer/admin/model-sources',
        permanent: true,
      },
      {
        source: '/control-layer/usage/admin/model-monitoring',
        destination: '/control-layer/admin/model-monitoring',
        permanent: true,
      },
      {
        source: '/control-layer/usage/admin/users-and-groups',
        destination: '/control-layer/admin/users-and-groups',
        permanent: true,
      },
    ]
  },
}

export default nextConfig

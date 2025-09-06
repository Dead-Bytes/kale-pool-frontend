# KALE Pool Frontend Deployment Guide

## Environment Configuration

This application uses environment variables to configure backend API endpoints for different environments.

### Environment Files

- `.env` - Development configuration (local development)
- `.env.production` - Production configuration template
- `.env.example` - Template for all environments

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_BACKEND_API_BASE_URL` | Main backend API endpoint | `https://api.kale-pool.com` |
| `VITE_POOLER_API_BASE_URL` | Pooler service API endpoint | `https://pooler.kale-pool.com` |
| `NODE_ENV` | Environment mode | `production` or `development` |
| `VITE_PUBLIC_BUILDER_KEY` | Builder.io public key (optional) | `your-builder-key` |

### Deployment Environments

#### Development
```bash
# Start development server
npm run dev
```
Uses `.env` file with localhost URLs by default.

#### Production Build
```bash
# Build for production
npm run build:production
```
Uses `.env.production` file or environment-specific variables.

### Platform-Specific Configuration

#### Netlify
1. Set environment variables in Netlify dashboard:
   - `VITE_BACKEND_API_BASE_URL`: Your production backend URL
   - `VITE_POOLER_API_BASE_URL`: Your production pooler URL
   - `NODE_ENV`: `production`

2. Deploy using the existing `netlify.toml` configuration

#### Vercel
1. Set environment variables in Vercel dashboard:
   - `VITE_BACKEND_API_BASE_URL`
   - `VITE_POOLER_API_BASE_URL`
   - `NODE_ENV`

#### Docker
```dockerfile
# Example Dockerfile environment setup
ENV VITE_BACKEND_API_BASE_URL=https://your-backend.com
ENV VITE_POOLER_API_BASE_URL=https://your-pooler.com
ENV NODE_ENV=production
```

### API Endpoint Fallback Logic

The application uses the following fallback order for API endpoints:

1. `VITE_BACKEND_API_BASE_URL` (preferred)
2. `VITE_API_BASE_URL` (legacy compatibility)
3. Development fallback: `http://localhost:3000`
4. Production fallback: Empty string (relative URLs)

### Security Considerations

- Never commit sensitive environment variables to version control
- Use `.env.example` as a template for new environments
- Ensure production URLs use HTTPS
- Validate environment variables in your CI/CD pipeline

### Troubleshooting

#### Common Issues

1. **API calls failing in production**
   - Check that environment variables are set correctly
   - Verify backend URLs are accessible
   - Check CORS configuration on backend

2. **Build failing**
   - Ensure all required environment variables are available during build
   - Check TypeScript compilation with `npm run typecheck`

3. **Environment variables not loading**
   - Verify variable names start with `VITE_` for client-side access
   - Check file naming (`.env`, `.env.production`, etc.)
   - Ensure variables are set in deployment platform

### Quick Setup

1. Copy `.env.example` to `.env`
2. Update URLs to match your backend services
3. For production, create `.env.production` or set variables in deployment platform
4. Run `npm run build:production` to build for production

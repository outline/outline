# GitHub Actions Caching Strategy

This document outlines the optimized caching strategy implemented for Outline's GitHub Actions workflows to significantly speed up `yarn install` operations.

## Overview

The optimization focuses on maximizing cache reuse across jobs and reducing redundant dependency installations. Key improvements include:

- **Enhanced cache keys** with fallback strategies
- **Shared cache** across dependent jobs
- **Conditional installations** based on cache hits
- **Performance monitoring** with timing and status reporting

## Key Optimizations

### 1. Multi-Level Cache Strategy

```yaml
- name: Cache yarn dependencies
  uses: actions/cache@v4
  with:
    path: |
      ~/.yarn/cache
      node_modules
      */*/node_modules
    key: ${{ runner.os }}-yarn-${{ matrix.node-version }}-${{ hashFiles('**/yarn.lock') }}
    restore-keys: |
      ${{ runner.os }}-yarn-${{ matrix.node-version }}-
      ${{ runner.os }}-yarn-
```

**Benefits:**
- Primary key ensures exact match for lockfile + Node version
- Fallback keys allow partial cache reuse when dependencies change
- Multiple cache paths cover all dependency locations

### 2. Conditional Installation Logic

```yaml
- name: Install dependencies
  if: steps.yarn-cache.outputs.cache-hit != 'true'
  run: yarn install --frozen-lockfile --prefer-offline --network-timeout 300000
  
- name: Verify installation (cache hit)
  if: steps.yarn-cache.outputs.cache-hit == 'true'
  run: yarn install --frozen-lockfile --prefer-offline --check-files
```

**Benefits:**
- Full install only when cache misses
- Quick verification when cache hits
- Prevents unnecessary network requests

### 3. Cross-Job Cache Sharing

All dependent jobs (lint, types, test, etc.) reuse the cache created by the build job:

```yaml
- name: Restore yarn dependencies
  uses: actions/cache@v4
  with:
    path: |
      ~/.yarn/cache
      node_modules
      */*/node_modules
    key: ${{ runner.os }}-yarn-22.x-${{ hashFiles('**/yarn.lock') }}
```

**Benefits:**
- Eliminates redundant installations across jobs
- Faster job startup times
- Reduced CI resource usage

## Performance Monitoring

The workflow includes built-in performance monitoring:

- **Cache status notifications** show hit/miss rates
- **Timing measurements** track installation duration
- **Visual indicators** (✅/🔄) for quick status identification

## Expected Performance Improvements

### Before Optimization
- Each job runs full `yarn install` (~2-3 minutes)
- 6+ jobs × 3 minutes = ~18 minutes of install time
- No cache sharing between jobs

### After Optimization
- Build job: Full install on cache miss (~2-3 minutes)
- Dependent jobs: Cache verification (~10-30 seconds)
- Total install time: ~3-5 minutes (60-70% reduction)

## Cache Key Strategy

### Primary Cache Key
`${{ runner.os }}-yarn-${{ matrix.node-version }}-${{ hashFiles('**/yarn.lock') }}`

- **OS**: Ensures platform-specific caches
- **Node version**: Separates caches for different Node versions
- **Lockfile hash**: Invalidates cache when dependencies change

### Fallback Keys
1. `${{ runner.os }}-yarn-${{ matrix.node-version }}-`
2. `${{ runner.os }}-yarn-`

Allows partial cache reuse when:
- Dependencies change but Node version stays same
- Both dependencies and Node version change

## Maintenance Guidelines

### Adding New Jobs
When adding new jobs that require dependencies:

1. Copy the cache restoration block from existing jobs
2. Use appropriate Node version in cache key
3. Add conditional installation logic
4. Include performance monitoring

### Troubleshooting Cache Issues

#### Cache Miss Troubleshooting
- Check if `yarn.lock` was modified
- Verify Node version matches cache key
- Look for changes in `package.json`

#### Cache Corruption
If cache appears corrupted:
1. Update cache key (add version suffix)
2. Let new cache populate
3. Remove old cache key after verification

#### Performance Regression
Monitor workflow run times and cache hit rates:
- Check GitHub Actions insights
- Look for cache status notifications
- Compare before/after timing measurements

## Best Practices

### Do's
- ✅ Always use fallback cache keys
- ✅ Include timing measurements for new jobs
- ✅ Use `--check-files` for cache hit verification
- ✅ Monitor cache hit rates regularly

### Don'ts
- ❌ Don't skip cache restoration in dependent jobs
- ❌ Don't use overly specific cache keys without fallbacks
- ❌ Don't ignore cache status notifications
- ❌ Don't modify cache paths without updating all jobs

## Monitoring and Metrics

### Key Metrics to Track
1. **Cache Hit Rate**: Percentage of jobs using cached dependencies
2. **Install Duration**: Time spent on yarn install operations
3. **Total CI Time**: Overall workflow execution time
4. **Resource Usage**: GitHub Actions minutes consumed

### Expected Baselines
- Cache hit rate: >80% for typical development workflows
- Install duration: <30 seconds for cache hits
- Total CI time reduction: 60-70% for dependency installation

## Future Improvements

### Potential Enhancements
1. **Artifact-based sharing**: Use GitHub Actions artifacts for large dependency sets
2. **Selective job execution**: Skip jobs when no relevant files changed
3. **Docker layer caching**: Optimize container builds with dependency caching
4. **Custom cache warming**: Pre-populate caches for common dependency patterns

### Monitoring Integration
Consider integrating with external monitoring tools to track:
- Long-term cache performance trends
- Cost savings from reduced CI minutes
- Developer productivity improvements

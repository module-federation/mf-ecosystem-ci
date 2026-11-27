import { RetryPlugin } from '@module-federation/retry-plugin';

const log = (window.__RETRY_LOG__ = []);
const domains = ['http://127.0.0.1:4212', 'http://127.0.0.1:4211'];

export default function retryRuntimePlugin() {
  return RetryPlugin({
    retryTimes: 3,
    retryDelay: 50,
    domains,
    manifestDomains: domains,
    addQuery: true,
    onRetry: ({ times, url, tagName }) => log.push({ event: 'retry', times, url, tagName }),
    onSuccess: ({ url, tagName }) => log.push({ event: 'success', url, tagName }),
    onError: ({ url, tagName }) => log.push({ event: 'error', url, tagName }),
  });
}

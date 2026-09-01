import { useCallback, useEffect, useState } from 'react';

export type LiveNews = {
  kind: 'news';
  title: string;
  source: string;
  tag: string;
  time: string;
  url?: string;
  author?: string;
  description: string;
  publishedAt?: string;
};

export type LiveCve = {
  kind: 'cve';
  id: string;
  score: number;
  product: string;
  status: string;
  description: string;
  publishedAt?: string;
  modifiedAt?: string;
  references: string[];
  kev?: {
    vendorProject?: string;
    vulnerabilityName?: string;
    requiredAction?: string;
    dueDate?: string;
    notes?: string;
  };
};

export type LiveJob = {
  kind: 'job';
  role: string;
  company: string;
  location: string;
  match: number;
  url?: string;
  description: string;
  tags: string[];
  salary?: string;
  date?: string;
};

export type LiveProject = {
  kind: 'project';
  title: string;
  domain: string;
  difficulty: string;
  description: string;
};

export type DetailItem = LiveNews | LiveCve | LiveJob | LiveProject;

const fallbackNews: LiveNews[] = [
  {
    kind: 'news',
    title: 'Live news source unavailable',
    source: 'Fallback',
    tag: 'Status',
    time: 'now',
    description: 'CyberPulse could not reach the live news API from this browser session. Check the dev server proxy or network access.',
  },
];

const fallbackCves: LiveCve[] = [
  {
    kind: 'cve',
    id: 'LIVE-CVE-FEED-OFFLINE',
    score: 0,
    product: 'NVD',
    status: 'Source unavailable',
    description: 'CyberPulse could not reach the NVD API. When the connection works, recent CVEs and full NVD descriptions appear here.',
    references: ['https://nvd.nist.gov/vuln'],
  },
];

const fallbackJobs: LiveJob[] = [
  {
    kind: 'job',
    role: 'Live job feed unavailable',
    company: 'RemoteOK',
    location: 'Remote',
    match: 0,
    description: 'CyberPulse could not reach the RemoteOK API. When the connection works, live security job posts and descriptions appear here.',
    tags: ['security'],
    url: 'https://remoteok.com/remote-security-jobs',
  },
];

const projects: LiveProject[] = [
  {
    kind: 'project',
    title: 'Build a KEV-aware CVE triage bot',
    domain: 'Blue Team',
    difficulty: 'Intermediate',
    description: 'Create a small service that merges NVD CVEs with CISA KEV and ranks items by exploited status, severity, and your vendor watchlist.',
  },
  {
    kind: 'project',
    title: 'Write Sigma rules for cloud token abuse',
    domain: 'Detection',
    difficulty: 'Advanced',
    description: 'Use recent identity and cloud intrusion stories as seed material, then build detections for suspicious token use and impossible travel.',
  },
  {
    kind: 'project',
    title: 'Create a tiny vulnerable API lab',
    domain: 'AppSec',
    difficulty: 'Beginner',
    description: 'Build an intentionally vulnerable API with auth, object access, and rate-limit flaws, then document exploitation and fixes.',
  },
];

function stripHtml(value = '') {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function relativeTime(dateString?: string) {
  if (!dateString) return 'recent';
  const delta = Date.now() - new Date(dateString).getTime();
  if (!Number.isFinite(delta)) return 'recent';
  const minutes = Math.max(1, Math.round(delta / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function scoreFromMetrics(metrics: any) {
  const metric = metrics?.cvssMetricV31?.[0] ?? metrics?.cvssMetricV30?.[0] ?? metrics?.cvssMetricV2?.[0];
  return Number(metric?.cvssData?.baseScore ?? 0);
}

function productFromCve(vulnerability: any) {
  const nodes = vulnerability?.cve?.configurations?.flatMap((config: any) => config.nodes ?? []) ?? [];
  const match = nodes.flatMap((node: any) => node.cpeMatch ?? [])[0]?.criteria as string | undefined;
  if (!match) return 'Unknown product';
  const parts = match.split(':');
  return [parts[3], parts[4]].filter(Boolean).join(' ');
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json() as Promise<T>;
}

async function fetchNews(signal: AbortSignal): Promise<LiveNews[]> {
  const queries = ['cybersecurity', 'ransomware', 'vulnerability'];
  const responses = await Promise.all(
    queries.map((query) => fetchJson<any>(`/api/hn/api/v1/search_by_date?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=8`, signal)),
  );
  const seen = new Set<string>();
  return responses
    .flatMap((result) => result.hits ?? [])
    .filter((hit) => {
      const key = hit.url || hit.objectID || hit.title;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return Boolean(hit.title);
    })
    .slice(0, 8)
    .map((hit): LiveNews => ({
      kind: 'news',
      title: hit.title,
      source: 'Hacker News',
      tag: hit.title?.toLowerCase().includes('ransom') ? 'Ransomware' : hit.title?.toLowerCase().includes('cve') || hit.title?.toLowerCase().includes('vulnerab') ? 'Vulnerability' : 'Security',
      time: relativeTime(hit.created_at),
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      author: hit.author,
      publishedAt: hit.created_at,
      description: stripHtml(hit.story_text || hit._highlightResult?.title?.value || hit.title),
    }));
}

async function fetchKev(signal: AbortSignal) {
  const data = await fetchJson<any>('/api/cisa/sites/default/files/feeds/known_exploited_vulnerabilities.json', signal);
  return new Map((data.vulnerabilities ?? []).map((item: any) => [item.cveID, item]));
}

async function fetchCves(signal: AbortSignal): Promise<LiveCve[]> {
  const end = new Date();
  const start = new Date(end.getTime() - 1000 * 60 * 60 * 24 * 7);
  const params = new URLSearchParams({
    pubStartDate: start.toISOString(),
    pubEndDate: end.toISOString(),
    resultsPerPage: '20',
    noRejected: '',
  });
  const [data, kev] = await Promise.all([fetchJson<any>(`/api/nvd/rest/json/cves/2.0?${params.toString()}`, signal), fetchKev(signal).catch(() => new Map())]);
  return (data.vulnerabilities ?? [])
    .map((vulnerability: any): LiveCve => {
      const cve = vulnerability.cve;
      const id = cve.id;
      const kevItem = kev.get(id) as any;
      const description = cve.descriptions?.find((item: any) => item.lang === 'en')?.value ?? 'No NVD description available.';
      return {
        kind: 'cve',
        id,
        score: scoreFromMetrics(cve.metrics),
        product: kevItem?.vendorProject || productFromCve(vulnerability),
        status: kevItem ? 'Actively exploited' : 'NVD published',
        description,
        publishedAt: cve.published,
        modifiedAt: cve.lastModified,
        references: (cve.references?.referenceData ?? cve.references ?? []).map((ref: any) => ref.url).filter(Boolean).slice(0, 8),
        kev: kevItem
          ? {
              vendorProject: kevItem.vendorProject,
              vulnerabilityName: kevItem.vulnerabilityName,
              requiredAction: kevItem.requiredAction,
              dueDate: kevItem.dueDate,
              notes: kevItem.notes,
            }
          : undefined,
      };
    })
    .sort((a: LiveCve, b: LiveCve) => Number(Boolean(b.kev)) - Number(Boolean(a.kev)) || b.score - a.score)
    .slice(0, 10);
}

async function fetchJobs(signal: AbortSignal): Promise<LiveJob[]> {
  const data = await fetchJson<any[]>('/api/remoteok/api?tags=security', signal);
  return data
    .filter((item) => item?.position && item?.company)
    .slice(0, 8)
    .map((item): LiveJob => ({
      kind: 'job',
      role: item.position,
      company: item.company,
      location: item.location || 'Remote',
      match: Math.min(98, 70 + Math.round((item.tags?.length ?? 1) * 3)),
      url: item.url,
      description: stripHtml(item.description || 'No job description was provided by the source feed.'),
      tags: item.tags ?? [],
      salary: item.salary,
      date: item.date,
    }));
}

export function useLiveData() {
  const [news, setNews] = useState<LiveNews[]>(fallbackNews);
  const [cves, setCves] = useState<LiveCve[]>(fallbackCves);
  const [jobs, setJobs] = useState<LiveJob[]>(fallbackJobs);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    const controller = new AbortController();
    setLoading(true);
    const nextErrors: string[] = [];

    const [newsResult, cveResult, jobResult] = await Promise.allSettled([
      fetchNews(controller.signal),
      fetchCves(controller.signal),
      fetchJobs(controller.signal),
    ]);

    if (newsResult.status === 'fulfilled' && newsResult.value.length > 0) setNews(newsResult.value);
    else nextErrors.push('News feed unavailable');

    if (cveResult.status === 'fulfilled' && cveResult.value.length > 0) setCves(cveResult.value);
    else nextErrors.push('NVD/CISA feed unavailable');

    if (jobResult.status === 'fulfilled' && jobResult.value.length > 0) setJobs(jobResult.value);
    else nextErrors.push('RemoteOK jobs feed unavailable');

    setErrors(nextErrors);
    setLastUpdated(new Date());
    setLoading(false);

    return () => controller.abort();
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 1000 * 60 * 30);
    return () => window.clearInterval(interval);
  }, [refresh]);

  return { news, cves, jobs, projects, lastUpdated, loading, errors, refresh };
}

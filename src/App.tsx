import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowDown, ArrowRight, Bell, BriefcaseBusiness, CheckCircle2, ChevronUp, Code2, Info, Menu, Newspaper, Radar, Search, Settings, ShieldAlert, Sparkles, Star, X } from 'lucide-react';
import { useVideoScrub } from '@/useVideoScrub';
import { useLiveData, type DetailItem, type LiveCve, type LiveJob, type LiveNews, type LiveProject } from '@/liveData';

const DARK = '#1D3045';
const VIDEO_SRC =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260821_114821_a8ca298f-be2c-4613-a4dd-51b69e16bbde.mp4';

const navLinks = ['TODAY', 'THREATS', 'CVES', 'JOBS', 'PROJECTS'];
const navTargets: Record<string, number> = {
  TODAY: 0,
  THREATS: 0.38,
  CVES: 0.42,
  JOBS: 0.76,
  PROJECTS: 0.82,
};

function App() {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem('cyberpulse-auth') === 'true');
  const login = () => {
    sessionStorage.setItem('cyberpulse-auth', 'true');
    setAuthenticated(true);
  };
  const logout = () => {
    sessionStorage.removeItem('cyberpulse-auth');
    setAuthenticated(false);
  };

  return authenticated ? <CyberPulseScene onLogout={logout} /> : <LoginScreen onLogin={login} />;
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Enter an email and password to continue.');
      return;
    }
    setError('');
    onLogin();
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#1D3045] px-6 text-white">
      <video className="absolute inset-0 h-full w-full object-cover opacity-45" src={VIDEO_SRC} muted playsInline preload="auto" />
      <form onSubmit={submit} className="relative z-10 w-full max-w-md border border-white/25 bg-[#1D3045]/80 p-8 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30">
            <Radar size={21} />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/60">CyberPulse</p>
            <p className="text-sm text-white/80">Personal CySec Intelligence</p>
          </div>
        </div>
        <h1 className="mt-8 text-4xl font-light uppercase leading-tight tracking-wide">Sign in to your morning scan</h1>
        <label className="mt-8 block">
          <span className="text-xs uppercase tracking-[0.2em] text-white/60">Email</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full border border-white/25 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-white" placeholder="you@example.com" type="email" />
        </label>
        <label className="mt-4 block">
          <span className="text-xs uppercase tracking-[0.2em] text-white/60">Password</span>
          <input value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full border border-white/25 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-white" placeholder="Any password works" type="password" />
        </label>
        {error && <p className="mt-4 text-sm text-red-200">{error}</p>}
        <button className="group mt-6 flex w-full items-center justify-between bg-white px-5 py-3 text-sm font-medium uppercase tracking-[0.2em] text-[#1D3045]" type="submit">
          Login
          <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
        </button>
        <button
          className="mt-3 w-full border border-white/25 px-5 py-3 text-sm font-medium uppercase tracking-[0.2em] text-white hover:bg-white hover:text-[#1D3045]"
          type="button"
          onClick={onLogin}
        >
          Continue preview
        </button>
      </form>
    </main>
  );
}

function CyberPulseScene({ onLogout }: { onLogout: () => void }) {
  const { containerRef, videoRef, scrollProgress } = useVideoScrub(VIDEO_SRC);
  const { news, cves, jobs, projects, lastUpdated, loading, errors, refresh } = useLiveData();
  const sourceStatus = loading || !lastUpdated ? 'Checking...' : `${3 - errors.length}/3 online`;
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<DetailItem | null>(null);
  const isLight = scrollProgress > 0.55;
  const color = isLight ? '#ffffff' : DARK;
  const inverseColor = isLight ? DARK : '#ffffff';
  const sectionOpacity = useMemo(
    () => ({
      s1: scrollProgress < 0.2 ? 1 : Math.max(0, 1 - (scrollProgress - 0.2) / 0.08),
      s2: scrollProgress < 0.32 ? 0 : scrollProgress < 0.4 ? (scrollProgress - 0.32) / 0.08 : scrollProgress < 0.55 ? 1 : Math.max(0, 1 - (scrollProgress - 0.55) / 0.08),
      s3: scrollProgress < 0.67 ? 0 : scrollProgress < 0.75 ? (scrollProgress - 0.67) / 0.08 : 1,
    }),
    [scrollProgress],
  );

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const scrollToProgress = (progress: number) => {
    const container = containerRef.current;
    if (!container) return;
    const span = container.offsetHeight - window.innerHeight;
    window.scrollTo({ top: span * progress, behavior: 'smooth' });
  };

  return (
    <main ref={containerRef} className="relative h-[500vh]">
      <section className="sticky top-0 h-screen w-full overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          src={VIDEO_SRC}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          style={{
            transform: `scale(${1.03 + scrollProgress * 0.07}) translate3d(${(scrollProgress - 0.5) * -2.5}%, ${scrollProgress * -1.5}%, 0)`,
            filter: `brightness(${1 - Math.max(0, scrollProgress - 0.58) * 0.75}) saturate(${1 + scrollProgress * 0.12})`,
          }}
        />

        <div className="pointer-events-none absolute inset-0">
          <Navbar color={color} inverseColor={inverseColor} menuOpen={menuOpen} setMenuOpen={setMenuOpen} onLogout={onLogout} onNavigate={scrollToProgress} />
          <SectionOne opacity={sectionOpacity.s1} onNext={() => scrollToProgress(0.38)} lastUpdated={lastUpdated} loading={loading} errors={errors} refresh={refresh} />
          <SectionTwo opacity={sectionOpacity.s2} query={query} setQuery={setQuery} onNext={() => scrollToProgress(0.76)} onPrevious={() => scrollToProgress(0)} news={news} cves={cves} onSelect={setDetail} />
          <SectionThree opacity={sectionOpacity.s3} onNavigate={scrollToProgress} jobs={jobs} projects={projects} sourceStatus={sourceStatus} onSelect={setDetail} />
        </div>
      </section>
      <MobileMenu open={menuOpen} close={() => setMenuOpen(false)} onNavigate={scrollToProgress} />
      <DetailModal item={detail} onClose={() => setDetail(null)} />
    </main>
  );
}

function Navbar({ color, inverseColor, menuOpen, setMenuOpen, onLogout, onNavigate }: { color: string; inverseColor: string; menuOpen: boolean; setMenuOpen: (open: boolean) => void; onLogout: () => void; onNavigate: (progress: number) => void }) {
  return (
    <nav className="pointer-events-auto absolute left-0 right-0 top-0 z-50 flex items-center justify-between px-6 pb-6 pt-8 transition-colors duration-500 sm:px-8 sm:pt-12 md:px-12" style={{ color }}>
      <button className="flex h-11 w-11 items-center justify-center lg:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open menu" aria-expanded={menuOpen}>
        <Menu size={22} />
      </button>
      <div className="hidden items-center gap-8 lg:flex xl:gap-10">
        {navLinks.map((link, index) => (
          <button key={link} className="nav-enter relative text-xs font-medium uppercase tracking-[0.15em] hover:opacity-70" onClick={() => onNavigate(navTargets[link])} style={{ animationDelay: `${index * 80 + 100}ms` }}>
            {link}
            {index === 0 && <span className="absolute -bottom-3 left-0 h-[2px] w-full" style={{ backgroundColor: color }} />}
          </button>
        ))}
      </div>
      <div className="nav-enter ml-auto flex items-center gap-6" style={{ animationDelay: '500ms' }}>
        <button className="hidden items-center gap-3 sm:flex" onClick={() => onNavigate(0.38)}>
          <span className="text-xs font-medium uppercase tracking-[0.2em]">ALERTS</span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full transition-colors duration-500" style={{ backgroundColor: color, color: inverseColor }}>
            <Info size={10} />
          </span>
        </button>
        <button className="hidden text-xs font-medium uppercase tracking-[0.2em] lg:inline" onClick={onLogout}>
          LOGOUT
        </button>
      </div>
    </nav>
  );
}

function MobileMenu({ open, close, onNavigate }: { open: boolean; close: () => void; onNavigate: (progress: number) => void }) {
  const navigate = (target: number) => {
    close();
    window.setTimeout(() => onNavigate(target), 220);
  };

  return (
    <div className={open ? 'fixed inset-0 z-[100] visible bg-[#1D3045] opacity-100 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]' : 'invisible fixed inset-0 z-[100] bg-[#1D3045] opacity-0 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]'}>
      <div className={open ? 'flex h-full translate-y-0 flex-col transition-transform duration-500' : 'flex h-full -translate-y-8 flex-col transition-transform duration-500'}>
        <div className="flex justify-end px-6 pt-8 sm:px-8 sm:pt-12">
          <button className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 text-white hover:border-white" onClick={close} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-1 flex-col justify-center px-8 sm:px-12">
          {navLinks.map((link, index) => (
            <button key={link} className={index === 0 ? 'stagger-enter py-3 text-left text-2xl font-light uppercase tracking-wide text-white sm:text-3xl' : 'stagger-enter py-3 text-left text-2xl font-light uppercase tracking-wide text-white/60 hover:text-white sm:text-3xl'} style={{ animationDelay: `${index * 60}ms` }} onClick={() => navigate(navTargets[link])}>
              {link}
            </button>
          ))}
        </div>
        <div className="flex justify-between px-8 pb-10 text-xs font-medium uppercase tracking-[0.2em] text-white/60 sm:px-12">
          <button onClick={() => navigate(0.38)} className="hover:text-white">ALERTS</button>
          <button onClick={() => navigate(0.82)} className="hover:text-white">SETTINGS</button>
        </div>
      </div>
    </div>
  );
}

function SectionOne({ opacity, onNext, lastUpdated, loading, errors, refresh }: { opacity: number; onNext: () => void; lastUpdated: Date | null; loading: boolean; errors: string[]; refresh: () => Promise<unknown> }) {
  const show = opacity > 0.3;
  return (
    <section aria-hidden={!show} ref={(element) => { element?.toggleAttribute('inert', !show); }} className={show ? 'pointer-events-auto absolute inset-0 px-6 sm:px-8 md:px-20 lg:px-32' : 'pointer-events-none absolute inset-0 px-6 sm:px-8 md:px-20 lg:px-32'} style={{ opacity }}>
      <div className="flex h-full max-w-5xl flex-col justify-center">
        <Stagger show={show} delay={0}>
          <p className="mb-6 text-sm font-medium uppercase tracking-[0.3em] text-[#1D304590]">CyberPulse</p>
          <h1 className="max-w-5xl font-light uppercase leading-[1.2] text-[#1D3045]" style={{ fontSize: 'clamp(2rem,5vw,5rem)' }}>
            Your daily cyber intelligence command center
          </h1>
        </Stagger>
        <Stagger show={show} delay={150}>
          <p className="mt-6 max-w-2xl text-sm uppercase leading-7 tracking-[0.24em] text-[#1D304590]">Security news, CVEs, jobs, and project ideas in one morning scan</p>
        </Stagger>
        <Stagger show={show} delay={240}>
          <p className="mt-8 max-w-xl text-xs uppercase leading-6 tracking-[0.22em] text-[#1D304570]">
            {loading ? 'Refreshing live feeds...' : `Live public feeds / Updated ${lastUpdated ? lastUpdated.toLocaleTimeString() : 'on load'}`}
          </p>
          <p className="mt-2 max-w-xl text-xs uppercase leading-6 tracking-[0.18em] text-[#1D304560]">
            Motion engine: stable scroll animation
          </p>
          {errors.length > 0 && <p className="mt-2 max-w-xl text-xs uppercase leading-6 tracking-[0.18em] text-[#1D304590]">{errors.join(' / ')}</p>}
          <button onClick={() => void refresh()} className="mt-5 border border-[#1D304580] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#1D3045] hover:bg-[#1D3045] hover:text-white">
            Refresh now
          </button>
        </Stagger>
      </div>
      <Stagger show={show} delay={300}>
        <button onClick={onNext} className="absolute bottom-12 right-6 flex h-12 w-12 items-center justify-center rounded-full border border-[#1D304580] text-[#1D3045] hover:opacity-70 sm:right-8 md:right-12" aria-label="Next">
          <ArrowRight size={18} />
        </button>
      </Stagger>
    </section>
  );
}

function SectionTwo({ opacity, query, setQuery, onNext, onPrevious, news, cves, onSelect }: { opacity: number; query: string; setQuery: (query: string) => void; onNext: () => void; onPrevious: () => void; news: LiveNews[]; cves: LiveCve[]; onSelect: (item: DetailItem) => void }) {
  const [activePanel, setActivePanel] = useState<'threats' | 'cves'>('threats');
  const show = opacity > 0.3;
  const normalizedQuery = query.trim().toLowerCase();
  const visibleNews = news.filter((item) => !normalizedQuery || `${item.title} ${item.source} ${item.tag} ${item.description}`.toLowerCase().includes(normalizedQuery));
  const visibleCves = cves.filter((cve) => !normalizedQuery || `${cve.id} ${cve.product} ${cve.status} ${cve.description}`.toLowerCase().includes(normalizedQuery));
  const threatRows = visibleNews.slice(0, 5).map((item) => (
    <DataRow key={item.title} title={item.title} meta={`${item.source} / ${item.tag} / ${item.time}`} onClick={() => onSelect(item)} />
  ));
  const cveRows = visibleCves.slice(0, 5).map((cve) => (
    <DataRow key={cve.id} title={`${cve.id} / ${cve.score.toFixed(1)}`} meta={`${cve.product} / ${cve.status}`} onClick={() => onSelect(cve)} />
  ));
  const threatPanel = (count: number) => (
    <DashboardPanel title="Threat Feed" icon={<Newspaper size={18} />} onAction={() => visibleNews[0] ? onSelect(visibleNews[0]) : onNext()}>
      {threatRows.slice(0, count)}
      {visibleNews.length === 0 && <EmptyRow text="No threat stories match this search" />}
    </DashboardPanel>
  );
  const cvePanel = (count: number) => (
    <DashboardPanel title="CVE Watchlist" icon={<ShieldAlert size={18} />} onAction={() => visibleCves[0] ? onSelect(visibleCves[0]) : onNext()}>
      {cveRows.slice(0, count)}
      {visibleCves.length === 0 && <EmptyRow text="No CVEs match this search" />}
    </DashboardPanel>
  );

  return (
    <section aria-hidden={!show} ref={(element) => { element?.toggleAttribute('inert', !show); }} className={show ? 'pointer-events-auto absolute inset-0 px-6 text-[#1D3045] sm:px-8 md:px-12' : 'pointer-events-none absolute inset-0 px-6 text-[#1D3045] sm:px-8 md:px-12'} style={{ opacity }}>
      <div className="flex h-full items-center justify-center pt-20 pb-24 sm:py-24 lg:pb-16 lg:pt-28">
        <div className="w-full max-w-6xl">
          <Stagger show={show} delay={0}>
            <div className="mx-auto max-w-[900px] text-center">
              <h2 className="font-extralight uppercase leading-[1.3] tracking-wide" style={{ fontSize: 'clamp(1.5rem,3.5vw,3.5rem)' }}>
                Track urgent threats <span className="text-[#1D3045]/80">and exploitable CVEs</span> <span className="text-[#1D3045]/50">before they become noise</span>
              </h2>
            </div>
          </Stagger>
          <Stagger show={show} delay={180}>
            <label className="mx-auto mt-8 flex max-w-xl items-center gap-3 border border-[#1D304540] bg-white/25 px-4 py-3 backdrop-blur-sm">
              <Search size={18} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm uppercase tracking-[0.12em] outline-none placeholder:text-[#1D304580]" placeholder="Search threats and CVEs" />
            </label>
          </Stagger>
          <div className="mt-8 hidden gap-4 lg:grid lg:grid-cols-2">
            <Stagger show={show} delay={260}>
              {threatPanel(4)}
            </Stagger>
            <Stagger show={show} delay={360}>
              {cvePanel(4)}
            </Stagger>
          </div>
          <div className="mt-5 lg:hidden">
            <div className="mb-3 grid grid-cols-2 border border-[#1D304540] bg-white/20 p-1" role="group" aria-label="Choose dashboard panel">
              <button type="button" aria-pressed={activePanel === 'threats'} onClick={() => setActivePanel('threats')} className={activePanel === 'threats' ? 'bg-[#1D3045] px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-white' : 'px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-[#1D3045]/70'}>
                Threats
              </button>
              <button type="button" aria-pressed={activePanel === 'cves'} onClick={() => setActivePanel('cves')} className={activePanel === 'cves' ? 'bg-[#1D3045] px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-white' : 'px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-[#1D3045]/70'}>
                CVEs
              </button>
            </div>
            {activePanel === 'threats' ? threatPanel(2) : cvePanel(2)}
          </div>
        </div>
      </div>
      <div className="absolute bottom-5 right-6 flex items-center gap-3 sm:bottom-8 sm:right-8 md:right-12">
        <button onClick={onPrevious} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#1D30454d] text-[#1D3045]/80 transition-colors hover:bg-[#1D3045] hover:text-white" aria-label="Previous section">
          <ChevronUp size={16} />
        </button>
        <div className="flex items-center gap-2" aria-label="Section 2 of 3">
          <span className="h-1.5 w-1.5 rounded-full bg-[#1D3045]/40" />
          <span className="h-2 w-2 rounded-full bg-[#1D3045]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#1D3045]/40" />
        </div>
        <button onClick={onNext} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#1D304566] transition-colors hover:bg-[#1D3045] hover:text-white" aria-label="Next section">
          <ArrowDown size={18} />
        </button>
      </div>
    </section>
  );
}

function SectionThree({ opacity, onNavigate, jobs, projects, sourceStatus, onSelect }: { opacity: number; onNavigate: (progress: number) => void; jobs: LiveJob[]; projects: LiveProject[]; sourceStatus: string; onSelect: (item: DetailItem) => void }) {
  const show = opacity > 0.3;
  return (
    <section aria-hidden={!show} ref={(element) => { element?.toggleAttribute('inert', !show); }} className={show ? 'pointer-events-auto absolute inset-0 flex items-center justify-end px-6 text-white sm:px-8 md:px-20 lg:px-32' : 'pointer-events-none absolute inset-0 flex items-center justify-end px-6 text-white sm:px-8 md:px-20 lg:px-32'} style={{ opacity }}>
      <div className="w-full max-w-4xl text-left">
        <Stagger show={show} delay={0}>
          <p className="mb-4 text-lg tracking-wide text-white/60">Jobs | Projects | Settings</p>
        </Stagger>
        <Stagger show={show} delay={150}>
          <h2 className="mb-8 max-w-2xl font-light uppercase leading-[1.2] tracking-wide text-white" style={{ fontSize: 'clamp(2rem,4vw,4rem)' }}>
            Turn the signal into career momentum.
          </h2>
        </Stagger>
        <div className="grid gap-4 lg:grid-cols-2">
          <Stagger show={show} delay={260}>
            <DashboardPanel title="Job Matches" icon={<BriefcaseBusiness size={18} />} onAction={() => jobs[0] ? onSelect(jobs[0]) : onNavigate(0.82)} light>
              {jobs.slice(0, 5).map((job) => (
                <DataRow key={`${job.company}-${job.role}`} title={`${job.role} / ${job.match}%`} meta={`${job.company} / ${job.location}`} onClick={() => onSelect(job)} light />
              ))}
            </DashboardPanel>
          </Stagger>
          <Stagger show={show} delay={360}>
            <DashboardPanel title="Project Ideas" icon={<Sparkles size={18} />} onAction={() => projects[0] ? onSelect(projects[0]) : onNavigate(0.38)} light>
              {projects.map((project) => (
                <DataRow key={project.title} title={project.title} meta={`${project.domain} / ${project.difficulty}`} onClick={() => onSelect(project)} light />
              ))}
            </DashboardPanel>
          </Stagger>
        </div>
        <Stagger show={show} delay={480}>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <StatusCard icon={<Bell size={17} />} label="Digest" value="08:00 local" />
            <StatusCard icon={<Settings size={17} />} label="Refresh" value="News 2h / CVEs 4h" />
            <StatusCard icon={<CheckCircle2 size={17} />} label="Sources" value={sourceStatus} />
          </div>
        </Stagger>
      </div>
    </section>
  );
}

function DashboardPanel({ title, icon, children, light = false, onAction }: { title: string; icon: ReactNode; children: ReactNode; light?: boolean; onAction?: () => void }) {
  return (
    <div className={light ? 'border border-white/20 bg-white/10 p-4 text-white backdrop-blur-md' : 'border border-[#1D304533] bg-white/30 p-4 text-[#1D3045] backdrop-blur-md'}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-xs font-medium uppercase tracking-[0.2em]">{title}</h3>
        </div>
        <button onClick={onAction} className="rounded-full p-1 hover:opacity-70" aria-label={`Open ${title}`}>
          <ArrowRight size={16} />
        </button>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function DataRow({ title, meta, light = false, onClick }: { title: string; meta: string; light?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={light ? 'block w-full border-t border-white/15 pt-3 text-left hover:opacity-75' : 'block w-full border-t border-[#1D304526] pt-3 text-left hover:opacity-75'}>
      <div className="flex items-start gap-3">
        <Star size={14} className="mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium leading-5">{title}</p>
          <p className={light ? 'mt-1 text-xs uppercase tracking-[0.16em] text-white/55' : 'mt-1 text-xs uppercase tracking-[0.16em] text-[#1D304599]'}>{meta}</p>
        </div>
      </div>
    </button>
  );
}

function DetailModal({ item, onClose }: { item: DetailItem | null; onClose: () => void }) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#1D3045]/85 px-4 py-8 backdrop-blur-md">
      <article className="max-h-[86vh] w-full max-w-3xl overflow-y-auto bg-white p-6 text-[#1D3045] shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[#1D3045]/55">{detailType(item)}</p>
            <h2 className="mt-3 text-2xl font-light uppercase leading-tight tracking-wide sm:text-4xl">{detailTitle(item)}</h2>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#1D304540]" aria-label="Close details">
            <X size={18} />
          </button>
        </div>
        <div className="mt-6 space-y-5 text-sm leading-7">
          <DetailBody item={item} />
        </div>
      </article>
    </div>
  );
}

function detailType(item: DetailItem) {
  if (item.kind === 'cve') return `${item.id} / CVSS ${item.score.toFixed(1)}`;
  if (item.kind === 'job') return `${item.company} / ${item.location}`;
  if (item.kind === 'project') return `${item.domain} / ${item.difficulty}`;
  return `${item.source} / ${item.tag}`;
}

function detailTitle(item: DetailItem) {
  if (item.kind === 'cve') return item.id;
  if (item.kind === 'job') return item.role;
  return item.title;
}

function DetailBody({ item }: { item: DetailItem }) {
  if (item.kind === 'cve') {
    return (
      <>
        <p>{item.description}</p>
        <p><strong>Product:</strong> {item.product}</p>
        <p><strong>Status:</strong> {item.status}</p>
        {item.publishedAt && <p><strong>Published:</strong> {new Date(item.publishedAt).toLocaleString()}</p>}
        {item.modifiedAt && <p><strong>Modified:</strong> {new Date(item.modifiedAt).toLocaleString()}</p>}
        {item.kev && (
          <div className="border border-[#1D304526] p-4">
            <p><strong>CISA KEV:</strong> {item.kev.vulnerabilityName}</p>
            {item.kev.requiredAction && <p><strong>Required action:</strong> {item.kev.requiredAction}</p>}
            {item.kev.dueDate && <p><strong>Due date:</strong> {item.kev.dueDate}</p>}
          </div>
        )}
        {item.references.length > 0 && (
          <div>
            <p className="mb-2 font-semibold">References</p>
            <div className="space-y-2">
              {item.references.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer" className="block break-all underline">{url}</a>
              ))}
            </div>
          </div>
        )}
      </>
    );
  }

  if (item.kind === 'job') {
    return (
      <>
        <p>{item.description}</p>
        <p><strong>Match:</strong> {item.match}%</p>
        {item.salary && <p><strong>Salary:</strong> {item.salary}</p>}
        {item.tags.length > 0 && <p><strong>Tags:</strong> {item.tags.join(', ')}</p>}
        {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border border-[#1D304540] px-4 py-2 uppercase tracking-[0.18em]">Open job post <ArrowRight size={15} /></a>}
      </>
    );
  }

  if (item.kind === 'news') {
    return (
      <>
        <p>{item.description}</p>
        {item.author && <p><strong>Author:</strong> {item.author}</p>}
        {item.publishedAt && <p><strong>Published:</strong> {new Date(item.publishedAt).toLocaleString()}</p>}
        {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border border-[#1D304540] px-4 py-2 uppercase tracking-[0.18em]">Read full article <ArrowRight size={15} /></a>}
      </>
    );
  }

  return <p>{item.description}</p>;
}

function EmptyRow({ text }: { text: string }) {
  return <p className="border-t border-current/15 pt-3 text-sm uppercase tracking-[0.14em] opacity-60">{text}</p>;
}

function StatusCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="border border-white/20 bg-white/10 p-3 backdrop-blur-md">
      <div className="text-white/65">{icon}</div>
      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-white/55">{label}</p>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function Stagger({ show, delay, children }: { show: boolean; delay: number; children: ReactNode }) {
  return (
    <div className={show ? 'stagger-enter' : 'translate-y-6 opacity-0'} style={show ? { animationDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}

export default App;

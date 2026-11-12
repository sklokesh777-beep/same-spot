import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AskHost, Toaster } from './components/overlay';
import { Appearance, DatePill, RequireOnboarded, StorageBanner, TabLayout, UpdateBar } from './components/shell';
import { Spinner } from './components/ui';
import { LockGate } from './features/lock/Lock';
import { CaptureHost } from './features/camera/Camera';
import { recordLocation } from './data/flows';

const Onboarding = lazy(() => import('./features/onboarding/Onboarding'));
const NewTracker = lazy(() => import('./features/newTracker/NewTracker'));
const Home = lazy(() => import('./features/home/Home'));
const Checkin = lazy(() => import('./features/checkin/Checkin'));
const Look = lazy(() => import('./features/look/Look'));
const Safety = lazy(() => import('./features/safety/Safety'));
const Progress = lazy(() => import('./features/progress/Progress'));
const Photos = lazy(() => import('./features/photos/Photos'));
const Guide = lazy(() => import('./features/guide/Guide'));
const Pack = lazy(() => import('./features/pack/Pack'));
const Summary = lazy(() => import('./features/summary/Summary'));
const Settings = lazy(() => import('./features/settings/Settings'));
const SettingsPages = lazy(() => import('./features/settings/SettingsPages'));
const AddPhotos = lazy(() => import('./features/photos/AddPhotos'));

/** Each new screen starts at the top. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/** Remembers which screen is at which history position, for the Back button. */
function HistoryRecorder() {
  const loc = useLocation();
  useEffect(() => {
    recordLocation(loc.pathname + loc.search);
  }, [loc]);
  return null;
}

/** Hash routing reads "#main" as a page, so the skip link moves focus itself. */
function SkipLink() {
  return (
    <a
      href="#main"
      onClick={(e) => {
        e.preventDefault();
        const main = document.getElementById('main');
        main?.focus();
        main?.scrollIntoView();
      }}
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[90] focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:font-semibold focus:text-primary"
    >
      Skip to content
    </a>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Appearance>
        <SkipLink />
        <StorageBanner />
        <LockGate>
          <ScrollToTop />
          <HistoryRecorder />
          <UpdateBar />
          <DatePill />
          <Suspense fallback={<Spinner />}>
            <RequireOnboarded>
              <Routes>
                <Route path="/welcome/:step?" element={<Onboarding />} />
                <Route path="/new/:step?" element={<NewTracker />} />
                <Route path="/t/:id/checkin/:step?" element={<Checkin />} />
                <Route path="/t/:id/look/:step?" element={<Look />} />
                <Route path="/t/:id/safety" element={<Safety />} />
                <Route path="/t/:id/pack" element={<Pack />} />
                <Route path="/t/:id/summary" element={<Summary />} />
                <Route path="/t/:id/add-photos/:view?" element={<AddPhotos />} />
                <Route element={<TabLayout />}>
                  <Route index element={<Home />} />
                  <Route path="/progress" element={<Progress />} />
                  <Route path="/photos" element={<Photos />} />
                  <Route path="/guide" element={<Guide />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/settings/:page/:id?" element={<SettingsPages />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </RequireOnboarded>
          </Suspense>
          <CaptureHost />
        </LockGate>
        <AskHost />
        <Toaster />
      </Appearance>
    </HashRouter>
  );
}

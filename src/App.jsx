import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./store/auth";
import { LiveProvider } from "./store/live";
import { PageLoader } from "./components/Loading";
import { isAdmin } from "./admin/access";
import PublicLayout from "./layouts/PublicLayout";
import AppLayout from "./layouts/AppLayout";
import Home from "./pages/public/Home";
import { About, Contact, Help, Horoscope, Legal, Membership, SeoLanding, Stories } from "./pages/public/Pages";
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";

// Lazy: pulls in the world country/state/city dataset used for the location
// step, which would otherwise bloat the bundle every page pays for.
const Register = lazy(() => import("./pages/auth/Register"));
const OnboardOtp = lazy(() => import("./pages/onboard/OnboardOtp"));
const OnboardPhoto = lazy(() => import("./pages/onboard/OnboardPhoto"));
const OnboardInterests = lazy(() => import("./pages/onboard/OnboardInterests"));
const OnboardVerify = lazy(() => import("./pages/onboard/OnboardVerify"));
const LiveMobile = lazy(() => import("./pages/onboard/LiveMobile"));
const Dashboard = lazy(() => import("./pages/app/Dashboard"));
const FeedList = lazy(() => import("./pages/app/FeedList"));
const Matches = lazy(() => import("./pages/app/Matches"));
const Search = lazy(() => import("./pages/app/Search"));
const ProfileDetail = lazy(() => import("./pages/app/ProfileDetail"));
const Messages = lazy(() => import("./pages/app/Messages"));
const MyProfile = lazy(() => import("./pages/app/MyProfile"));
const PartnerProfile = lazy(() => import("./pages/app/PartnerProfile"));
const Interests = lazy(() => import("./pages/app/Social").then((m) => ({ default: m.Interests })));
const Shortlist = lazy(() => import("./pages/app/Social").then((m) => ({ default: m.Shortlist })));
const Requests = lazy(() => import("./pages/app/Social").then((m) => ({ default: m.Requests })));
const Notifications = lazy(() => import("./pages/app/More").then((m) => ({ default: m.Notifications })));
const Verification = lazy(() => import("./pages/app/More").then((m) => ({ default: m.Verification })));
const MembershipApp = lazy(() => import("./pages/app/More").then((m) => ({ default: m.MembershipApp })));
const Settings = lazy(() => import("./pages/app/More").then((m) => ({ default: m.Settings })));
const AdminApp = lazy(() => import("./admin/AdminApp"));
const AdminLogin = lazy(() => import("./admin/AdminLogin"));

function LazyRoute({ children }) {
  return <Suspense fallback={<PageLoader label="Opening page…" />}>{children}</Suspense>;
}

function Guard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader label="Starting Matrimony…" />;
  if (!user) return <Navigate to="/login" replace />;
  // Admin logins have no member experience: send them to the console.
  if (isAdmin(user)) return <Navigate to="/admin" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/membership" element={<Membership />} />
          <Route path="/success-stories" element={<Stories />} />
          <Route path="/help" element={<Help />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/horoscope" element={<Horoscope />} />
          <Route path="/kundali-matching" element={<Horoscope />} />
          <Route path="/privacy" element={<Legal slug="privacy" />} />
          <Route path="/terms" element={<Legal slug="terms" />} />
          <Route path="/safety" element={<Legal slug="safety" />} />
          <Route path="/report-misuse" element={<Legal slug="report" />} />
          <Route path="/matrimony/:slug" element={<SeoLanding />} />
          <Route path="/dating/:slug" element={<SeoLanding />} />
          <Route path="*" element={<Legal slug="missing" />} />
        </Route>
        <Route path="/admin/login" element={<LazyRoute><AdminLogin /></LazyRoute>} />
        <Route path="/admin/*" element={<LazyRoute><AdminApp /></LazyRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/register"
          element={
            <LazyRoute>
              <Register />
            </LazyRoute>
          }
        />
        <Route
          path="/live/:token"
          element={
            <LazyRoute>
              <LiveMobile />
            </LazyRoute>
          }
        />
        <Route
          path="/onboard/otp"
          element={
            <Guard>
              <LazyRoute>
                <OnboardOtp />
              </LazyRoute>
            </Guard>
          }
        />
        <Route
          path="/onboard/photo"
          element={
            <Guard>
              <LazyRoute>
                <OnboardPhoto />
              </LazyRoute>
            </Guard>
          }
        />
        <Route
          path="/onboard/interests"
          element={
            <Guard>
              <LazyRoute>
                <OnboardInterests />
              </LazyRoute>
            </Guard>
          }
        />
        <Route
          path="/onboard/verify"
          element={
            <Guard>
              <LazyRoute>
                <OnboardVerify />
              </LazyRoute>
            </Guard>
          }
        />
        <Route
          path="/app"
          element={
            <Guard>
              <LiveProvider>
                <AppLayout />
              </LiveProvider>
            </Guard>
          }
        >
          <Route index element={<LazyRoute><Dashboard /></LazyRoute>} />
          <Route path="feed/:kind" element={<LazyRoute><FeedList /></LazyRoute>} />
          <Route path="matches" element={<LazyRoute><Matches /></LazyRoute>} />
          <Route path="search" element={<LazyRoute><Search /></LazyRoute>} />
          <Route path="profile" element={<LazyRoute><MyProfile /></LazyRoute>} />
          <Route path="partner-profile" element={<LazyRoute><PartnerProfile /></LazyRoute>} />
          <Route path="profile/:publicId" element={<LazyRoute><ProfileDetail /></LazyRoute>} />
          <Route path="interests" element={<LazyRoute><Interests /></LazyRoute>} />
          <Route path="inbox" element={<LazyRoute><Interests /></LazyRoute>} />
          <Route path="shortlist" element={<LazyRoute><Shortlist /></LazyRoute>} />
          <Route path="requests" element={<LazyRoute><Requests /></LazyRoute>} />
          <Route path="messages" element={<LazyRoute><Messages /></LazyRoute>} />
          <Route path="notifications" element={<LazyRoute><Notifications /></LazyRoute>} />
          <Route path="verification" element={<LazyRoute><Verification /></LazyRoute>} />
          <Route path="membership" element={<LazyRoute><MembershipApp /></LazyRoute>} />
          <Route path="settings" element={<LazyRoute><Settings /></LazyRoute>} />
          <Route path="admin" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

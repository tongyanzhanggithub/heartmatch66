import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Guests from './pages/Guests';
import GuestDetail from './pages/GuestDetail';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Reviews from './pages/Reviews';
import Matching from './pages/Matching';
import Hepan from './pages/Hepan';
import Audit from './pages/Audit';
import Tags from './pages/Tags';
import Members from './pages/Members';
import OpLogs from './pages/OpLogs';
import Accounts from './pages/Accounts';

function PrivateRoute({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="guests" element={<Guests />} />
          <Route path="guests/:id" element={<GuestDetail />} />
          <Route path="events" element={<Events />} />
          <Route path="events/:id" element={<EventDetail />} />
          <Route path="reviews/:eventId" element={<Reviews />} />
          <Route path="matching/:guestId" element={<Matching />} />
          <Route path="hepan" element={<Hepan />} />
          <Route path="audit" element={<Audit />} />
          <Route path="tags" element={<Tags />} />
          <Route path="members" element={<Members />} />
          <Route path="oplogs" element={<OpLogs />} />
          <Route path="accounts" element={<Accounts />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
